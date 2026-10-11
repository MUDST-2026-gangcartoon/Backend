
import React, { useEffect, useMemo, useState } from 'react';
import AdminNavbar from '../components/AdminNavbar.jsx';
import EventDrawer from '../components/EventDrawer.jsx';
import AttendeesDrawer from '../components/AttendeesDrawer.jsx';
import { eventService } from '../api/eventService.js';

const CATEGORY_CLASS = {
  TECH: 'eng',
  DESIGN: 'design',
  CAREER: 'access',
  COMMUNITY: 'product',
  Design: 'design',
  Engineering: 'eng',
  สัตว์เลี้ยง: 'product',
  ไลฟ์สไตล์: 'product',
  เวิร์กช็อป: 'eng',
};

const CATEGORY_API = {
  TECH: 'TECH',
  DESIGN: 'DESIGN',
  CAREER: 'CAREER',
  COMMUNITY: 'COMMUNITY',
  Design: 'DESIGN',
  Engineering: 'TECH',
  สัตว์เลี้ยง: 'COMMUNITY',
  ไลฟ์สไตล์: 'COMMUNITY',
  เวิร์กช็อป: 'TECH',
};

const mapApiEvent = (event) => ({
  id: event.id,
  name: event.title,
  desc: event.description ?? '',
  place: event.location ?? '',
  category: event.category ?? 'TECH',
  thumbClass: CATEGORY_CLASS[event.category] ?? 'eng',
  date: event.startsAt ?? '',
  dateLabel: event.startsAt
    ? new Date(event.startsAt).toLocaleDateString('th-TH')
    : '',
  seats: Number(event.registeredCount ?? 0),
  max: Number(event.capacity ?? 0),
  coverIndex: 0,
  coverUrl: event.imageUrl ?? '',
  attendees: [],
  ticketTypes: event.ticketTypes ?? [],
  detailImages: event.detailImages ?? [],
  status: event.status,
});

export default function ManageEventsPage() {
  const [events, setEvents] = useState([]);

  const [drawer, setDrawer] = useState({
    open: false,
    mode: 'create',
    event: null,
  });

  const [attendeesDrawer, setAttendeesDrawer] = useState({
    open: false,
    event: null,
    attendees: [],
  });

  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeesError, setAttendeesError] = useState('');

  // โหลดรายการอีเวนต์จาก Backend
  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      try {
        const response = await eventService.getAllEvents({
          page: 0,
          size: 100,
        });

        const data = response?.data ?? response;
        const items = Array.isArray(data?.items) ? data.items : [];

        if (!cancelled) {
          setEvents(items.map(mapApiEvent));
        }
      } catch (error) {
        console.error('Failed to load events:', error);

        if (!cancelled) {
          window.alert(
            'โหลดรายการอีเวนต์ไม่สำเร็จ กรุณาตรวจสอบ Backend'
          );
        }
      }
    };

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const total = events.length;
    const open = events.filter((event) => event.seats < event.max).length;
    const totalSeats = events.reduce((sum, event) => sum + event.max, 0);
    const totalRegistered = events.reduce(
      (sum, event) => sum + event.seats,
      0
    );

    return { total, open, totalSeats, totalRegistered };
  }, [events]);

  const openCreateDrawer = () =>
    setDrawer({ open: true, mode: 'create', event: null });

  const openEditDrawer = (event) =>
    setDrawer({ open: true, mode: 'edit', event });

  const closeDrawer = () =>
    setDrawer((current) => ({ ...current, open: false }));

  // ดึงรายชื่อผู้ลงทะเบียนของอีเวนต์จาก Backend
  const openAttendees = async (event) => {
    setAttendeesDrawer({
      open: true,
      event,
      attendees: [],
    });

    setAttendeesLoading(true);
    setAttendeesError('');

    try {
      const response = await eventService.getEventAttendees(event.id);
      const data = response?.data ?? response;

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];

      const normalizedAttendees = items.map((attendee) => {
        const combinedName = [
          attendee.firstName,
          attendee.lastName,
        ]
          .filter(Boolean)
          .join(' ');

        return {
          ...attendee,
          name:
            attendee.name ||
            attendee.fullName ||
            attendee.user?.name ||
            attendee.user?.fullName ||
            attendee.attendeeName ||
            combinedName ||
            attendee.username ||
            attendee.user?.username ||
            'ไม่ระบุชื่อ',
          email:
            attendee.email ||
            attendee.user?.email ||
            attendee.attendeeEmail ||
            '-',
          registeredAt:
            attendee.registeredAt ||
            attendee.createdAt ||
            attendee.registrationDate ||
            attendee.registeredOn ||
            '',
        };
      });

      setAttendeesDrawer((current) => {
        // ป้องกันผลลัพธ์เก่าไปแสดงในอีเวนต์ที่เปิดทีหลัง
        if (String(current.event?.id) !== String(event.id)) {
          return current;
        }

        return {
          ...current,
          attendees: normalizedAttendees,
        };
      });
    } catch (error) {
      console.error('Failed to load attendees:', error);

      setAttendeesError(
        error?.response?.data?.message ||
          error?.message ||
          'โหลดรายชื่อผู้ลงทะเบียนไม่สำเร็จ กรุณาตรวจสอบ Backend'
      );
    } finally {
      setAttendeesLoading(false);
    }
  };

  const closeAttendees = () => {
    setAttendeesDrawer((current) => ({
      ...current,
      open: false,
    }));

    setAttendeesError('');
  };

  // ลบอีเวนต์ผ่าน Backend
  const handleDelete = async (id) => {
    if (!window.confirm('ยืนยันการลบอีเวนต์นี้หรือไม่?')) {
      return;
    }

    try {
      await eventService.deleteEvent(id);

      setEvents((previous) =>
        previous.filter(
          (event) => String(event.id) !== String(id)
        )
      );

      window.alert('ลบอีเวนต์เรียบร้อยแล้ว');
    } catch (error) {
      console.error('Failed to delete event:', error);

      window.alert(
        error?.response?.data?.message ||
          'ลบอีเวนต์ไม่สำเร็จ กรุณาลองอีกครั้ง'
      );
    }
  };

  // สร้างหรือแก้ไขอีเวนต์ผ่าน Backend
  const handleSubmit = async (form, isEdit) => {
    const max = Number(form.max);
    const eventId = form.id ?? drawer.event?.id;

    const requiredFields = [
      ['name', 'ชื่ออีเวนต์'],
      ['desc', 'รายละเอียดอีเวนต์'],
      ['place', 'สถานที่'],
      ['date', 'วันและเวลา'],
    ];

    const missing = requiredFields.find(
      ([key]) => !String(form[key] ?? '').trim()
    );

    if (missing) {
      window.alert(`กรุณากรอก${missing[1]}`);
      return;
    }

    if (!Number.isInteger(max) || max <= 0) {
      window.alert('จำนวนผู้เข้าร่วมสูงสุดต้องเป็นจำนวนเต็มบวก');
      return;
    }

    if (!Number.isFinite(new Date(form.date).getTime())) {
      window.alert('วันและเวลาไม่ถูกต้อง');
      return;
    }

    if (isEdit && eventId == null) {
      window.alert('ไม่พบ ID ของอีเวนต์ที่ต้องการแก้ไข');
      return;
    }

    const currentEvent = isEdit
      ? events.find(
          (event) => String(event.id) === String(eventId)
        )
      : null;

    const existingTickets = currentEvent?.ticketTypes ?? [];


    const ticketTypes = existingTickets.length
      ? existingTickets.map((ticket) => ({
          ...(ticket.id != null ? { id: ticket.id } : {}),
          name: ticket.name,
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
        ];

    const currentTicketCapacity = ticketTypes.reduce(
      (sum, ticket) => sum + ticket.capacity,
      0
    );

    let seatsToAdjust = max - currentTicketCapacity;

    if (seatsToAdjust > 0) {
      ticketTypes[0].capacity += seatsToAdjust;
    } else if (seatsToAdjust < 0) {
      seatsToAdjust = Math.abs(seatsToAdjust);

      for (const ticket of [...ticketTypes].reverse()) {
        const sold = Math.max(0, Number(ticket.sold ?? 0));
        const removable = Math.max(0, ticket.capacity - sold);
        const reduction = Math.min(removable, seatsToAdjust);

        ticket.capacity -= reduction;
        seatsToAdjust -= reduction;

        if (seatsToAdjust === 0) break;
      }

      if (seatsToAdjust > 0) {
        window.alert(
          'Cannot reduce event capacity below the number of tickets already sold.'
        );
        return;
      }
    }

    const ticketTypesForRequest = ticketTypes.map(
      ({ sold, ...ticket }) => ticket
    );

    const category = CATEGORY_API[form.category] ?? 'TECH';

    // ใช้ URL เดิมถ้าไม่ได้เลือกรูปใหม่
    let submittedImageUrl =
      form.coverUrl && !form.coverUrl.startsWith('blob:')
        ? form.coverUrl
        : currentEvent?.coverUrl || '';

    const payload = {
      title: form.name.trim(),
      description: form.desc.trim(),
      location: form.place.trim(),
      startsAt: form.date,
      capacity: max,
      category,
      imageUrl: submittedImageUrl,
      detailImages: currentEvent?.detailImages ?? [],
      ticketTypes: ticketTypesForRequest,
    };

    try {
      // อัปโหลดไฟล์รูปใหม่ก่อนบันทึกอีเวนต์
      if (form.coverFile) {
        const uploadResponse = await eventService.uploadEventImage(
          form.coverFile
        );

        const uploadData = uploadResponse?.data ?? uploadResponse;

        if (!uploadData?.url) {
          throw new Error('Backend ไม่ได้ส่ง URL รูปภาพกลับมา');
        }

        submittedImageUrl = uploadData.url;
        payload.imageUrl = submittedImageUrl;
      }

      // บันทึกอีเวนต์โดยใช้ URL รูปที่อัปโหลดแล้ว
      const response = isEdit
        ? await eventService.updateEvent(eventId, payload)
        : await eventService.createEvent(payload);

      const savedEvent = response?.data ?? response;

      if (savedEvent?.id == null) {
        throw new Error('Backend ไม่ได้ส่งข้อมูลอีเวนต์กลับมา');
      }

      const mappedEvent = mapApiEvent(savedEvent);

      setEvents((previous) =>
        isEdit
          ? previous.map((event) =>
              String(event.id) === String(savedEvent.id)
                ? mappedEvent
                : event
            )
          : [mappedEvent, ...previous]
      );

      window.alert(
        isEdit
          ? 'บันทึกการแก้ไขเรียบร้อยแล้ว'
          : 'สร้างอีเวนต์เรียบร้อยแล้ว'
      );

      closeDrawer();
    } catch (error) {
      console.error('Failed to save event:', error);

      window.alert(
        `บันทึกอีเวนต์ไม่สำเร็จ: ${
          error?.response?.data?.message ||
          error?.message ||
          'กรุณาตรวจสอบ Backend'
        }`
      );
    }
  };

  return (
    <>
      <AdminNavbar />

      <main className="page">
        <div className="crumb">
          <svg
            width="12"
            height="12"
            viewBox="0 0 100 100"
            fill="currentColor"
          >
            <circle cx="30" cy="20" r="9" />
            <circle cx="60" cy="20" r="9" />
            <ellipse cx="45" cy="55" rx="25" ry="23" />
          </svg>
          การจัดการระบบ
        </div>

        <div className="page-head">
          <div>
            <h1>จัดการอีเวนต์</h1>
            <p className="subtitle">
              สร้างอีเวนต์ ตรวจสอบจำนวนที่นั่ง และดูรายชื่อผู้เข้าร่วม
            </p>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={openCreateDrawer}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
            สร้างอีเวนต์
          </button>
        </div>

        <hr className="rule" />

        <section className="stats-row">
          <div className="stat-card">
            <div className="stat-label">อีเวนต์ทั้งหมด</div>
            <div className="stat-num">{stats.total}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">กำลังเปิดรับสมัคร</div>
            <div className="stat-num">{stats.open}</div>
          </div>

          <div className="stat-card accent">
            <div className="stat-label">การลงทะเบียนทั้งหมด</div>
            <div className="stat-num">
              {stats.totalRegistered}
              <span>/ {stats.totalSeats} ที่นั่ง</span>
            </div>
          </div>
        </section>

        <section className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>อีเวนต์</th>
                  <th>วันเวลาและสถานที่</th>
                  <th>จำนวนที่นั่ง</th>
                  <th>สถานะ</th>
                  <th className="align-right">จัดการ</th>
                </tr>
              </thead>

              <tbody>
                {events.map((event) => {
                  const fillPct =
                    event.max > 0
                      ? Math.min(
                          100,
                          Math.round((event.seats / event.max) * 100)
                        )
                      : 0;

                  const isOpen = event.seats < event.max;

                  return (
                    <tr key={event.id}>
                      <td>
                        <div className="ev-cell">
                          <div className={`ev-thumb ${event.thumbClass}`}>
                            🐾
                          </div>
                          <div>
                            <div className="ev-title">{event.name}</div>
                            <div className="ev-cat">{event.category}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="dt-main">
                          {event.dateLabel ||
                            (event.date &&
                              new Date(event.date).toLocaleDateString(
                                'th-TH'
                              ))}
                        </div>
                        <div className="dt-sub">{event.place}</div>
                      </td>

                      <td>
                        <div className="seats-num">
                          {event.seats} / {event.max}
                        </div>
                        <div className="seats-bar">
                          <div
                            className="seats-fill"
                            style={{ '--fill': `${fillPct}%` }}
                          />
                        </div>
                      </td>

                      <td>
                        <span className="status">
                          <span className="dot" />
                          {isOpen ? 'เปิดรับลงทะเบียน' : 'เต็มแล้ว'}
                        </span>
                      </td>

                      <td>
                        <div className="actions">
                          <button
                            type="button"
                            className="icon-btn"
                            title="ดูรายชื่อผู้ลงทะเบียน"
                            onClick={() => openAttendees(event)}
                          >
                            👁
                          </button>

                          <button
                            type="button"
                            className="icon-btn"
                            title="แก้ไข"
                            onClick={() => openEditDrawer(event)}
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            className="icon-btn danger"
                            title="ลบ"
                            onClick={() => handleDelete(event.id)}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {events.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div style={{ padding: '24px', textAlign: 'center' }}>
                        ยังไม่มีอีเวนต์
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <EventDrawer
        open={drawer.open}
        mode={drawer.mode}
        initialEvent={
          drawer.event && {
            id: drawer.event.id,
            name: drawer.event.name,
            desc: drawer.event.desc,
            place: drawer.event.place,
            category: drawer.event.category,
            date: drawer.event.date,
            max: drawer.event.max,
            coverIndex: drawer.event.coverIndex,
            coverUrl: drawer.event.coverUrl,
          }
        }
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />

      <AttendeesDrawer
        open={attendeesDrawer.open}
        eventName={attendeesDrawer.event?.name || ''}
        seatsInfo={
          attendeesDrawer.event
            ? `${attendeesDrawer.event.seats} / ${attendeesDrawer.event.max}`
            : ''
        }
        attendees={attendeesDrawer.attendees || []}
        loading={attendeesLoading}
        error={attendeesError}
        onClose={closeAttendees}
      />
    </>
  );
}
