import React, { useEffect, useState } from 'react';

const CATEGORY_OPTIONS = ['สัตว์เลี้ยง', 'ไลฟ์สไตล์', 'เวิร์กช็อป', 'Design', 'Engineering'];

const emptyForm = {
  id: null,
  name: '',
  desc: '',
  place: '',
  category: CATEGORY_OPTIONS[0],
  date: '',
  max: 30,
  coverIndex: 0,
  coverUrl: '',
  coverFile: null,
  ticketTypes: [{ name: 'General Admission', description: '', price: 0, capacity: 30, sold: 0 }],
};

export default function EventDrawer({ open, mode, initialEvent, onClose, onSubmit }) {
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
        category: initialEvent.category || CATEGORY_OPTIONS[0],
        date: initialEvent.date || '',
        max: initialEvent.max || 30,
        coverIndex: initialEvent.coverIndex ?? 0,
        coverUrl: initialEvent.coverUrl || '',
        coverFile: null,
        ticketTypes: Array.isArray(initialEvent.ticketTypes) && initialEvent.ticketTypes.length
          ? initialEvent.ticketTypes.map((ticket) => ({
              ...ticket,
              name: ticket.name ?? '',
              description: ticket.description ?? '',
              price: Number(ticket.price ?? 0),
              capacity: Number(ticket.capacity ?? 0),
              sold: Number(ticket.sold ?? 0),
            }))
          : [{
              name: 'General Admission',
              description: '',
              price: 0,
              capacity: Number(initialEvent.max || 30),
              sold: 0,
            }],
      });
    } else {
      setErrors({});
      setForm(emptyForm);
    }
  }, [open, isEdit, initialEvent]);

  if (!open) return null;

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

    if (!form.name.trim()) nextErrors.name = 'กรุณากรอกชื่ออีเวนต์';
    if (!form.place.trim()) nextErrors.place = 'กรุณากรอกสถานที่';
    if (!form.date) nextErrors.date = 'กรุณาเลือกวันและเวลา';

    const max = Number(form.max);
    if (!Number.isInteger(max) || max <= 0) {
      nextErrors.max = 'ต้องเป็นจำนวนเต็มบวก';
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
      window.alert('ต้องมีประเภทบัตรอย่างน้อย 1 รายการ');
      return;
    }

    if (Number(ticket?.sold ?? 0) > 0) {
      window.alert('ไม่สามารถลบประเภทบัตรที่มีการขายแล้ว');
      return;
    }

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
            ✕
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
            <span className="hint">เลือกภาพในระบบ หรือวาง URL ของรูปภาพ</span>
            <div className="cover-grid">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`cover-thumb${form.coverIndex === i ? ' selected' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, coverIndex: i }))}
                />
              ))}
            </div>
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

            {form.coverUrl && (
              <img
                src={form.coverUrl}
                alt="ตัวอย่างรูปปก"
                style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 12, marginTop: 10 }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="ev-place">สถานที่</label>
              <input
                type="text"
                id="ev-place"
                placeholder="อาคาร / ชั้น / ห้อง"
                value={form.place}
                onChange={set('place')}
              />
            </div>
            <div className="field">
              <label htmlFor="ev-cat">หมวดหมู่</label>
              <select id="ev-cat" value={form.category} onChange={set('category')}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
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

            {(form.ticketTypes ?? []).map((ticket, index) => (
              <div className="ticket-type-card" key={ticket.id ?? `new-ticket-${index}`}>
                <div className="ticket-type-heading">
                  <strong>ประเภทบัตรที่ {index + 1}</strong>
                  <button
                    type="button"
                    className="btn-ghost ticket-remove"
                    onClick={() => removeTicketType(index)}
                    disabled={Number(ticket.sold ?? 0) > 0}
                    title={Number(ticket.sold ?? 0) > 0 ? 'มีการขายบัตรแล้ว ไม่สามารถลบได้' : 'ลบประเภทบัตร'}
                  >
                    ลบ
                  </button>
                </div>

                <div className="field">
                  <label htmlFor={`ticket-name-${index}`}>ชื่อประเภทบัตร</label>
                  <input
                    id={`ticket-name-${index}`}
                    type="text"
                    maxLength={80}
                    value={ticket.name ?? ''}
                    onChange={(e) => updateTicketType(index, 'name', e.target.value)}
                    placeholder="เช่น General Admission, VIP"
                  />
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
                    />
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
