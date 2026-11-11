import React, { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { CATEGORY_META } from '../utils/eventFilters.js';

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
  checkinOpensAt: '',
  checkinClosesAt: '',
  organizerName: '',
  contactInfo: '',
  locationType: 'ONSITE',
  onlineUrl: '',
  ticketTypes: [{ name: 'General Admission', description: '', price: 0, capacity: 30, sold: 0, saleOpen: true }],
};

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    // ลิงก์ห้องออนไลน์ต้องเป็น https และมี host
    return url.protocol === 'https:' && Boolean(url.hostname);
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
        category: Object.hasOwn(CATEGORY_META, initialEvent.category) ? initialEvent.category : '',
        date: initialEvent.date || '',
        max: initialEvent.max || 30,
        coverIndex: initialEvent.coverIndex ?? 0,
        coverUrl: initialEvent.coverUrl || '',
        coverFile: null,
        endsAt: initialEvent.endsAt || '',
        registrationClosesAt: initialEvent.registrationClosesAt || '',
        checkinOpensAt: initialEvent.checkinOpensAt || '',
        checkinClosesAt: initialEvent.checkinClosesAt || '',
        organizerName: initialEvent.organizerName || '',
        contactInfo: initialEvent.contactInfo || '',
        locationType:
          (initialEvent.eventFormat || initialEvent.locationType) === 'ONLINE' ? 'ONLINE' : 'ONSITE',
        onlineUrl: initialEvent.onlineUrl || '',
        ticketTypes: Array.isArray(initialEvent.ticketTypes) && initialEvent.ticketTypes.length
          ? initialEvent.ticketTypes.map((ticket) => ({
              ...ticket,
              name: ticket.name ?? '',
              description: ticket.description ?? '',
              price: Number(ticket.price ?? 0),
              capacity: Number(ticket.capacity ?? 0),
              sold: Number(ticket.sold ?? 0),
              saleOpen: ticket.salesEnabled !== false && ticket.saleOpen !== false,
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
    (initialEvent?.deletable === false ||
      Number(initialEvent?.seats ?? 0) > 0 ||
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
    if (!form.date) nextErrors.date = 'กรุณาเลือกเวลาเริ่มงาน';
    if (!Object.hasOwn(CATEGORY_META, form.category)) nextErrors.category = 'กรุณาเลือกหมวดหมู่ที่รองรับ';

    if (isOnline) {
      if (!form.onlineUrl.trim()) nextErrors.onlineUrl = 'กรุณากรอกลิงก์ห้องออนไลน์';
      else if (!isHttpUrl(form.onlineUrl.trim())) {
        nextErrors.onlineUrl = 'กรุณาใส่ลิงก์ให้ครบ เช่น https://meet.example.com/room';
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
    // ปิดรับสมัครต้องไม่เกินเวลาเริ่มกิจกรรม (ตามกติกาหลังบ้าน)
    if (form.registrationClosesAt && Number.isFinite(start) && close > start) {
      nextErrors.registrationClosesAt = 'เวลาปิดรับสมัครต้องไม่เกินเวลาเริ่มงาน';
    }

    // ช่วงเช็กอิน: ปิดต้องหลังเปิด และไม่เกินเวลาสิ้นสุด
    const ciOpen = form.checkinOpensAt ? new Date(form.checkinOpensAt).getTime() : NaN;
    const ciClose = form.checkinClosesAt ? new Date(form.checkinClosesAt).getTime() : NaN;
    if (Number.isFinite(ciOpen) && Number.isFinite(ciClose) && ciClose <= ciOpen) {
      nextErrors.checkinClosesAt = 'เวลาปิดเช็กอินต้องหลังเวลาเปิดเช็กอิน';
    }
    if (Number.isFinite(ciClose) && Number.isFinite(end) && ciClose > end) {
      nextErrors.checkinClosesAt = 'เวลาปิดเช็กอินต้องไม่เกินเวลาสิ้นสุดกิจกรรม';
    }

    const max = Number(form.max);
    if (!Number.isInteger(max) || max <= 0) {
      nextErrors.max = 'กรุณากรอกตัวเลขตั้งแต่ 1 ขึ้นไป';
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
    // ใช้ flag จาก API (removable / removalBlockedReason) เป็นหลัก
    if (ticket?.removable === false) {
      return ticket.removalBlockedReason ||
        'ลบไม่ได้: ประเภทบัตรนี้มีประวัติการจอง ให้ปิดขายแทน';
    }
    if (ticket?.removable === undefined && Number(ticket?.sold ?? 0) > 0) {
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
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="event-drawer-title">
        <div className="drawer-head">
          <div>
            <h2 id="event-drawer-title" className="drawer-title">{isEdit ? 'แก้ไขอีเวนต์' : 'สร้างอีเวนต์'}</h2>
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
              placeholder="เช่น งานนี้เกี่ยวกับอะไร เหมาะกับใคร และต้องเตรียมอะไรบ้าง"
              value={form.desc}
              onChange={set('desc')}
            />
          </div>

          <div className="field">
            <label>รูปปกอีเวนต์</label>
            <span className="hint">เลือกรูปจากเครื่อง หรือวางลิงก์รูปภาพ</span>
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
              <label htmlFor="ev-cover-url">ลิงก์รูปปก</label>
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
                { value: 'ONSITE', label: 'จัดที่สถานที่จริง' },
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
                placeholder="เช่น อาคาร A ชั้น 2 ห้องประชุมใหญ่"
                value={form.place}
                onChange={set('place')}
                aria-invalid={Boolean(errors.place)}
              />
              {errors.place && <small className="helper-text err">{errors.place}</small>}
            </div>
            <div className="field">
              <label htmlFor="ev-cat">หมวดหมู่</label>
              <select id="ev-cat" value={form.category} onChange={set('category')} aria-invalid={Boolean(errors.category)}>
                <option value="" disabled>เลือกหมวดหมู่</option>
                {Object.entries(CATEGORY_META).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {errors.category && <small className="helper-text err">{errors.category}</small>}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="ev-date">วันและเวลาเริ่มงาน</label>
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
              <label htmlFor="ev-ends">วันและเวลาจบงาน</label>
              <input type="datetime-local" id="ev-ends" value={form.endsAt} min={form.date || undefined} onChange={set('endsAt')} aria-invalid={Boolean(errors.endsAt)} />
              {errors.endsAt && <small className="helper-text err">{errors.endsAt}</small>}
            </div>
            <div className="field">
              <label htmlFor="ev-close">วันและเวลาปิดรับสมัคร</label>
              <input type="datetime-local" id="ev-close" value={form.registrationClosesAt} onChange={set('registrationClosesAt')} aria-invalid={Boolean(errors.registrationClosesAt)} />
              {errors.registrationClosesAt && <small className="helper-text err">{errors.registrationClosesAt}</small>}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="ev-checkin-opens">เวลาเริ่มเช็กอิน</label>
              <input
                type="datetime-local"
                id="ev-checkin-opens"
                value={form.checkinOpensAt}
                onChange={set('checkinOpensAt')}
                aria-invalid={Boolean(errors.checkinOpensAt)}
              />
              {errors.checkinOpensAt && <small className="helper-text err">{errors.checkinOpensAt}</small>}
            </div>
            <div className="field">
              <label htmlFor="ev-checkin-closes">เวลาหยุดเช็กอิน</label>
              <input
                type="datetime-local"
                id="ev-checkin-closes"
                value={form.checkinClosesAt}
                onChange={set('checkinClosesAt')}
                aria-invalid={Boolean(errors.checkinClosesAt)}
              />
              {errors.checkinClosesAt && <small className="helper-text err">{errors.checkinClosesAt}</small>}
            </div>
          </div>
          <p className="hint">ถ้าเว้นว่าง จะเริ่มเช็กอินได้ก่อนงาน 1 ชั่วโมง และปิดเมื่อจบงาน อีเวนต์ออนไลน์เช็กอินได้ระหว่างงาน</p>

          <div className="field-row">
            <div className="field">
              <label htmlFor="ev-organizer">ผู้จัดงาน</label>
              <input type="text" id="ev-organizer" maxLength={100} placeholder="ชื่อผู้จัด/องค์กร" value={form.organizerName} onChange={set('organizerName')} aria-invalid={Boolean(errors.organizerName)} />
              {errors.organizerName && <small className="helper-text err">{errors.organizerName}</small>}
            </div>
            <div className="field">
              <label htmlFor="ev-contact">ช่องทางติดต่อ</label>
              <input type="text" id="ev-contact" maxLength={254} placeholder="อีเมลหรือเบอร์โทร" value={form.contactInfo} onChange={set('contactInfo')} aria-invalid={Boolean(errors.contactInfo)} />
              {errors.contactInfo && <small className="helper-text err">{errors.contactInfo}</small>}
            </div>
          </div>

          <section className="ticket-types-section">
            <div className="ticket-types-heading">
              <div>
                <h3>ประเภทบัตร</h3>
                <p className="hint">ตั้งชื่อบัตรและจำนวนที่เปิดให้จอง ถ้าเป็นบัตรฟรีให้ใส่ราคา 0 บาท</p>
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
                      placeholder="เช่น บัตรทั่วไป หรือบัตร VIP"
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
                      <span className="hint">ปิดเพื่อหยุดรับจองบัตรประเภทนี้ บัตรที่จองแล้วใช้เข้างานได้ตามปกติ</span>
                    </span>
                    <input
                      id={`ticket-sale-${index}`}
                      type="checkbox"
                      checked={ticket.saleOpen !== false}
                      onChange={(e) => updateTicketType(index, 'saleOpen', e.target.checked)}
                    />
                  </label>

                  <p className="hint">จองแล้ว {Number(ticket.sold ?? 0)} ใบ</p>
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
