
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Icon from '../components/Icon.jsx';
import { useNavigate } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EventDrawer from '../components/EventDrawer.jsx';
import AttendeesDrawer from '../components/AttendeesDrawer.jsx';
import { MOCK_BOOKINGS, isMockMode } from '../data/mockBookings.js';
import EventFilterBar, { Highlight } from '../components/EventFilterBar.jsx';
import { useEventFilters } from '../hooks/useEventFilters.js';
import {
  applyEventFilters,
  getFacetCounts,
  sortEvents,
} from '../utils/eventFilters.js';
import { eventService } from '../api/eventService.js';
import { resolveImageUrl } from '../api/apiClient.js';

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
    endsAt: toLocalDateTime(event.endsAt),
    registrationClosesAt: toLocalDateTime(event.registrationClosesAt),
    checkinEnabled: event.checkinEnabled !== false,
    organizerName: event.organizerName || event.organizer || '',
    contactInfo: event.contactInfo || event.contact || '',
    locationType: event.locationType === 'ONLINE' ? 'ONLINE' : 'ONSITE',
    onlineUrl: event.onlineUrl || '',
  };
};

// เหตุผลที่ลบอีเวนต์ไม่ได้ (null = ลบได้) ให้หลังบ้านเป็นผู้ตัดสินสุดท้าย
const getDeleteBlockReason = (event) => {
  if (event.deleteBlockedReason) return String(event.deleteBlockedReason);

  const registered = Number(event.seats || 0);
  const sold = (event.ticketTypes || []).reduce(
    (sum, ticket) => sum + Number(ticket.sold || 0),
    0
  );

  if (registered > 0 || sold > 0) {
    return `ลบไม่ได้: มีผู้ลงทะเบียน/ซื้อบัตรแล้ว ${Math.max(registered, sold)} รายการ ให้ปิดรับสมัครแทน`;
  }
  if (Number(event.checkedInCount || 0) > 0) {
    return 'ลบไม่ได้: มีประวัติการเช็กอินแล้ว';
  }
  return null;
};

// แปลง error จากหลังบ้านเป็นข้อความใต้ช่องฟอร์ม
const FIELD_ERROR_MAP = {
  title: 'name',
  description: 'desc',
  location: 'place',
  startsAt: 'date',
  capacity: 'max',
  imageUrl: 'coverUrl',
  endsAt: 'endsAt',
  registrationClosesAt: 'registrationClosesAt',
  onlineUrl: 'onlineUrl',
  locationType: 'locationType',
};

const extractFieldErrors = (error) => {
  const raw = error?.fieldErrors || error?.errors || error?.data?.errors;
  if (!raw || typeof raw !== 'object') return null;

  const entries = Array.isArray(raw)
    ? raw.map((item) => [item.field, item.message])
    : Object.entries(raw);

  const result = {};
  entries.forEach(([field, message]) => {
    const key = FIELD_ERROR_MAP[field];
    if (key && message) result[key] = String(message);
  });
  return Object.keys(result).length ? result : null;
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
  const navigate = useNavigate();

  // กล่องยืนยัน/แจ้งผล แทน window.confirm และ window.alert เพื่อให้สีตรงกับ popup อื่น
  const [dialog, setDialog] = useState(null);

  const showNotice = (message) => {
    const text = String(message ?? '');
    const isError = /ไม่สำเร็จ|ผิดพลาด/.test(text);

    setDialog({
      type: 'notice',
      tone: isError ? 'danger' : 'primary',
      title: isError ? 'เกิดข้อผิดพลาด' : 'แจ้งเตือน',
      message: text,
    });
  };
  const { filters, setFilter, clear, activeCount } = useEventFilters();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState(null);

  const mockMode = isMockMode();
  const [attendeesView, setAttendeesView] = useState({
    open: false,
    event: null,
    bookings: [],
    loading: false,
    error: '',
  });

  const [drawer, setDrawer] = useState({
    open: false,
    mode: 'create',
    event: null,
  });


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

  // ค้นหา/กรอง/เรียง ทำฝั่งหน้าจอจากรายการที่โหลดมาแล้ว
  const visibleEvents = useMemo(
    () => sortEvents(applyEventFilters(events, filters), filters.sort),
    [events, filters],
  );
  const facetCounts = useMemo(
    () => getFacetCounts(events, filters),
    [events, filters],
  );

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
      console.log('Selected event from list:', event);

      const response = await eventService.getEventById(event.id);
      const detail = response?.data ?? response;

      console.log('Event detail from Backend:', detail);

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

      console.log('Loaded event:', fullEvent);
      console.log('Event ID:', fullEvent.id);
      console.log('Event capacity:', fullEvent.max);
      console.log('Registered count:', fullEvent.seats);
      console.log('Ticket types:', fullEvent.ticketTypes);

      setDrawer({
        open: true,
        mode: 'edit',
        event: fullEvent,
      });
    } catch (error) {
      console.error('Failed to load event details:', error);

      showNotice(
        `ไม่สามารถโหลดรายละเอียดกิจกรรมได้: ${
          error?.message || 'กรุณาลองใหม่อีกครั้ง'
        }`
      );
    }
  };

  const loadAttendees = async (event) => {
    setAttendeesView({ open: true, event, bookings: [], loading: true, error: '' });

    if (mockMode) {
      setAttendeesView({ open: true, event, bookings: MOCK_BOOKINGS, loading: false, error: '' });
      return;
    }

    try {
      const response = await eventService.getEventAttendees(event.id);
      const items = getResponseItems(response?.data ?? response);
      setAttendeesView({ open: true, event, bookings: items, loading: false, error: '' });
    } catch (error) {
      setAttendeesView({
        open: true,
        event,
        bookings: [],
        loading: false,
        error: error?.message || 'เกิดข้อผิดพลาด',
      });
    }
  };

  const closeDrawer = () => {
    setServerErrors(null);
    if (!saving) {
      setDrawer((current) => ({
        ...current,
        open: false,
      }));
    }
  };

  const handleDelete = (id) => {
    if (saving) return;

    const target = events.find((event) => String(event.id) === String(id));
    const blockReason = target ? getDeleteBlockReason(target) : null;

    if (blockReason) {
      setDialog({
        type: 'notice',
        tone: 'danger',
        title: 'ลบอีเวนต์ไม่ได้',
        message: blockReason,
      });
      return;
    }

    setDialog({
      type: 'confirm-delete',
      id,
      name: target?.name || '',
    });
  };

  const confirmDelete = async () => {
    const { id } = dialog;
    setDialog((current) => ({ ...current, busy: true }));

    try {
      await eventService.deleteEvent(id);

      setEvents((previous) =>
        previous.filter((event) => String(event.id) !== String(id))
      );

      setDialog({
        type: 'notice',
        title: 'ลบกิจกรรมเรียบร้อยแล้ว',
        message: '',
      });
    } catch (error) {
      setDialog({
        type: 'notice',
        tone: 'danger',
        title: 'ลบกิจกรรมไม่สำเร็จ',
        message: error?.message || 'เกิดข้อผิดพลาด',
      });
    }
  };

  const handleSubmit = async (form, isEdit) => {
    if (saving) return;

    console.log('Event capacity:', form.max);
    console.log('Ticket types:', form.ticketTypes);

    const name = String(form.name || '').trim();
    const place = String(form.place || '').trim();
    const description = String(form.desc || '').trim();
    const capacity = Number(form.max);
    const startsAt = String(form.date || '').trim();

    if (!name || !place || !startsAt) {
      showNotice('กรุณากรอกชื่อกิจกรรม สถานที่ และวันเวลา');
      return;
    }

    if (!Number.isInteger(capacity) || capacity <= 0) {
      showNotice('ความจุของกิจกรรมต้องเป็นจำนวนเต็มที่มากกว่า 0');
      return;
    }

    if (Number.isNaN(new Date(startsAt).getTime())) {
      showNotice('วันเวลาไม่ถูกต้อง');
      return;
    }

    const originalEvent = isEdit ? drawer.event : null;

    if (isEdit && !originalEvent) {
      showNotice(
        'ไม่พบกิจกรรมที่ต้องการแก้ไข กรุณาปิดแล้วลองใหม่'
      );
      return;
    }

    const registeredCount = Number(originalEvent?.seats || 0);

    if (isEdit && capacity < registeredCount) {
      showNotice(
        'ความจุใหม่ต้องไม่น้อยกว่าจำนวนผู้ลงทะเบียนปัจจุบัน'
      );
      return;
    }

    const result = prepareTicketTypes(
      form.ticketTypes,
      originalEvent
    );

    if (result.error) {
      showNotice(result.error);
      return;
    }

    const ticketTypes = result.ticketTypes;

    const ticketCapacityTotal = ticketTypes.reduce(
      (sum, ticket) => sum + ticket.capacity,
      0
    );

    if (ticketCapacityTotal !== capacity) {
      showNotice(
        `ผลรวมความจุของประเภทตั๋ว (${ticketCapacityTotal}) ต้องเท่ากับความจุรวมของกิจกรรม (${capacity}) กรุณาปรับจำนวนตั๋วแต่ละประเภทก่อนบันทึก`
      );
      return;
    }

    setSaving(true);
    setServerErrors(null);

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

        // เก็บ path ที่ Backend ส่งกลับมาในข้อมูลกิจกรรม
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
        ticketTypes: ticketTypesForRequest.map((ticket, index) => ({
          ...ticket,
          saleOpen: form.ticketTypes[index]?.saleOpen !== false,
        })),
        endsAt: form.endsAt || null,
        registrationClosesAt: form.registrationClosesAt || null,
        checkinEnabled: form.checkinEnabled !== false,
        organizerName: String(form.organizerName || '').trim(),
        contactInfo: String(form.contactInfo || '').trim(),
        locationType: form.locationType === 'ONLINE' ? 'ONLINE' : 'ONSITE',
        onlineUrl:
          form.locationType === 'ONLINE'
            ? String(form.onlineUrl || '').trim()
            : null,
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

      showNotice(
        isEdit
          ? 'บันทึกการแก้ไขกิจกรรมเรียบร้อยแล้ว'
          : 'สร้างกิจกรรมเรียบร้อยแล้ว'
      );

      await loadEvents();
    } catch (error) {
      const fieldErrors = extractFieldErrors(error);

      if (fieldErrors) {
        // แสดงใต้ช่องเดิมใน Drawer แทน popup
        setServerErrors({ ...fieldErrors });
        return;
      }

      showNotice(
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
              สร้างกิจกรรม ตรวจสอบจำนวนที่นั่ง และแก้ไขรายละเอียดอีเวนต์
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
          <EventFilterBar
            filters={filters}
            setFilter={setFilter}
            clear={clear}
            activeCount={activeCount}
            counts={facetCounts}
            total={events.length}
            shown={visibleEvents.length}
            searchPlaceholder="ค้นหาชื่อ สถานที่ หรือหมวดหมู่"
            showDayFilter
          />
        )}

        {!loading &&
          !pageError &&
          events.length > 0 &&
          visibleEvents.length === 0 && (
            <div className="ef-empty">
              <strong>ไม่พบอีเวนต์ที่ตรงกับเงื่อนไข</strong>
              ลองลดคำค้นหา หรือเอาตัวกรองบางอย่างออก
              <div>
                <button type="button" className="ef-clear" onClick={clear}>
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            </div>
          )}

        {!loading &&
          !pageError &&
          visibleEvents.length > 0 && (
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
                  {visibleEvents.map((event) => {
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
                                  src={resolveImageUrl(event.coverUrl)}
                                  alt=""
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                  }}
                                />
                              ) : (
                                <Icon name="ticket" size="1.4em" />
                              )}
                            </div>

                            <div>
                              <div className="ev-title">
                                <Highlight text={event.name} query={filters.q} />
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
                            <Highlight text={event.place} query={filters.q} />
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
                              title="ดูรายชื่อผู้เข้าร่วมและรายงาน"
                              aria-label="ดูรายชื่อผู้เข้าร่วมและรายงาน"
                              onClick={() => loadAttendees(event)}
                            >
                              <Icon name="users" />
                            </button>

                            <button
                              type="button"
                              className="icon-btn"
                              title="แก้ไข"
                              onClick={() => openEditDrawer(event)}
                              disabled={saving}
                            >
                              <Icon name="edit" />
                            </button>

                            <button
                              type="button"
                              className="icon-btn danger"
                              title={getDeleteBlockReason(event) || 'ลบ'}
                              aria-label={getDeleteBlockReason(event) || 'ลบอีเวนต์'}
                              aria-disabled={Boolean(getDeleteBlockReason(event))}
                              style={getDeleteBlockReason(event) ? { opacity: 0.45 } : undefined}
                              onClick={() => handleDelete(event.id)}
                              disabled={saving}
                            >
                              <Icon name="trash" />
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
                seats: drawer.event.seats,
                endsAt: drawer.event.endsAt,
                registrationClosesAt: drawer.event.registrationClosesAt,
                checkinEnabled: drawer.event.checkinEnabled,
                organizerName: drawer.event.organizerName,
                contactInfo: drawer.event.contactInfo,
                locationType: drawer.event.locationType,
                onlineUrl: drawer.event.onlineUrl,
                ticketTypes: drawer.event.ticketTypes || [],
                detailImages: drawer.event.detailImages || [],
              }
            : null
        }
        onClose={closeDrawer}
        onSubmit={handleSubmit}
        serverErrors={serverErrors}
      />

      <AttendeesDrawer
        open={attendeesView.open}
        event={attendeesView.event}
        bookings={attendeesView.bookings}
        loading={attendeesView.loading}
        error={attendeesView.error}
        mock={mockMode}
        onRetry={() => loadAttendees(attendeesView.event)}
        onClose={() =>
          setAttendeesView((current) => ({ ...current, open: false }))
        }
      />

      <ConfirmDialog
        open={dialog?.type === 'confirm-delete'}
        title="ยืนยันการลบอีเวนต์"
        message={`ต้องการลบ${
          dialog?.name ? ` “${dialog.name}”` : 'อีเวนต์นี้'
        } หรือไม่ การลบไม่สามารถย้อนกลับได้`}
        confirmLabel="ลบอีเวนต์"
        tone="danger"
        loading={Boolean(dialog?.busy)}
        onConfirm={confirmDelete}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog?.type === 'notice'}
        title={dialog?.title}
        message={dialog?.message}
        cancelLabel={null}
        tone={dialog?.tone === 'danger' ? 'danger' : 'primary'}
        onConfirm={() => setDialog(null)}
        onCancel={() => setDialog(null)}
      />

    </>
  );
}
