import React, { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ConfirmDialog from './ConfirmDialog.jsx';
import Icon from './Icon.jsx';

// เมนูโปรไฟล์บน navbar: ข้อมูลผู้ใช้ ลิงก์ที่ใช้บ่อย และปุ่มออกจากระบบ (มีกล่องยืนยัน)
// items: [{ to, label, icon }]
export default function ProfileMenu({ user, items = [], onLogout }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef(null);
  const menuId = useId();

  // ปิดเมนูเมื่อคลิกนอกเมนู หรือกด Esc
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await onLogout?.();
    } finally {
      setLoggingOut(false);
      setConfirming(false);
      setOpen(false);
      navigate('/', { replace: true });
    }
  };

  const name = user?.username || 'ผู้ใช้งาน';
  const roleLabel = user?.roleLabel || user?.role || '';

  return (
    <div className="user-profile-container" ref={containerRef}>
      <button
        type="button"
        className="user-profile profile-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className="avatar">{user?.avatarLetter || 'U'}</span>

        <span className="user-info">
          <span className="username">{name}</span>
          <span className="role">{roleLabel}</span>
        </span>

        <span
          className="dropdown-icon"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: '0.2s',
          }}
        >
          <Icon name="chevronDown" size="0.9em" strokeWidth={2.2} />
        </span>
      </button>

      {open && (
        <div className="profile-dropdown-menu" id={menuId} role="menu">
          <div className="profile-menu-head">
            <span className="profile-menu-avatar">
              {user?.avatarLetter || 'U'}
            </span>
            <div className="profile-menu-who">
              <strong>{name}</strong>
              {user?.email && <span>{user.email}</span>}
              {roleLabel && <em>{roleLabel}</em>}
            </div>
          </div>

          {items.length > 0 && (
            <div className="profile-menu-group">
              {items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  role="menuitem"
                  className="dropdown-item"
                  onClick={() => setOpen(false)}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          )}

          <div className="profile-menu-group">
            <button
              type="button"
              role="menuitem"
              className="dropdown-item logout-btn"
              onClick={() => {
                setOpen(false);
                setConfirming(true);
              }}
            >
              <Icon name="logout" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title="ออกจากระบบ"
        message={`ต้องการออกจากระบบของ “${name}” หรือไม่`}
        confirmLabel="ออกจากระบบ"
        loading={loggingOut}
        onConfirm={handleConfirmLogout}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
