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
};

export default function EventDrawer({ open, mode, initialEvent, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const isEdit = mode === 'edit';

  useEffect(() => {
    if (!open) return;
    if (isEdit && initialEvent) {
      setForm({
        id: initialEvent.id,
        name: initialEvent.name || '',
        desc: initialEvent.desc || '',
        place: initialEvent.place || '',
        category: initialEvent.category || CATEGORY_OPTIONS[0],
        date: initialEvent.date || '',
        max: initialEvent.max || 30,
        coverIndex: initialEvent.coverIndex ?? 0,
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, isEdit, initialEvent]);

  if (!open) return null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = () => {
    onSubmit(form, isEdit);
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
            />
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
            <span className="hint">เลือกภาพในระบบหรือวาง URL ของรูปภาพ</span>
            <div className="cover-grid">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`cover-thumb${form.coverIndex === i ? ' selected' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, coverIndex: i }))}
                />
              ))}
            </div>
            <button type="button" className="btn-secondary" style={{ marginTop: 8 }}>
              อัปโหลดรูปปก
            </button>
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
              <input type="datetime-local" id="ev-date" value={form.date} onChange={set('date')} />
            </div>
            <div className="field">
              <label htmlFor="ev-max">จำนวนผู้เข้าร่วมสูงสุด</label>
              <input type="number" id="ev-max" value={form.max} onChange={set('max')} />
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
