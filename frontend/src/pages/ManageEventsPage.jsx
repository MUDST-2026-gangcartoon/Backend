
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

import AdminNavbar from '../components/AdminNavbar.jsx';
import EventDrawer from '../components/EventDrawer.jsx';
import EventFilterBar, {
  Highlight,
} from '../components/EventFilterBar.jsx';

import {
  showAppAlert,
  showAppConfirm,
} from '../components/AppDialog.jsx';

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

  if (match) {
    return `${match[1]}T${match[2]}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const pad = (number) => String(number).padStart(2, '0');

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const formatDate = (value) => {
  if (!value) return 'ไม่ระบุวันเวลา';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// อ่าน URL รูปจากชื่อฟิลด์ที่อาจพบในข้อมูล API
const getEventImageUrl = (...sources) => {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;

    const candidates = [
      source.imageUrl,
      source.coverUrl,
      source.image,
      source.coverImageUrl,
      source.data?.imageUrl,
      source.data?.coverUrl,
      source.data?.image,
      source.data?.coverImageUrl,
    ];

    for (const candidate of candidates) {
      if (
        typeof candidate === 'string' &&
        candidate.trim()
      ) {
        return candidate.trim();
      }
    }
  }

  return '';
};

const mapApiEvent = (event) => {
  const category = toApiCategory(event.category);
  const imageUrl = getEventImageUrl(event);

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
    coverUrl: imageUrl,
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
  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }
  if (Array.isArray(response?.data?.content)) {
    return response.data.content;
  }

  return [];
};

const prepareTicketTypes = (formTicketTypes, originalEvent) => {
  if (
    !Array.isArray(formTicketTypes) ||
    formTicketTypes.length === 0
  ) {
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

// แปลง Data URL ที่โหลดกลับจาก localStorage ให้เป็นไฟล์จริง
const dataUrlToFile = async (
  dataUrl,
  filename = 'event-cover'
) => {
  if (
    typeof dataUrl !== 'string' ||
    !dataUrl.startsWith('data:image/')
  ) {
    return null;
  }

  const response = await fetch(dataUrl);
  const blob = await response.blob();

  const extensionByType = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  };

  const extension = extensionByType[blob.type] || 'jpg';

  return new File(
    [blob],
    `${filename}.${extension}`,
    {
      type: blob.type || 'image/jpeg',
    }
  );
};

const getUploadedImageUrl = (uploadData) => {
  const url =
    typeof uploadData === 'string'
      ? uploadData
      : uploadData?.url ||
        uploadData?.imageUrl ||
        uploadData?.data?.url ||
        uploadData?.data?.imageUrl;

  if (
    typeof url !== 'string' ||
    !url.trim() ||
    url.startsWith('data:') ||
    url.length > 2000
  ) {
    throw new Error(
      'อัปโหลดรูปไม่สำเร็จ หรือ URL รูปภาพที่ได้รับไม่ถูกต้อง'
    );
  }

  return url.trim();
};

export default function ManageEventsPage() {
  const navigate = useNavigate();

  const {
    filters,
    setFilter,
    clear,
    activeCount,
  } = useEventFilters();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [saving, setSaving] = useState(false);

  const [drawer, setDrawer] = useState({
    open: false,
    mode: 'create',
    event: null,
  });

  // โหลดรายการกิจกรรมจาก Backend
  const loadEvents = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const result =
        await eventService.getAllEventsAcrossPages({
          size: 100,
        });

      setEvents(
        getResponseItems(result).map(mapApiEvent)
      );
    } catch (error) {
      setPageError(
        error?.message ||
          'ไม่สามารถโหลดรายการกิจกรรมจาก Backend ได้'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // ค้นหา กรอง และเรียงลำดับกิจกรรม
  const visibleEvents = useMemo(
    () =>
      sortEvents(
        applyEventFilters(events, filters),
        filters.sort
      ),
    [events, filters]
  );

  const facetCounts = useMemo(
    () => getFacetCounts(events, filters),
    [events, filters]
  );

  // เปิด Drawer สำหรับสร้างกิจกรรม
  const openCreateDrawer = () => {
    if (saving) return;

    setDrawer({
      open: true,
      mode: 'create',
      event: null,
    });
  };

  // เปิด Drawer สำหรับแก้ไขกิจกรรม
  const openEditDrawer = async (event) => {
    if (saving) return;

    try {
      const response =
        await eventService.getEventById(event.id);

      const detail = response?.data ?? response;

      if (!detail || !Array.isArray(detail.ticketTypes)) {
        throw new Error(
          'ไม่พบข้อมูลประเภทบัตรของกิจกรรม'
        );
      }

      const detailImageUrl = getEventImageUrl(detail);
      const eventImageUrl = getEventImageUrl(event);

      const fullEvent = mapApiEvent({
        ...event,
        ...detail,
        imageUrl:
          detailImageUrl ||
          eventImageUrl ||
          '',
        coverUrl:
          detailImageUrl ||
          eventImageUrl ||
          '',
        detailImages: Array.isArray(detail.detailImages)
          ? detail.detailImages
          : Array.isArray(event.detailImages)
            ? event.detailImages
            : [],
        ticketTypes: detail.ticketTypes,
      });

      setDrawer({
        open: true,
        mode: 'edit',
        event: fullEvent,
      });
    } catch (error) {
      console.error(
        'Failed to load event details:',
        error
      );

      showAppAlert(
        `ไม่สามารถโหลดรายละเอียดกิจกรรมได้: ${
          error?.message || 'กรุณาลองใหม่อีกครั้ง'
        }`,
        { title: 'โหลดข้อมูลไม่สำเร็จ' }
      );
    }
  };

  // ปิด Drawer
  const closeDrawer = () => {
    if (!saving) {
      setDrawer((current) => ({
        ...current,
        open: false,
      }));
    }
  };

  // ลบกิจกรรมด้วย Popup ยืนยันสีฟ้า
  const handleDelete = async (id) => {
    if (saving) return;

    const confirmed = await showAppConfirm(
      'ยืนยันการลบกิจกรรมนี้หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
      { title: 'ยืนยันการลบกิจกรรม' }
    );

    if (!confirmed) return;

    try {
      await eventService.deleteEvent(id);

      setEvents((previous) =>
        previous.filter(
          (event) => String(event.id) !== String(id)
        )
      );

      showAppAlert('ลบกิจกรรมเรียบร้อยแล้ว', {
        title: 'ลบกิจกรรมสำเร็จ',
      });
    } catch (error) {
      showAppAlert(
        `ลบกิจกรรมไม่สำเร็จ: ${
          error?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
        }`,
        { title: 'ลบกิจกรรมไม่สำเร็จ' }
      );
    }
  };

  // สร้างหรือแก้ไขกิจกรรม
  const handleSubmit = async (form, isEdit) => {
    if (saving) return;

    const name = String(form.name || '').trim();
    const place = String(form.place || '').trim();
    const description = String(form.desc || '').trim();
    const capacity = Number(form.max);
    const startsAt = String(form.date || '').trim();

    if (!name || !place || !startsAt) {
      showAppAlert(
        'กรุณากรอกชื่อกิจกรรม สถานที่ และวันเวลา',
        { title: 'กรุณาตรวจสอบข้อมูล' }
      );
      return;
    }

    if (!Number.isInteger(capacity) || capacity <= 0) {
      showAppAlert(
        'ความจุของกิจกรรมต้องเป็นจำนวนเต็มที่มากกว่า 0',
        { title: 'ความจุไม่ถูกต้อง' }
      );
      return;
    }

    if (Number.isNaN(new Date(startsAt).getTime())) {
      showAppAlert('วันเวลาไม่ถูกต้อง', {
        title: 'กรุณาตรวจสอบวันเวลา',
      });
      return;
    }

    const originalEvent = isEdit ? drawer.event : null;

    if (isEdit && !originalEvent) {
      showAppAlert(
        'ไม่พบกิจกรรมที่ต้องการแก้ไข กรุณาปิดแล้วลองใหม่',
        { title: 'ไม่พบกิจกรรม' }
      );
      return;
    }

    const registeredCount = Number(
      originalEvent?.seats || 0
    );

    if (isEdit && capacity < registeredCount) {
      showAppAlert(
        'ความจุใหม่ต้องไม่น้อยกว่าจำนวนผู้ลงทะเบียนปัจจุบัน',
        { title: 'ความจุไม่ถูกต้อง' }
      );
      return;
    }

    const result = prepareTicketTypes(
      form.ticketTypes,
      originalEvent
    );

    if (result.error) {
      showAppAlert(result.error, {
        title: 'กรุณาตรวจสอบประเภทตั๋ว',
      });
      return;
    }

    const ticketTypes = result.ticketTypes;

    const ticketCapacityTotal = ticketTypes.reduce(
      (sum, ticket) => sum + ticket.capacity,
      0
    );

    if (ticketCapacityTotal !== capacity) {
      showAppAlert(
        `ผลรวมความจุของประเภทตั๋ว (${ticketCapacityTotal}) ต้องเท่ากับความจุรวมของกิจกรรม (${capacity}) กรุณาปรับจำนวนตั๋วแต่ละประเภทก่อนบันทึก`,
        { title: 'ความจุตั๋วไม่ตรงกัน' }
      );
      return;
    }

    setSaving(true);

    const ticketTypesForRequest = ticketTypes.map(
      ({ sold, ...ticket }) => ticket
    );

    try {
      let imageUrl = originalEvent?.coverUrl || '';

      // ใช้ไฟล์ต้นฉบับถ้ายังอยู่ใน state
      let fileToUpload = form.coverFile || null;

      // ถ้ารีเฟรชหรือเปิด Drawer ใหม่ File object จะหายไป
      // แต่ Data URL ยังอยู่ใน localStorage จึงแปลงกลับเป็นไฟล์
      if (
        !fileToUpload &&
        typeof form.coverUrl === 'string' &&
        form.coverUrl.startsWith('data:image/')
      ) {
        fileToUpload = await dataUrlToFile(
          form.coverUrl,
          `event-cover-${form.coverIndex ?? 0}`
        );
      }

      if (fileToUpload) {
        // อัปโหลดไฟล์ก่อน ไม่ส่ง Base64 เข้า imageUrl
        const uploadData =
          await eventService.uploadEventImage(fileToUpload);

        imageUrl = getUploadedImageUrl(uploadData);
      } else if (
        typeof form.coverUrl === 'string' &&
        form.coverUrl.trim() &&
        !form.coverUrl.startsWith('blob:') &&
        !form.coverUrl.startsWith('data:')
      ) {
        // URL ปกติสามารถส่งให้ Backend ได้โดยตรง
        imageUrl = form.coverUrl.trim();
      }

      if (imageUrl.length > 2000) {
        throw new Error(
          'URL รูปภาพยาวเกิน 2000 ตัวอักษร กรุณาใช้ URL ที่ได้จากการอัปโหลดรูป'
        );
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
        await eventService.updateEvent(
          originalEvent.id,
          payload
        );
      } else {
        await eventService.createEvent(payload);
      }

      setDrawer((current) => ({
        ...current,
        open: false,
      }));

      showAppAlert(
        isEdit
          ? 'บันทึกการแก้ไขกิจกรรมเรียบร้อยแล้ว'
          : 'สร้างกิจกรรมเรียบร้อยแล้ว',
        {
          title: isEdit
            ? 'บันทึกสำเร็จ'
            : 'สร้างกิจกรรมสำเร็จ',
        }
      );

      await loadEvents();
    } catch (error) {
      console.error('บันทึกกิจกรรมไม่สำเร็จ:', error);

      showAppAlert(
        `${isEdit ? 'บันทึกการแก้ไข' : 'สร้างกิจกรรม'}ไม่สำเร็จ: ${
          error?.message || 'เกิดข้อผิดพลาด'
        }`,
        { title: 'บันทึกไม่สำเร็จ' }
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
              สร้างกิจกรรม ตรวจสอบจำนวนที่นั่ง
              และแก้ไขรายละเอียดอีเวนต์
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
          <p role="status">
            กำลังโหลดรายการกิจกรรม...
          </p>
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
          />
        )}

        {!loading &&
          !pageError &&
          events.length > 0 &&
          visibleEvents.length === 0 && (
            <div className="ef-empty">
              <strong>
                ไม่พบอีเวนต์ที่ตรงกับเงื่อนไข
              </strong>
              <p>
                ลองลดคำค้นหา หรือเอาตัวกรองบางอย่างออก
              </p>
              <div>
                <button
                  type="button"
                  className="ef-clear"
                  onClick={clear}
                >
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
                      <th className="align-right">
                        จัดการ
                      </th>
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
                              Math.round(
                                (registered / capacity) * 100
                              )
                            )
                          : 0;

                      const isOpen =
                        event.status === 'OPEN' ||
                        (!event.status &&
                          registered < capacity);

                      const imageUrl = resolveImageUrl(
                        event.coverUrl
                      );

                      return (
                        <tr key={event.id}>
                          <td>
                            <div className="ev-cell">
                              <div
                                className={`ev-thumb ${
                                  event.thumbClass || 'access'
                                }`}
                              >
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt=""
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                    }}
                                    onError={(error) => {
                                      error.currentTarget.style.display =
                                        'none';
                                    }}
                                  />
                                ) : (
                                  '🎟️'
                                )}
                              </div>

                              <div>
                                <div className="ev-title">
                                  <Highlight
                                    text={event.name}
                                    query={filters.q}
                                  />
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
                              <Highlight
                                text={event.place}
                                query={filters.q}
                              />
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
                                title="ผู้ลงทะเบียน"
                                onClick={() =>
                                  navigate(
                                    `/admin/dashboard?event=${event.id}`
                                  )
                                }
                              >
                                👥
                              </button>

                              <button
                                type="button"
                                className="icon-btn"
                                title="แก้ไข"
                                onClick={() =>
                                  openEditDrawer(event)
                                }
                                disabled={saving}
                              >
                                ✏️
                              </button>

                              <button
                                type="button"
                                className="icon-btn danger"
                                title="ลบ"
                                onClick={() =>
                                  handleDelete(event.id)
                                }
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
    </>
  );
}
