import React, { useEffect, useState } from 'react';
import { eventService } from '../../api/eventService';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';

const accessError = 'ตรวจสถานะห้องออนไลน์ไม่สำเร็จ';

export default function OnlineTicketAccess({ eventId, checkedIn, onCheckedIn }) {
  const [access, setAccess] = useState(null);
  const [accessFailed, setAccessFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [roomUrl, setRoomUrl] = useState('');

  useEffect(() => {
    let active = true;
    eventService.getOnlineAccess(eventId).then((result) => {
      if (!active) return;
      setAccess(result);
      setAccessFailed(false);
      if (!result.available) setRoomUrl('');
    }).catch(() => {
      if (active) setAccessFailed(true);
    });
    return () => { active = false; };
  }, [eventId, refresh]);

  useLiveRefresh(() => setRefresh((value) => value + 1), { intervalMs: 30_000 });

  async function join() {
    if (!access?.available || joining) return;
    setJoining(true);
    setJoinError('');
    try {
      const result = await eventService.joinOnlineEvent(eventId);
      if (result?.checkedInAt) onCheckedIn();
      const url = new URL(result?.url);
      if (url.protocol !== 'https:') throw new Error('Invalid meeting URL');
      setRoomUrl(url.href);
    } catch (error) {
      setJoinError(error.status === 403
        ? 'ต้องมีบัตรที่ยังใช้งานของอีเวนต์นี้'
        : error.status === 409
          ? error.data?.message || 'ยังเข้าห้องออนไลน์ไม่ได้ในขณะนี้'
          : 'รับลิงก์ห้องไม่สำเร็จ กรุณาลองอีกครั้ง');
      setRefresh((value) => value + 1);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="myticket-right myticket-online-action">
      {accessFailed ? (
        <>
          <p role="alert">{accessError}</p>
          <button type="button" onClick={() => setRefresh((value) => value + 1)}>ตรวจอีกครั้ง</button>
        </>
      ) : !access ? (
        <p role="status">กำลังตรวจสถานะห้องออนไลน์…</p>
      ) : !access.available ? (
        <p role="status">{access.reason || 'ห้องออนไลน์ยังไม่เปิด'}</p>
      ) : roomUrl ? (
        <>
          <p role="status">เช็กอินแล้ว เปิดห้องเพื่อเข้าร่วมอีเวนต์</p>
          <a href={roomUrl} target="_blank" rel="noopener noreferrer">เปิดห้องออนไลน์</a>
        </>
      ) : (
        <button type="button" onClick={join} disabled={joining}>
          {joining ? 'กำลังรับลิงก์…' : checkedIn || access.checkedInAt ? 'รับลิงก์ห้องอีกครั้ง' : 'เช็กอินและรับลิงก์'}
        </button>
      )}
      {joinError && <p className="myticket-online-error" role="alert">{joinError}</p>}
    </div>
  );
}
