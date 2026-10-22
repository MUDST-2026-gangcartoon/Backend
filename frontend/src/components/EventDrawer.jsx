import React, { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

const CATEGORY_OPTIONS = [
  { value: 'TECH', label: 'เทคโนโลยี' },
  { value: 'DESIGN', label: 'ออกแบบ' },
  { value: 'CAREER', label: 'อาชีพ' },
  { value: 'COMMUNITY', label: 'ชุมชน' },
];

const emptyForm = {
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
  endsAt: '',
  registrationClosesAt: '',
  checkinEnabled: true,
  organizerName: '',
  contactInfo: '',
  locationType: 'ONSITE',
  onlineUrl: '',
  ticketTypes: [{ name: 'General Admission', description: '', price: 0, capacity: 30, sold: 0, saleOpen: true }],
};

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export default function EventDrawer({ open, mode, initialEvent, onClose, onSubmit, serverErrors = null }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const isEdit = mode === 'edit';

  useEffect(() => {
    if (!open) return;
    if (isEdit && initialEvent) {
      setErrors({});
      setForm({
        id: initialEvent.id,
        name: initialEvent.name || '',
        desc: initialEvent.desc || '',
        place: initialEvent.place || '',
        category: initialEvent.category || 'TECH',
        date: initialEvent.date || '',
        max: initialEvent.max || 30,
        coverIndex: initialEvent.coverIndex ?? 0,
        coverUrl: initialEvent.coverUrl || '',
        coverFile: null,
        endsAt: initialEvent.endsAt || '',
        registrationClosesAt: initialEvent.registrationClosesAt || '',
        checkinEnabled: initialEvent.checkinEnabled !== false,
        organizerName: initialEvent.organizerName || '',
        contactInfo: initialEvent.contactInfo || '',
        locationType: initialEvent.locationType === 'ONLINE' ? 'ONLINE' : 'ONSITE',
        onlineUrl: initialEvent.onlineUrl || '',
        ticketTypes: Array.isArray(initialEvent.ticketTypes) && initialEvent.ticketTypes.length
          ? initialEvent.ticketTypes.map((ticket) => ({
              ...ticket,
              name: ticket.name ?? '',
              description: ticket.description ?? '',
              price: Number(ticket.price ?? 0),
              capacity: Number(ticket.capacity ?? 0),
              sold: Number(ticket.sold ?? 0),
              saleOpen: ticket.saleOpen !== false,
            }))
          : [{
              name: 'General Admission',
              description: '',
              price: 0,
              capacity: Number(initialEvent.max || 30),
              sold: 0,
              saleOpen: true,
            }],
      });
    } else {
      setErrors({});
      setForm(emptyForm);
    }
  }, [open, isEdit, initialEvent]);

  // แสดง error จากหลังบ้านใต้ช่องเดิม (รูปแบบ { field: 'ข้อความ' })
  useEffect(() => {
    if (serverErrors && typeof serverErrors === 'object') {
      setErrors((prev) => ({ ...prev, ...serverErrors }));
    }
  }, [serverErrors]);

  if (!open) return null;

  // มีประวัติ = มีผู้ลงทะเบียนหรือขายบัตรแล้ว ยังแก้รายละเอียด/ลิงก์ได้ แต่สลับรูปแบบไม่ได้
  const hasHistory =
    isEdit &&
    (Number(initialEvent?.seats ?? 0) > 0 ||
      (initialEvent?.ticketTypes ?? []).some((t) => Number(t.sold ?? 0) > 0));

  const set = (key) => (e) => {
    const value = e.target.value;

    setForm((f) => ({
      ...f,
      [key]: value,
      ...(key === 'coverUrl' ? { coverFile: null } : {}),
    }));

    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleSubmit = () => {
    const nextErrors = {};
    const isOnline = form.locationType === 'ONLINE';

    if (!form.name.trim()) nextErrors.name = 'กรุณากรอกชื่ออีเวนต์';
    if (!isOnline && !form.place.trim()) nextErrors.place = 'กรุณากรอกสถานที่';
    if (!form.date) nextErrors.date = 'กรุณาเลือกวันและเวลา';

    if (isOnline) {
      if (!form.onlineUrl.trim()) nextErrors.onlineUrl = 'กรุณากรอกลิงก์ห้องออนไลน์';
      else if (!isHttpUrl(form.onlineUrl.trim())) {
        nextErrors.onlineUrl = 'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://';
      }
    }

    // ตรวจลำดับเวลา: เริ่ม < สิ้นสุด และปิดรับสมัครต้องไม่เกินเวลาสิ้นสุด
    const start = form.date ? new Date(form.date).getTime() : NaN;
    const end = form.endsAt ? new Date(form.endsAt).getTime() : NaN;
    const close = form.registrationClosesAt
      ? new Date(form.registrationClosesAt).getTime()
      : NaN;

    if (form.endsAt && Number.isFinite(start) && end <= start) {
      nextErrors.endsAt = 'เวลาสิ้นสุดต้องหลังเวลาเริ่ม';
    }
    if (form.registrationClosesAt) {
      const limit = Number.isFinite(end) ? end : start;
      if (Number.isFinite(limit) && close > limit) {
        nextErrors.registrationClosesAt = Number.isFinite(end)
          ? 'เวลาปิดรับสมัครต้องไม่เกินเวลาสิ้นสุด'
          : 'เวลาปิดรับสมัครต้องไม่เกินเวลาเริ่มงาน';
      }
    }

    const max = Number(form.max);
    if (!Number.isInteger(max) || max <= 0) {
      nextErrors.max = 'ต้องเป็นจำนวนเต็มบวก';
    } else if (isEdit && max < Number(initialEvent?.seats ?? 0)) {
      nextErrors.max = `ต้องไม่น้อยกว่าจำนวนผู้ลงทะเบียนปัจจุบัน (${initialEvent.seats})`;
    }

    const ticketErrors = {};
    (form.ticketTypes ?? []).forEach((ticket, index) => {
      const e = {};
      if (!String(ticket.name ?? '').trim()) e.name = 'กรุณากรอกชื่อประเภทบัตร';
      const price = Number(ticket.price);
      if (!Number.isFinite(price) || price < 0) e.price = 'ราคาต้องตั้งแต่ 0 ขึ้นไป';
      const cap = Number(ticket.capacity);
      if (!Number.isInteger(cap) || cap < 1) e.capacity = 'ต้องเป็นจำนวนเต็มอย่างน้อย 1';
      else if (cap < Number(ticket.sold ?? 0)) {
        e.capacity = `ขายแล้ว ${ticket.sold} ใบ ลดต่ำกว่านี้ไม่ได้`;
      }
      if (Object.keys(e).length) ticketErrors[index] = e;
    });
    if (Object.keys(ticketErrors).length) nextErrors.tickets = ticketErrors;

    if (!nextErrors.max && !nextErrors.tickets) {
      const total = (form.ticketTypes ?? []).reduce((sum, t) => sum + Number(t.capacity), 0);
      if (total !== max) {
        nextErrors.max = `ผลรวมจำนวนบัตรทุกประเภท (${total}) ต้องเท่ากับจำนวนผู้เข้าร่วมสูงสุด (${max})`;
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit(form, isEdit);
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
          saleOpen: true,
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

  // เหตุผลที่ลบประเภทบัตรไม่ได้ (null = ลบได้)
  const ticketDeleteBlock = (ticket) => {
    if ((form.ticketTypes ?? []).length <= 1) {
      return 'ต้องมีประเภทบัตรอย่างน้อย 1 รายการ';
    }
    if (Number(ticket?.sold ?? 0) > 0) {
      return `ลบไม่ได้: ขายบัตรประเภทนี้ไปแล้ว ${ticket.sold} ใบ ให้ปิดขายแทน`;
    }
    return null;
  };

  const removeTicketType = (index) => {
    const ticket = (form.ticketTypes ?? [])[index];
    if (ticketDeleteBlock(ticket)) return;

    setForm((current) => ({
      ...current,
      ticketTypes: current.ticketTypes.filter(
        (_, ticketIndex) => ticketIndex !== index
      ),
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);

    setForm((f) => ({
      ...f,
      coverUrl: previewUrl,
      coverFile: file,
    }));

    setErrors((prev) => ({ ...prev, coverUrl: '' }));
  };

  return (
    <div className="drawer-overlay-wrap">
      <div className="bg-dimmed" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div>
            <div className="eyebrow">{isEdit ? 'แก้ไขอีเวนต์' : 'อีเวนต์ใหม่'}</div>
            <h2 className="drawer-title">{isEdit ? 'แก้ไขรายละเอียด' : 'สร้างอีเวนต์'}</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose} title="ปิด">
            <Icon name="close" size="1.2em" strokeWidth={2} />
          </button>
        </div>

        <div className="drawer-body">
          <div className="field">
            <label htmlFor="ev-name">ชื่ออีเวนต์</label>
            <input
              type="text"
              id="ev-name"
              placeholder="เช่น เวิร์กช็อปสำหรับน้องหมา"
              value={form.name}
              onChange={set('name')}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <small className="helper-text err">{errors.name}</small>}
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
            <span className="hint">อัปโหลดรูป หรือวาง URL ของรูปภาพ</span>
            {form.coverUrl && (
              <div className="cover-grid single">
                <div
                  className="cover-thumb selected has-image"
                  style={{ backgroundImage: `url("${form.coverUrl}")` }}
                  aria-label="รูปปกที่เลือก"
                />
              </div>
            )}
            <input
              id="ev-cover-file"
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.bmp"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="ev-cover-file" className="btn-secondary" style={{ marginTop: 8, display: 'inline-flex', cursor: 'pointer' }}>
              อัปโหลดรูปปก
            </label>

            <div className="field" style={{ marginTop: 10 }}>
              <label htmlFor="ev-cover-url">URL รูปปก</label>
              <input
                id="ev-cover-url"
                type="url"
                placeholder="https://example.com/cover.jpg"
                value={form.coverUrl}
                onChange={set('coverUrl')}
              />
            </div>

          </div>

          <div className="field">
            <label>รูปแบบการจัดงาน</label>
            <div className="segmented" role="group" aria-label="รูปแบบการจัดงาน">
              {[
                { value: 'ONSITE', label: 'ออนไซต์' },
                { value: 'ONLINE', label: 'ออนไลน์' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={form.locationType === option.value ? 'is-active' : ''}
                  aria-pressed={form.locationType === option.value}
                  disabled={hasHistory && form.locationType !== option.value}
                  onClick={() => {
                    if (hasHistory) return;
                    setForm((f) => ({ ...f, locationType: option.value }));
                    setErrors((prev) => ({ ...prev, place: '', onlineUrl: '' }));
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {hasHistory && (
              <p className="lock-note">
                สลับรูปแบบไม่ได้ เพราะอีเวนต์นี้มีผู้ลงทะเบียนหรือขายบัตรแล้ว
                แต่ยังแก้รายละเอียดและลิงก์ห้องได้
              </p>
            )}
          </div>

          {form.locationType === 'ONLINE' && (
            <div className="field">
              <label htmlFor="ev-online-url">ลิงก์ห้องออนไลน์</label>
              <input
                type="url"
                id="ev-online-url"
                placeholder="https://meet.example.com/room"
                value={form.onlineUrl}
                onChange={set('onlineUrl')}
                aria-invalid={Boolean(errors.onlineUrl)}
              />
              {errors.onlineUrl && <small className="helper-text err">{errors.onlineUrl}</small>}
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label htmlFor="ev-place">
                {form.locationType === 'ONLINE' ? 'สถานที่ (ถ้ามี)' : 'สถานที่'}
              </label>
              <input
                type="text"
                id="ev-place"
                placeholder="อาคาร / ชั้น / ห้อง"
                value={form.place}
                onChange={set('place')}
                aria-invalid={Boolean(errors.place)}
              />
              {errors.place && <small className="helper-text err">{errors.place}</small>}
            </div>
            <div className="field">
              <label htmlFor="ev-cat">หมวดหมู่</label>
              <select id="ev-cat" value={form.category} onChange={set('category')}>
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
              <input type="datetime-local" id="ev-date" value={form.date} onChange={set('date')} aria-invalid={Boolean(errors.date)} />
              {errors.date && <small className="helper-text err">{errors.date}</small>}
            </div>
            <div className="field">
              <label htmlFor="ev-max">จำนวนผู้เข้าร่วมสูงสุด</label>
              <input type="number" id="ev-max" min="1" step="1" value={form.max} onChange={set('max')} aria-invalid={Boolean(errors.max)} />
              {errors.max && <small className="helper-text err">{errors.max}</small>}
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="ev-ends">วันและเวลาสิ้นสุด</label>
              <input type="datetime-local" id="ev-ends" value={form.endsAt} min={form.date || undefined} onChange={set('endsAt')} aria-invalid={Boolean(errors.endsAt)} />
              {errors.endsAt && <small className="helper-text err">{errors.endsAt}</small>}
            </div>
            <div className="field">
              <label htmlFor="ev-close">ปิดรับสมัครเมื่อ</label>
              <input type="datetime-local" id="ev-close" value={form.registrationClosesAt} onChange={set('registrationClosesAt')} aria-invalid={Boolean(errors.registrationClosesAt)} />
              {errors.registrationClosesAt && <small className="helper-text err">{errors.registrationClosesAt}</small>}
            </div>
          </div>

          <label className="toggle-row" htmlFor="ev-checkin">
            <span className="toggle-text">
              <strong>เปิดเช็กอิน</strong>
              <span className="hint">ปิดไว้ สตาฟจะเช็กอินผู้เข้าร่วมของอีเวนต์นี้ไม่ได้</span>
            </span>
            <input
              id="ev-checkin"
              type="checkbox"
              checked={form.checkinEnabled}
              onChange={(e) => setForm((f) => ({ ...f, checkinEnabled: e.target.checked }))}
            />
          </label>

          <div className="field-row">
            <div className="field">
              <label htmlFor="ev-organizer">ผู้จัดงาน</label>
              <input type="text" id="ev-organizer" maxLength={120} placeholder="ชื่อผู้จัด/องค์กร" value={form.organizerName} onChange={set('organizerName')} />
            </div>
            <div className="field">
              <label htmlFor="ev-contact">ช่องทางติดต่อ</label>
              <input type="text" id="ev-contact" maxLength={200} placeholder="อีเมลหรือเบอร์โทร" value={form.contactInfo} onChange={set('contactInfo')} />
            </div>
          </div>

          <section className="ticket-types-section">
            <div className="ticket-types-heading">
              <div>
                <h3>ประเภทบัตร</h3>
                <p className="hint">กำหนดชื่อ ราคา และจำนวนบัตรแต่ละประเภท</p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={addTicketType}
              >
                + เพิ่มประเภทบัตร
              </button>
            </div>

            {(form.ticketTypes ?? []).map((ticket, index) => {
              const block = ticketDeleteBlock(ticket);
              const te = errors.tickets?.[index] || {};

              return (
                <div
                  className={`ticket-type-card${ticket.saleOpen === false ? ' ticket-sale-off' : ''}`}
                  key={ticket.id ?? `new-ticket-${index}`}
                >
                  <div className="ticket-type-heading">
                    <strong>ประเภทบัตรที่ {index + 1}</strong>
                    <button
                      type="button"
                      className="btn-ghost ticket-remove"
                      onClick={() => removeTicketType(index)}
                      disabled={Boolean(block)}
                      title={block || 'ลบประเภทบัตร'}
                    >
                      ลบ
                    </button>
                  </div>
                  {block && <p className="ticket-lock">{block}</p>}

                  <div className="field">
                    <label htmlFor={`ticket-name-${index}`}>ชื่อประเภทบัตร</label>
                    <input
                      id={`ticket-name-${index}`}
                      type="text"
                      maxLength={80}
                      value={ticket.name ?? ''}
                      onChange={(e) => updateTicketType(index, 'name', e.target.value)}
                      placeholder="เช่น General Admission, VIP"
                      aria-invalid={Boolean(te.name)}
                    />
                    {te.name && <small className="helper-text err">{te.name}</small>}
                  </div>

                  <div className="field">
                    <label htmlFor={`ticket-description-${index}`}>รายละเอียดบัตร</label>
                    <textarea
                      id={`ticket-description-${index}`}
                      rows={2}
                      maxLength={500}
                      value={ticket.description ?? ''}
                      onChange={(e) => updateTicketType(index, 'description', e.target.value)}
                      placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
                    />
                  </div>

                  <div className="field-row">
                    <div className="field">
                      <label htmlFor={`ticket-price-${index}`}>ราคา (บาท)</label>
                      <input
                        id={`ticket-price-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={ticket.price ?? 0}
                        onChange={(e) => updateTicketType(index, 'price', e.target.value)}
                        aria-invalid={Boolean(te.price)}
                      />
                      {te.price && <small className="helper-text err">{te.price}</small>}
                    </div>
                    <div className="field">
                      <label htmlFor={`ticket-capacity-${index}`}>จำนวนบัตร</label>
                      <input
                        id={`ticket-capacity-${index}`}
                        type="number"
                        min={Math.max(1, Number(ticket.sold ?? 0))}
                        step="1"
                        value={ticket.capacity ?? 1}
                        onChange={(e) => updateTicketType(index, 'capacity', e.target.value)}
                        aria-invalid={Boolean(te.capacity)}
                      />
                      {te.capacity && <small className="helper-text err">{te.capacity}</small>}
                    </div>
                  </div>

                  <label className="toggle-row" htmlFor={`ticket-sale-${index}`}>
                    <span className="toggle-text">
                      <strong>เปิดขายบัตรประเภทนี้</strong>
                      <span className="hint">ปิดขายแล้วผู้ใช้จะซื้อประเภทนี้ไม่ได้ แต่บัตรที่ขายไปแล้วยังใช้ได้</span>
                    </span>
                    <input
                      id={`ticket-sale-${index}`}
                      type="checkbox"
                      checked={ticket.saleOpen !== false}
                      onChange={(e) => updateTicketType(index, 'saleOpen', e.target.checked)}
                    />
                  </label>

                  <p className="hint">ขายแล้ว: {Number(ticket.sold ?? 0)} ใบ</p>
                </div>
              );
            })}
          </section>
        </div>

        <div className="drawer-footer">
          <button type="button" className="btn-ghost" onClick={onClose}>
            ยกเลิก
          </button>
          <button type="button" className="btn-primary" onClick={handleSubmit}>
            {isEdit ? 'บันทึกข้อมูล' : 'สร้างอีเวนต์'}
          </button>
        </div>
      </aside>
    </div>
  );
}
