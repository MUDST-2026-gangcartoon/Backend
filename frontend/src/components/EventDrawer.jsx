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
      });
    } else {
      setErrors({});
      setForm(emptyForm);
    }
  }, [open, isEdit, initialEvent]);

  if (!open) return null;

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setForm((f) => ({ ...f, coverUrl: previewUrl }));
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
              accept="image/*"
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
