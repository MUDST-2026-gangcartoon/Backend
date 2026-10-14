
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AdminNavbar from '../components/AdminNavbar.jsx';
import EventDrawer from '../components/EventDrawer.jsx';
import AttendeesDrawer from '../components/AttendeesDrawer.jsx';
import { eventService } from '../api/eventService.js';

const CATEGORY_CLASS = {
  DESIGN: 'design',
  TECH: 'eng',
  CAREER: 'product',
  COMMUNITY: 'access',
};

const CATEGORY_ALIASES = {
  Design: 'DESIGN',
  Engineering: 'TECH',
  TECH: 'TECH',
  DESIGN: 'DESIGN',
  CAREER: 'CAREER',
  COMMUNITY: 'COMMUNITY',
  'เวิร์กช็อป': 'TECH',
  'สัตว์เลี้ยง': 'COMMUNITY',
  'ไลฟ์สไตล์': 'COMMUNITY',
};

const CATEGORY_LABEL = {
  TECH: 'เทคโนโลยี',
  DESIGN: 'ออกแบบ',
  CAREER: 'อาชีพ',
  COMMUNITY: 'ชุมชน',
};

const toApiCategory = (category) => {
  const value = String(category ?? '').trim();
  const normalized =
    CATEGORY_ALIASES[value] || value.toUpperCase();

  return ['TECH', 'DESIGN', 'CAREER', 'COMMUNITY'].includes(
    normalized
  )
    ? normalized
    : 'COMMUNITY';
};

const toLocalDateTime = (value) => {
  if (!value) return '';

  const match = String(value).match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/
  );

  if (match) return `${match[1]}T${match[2]}`;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const pad = (number) => String(number).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDate = (value) => {
  if (!value) return 'ไม่ระบุวันเวลา';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const mapApiEvent = (event) => {
  const category = toApiCategory(event.category);

  return {
    ...event,
    id: event.id,
    name: event.title || event.name || '',
    desc: event.description || event.desc || '',
    place: event.location || event.place || '',
    category,
    thumbClass: CATEGORY_CLASS[category] || 'access',
    date: toLocalDateTime(event.startsAt || event.date),
    dateLabel: formatDate(event.startsAt || event.date),
    seats: Number(event.registeredCount ?? event.seats ?? 0),
    max: Number(event.capacity ?? event.max ?? 0),
    coverUrl: event.imageUrl || event.coverUrl || '',
    coverIndex: event.coverIndex ?? 0,
    attendees: [],
    detailImages: Array.isArray(event.detailImages)
      ? event.detailImages
      : [],
    ticketTypes: Array.isArray(event.ticketTypes)
      ? event.ticketTypes
      : [],
    status: event.status || '',
  };
};

const getResponseItems = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const prepareTicketTypes = (formTicketTypes, originalEvent) => {
  if (!Array.isArray(formTicketTypes) || formTicketTypes.length === 0) {
    return {
      error: 'กรุณาเพิ่มประเภทตั๋วอย่างน้อย 1 ประเภท',
    };
  }

  const originalTypes = Array.isArray(originalEvent?.ticketTypes)
    ? originalEvent.ticketTypes
    : [];

  const ticketTypes = formTicketTypes.map((ticket) => {
    const original = originalTypes.find(
      (item) =>
        item.id != null &&
        ticket.id != null &&
        String(item.id) === String(ticket.id)
    );

    const sold = Math.max(
      0,
      Number(original?.sold ?? ticket.sold ?? 0) || 0
    );

    return {
      ...(ticket.id != null ? { id: ticket.id } : {}),
      name: String(ticket.name ?? '').trim(),
      description: String(ticket.description ?? '').trim(),
      price: Number(ticket.price),
      capacity: Number(ticket.capacity),
      sold,
    };
  });

  for (const ticket of ticketTypes) {
    if (!ticket.name) {
      return {
        error: 'กรุณากรอกชื่อประเภทตั๋วให้ครบทุกประเภท',
      };
    }

    if (!Number.isFinite(ticket.price) || ticket.price < 0) {
      return {
        error: 'ราคาตั๋วต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป',
      };
    }

    if (
      !Number.isInteger(ticket.capacity) ||
      ticket.capacity < 1
    ) {
      return {
        error: 'ความจุตั๋วแต่ละประเภทต้องเป็นจำนวนเต็มอย่างน้อย 1',
      };
    }

    if (ticket.capacity < ticket.sold) {
      return {
        error: `ประเภทตั๋ว "${ticket.name}" มีผู้ซื้อแล้ว ${ticket.sold} ใบ จึงลดความจุต่ำกว่านี้ไม่ได้`,
      };
    }
  }

  return { ticketTypes };
};

export default function ManageEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [saving, setSaving] = useState(false);

  const [drawer, setDrawer] = useState({
    open: false,
    mode: 'create',
    event: null,
  });

  const [attendeesDrawer, setAttendeesDrawer] = useState({
    open: false,
    event: null,
    attendees: [],
    loading: false,
    error: '',
  });

  const attendeesRequestId = useRef(0);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const result = await eventService.getAllEventsAcrossPages({
        size: 100,
      });

      setEvents(getResponseItems(result).map(mapApiEvent));
    } catch (error) {
      setPageError(
        error?.message || 'ไม่สามารถโหลดรายการกิจกรรมจาก Backend ได้'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const stats = useMemo(() => {
    const total = events.length;

    const open = events.filter(
      (event) =>
        event.status === 'OPEN' ||
        (!event.status && event.seats < event.max)
    ).length;

    const totalSeats = events.reduce(
      (sum, event) => sum + Number(event.max || 0),
      0
    );

    const totalRegistered = events.reduce(
      (sum, event) => sum + Number(event.seats || 0),
      0
    );

    return {
      total,
      open,
      totalSeats,
      totalRegistered,
    };
  }, [events]);

  const openCreateDrawer = () => {
    if (saving) return;

    setDrawer({
      open: true,
      mode: 'create',
      event: null,
    });
  };

  const openEditDrawer = async (event) => {
    if (saving) return;

    try {
      const response = await eventService.getEventById(event.id);
      const detail = response?.data ?? response;

      if (!detail || !Array.isArray(detail.ticketTypes)) {
        throw new Error('ไม่พบข้อมูลประเภทบัตรของกิจกรรม');
      }

      const fullEvent = mapApiEvent({
        ...event,
        ...detail,
        detailImages: Array.isArray(detail.detailImages)
          ? detail.detailImages
          : [],
        ticketTypes: detail.ticketTypes,
      });

      setDrawer({
        open: true,
        mode: 'edit',
        event: fullEvent,
      });
    } catch (error) {
      console.error('Failed to load event details:', error);

      window.alert(
        `ไม่สามารถโหลดรายละเอียดกิจกรรมได้: ${
          error?.message || 'กรุณาลองใหม่อีกครั้ง'
        }`
      );
    }
  };

  const closeDrawer = () => {
    if (!saving) {
      setDrawer((current) => ({
        ...current,
        open: false,
      }));
    }
  };

  const closeAttendees = () => {
    attendeesRequestId.current += 1;

    setAttendeesDrawer((current) => ({
      ...current,
      open: false,
      loading: false,
    }));
  };

  const openAttendees = async (event) => {
    const requestId = ++attendeesRequestId.current;

    setAttendeesDrawer({
      open: true,
      event,
      attendees: [],
      loading: true,
      error: '',
    });

    try {
      const response = await eventService.getEventAttendees(event.id);
      const attendees = getResponseItems(response);

      if (requestId !== attendeesRequestId.current) return;

      setAttendeesDrawer((current) => ({
        ...current,
        attendees,
        loading: false,
        error: '',
      }));
    } catch (error) {
      if (requestId !== attendeesRequestId.current) return;

      setAttendeesDrawer((current) => ({
        ...current,
        loading: false,
        error:
          error?.message || 'ไม่สามารถโหลดรายชื่อผู้เข้าร่วมได้',
      }));
    }
  };

  const handleDelete = async (id) => {
    if (saving) return;

    const confirmed = window.confirm(
      'ยืนยันการลบกิจกรรมนี้หรือไม่?'
    );

    if (!confirmed) return;

    try {
      await eventService.deleteEvent(id);

      setEvents((previous) =>
        previous.filter(
          (event) => String(event.id) !== String(id)
        )
      );

      window.alert('ลบกิจกรรมเรียบร้อยแล้ว');
    } catch (error) {
      window.alert(
        `ลบกิจกรรมไม่สำเร็จ: ${
          error?.message || 'เกิดข้อผิดพลาด'
        }`
      );
    }
  };

  const handleSubmit = async (form, isEdit) => {
    if (saving) return;

    const name = String(form.name || '').trim();
    const place = String(form.place || '').trim();
    const description = String(form.desc || '').trim();
    const capacity = Number(form.max);
    const startsAt = String(form.date || '').trim();

    if (!name || !place || !startsAt) {
      window.alert('กรุณากรอกชื่อกิจกรรม สถานที่ และวันเวลา');
      return;
    }

    if (!Number.isInteger(capacity) || capacity <= 0) {
      window.alert('ความจุของกิจกรรมต้องเป็นจำนวนเต็มที่มากกว่า 0');
      return;
    }

    if (Number.isNaN(new Date(startsAt).getTime())) {
      window.alert('วันเวลาไม่ถูกต้อง');
      return;
    }

    const originalEvent = isEdit ? drawer.event : null;

    if (isEdit && !originalEvent) {
      window.alert(
        'ไม่พบกิจกรรมที่ต้องการแก้ไข กรุณาปิดแล้วลองใหม่'
      );
      return;
    }

    const registeredCount = Number(originalEvent?.seats || 0);

    if (isEdit && capacity < registeredCount) {
      window.alert(
        'ความจุใหม่ต้องไม่น้อยกว่าจำนวนผู้ลงทะเบียนปัจจุบัน'
      );
      return;
    }

    const result = prepareTicketTypes(
      form.ticketTypes,
      originalEvent
    );

    if (result.error) {
      window.alert(result.error);
      return;
    }

    const ticketTypes = result.ticketTypes;

    const ticketCapacityTotal = ticketTypes.reduce(
      (sum, ticket) => sum + ticket.capacity,
      0
    );

    if (ticketCapacityTotal !== capacity) {
      window.alert(
        `ผลรวมความจุของประเภทตั๋ว (${ticketCapacityTotal}) ต้องเท่ากับความจุรวมของกิจกรรม (${capacity}) กรุณาปรับจำนวนตั๋วแต่ละประเภทก่อนบันทึก`
      );
      return;
    }

    setSaving(true);

    // ไม่ส่ง sold ไป เพราะ Backend คำนวณจำนวนขายจากข้อมูลการลงทะเบียน
    const ticketTypesForRequest = ticketTypes.map(
      ({ sold, ...ticket }) => ticket
    );

    try {
      let imageUrl = originalEvent?.coverUrl || '';

      if (form.coverFile) {
        const uploadData = await eventService.uploadEventImage(
          form.coverFile
        );

        const uploadedUrl =
          typeof uploadData === 'string'
            ? uploadData
            : uploadData?.url ||
              uploadData?.imageUrl ||
              uploadData?.data?.url ||
              uploadData?.data?.imageUrl;

        if (!uploadedUrl || typeof uploadedUrl !== 'string') {
          throw new Error(
            'อัปโหลดรูปแล้ว แต่ไม่พบ URL ในผลลัพธ์จาก Backend'
          );
        }

        imageUrl = uploadedUrl;
      } else if (
        form.coverUrl &&
        !form.coverUrl.startsWith('blob:')
      ) {
        imageUrl = form.coverUrl;
      }

      const payload = {
        title: name,
        description,
        location: place,
        startsAt,
        capacity,
        category: toApiCategory(form.category),
        imageUrl,
        detailImages: originalEvent?.detailImages || [],
        ticketTypes: ticketTypesForRequest,
      };

      if (isEdit) {
        await eventService.updateEvent(originalEvent.id, payload);
      } else {
        await eventService.createEvent(payload);
      }

      setDrawer((current) => ({
        ...current,
        open: false,
      }));

      window.alert(
        isEdit
          ? 'บันทึกการแก้ไขกิจกรรมเรียบร้อยแล้ว'
          : 'สร้างกิจกรรมเรียบร้อยแล้ว'
      );

      await loadEvents();
    } catch (error) {
      window.alert(
        `${isEdit ? 'บันทึกการแก้ไข' : 'สร้างกิจกรรม'}ไม่สำเร็จ: ${
          error?.message || 'เกิดข้อผิดพลาด'
        }`
      );
    } finally {
      setSaving(false);
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
            aria-hidden="true"
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
              สร้างกิจกรรม ตรวจสอบจำนวนที่นั่ง และดูรายชื่อผู้เข้าร่วม
            </p>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={openCreateDrawer}
            disabled={saving}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
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

        {loading && (
          <p role="status">กำลังโหลดรายการกิจกรรม...</p>
        )}

        {!loading && pageError && (
          <section role="alert">
            <p>{pageError}</p>
            <button
              type="button"
              className="btn-primary"
              onClick={loadEvents}
            >
              ลองโหลดใหม่
            </button>
          </section>
        )}

        {!loading && !pageError && events.length === 0 && (
          <p>ยังไม่มีกิจกรรม</p>
        )}

        {!loading && !pageError && events.length > 0 && (
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
                    const capacity = Number(event.max || 0);
                    const registered = Number(event.seats || 0);

                    const fillPct =
                      capacity > 0
                        ? Math.min(
                            100,
                            Math.round((registered / capacity) * 100)
                          )
                        : 0;

                    const isOpen =
                      event.status === 'OPEN' ||
                      (!event.status && registered < capacity);

                    return (
                      <tr key={event.id}>
                        <td>
                          <div className="ev-cell">
                            <div
                              className={`ev-thumb ${
                                event.thumbClass || 'access'
                              }`}
                            >
                              {event.coverUrl ? (
                                <img
                                  src={event.coverUrl}
                                  alt=""
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                  }}
                                />
                              ) : (
                                '🎟️'
                              )}
                            </div>

                            <div>
                              <div className="ev-title">
                                {event.name}
                              </div>
                              <div className="ev-cat">
                                {CATEGORY_LABEL[event.category] ||
                                  event.category}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="dt-main">
                            {event.dateLabel}
                          </div>
                          <div className="dt-sub">
                            {event.place}
                          </div>
                        </td>

                        <td>
                          <div className="seats-num">
                            {registered} / {capacity}
                          </div>
                          <div className="seats-bar">
                            <div
                              className="seats-fill"
                              style={{
                                '--fill': `${fillPct}%`,
                              }}
                            />
                          </div>
                        </td>

                        <td>
                          <span className="status">
                            <span className="dot" />
                            {event.status === 'ENDED'
                              ? 'สิ้นสุดแล้ว'
                              : event.status === 'FULL'
                                ? 'เต็มแล้ว'
                                : isOpen
                                  ? 'เปิดรับลงทะเบียน'
                                  : 'เต็มแล้ว'}
                          </span>
                        </td>

                        <td>
                          <div className="actions">
                            <button
                              type="button"
                              className="icon-btn"
                              title="ดูรายชื่อผู้เข้าร่วม"
                              onClick={() => openAttendees(event)}
                            >
                              👥
                            </button>

                            <button
                              type="button"
                              className="icon-btn"
                              title="แก้ไข"
                              onClick={() => openEditDrawer(event)}
                              disabled={saving}
                            >
                              ✏️
                            </button>

                            <button
                              type="button"
                              className="icon-btn danger"
                              title="ลบ"
                              onClick={() => handleDelete(event.id)}
                              disabled={saving}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      <EventDrawer
        open={drawer.open}
        mode={drawer.mode}
        initialEvent={
          drawer.event
            ? {
                id: drawer.event.id,
                name: drawer.event.name,
                desc: drawer.event.desc,
                place: drawer.event.place,
                category: drawer.event.category,
                date: drawer.event.date,
                max: drawer.event.max,
                coverIndex: drawer.event.coverIndex,
                coverUrl: drawer.event.coverUrl,
                ticketTypes: drawer.event.ticketTypes || [],
                detailImages: drawer.event.detailImages || [],
              }
            : null
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
        attendees={attendeesDrawer.attendees}
        loading={attendeesDrawer.loading}
        error={attendeesDrawer.error}
        onClose={closeAttendees}
      />
    </>
  );
}