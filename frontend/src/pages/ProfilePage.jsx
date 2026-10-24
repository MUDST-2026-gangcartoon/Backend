import React, { useEffect, useRef, useState } from 'react';
import UserAvatar from '../components/UserAvatar.jsx';
import Navbar from '../components/Navbar.jsx';
import AdminNavbar from '../components/AdminNavbar.jsx';
import StaffNavbar from '../components/StaffNavbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { authService } from '../api/authService.js';
import { normalizeRole } from '../utils/roleAccess.js';
import { isMockMode } from '../data/mockBookings.js';
import '../ProfilePage.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD_BYTES = 72; // ข้อจำกัดของ bcrypt
const utf8Bytes = (text) => new TextEncoder().encode(text).length;

const MOCK_OUTCOMES = [
  { value: 'success', label: 'สำเร็จ' },
  { value: 'wrongPassword', label: 'รหัสผ่านเดิมผิด' },
  { value: 'duplicateEmail', label: 'อีเมลซ้ำ' },
  { value: 'sessionExpired', label: 'Session หมดอายุ' },
];

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_INPUT = 5 * 1024 * 1024; // ไฟล์ต้นฉบับไม่เกิน 5MB
const AVATAR_SIZE = 256; // ย่อและครอปกลางเป็นจัตุรัส 256x256 ก่อนอัปโหลด

// ครอปกลางภาพเป็นจัตุรัสและย่อขนาด (ตัด EXIF ออกด้วย) คืนเป็น Blob JPEG
function cropToSquare(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('แปลงรูปไม่สำเร็จ'))),
          'image/jpeg',
          0.9
        );
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('เปิดไฟล์รูปไม่ได้ ไฟล์อาจเสียหาย'));
    };
    img.src = objectUrl;
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// แปลง error จากหลังบ้านเป็นข้อความใต้ช่องที่เกี่ยวข้อง
// หลังบ้านเป็นผู้ตัดสินสุดท้ายเสมอ หน้าบ้านแค่แสดงผล
function mapServerError(error, kind) {
  const status = Number(error?.status ?? 0);
  const message = String(error?.message || '');

  const raw = error?.fieldErrors || error?.errors || error?.data?.errors;
  const fields = {};
  if (raw && typeof raw === 'object') {
    const entries = Array.isArray(raw)
      ? raw.map((item) => [item.field, item.message])
      : Object.entries(raw);
    entries.forEach(([field, msg]) => {
      if (msg) fields[field] = String(msg);
    });
  }

  const passwordWrong =
    /รหัสผ่าน(เดิม|ปัจจุบัน)|current password|incorrect password|wrong password|bad credentials|invalid credentials/i.test(
      message
    );
  const emailTaken =
    status === 409 || /อีเมล.*(ซ้ำ|ถูกใช้)|email.*(exist|taken|duplicate|in use)/i.test(message);

  if (fields.currentPassword || passwordWrong) {
    return {
      fields: {
        currentPassword: fields.currentPassword || 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
        ...fields,
      },
    };
  }
  if (kind === 'profile' && (fields.email || emailTaken)) {
    return { fields: { email: fields.email || 'อีเมลนี้ถูกใช้งานแล้ว', ...fields } };
  }
  if (status === 401) return { sessionExpired: true };
  if (Object.keys(fields).length) return { fields };

  if (status === 404 || status === 405 || status === 501) {
    return {
      form: `หลังบ้านยังไม่มี API สำหรับฟังก์ชันนี้ (รหัส ${status}) กรุณาแจ้งผู้ทำหลังบ้าน`,
    };
  }
  if (status === 413) return { form: 'ไฟล์ใหญ่เกินที่หลังบ้านรับได้' };
  if (status >= 500) {
    return {
      form: `หลังบ้านเกิดข้อผิดพลาด (รหัส ${status})${message ? `: ${message}` : ''} กรุณาแจ้งผู้ทำหลังบ้าน`,
    };
  }

  return { form: message || 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };
}

export default function ProfilePage() {
  const { user, updateUser, logout, openModal } = useAuth();
  const role = normalizeRole(user);
  const NavbarForRole =
    role === 'admin' ? AdminNavbar : role === 'staff' ? StaffNavbar : Navbar;

  const mockMode = isMockMode();
  const [mockOutcome, setMockOutcome] = useState('success');
  const [sessionExpired, setSessionExpired] = useState(false);

  // ---- ฟอร์มข้อมูลส่วนตัว ----
  const [profile, setProfile] = useState({
    name: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileDone, setProfileDone] = useState('');

  // ---- ฟอร์มเปลี่ยนรหัสผ่าน ----
  const emptyPw = { currentPassword: '', newPassword: '', confirmPassword: '' };
  const [pw, setPw] = useState(emptyPw);
  const [pwErrors, setPwErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);
  const [pwDone, setPwDone] = useState('');
  const submitting = useRef(false);

  // ---- รูปโปรไฟล์ ----
  const fileInputRef = useRef(null);
  const [avatarBlob, setAvatarBlob] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [avatarDone, setAvatarDone] = useState('');
  const [avatarSaving, setAvatarSaving] = useState(false);

  useEffect(
    () => () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview]
  );

  const clearAvatarSelection = () => {
    setAvatarBlob(null);
    setAvatarPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAvatarPick = async (event) => {
    const file = event.target.files?.[0];
    setAvatarError('');
    setAvatarDone('');
    if (!file) return;

    if (!AVATAR_TYPES.includes(file.type)) {
      clearAvatarSelection();
      setAvatarError('รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP');
      return;
    }
    if (file.size > AVATAR_MAX_INPUT) {
      clearAvatarSelection();
      setAvatarError('ไฟล์ใหญ่เกิน 5MB กรุณาเลือกรูปที่เล็กลง');
      return;
    }

    try {
      const blob = await cropToSquare(file);
      setAvatarBlob(blob);
      setAvatarPreview(URL.createObjectURL(blob));
    } catch (err) {
      clearAvatarSelection();
      setAvatarError(err.message || 'อ่านรูปไม่สำเร็จ');
    }
  };

  const userAsRaw = (extra = {}) => ({
    id: user?.id,
    name: user?.username,
    email: user?.email,
    role: user?.role,
    ...extra,
  });

  const saveAvatar = async () => {
    if (!avatarBlob || submitting.current) return;
    submitting.current = true;
    setAvatarSaving(true);
    setAvatarError('');
    setAvatarDone('');

    try {
      const formData = new FormData();
      formData.append('file', avatarBlob, 'avatar.jpg');

      const response = await runRequest('avatar', () =>
        authService.uploadAvatar(formData)
      );

      if (mockMode) {
        updateUser(userAsRaw({ avatarUrl: avatarPreview }));
      } else {
        const payload = response?.data ?? response ?? {};
        const url = payload.avatarUrl ?? payload.url ?? payload.user?.avatarUrl;
        updateUser(payload.user || payload.role ? payload : userAsRaw({ avatarUrl: url }));
      }
      clearAvatarSelection();
      setAvatarDone('เปลี่ยนรูปโปรไฟล์แล้ว');
    } catch (error) {
      const mapped = mapServerError(error, 'avatar');
      if (mapped.sessionExpired) setSessionExpired(true);
      else setAvatarError(mapped.form || Object.values(mapped.fields || {})[0] || 'อัปโหลดไม่สำเร็จ');
    } finally {
      submitting.current = false;
      setAvatarSaving(false);
    }
  };

  const removeAvatar = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setAvatarSaving(true);
    setAvatarError('');
    setAvatarDone('');

    try {
      await runRequest('avatar', () => authService.removeAvatar());
      updateUser(userAsRaw({ avatarUrl: '' }));
      clearAvatarSelection();
      setAvatarDone('ลบรูปโปรไฟล์แล้ว');
    } catch (error) {
      const mapped = mapServerError(error, 'avatar');
      if (mapped.sessionExpired) setSessionExpired(true);
      else setAvatarError(mapped.form || 'ลบรูปไม่สำเร็จ');
    } finally {
      submitting.current = false;
      setAvatarSaving(false);
    }
  };

  const setProfileField = (key) => (e) => {
    setProfile((c) => ({ ...c, [key]: e.target.value }));
    setProfileErrors((c) => ({ ...c, [key]: '', form: '' }));
    setProfileDone('');
  };
  const setPwField = (key) => (e) => {
    setPw((c) => ({ ...c, [key]: e.target.value }));
    setPwErrors((c) => ({ ...c, [key]: '', form: '' }));
    setPwDone('');
  };

  const runRequest = async (kind, request) => {
    if (mockMode) {
      await wait(900);
      if (mockOutcome === 'wrongPassword') {
        throw Object.assign(new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง'), { status: 400 });
      }
      if (mockOutcome === 'duplicateEmail' && kind === 'profile') {
        throw Object.assign(new Error('อีเมลนี้ถูกใช้งานแล้ว'), { status: 409 });
      }
      if (mockOutcome === 'sessionExpired') {
        throw Object.assign(new Error('Unauthorized'), { status: 401 });
      }
      return null;
    }
    return request();
  };

  const submitProfile = async (event) => {
    event.preventDefault();
    if (submitting.current) return;

    const name = profile.name.trim();
    const email = profile.email.trim();
    const errors = {};

    if (!name) errors.name = 'กรุณากรอกชื่อที่แสดง';
    else if (name.length > 100) errors.name = 'ชื่อต้องไม่เกิน 100 ตัวอักษร';
    if (!email) errors.email = 'กรุณากรอกอีเมล';
    else if (email !== (user?.email || '') && !EMAIL_PATTERN.test(email)) {
      // อีเมลเดิมของบัญชีไม่ต้องตรวจรูปแบบซ้ำ ตรวจเฉพาะตอนเปลี่ยนค่า
      errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    if (!profile.currentPassword) {
      errors.currentPassword = 'กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยัน';
    }

    setProfileErrors(errors);
    setProfileDone('');
    if (Object.keys(errors).length) return;

    submitting.current = true;
    setProfileSaving(true);
    try {
      const response = await runRequest('profile', () =>
        authService.updateProfile({
          name,
          email,
          currentPassword: profile.currentPassword,
        })
      );

      // อัปเดตจากคำตอบจริงของหลังบ้าน (โหมดจำลองใช้ค่าที่กรอก)
      updateUser(
        response ?? { id: user?.id, name, email, role: user?.role }
      );
      setProfile((c) => ({ ...c, name, email, currentPassword: '' }));
      setProfileDone('บันทึกข้อมูลส่วนตัวแล้ว');
    } catch (error) {
      const mapped = mapServerError(error, 'profile');
      if (mapped.sessionExpired) setSessionExpired(true);
      else setProfileErrors({ ...mapped.fields, form: mapped.form });
      // ล้างรหัสผ่านเฉพาะกรณีรหัสผิด ไม่ล้างเมื่อเป็นปัญหาอื่นจะได้ไม่ต้องกรอกใหม่
      if (mapped.fields?.currentPassword) {
        setProfile((c) => ({ ...c, currentPassword: '' }));
      }
    } finally {
      submitting.current = false;
      setProfileSaving(false);
    }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    if (submitting.current) return;

    const errors = {};
    if (!pw.currentPassword) errors.currentPassword = 'กรุณากรอกรหัสผ่านปัจจุบัน';

    if (!pw.newPassword) errors.newPassword = 'กรุณากรอกรหัสผ่านใหม่';
    else if (pw.newPassword.length < MIN_PASSWORD) {
      errors.newPassword = `รหัสผ่านใหม่ต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร`;
    } else if (utf8Bytes(pw.newPassword) > MAX_PASSWORD_BYTES) {
      errors.newPassword = `รหัสผ่านใหม่ต้องไม่เกิน ${MAX_PASSWORD_BYTES} ไบต์`;
    } else if (pw.newPassword === pw.currentPassword) {
      errors.newPassword = 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม';
    }

    if (!pw.confirmPassword) errors.confirmPassword = 'กรุณายืนยันรหัสผ่านใหม่';
    else if (pw.confirmPassword !== pw.newPassword) {
      errors.confirmPassword = 'รหัสผ่านใหม่ไม่ตรงกัน';
    }

    setPwErrors(errors);
    setPwDone('');
    if (Object.keys(errors).length) return;

    submitting.current = true;
    setPwSaving(true);
    try {
      await runRequest('password', () =>
        authService.changePassword({
          currentPassword: pw.currentPassword,
          newPassword: pw.newPassword,
          confirmPassword: pw.confirmPassword,
        })
      );
      setPwDone('เปลี่ยนรหัสผ่านแล้ว');
    } catch (error) {
      const mapped = mapServerError(error, 'password');
      if (mapped.sessionExpired) setSessionExpired(true);
      else setPwErrors({ ...mapped.fields, form: mapped.form });
    } finally {
      // ไม่ค้างรหัสผ่านไว้ใน state หลังส่งทุกกรณี และไม่เก็บลง storage
      setPw(emptyPw);
      submitting.current = false;
      setPwSaving(false);
    }
  };

  const handleRelogin = async () => {
    await logout();
    openModal('login');
  };

  return (
    <>
      <NavbarForRole />
      <main className="profile-page">
        <header className="profile-head">
          <span className="profile-eyebrow">บัญชีของฉัน</span>
          <h1>จัดการโปรไฟล์</h1>
          <p>
            {user?.roleLabel} · {user?.email}
          </p>
        </header>

        {mockMode && (
          <div className="profile-mock">
            <span>โหมดข้อมูลจำลอง (?mock=1) — เลือกผลลัพธ์ที่ต้องการทดสอบ</span>
            <select
              value={mockOutcome}
              onChange={(e) => setMockOutcome(e.target.value)}
              aria-label="ผลลัพธ์จำลอง"
            >
              {MOCK_OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        {sessionExpired && (
          <div className="profile-alert" role="alert">
            <strong>Session หมดอายุ</strong>
            <span>กรุณาเข้าสู่ระบบอีกครั้งเพื่อดำเนินการต่อ ข้อมูลที่กรอกไว้ยังไม่ถูกบันทึก</span>
            <button type="button" className="profile-btn" onClick={handleRelogin}>
              เข้าสู่ระบบอีกครั้ง
            </button>
          </div>
        )}

        <section className="profile-card" aria-labelledby="profile-avatar-title">
          <h2 id="profile-avatar-title">รูปโปรไฟล์</h2>
          <p className="profile-hint">
            รองรับ JPG, PNG, WebP ไม่เกิน 5MB ระบบจะครอปกลางภาพเป็นจัตุรัสให้
          </p>

          <div className="profile-avatar-row">
            <div className="profile-avatar-preview">
              <span className="profile-avatar-circle">
                <UserAvatar user={user} src={avatarPreview || undefined} />
              </span>
            </div>

            <div className="profile-avatar-actions">
              <input
                ref={fileInputRef}
                id="pf-avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="profile-file-input"
                onChange={handleAvatarPick}
                disabled={avatarSaving}
              />
              <label htmlFor="pf-avatar" className="profile-btn">
                เลือกรูป
              </label>

              {avatarBlob && (
                <>
                  <button
                    type="button"
                    className="profile-btn primary"
                    onClick={saveAvatar}
                    disabled={avatarSaving}
                  >
                    {avatarSaving ? 'กำลังอัปโหลด...' : 'บันทึกรูป'}
                  </button>
                  <button
                    type="button"
                    className="profile-btn"
                    onClick={clearAvatarSelection}
                    disabled={avatarSaving}
                  >
                    ยกเลิก
                  </button>
                </>
              )}

              {!avatarBlob && user?.avatarUrl && (
                <button
                  type="button"
                  className="profile-btn danger"
                  onClick={removeAvatar}
                  disabled={avatarSaving}
                >
                  ลบรูป
                </button>
              )}
            </div>
          </div>

          {avatarError && <p className="profile-err form" role="alert">{avatarError}</p>}
          {avatarDone && <p className="profile-ok" role="status">{avatarDone}</p>}
        </section>

        <section className="profile-card" aria-labelledby="profile-info-title">
          <h2 id="profile-info-title">ข้อมูลส่วนตัว</h2>
          <p className="profile-hint">
            อีเมลใช้สำหรับเข้าสู่ระบบ ยืนยันตัวตนด้วยรหัสผ่านปัจจุบันก่อนบันทึกทุกครั้ง
          </p>

          <form onSubmit={submitProfile} noValidate>
            <div className="profile-field">
              <label htmlFor="pf-name">ชื่อที่แสดง</label>
              <input
                id="pf-name"
                name="displayName"
                type="text"
                autoComplete="name"
                value={profile.name}
                onChange={setProfileField('name')}
                aria-invalid={Boolean(profileErrors.name)}
                aria-describedby={profileErrors.name ? 'pf-name-err' : undefined}
              />
              {profileErrors.name && <small id="pf-name-err" className="profile-err">{profileErrors.name}</small>}
            </div>

            <div className="profile-field">
              <label htmlFor="pf-email">อีเมล</label>
              <input
                id="pf-email"
                name="email"
                type="email"
                autoComplete="email"
                value={profile.email}
                onChange={setProfileField('email')}
                aria-invalid={Boolean(profileErrors.email)}
                aria-describedby={profileErrors.email ? 'pf-email-err' : undefined}
              />
              {profileErrors.email && <small id="pf-email-err" className="profile-err">{profileErrors.email}</small>}
            </div>

            <div className="profile-field">
              <label htmlFor="pf-current">รหัสผ่านปัจจุบัน</label>
              <input
                id="pf-current"
                name="currentPasswordForProfile"
                type="password"
                autoComplete="current-password"
                value={profile.currentPassword}
                onChange={setProfileField('currentPassword')}
                aria-invalid={Boolean(profileErrors.currentPassword)}
                aria-describedby={profileErrors.currentPassword ? 'pf-current-err' : undefined}
              />
              {profileErrors.currentPassword && <small id="pf-current-err" className="profile-err">{profileErrors.currentPassword}</small>}
            </div>

            {profileErrors.form && <p className="profile-err form" role="alert">{profileErrors.form}</p>}
            {profileDone && <p className="profile-ok" role="status">{profileDone}</p>}

            <button type="submit" className="profile-btn primary" disabled={profileSaving}>
              {profileSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลส่วนตัว'}
            </button>
          </form>
        </section>

        <section className="profile-card" aria-labelledby="profile-pw-title">
          <h2 id="profile-pw-title">เปลี่ยนรหัสผ่าน</h2>
          <p className="profile-hint">
            ใช้อย่างน้อย {MIN_PASSWORD} ตัวอักษร และไม่เกิน {MAX_PASSWORD_BYTES} ไบต์
          </p>

          <form onSubmit={submitPassword} noValidate>
            <div className="profile-field">
              <label htmlFor="pw-current">รหัสผ่านปัจจุบัน</label>
              <input
                id="pw-current"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                value={pw.currentPassword}
                onChange={setPwField('currentPassword')}
                aria-invalid={Boolean(pwErrors.currentPassword)}
                aria-describedby={pwErrors.currentPassword ? 'pw-current-err' : undefined}
              />
              {pwErrors.currentPassword && <small id="pw-current-err" className="profile-err">{pwErrors.currentPassword}</small>}
            </div>

            <div className="profile-field">
              <label htmlFor="pw-new">รหัสผ่านใหม่</label>
              <input
                id="pw-new"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                value={pw.newPassword}
                onChange={setPwField('newPassword')}
                aria-invalid={Boolean(pwErrors.newPassword)}
                aria-describedby={pwErrors.newPassword ? 'pw-new-err' : undefined}
              />
              {pwErrors.newPassword && <small id="pw-new-err" className="profile-err">{pwErrors.newPassword}</small>}
            </div>

            <div className="profile-field">
              <label htmlFor="pw-confirm">ยืนยันรหัสผ่านใหม่</label>
              <input
                id="pw-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={pw.confirmPassword}
                onChange={setPwField('confirmPassword')}
                aria-invalid={Boolean(pwErrors.confirmPassword)}
                aria-describedby={pwErrors.confirmPassword ? 'pw-confirm-err' : undefined}
              />
              {pwErrors.confirmPassword && <small id="pw-confirm-err" className="profile-err">{pwErrors.confirmPassword}</small>}
            </div>

            {pwErrors.form && <p className="profile-err form" role="alert">{pwErrors.form}</p>}
            {pwDone && <p className="profile-ok" role="status">{pwDone}</p>}

            <button type="submit" className="profile-btn primary" disabled={pwSaving}>
              {pwSaving ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
