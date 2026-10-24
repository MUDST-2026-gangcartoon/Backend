import React, { useEffect, useState } from 'react';
import './user-avatar.css';

// แสดงรูปโปรไฟล์ ถ้าไม่มีรูปหรือโหลดไม่ได้ ใช้ตัวอักษรแรกของชื่อแทน
// ใส่ภายในกล่องวงกลมเดิมของแต่ละเมนู (.avatar, .profile-menu-avatar ฯลฯ)
export default function UserAvatar({ user, src }) {
  const url = src !== undefined ? src : user?.avatarUrl;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (url && !failed) {
    return (
      <img
        className="user-avatar-img"
        src={url}
        alt=""
        onError={() => setFailed(true)}
      />
    );
  }

  return <>{user?.avatarLetter || 'U'}</>;
}
