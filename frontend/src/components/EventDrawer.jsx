
import React, { useEffect, useState } from 'react';
import { showAppAlert } from './AppDialog.jsx';
import { resolveImageUrl } from '../api/apiClient.js';

const COVER_SLOT_COUNT = 4;
const STORAGE_PREFIX = 'event-cover-slots:';

const CATEGORY_OPTIONS = [
  { value: 'TECH', label: 'เทคโนโลยี' },
  { value: 'DESIGN', label: 'ออกแบบ' },
  { value: 'CAREER', label: 'อาชีพ' },
  { value: 'COMMUNITY', label: 'ชุมชน' },
];

const createEmptyForm = () => ({
  id: null,
  name: '',
  desc: '',
  place: '',
  category: 'TECH',
  date: '',
  max: 30,
  coverIndex: 0,
  coverUrl: '',
  coverFile: null,
  ticketTypes: [
    {
      name: 'General Admission',
      description: '',
      price: 0,
      capacity: 30,
      sold: 0,
    },
  ],
});

const getInitialCoverUrl = (event) =>
  event?.imageUrl ||
  event?.coverUrl ||
  event?.image ||
  event?.coverImage ||
  '';

const getStorageKey = (event, draftKey) =>
  `${STORAGE_PREFIX}${
    event?.id != null ? String(event.id) : draftKey
  }`;

const createEmptyCoverSlots = () =>
  Array.from({ length: COVER_SLOT_COUNT }, () => ({
    url: '',
    file: null,
  }));

const readStoredCoverSlots = (key) => {
  const emptySlots = createEmptyCoverSlots();

  try {
    const saved = localStorage.getItem(key);
    if (!saved) return emptySlots;

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return emptySlots;

    return emptySlots.map((_, index) => ({
      url:
        typeof parsed[index]?.url === 'string'
          ? parsed[index].url
          : '',
      file: null,
    }));
  } catch (error) {
    console.warn('อ่านรูปปกที่บันทึกไว้ไม่สำเร็จ:', error);
    return emptySlots;
  }
};

const saveCoverSlots = (key, slots) => {
  try {
    // เก็บ URL ของแต่ละช่องแยกกัน
    // File object ไม่สามารถเก็บลง localStorage โดยตรงได้
    const serializableSlots = slots.map((slot) => ({
      url: slot.url || '',
    }));

    localStorage.setItem(key, JSON.stringify(serializableSlots));
    return true;
  } catch (error) {
    console.error('บันทึกรูปปกไม่สำเร็จ:', error);

    showAppAlert(
      'ไม่สามารถบันทึกรูปในเบราว์เซอร์ได้ อาจเป็นเพราะพื้นที่จัดเก็บเต็ม กรุณาเลือกรูปที่มีขนาดเล็กลง',
      { title: 'บันทึกรูปไม่สำเร็จ' }
    );

    return false;
  }
};

const createInitialCoverSlots = (event, storageKey) => {
  const slots = readStoredCoverSlots(storageKey);
  const initialUrl = getInitialCoverUrl(event);

  const rawIndex = Number(event?.coverIndex ?? 0);
  const index =
    Number.isInteger(rawIndex) &&
    rawIndex >= 0 &&
    rawIndex < COVER_SLOT_COUNT
      ? rawIndex
      : 0;

  // เติมรูปจาก Backend เฉพาะช่องที่ยังไม่มีรูป
  if (initialUrl && !slots[index].url) {
    slots[index] = { url: initialUrl, file: null };
  }

  return slots;
};

export default function EventDrawer({
  open,
  mode,
  initialEvent,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(createEmptyForm);
  const [errors, setErrors] = useState({});
  const [coverSlots, setCoverSlots] = useState(createEmptyCoverSlots);
  const [coverImageError, setCoverImageError] = useState(false);

  // สร้าง key สำหรับกิจกรรมใหม่หนึ่งชุดตลอดอายุของ Drawer
  const [draftKey] = useState(
    () =>
      `draft-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`
  );

  const isEdit = mode === 'edit';

  const storageKey = getStorageKey(
    isEdit ? initialEvent : null,
    draftKey
  );

  const selectedIndex = Number(form.coverIndex ?? 0);

  const selectedSlot = coverSlots[selectedIndex] || {
    url: '',
    file: null,
  };

  const resolvedCoverUrl = resolveImageUrl(selectedSlot.url);

  useEffect(() => {
    if (!open) return;

    setErrors({});
    setCoverImageError(false);

    const slots = createInitialCoverSlots(
      isEdit ? initialEvent : null,
      storageKey
    );

    setCoverSlots(slots);

    if (isEdit && initialEvent) {
      const max = Number(initialEvent.max ?? 30) || 30;

      const rawIndex = Number(initialEvent.coverIndex ?? 0);
      const index =
        Number.isInteger(rawIndex) &&
        rawIndex >= 0 &&
        rawIndex < COVER_SLOT_COUNT
          ? rawIndex
          : 0;

      setForm({
        id: initialEvent.id ?? null,
        name: initialEvent.name || '',
        desc: initialEvent.desc || '',
        place: initialEvent.place || '',
        category: initialEvent.category || 'TECH',
        date: initialEvent.date || '',
        max,
        coverIndex: index,
        coverUrl: slots[index]?.url || '',
        coverFile: null,
        ticketTypes:
          Array.isArray(initialEvent.ticketTypes) &&
          initialEvent.ticketTypes.length > 0
            ? initialEvent.ticketTypes.map((ticket) => ({
                ...ticket,
                name: ticket.name ?? '',
                description: ticket.description ?? '',
                price: Number(ticket.price ?? 0),
                capacity: Number(ticket.capacity ?? 0),
                sold: Number(ticket.sold ?? 0),
              }))
            : [
                {
                  name: 'General Admission',
                  description: '',
                  price: 0,
                  capacity: max,
                  sold: 0,
                },
              ],
      });
    } else {
      setForm(createEmptyForm());
    }
  }, [open, isEdit, initialEvent, storageKey]);

  if (!open) return null;

  const persistSlots = (nextSlots) => {
    saveCoverSlots(storageKey, nextSlots);
  };

  const selectCoverSlot = (index) => {
    const slot = coverSlots[index] || {
      url: '',
      file: null,
    };

    setForm((current) => ({
      ...current,
      coverIndex: index,
      coverUrl: slot.url,
      coverFile: slot.file,
    }));

    setCoverImageError(false);

    setErrors((previous) => ({
      ...previous,
      coverUrl: '',
    }));
  };

  const set = (key) => (e) => {
    const value = e.target.value;

    if (key === 'coverUrl') {
      const nextSlots = coverSlots.map((slot, index) =>
        index === selectedIndex
          ? { url: value, file: null }
          : slot
      );

      setCoverSlots(nextSlots);
      persistSlots(nextSlots);
      setCoverImageError(false);

      setForm((current) => ({
        ...current,
        coverUrl: value,
        coverFile: null,
      }));
    } else {
      setForm((current) => ({
        ...current,
        [key]: value,
      }));
    }

    setErrors((previous) => ({
      ...previous,
      [key]: '',
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showAppAlert('กรุณาเลือกไฟล์รูปภาพ');
      e.target.value = '';
      return;
    }

    const index = selectedIndex;
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result;

      if (typeof dataUrl !== 'string') {
        showAppAlert('ไม่สามารถอ่านไฟล์รูปภาพได้');
        return;
      }

      setCoverSlots((previous) => {
        const nextSlots = previous.map((slot, slotIndex) =>
          slotIndex === index
            ? { url: dataUrl, file }
            : slot
        );

        persistSlots(nextSlots);
        return nextSlots;
      });

      setForm((current) => ({
        ...current,
        coverIndex: index,
        coverUrl: dataUrl,
        coverFile: file,
      }));

      setCoverImageError(false);

      setErrors((previous) => ({
        ...previous,
        coverUrl: '',
      }));
    };

    reader.onerror = () => {
      showAppAlert('ไม่สามารถอ่านไฟล์รูปภาพได้');
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearSelectedCover = () => {
    const nextSlots = coverSlots.map((slot, index) =>
      index === selectedIndex
        ? { url: '', file: null }
        : slot
    );

    setCoverSlots(nextSlots);
    persistSlots(nextSlots);

    setForm((current) => ({
      ...current,
      coverUrl: '',
      coverFile: null,
    }));

    setCoverImageError(false);
  };

  const handleSubmit = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'กรุณากรอกชื่ออีเวนต์';
    }

    if (!form.place.trim()) {
      nextErrors.place = 'กรุณากรอกสถานที่';
    }

    if (!form.date) {
      nextErrors.date = 'กรุณาเลือกวันและเวลา';
    }

    const max = Number(form.max);

    if (!Number.isInteger(max) || max <= 0) {
      nextErrors.max = 'ต้องเป็นจำนวนเต็มบวก';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    const currentSlot = coverSlots[selectedIndex] || {
      url: '',
      file: null,
    };

    onSubmit(
      {
        ...form,
        coverIndex: selectedIndex,
        coverUrl: currentSlot.url || '',
        coverFile: currentSlot.file || null,
        coverImages: coverSlots.map((slot) => slot.url || ''),
      },
      isEdit
    );
  };

  const addTicketType = () => {
    setForm((current) => ({
      ...current,
      ticketTypes: [
        ...(current.ticketTypes ?? []),
        {
          name: '',
          description: '',
          price: 0,
          capacity: 1,
          sold: 0,
        },
      ],
    }));
  };

  const updateTicketType = (index, key, value) => {
    setForm((current) => ({
      ...current,
      ticketTypes: current.ticketTypes.map((ticket, ticketIndex) =>
        ticketIndex === index
          ? { ...ticket, [key]: value }
          : ticket
      ),
    }));
  };

  const removeTicketType = (index) => {
    const tickets = form.ticketTypes ?? [];
    const ticket = tickets[index];

    if (tickets.length <= 1) {
      showAppAlert('ต้องมีประเภทบัตรอย่างน้อย 1 รายการ');
      return;
    }

    if (Number(ticket?.sold ?? 0) > 0) {
      showAppAlert('ไม่สามารถลบประเภทบัตรที่มีการขายแล้ว');
      return;
    }

    setForm((current) => ({
      ...current,
      ticketTypes: current.ticketTypes.filter(
        (_, ticketIndex) => ticketIndex !== index
      ),
    }));
  };

  return (
    <div className="drawer-overlay-wrap">
      <div className="bg-dimmed" onClick={onClose} />

      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div>
            <div className="eyebrow">
              {isEdit ? 'แก้ไขอีเวนต์' : 'อีเวนต์ใหม่'}
            </div>
            <h2 className="drawer-title">
              {isEdit ? 'แก้ไขรายละเอียด' : 'สร้างอีเวนต์'}
            </h2>
          </div>

          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            title="ปิด"
          >
            ✕
          </button>
        </div>

        <div className="drawer-body">
          <div className="field">
            <label htmlFor="ev-name">ชื่ออีเวนต์</label>
            <input
              id="ev-name"
              type="text"
              placeholder="เช่น เวิร์กช็อปสำหรับน้องหมา"
              value={form.name}
              onChange={set('name')}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && (
              <small className="helper-text err">
                {errors.name}
              </small>
            )}
          </div>

          <div className="field">
            <label htmlFor="ev-desc">รายละเอียด</label>
            <textarea
              id="ev-desc"
              rows={3}
              placeholder="ระบุสิ่งที่ผู้เข้าร่วมจะได้รับ"
              value={form.desc}
              onChange={set('desc')}
            />
          </div>

          <div className="field">
            <label>รูปปกอีเวนต์</label>
            <span className="hint">
              เลือกช่องก่อนอัปโหลด รูปจะเปลี่ยนเฉพาะช่องที่เลือก
            </span>

            <div className="cover-grid">
              {coverSlots.map((slot, index) => {
                const imageUrl = resolveImageUrl(slot.url);

                return (
                  <button
                    key={index}
                    type="button"
                    className={`cover-thumb${
                      selectedIndex === index ? ' selected' : ''
                    }`}
                    onClick={() => selectCoverSlot(index)}
                    aria-label={`เลือกช่องรูปปกที่ ${index + 1}`}
                    aria-pressed={selectedIndex === index}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={`รูปปกช่องที่ ${index + 1}`}
                        className="cover-thumb-image"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span
                        className="cover-thumb-placeholder"
                        aria-hidden="true"
                      >
                        ＋
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                marginTop: 8,
              }}
            >
              <label
                htmlFor="ev-cover-file"
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  cursor: 'pointer',
                }}
              >
                อัปโหลดรูปช่องที่ {selectedIndex + 1}
              </label>

              <button
                type="button"
                className="btn-ghost"
                onClick={clearSelectedCover}
                disabled={!selectedSlot.url}
              >
                ล้างรูปช่องนี้
              </button>
            </div>

            <input
              id="ev-cover-file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            <div className="field" style={{ marginTop: 10 }}>
              <label htmlFor="ev-cover-url">
                URL รูปปกช่องที่ {selectedIndex + 1}
              </label>
              <input
                id="ev-cover-url"
                type="text"
                placeholder="https://example.com/cover.jpg หรือ /uploads/cover.jpg"
                value={selectedSlot.url}
                onChange={set('coverUrl')}
              />
            </div>

            {coverImageError && selectedSlot.url && (
              <small className="helper-text err">
                โหลดรูปไม่สำเร็จ กรุณาตรวจสอบ URL รูปภาพ
              </small>
            )}

            {resolvedCoverUrl && !coverImageError && (
              <img
                key={resolvedCoverUrl}
                src={resolvedCoverUrl}
                alt={`ตัวอย่างรูปปกช่องที่ ${selectedIndex + 1}`}
                style={{
                  display: 'block',
                  width: '100%',
                  maxHeight: 180,
                  objectFit: 'cover',
                  borderRadius: 12,
                  marginTop: 10,
                }}
                onError={() => setCoverImageError(true)}
              />
            )}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="ev-place">สถานที่</label>
              <input
                id="ev-place"
                type="text"
                placeholder="อาคาร / ชั้น / ห้อง"
                value={form.place}
                onChange={set('place')}
              />
            </div>

            <div className="field">
              <label htmlFor="ev-cat">หมวดหมู่</label>
              <select
                id="ev-cat"
                value={form.category}
                onChange={set('category')}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="ev-date">วันและเวลา</label>
              <input
                id="ev-date"
                type="datetime-local"
                value={form.date}
                onChange={set('date')}
                aria-invalid={Boolean(errors.date)}
              />
              {errors.date && (
                <small className="helper-text err">
                  {errors.date}
                </small>
              )}
            </div>

            <div className="field">
              <label htmlFor="ev-max">
                จำนวนผู้เข้าร่วมสูงสุด
              </label>
              <input
                id="ev-max"
                type="number"
                min="1"
                step="1"
                value={form.max}
                onChange={set('max')}
                aria-invalid={Boolean(errors.max)}
              />
              {errors.max && (
                <small className="helper-text err">
                  {errors.max}
                </small>
              )}
            </div>
          </div>

          <section className="ticket-types-section">
            <div className="ticket-types-heading">
              <div>
                <h3>ประเภทบัตร</h3>
                <p className="hint">
                  กำหนดชื่อ ราคา และจำนวนบัตรแต่ละประเภท
                </p>
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={addTicketType}
              >
                + เพิ่มประเภทบัตร
              </button>
            </div>

            {(form.ticketTypes ?? []).map((ticket, index) => (
              <div
                className="ticket-type-card"
                key={ticket.id ?? `new-ticket-${index}`}
              >
                <div className="ticket-type-heading">
                  <strong>ประเภทบัตรที่ {index + 1}</strong>
                  <button
                    type="button"
                    className="btn-ghost ticket-remove"
                    onClick={() => removeTicketType(index)}
                    disabled={Number(ticket.sold ?? 0) > 0}
                    title={
                      Number(ticket.sold ?? 0) > 0
                        ? 'มีการขายบัตรแล้ว ไม่สามารถลบได้'
                        : 'ลบประเภทบัตร'
                    }
                  >
                    ลบ
                  </button>
                </div>

                <div className="field">
                  <label htmlFor={`ticket-name-${index}`}>
                    ชื่อประเภทบัตร
                  </label>
                  <input
                    id={`ticket-name-${index}`}
                    type="text"
                    maxLength={80}
                    value={ticket.name ?? ''}
                    onChange={(e) =>
                      updateTicketType(index, 'name', e.target.value)
                    }
                    placeholder="เช่น General Admission, VIP"
                  />
                </div>

                <div className="field">
                  <label htmlFor={`ticket-description-${index}`}>
                    รายละเอียดบัตร
                  </label>
                  <textarea
                    id={`ticket-description-${index}`}
                    rows={2}
                    maxLength={500}
                    value={ticket.description ?? ''}
                    onChange={(e) =>
                      updateTicketType(
                        index,
                        'description',
                        e.target.value
                      )
                    }
                    placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
                  />
                </div>

                <div className="field-row">
                  <div className="field">
                    <label htmlFor={`ticket-price-${index}`}>
                      ราคา (บาท)
                    </label>
                    <input
                      id={`ticket-price-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={ticket.price ?? 0}
                      onChange={(e) =>
                        updateTicketType(index, 'price', e.target.value)
                      }
                    />
                  </div>

                  <div className="field">
                    <label htmlFor={`ticket-capacity-${index}`}>
                      จำนวนบัตร
                    </label>
                    <input
                      id={`ticket-capacity-${index}`}
                      type="number"
                      min={Math.max(1, Number(ticket.sold ?? 0))}
                      step="1"
                      value={ticket.capacity ?? 1}
                      onChange={(e) =>
                        updateTicketType(
                          index,
                          'capacity',
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                <p className="hint">
                  ขายแล้ว: {Number(ticket.sold ?? 0)} ใบ
                </p>
              </div>
            ))}
          </section>
        </div>

        <div className="drawer-footer">
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
          >
            ยกเลิก
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
          >
            {isEdit ? 'บันทึกข้อมูล' : 'สร้างอีเวนต์'}
          </button>
        </div>
      </aside>
    </div>
  );
}
