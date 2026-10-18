// ตัวช่วยค้นหา/กรอง/เรียงอีเวนต์ ใช้ร่วมกันระหว่างหน้า Dashboard และหน้าจัดการอีเวนต์

export const CATEGORY_META = {
  TECH: { label: 'เทคโนโลยี', color: '#38BDF8' },
  DESIGN: { label: 'ออกแบบ', color: '#7C5CB8' },
  CAREER: { label: 'อาชีพ', color: '#FF6B4A' },
  COMMUNITY: { label: 'ชุมชน', color: '#B0F135' },
};

const CATEGORY_ALIASES = {
  Design: 'DESIGN',
  Engineering: 'TECH',
  'เวิร์กช็อป': 'TECH',
  'สัตว์เลี้ยง': 'COMMUNITY',
  'ไลฟ์สไตล์': 'COMMUNITY',
};

export function normalizeCategory(value) {
  const text = String(value ?? '').trim();
  const key = CATEGORY_ALIASES[text] || text.toUpperCase();
  return CATEGORY_META[key] ? key : 'COMMUNITY';
}

export const STATUS_OPTIONS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'open', label: 'เปิดรับ' },
  { key: 'nearfull', label: 'ใกล้เต็ม' },
  { key: 'full', label: 'เต็มแล้ว' },
  { key: 'ended', label: 'จบแล้ว' },
];

export const WHEN_OPTIONS = [
  { key: 'all', label: 'ทุกช่วงเวลา' },
  { key: 'week', label: '7 วันข้างหน้า' },
  { key: 'month', label: '30 วันข้างหน้า' },
  { key: 'past', label: 'ผ่านไปแล้ว' },
];

export const SORT_OPTIONS = [
  { key: 'soon', label: 'ใกล้วันจัดงานก่อน' },
  { key: 'popular', label: 'คนลงทะเบียนมากสุด' },
  { key: 'fill', label: 'ที่นั่งใกล้เต็มสุด' },
  { key: 'name', label: 'ชื่อ ก–ฮ' },
];

export const NEAR_FULL_PERCENT = 80;
const DAY_MS = 24 * 60 * 60 * 1000;

// รองรับทั้งข้อมูลจาก API ตรง ๆ และข้อมูลที่ผ่าน mapApiEvent ของหน้าจัดการอีเวนต์
function normalize(event) {
  const capacity = Number(event.capacity ?? event.max ?? 0) || 0;
  const registered =
    Number(event.registeredCount ?? event.seats ?? 0) || 0;
  const startsAtRaw = event.startsAt || event.date || null;
  const startsAt = startsAtRaw ? new Date(startsAtRaw).getTime() : NaN;

  return {
    name: String(event.title || event.name || ''),
    place: String(event.location || event.place || ''),
    category: normalizeCategory(event.category),
    capacity,
    registered,
    percent: capacity > 0 ? Math.round((registered / capacity) * 100) : 0,
    startsAt: Number.isFinite(startsAt) ? startsAt : null,
    status: String(event.status || '').toUpperCase(),
  };
}

export function getEventState(event) {
  const info = normalize(event);

  if (info.status === 'ENDED') return 'ended';
  if (
    info.status === 'FULL' ||
    (info.capacity > 0 && info.registered >= info.capacity)
  ) {
    return 'full';
  }
  if (info.percent >= NEAR_FULL_PERCENT) return 'nearfull';
  return 'open';
}

const STATE_LABEL = {
  open: 'เปิดรับลงทะเบียน',
  nearfull: 'ใกล้เต็ม เปิดรับลงทะเบียน',
  full: 'เต็มแล้ว',
  ended: 'สิ้นสุดแล้ว จบแล้ว',
};

// ค้นหาแบบแยกคำ: ทุกคำต้องพบ (ไม่สนตัวพิมพ์เล็กใหญ่) เช่น "tech ห้อง" หรือ "ออกแบบ เต็ม"
export function matchesTokens(haystack, query) {
  const tokens = String(query || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;

  const text = String(haystack || '').toLowerCase();
  return tokens.every((token) => text.includes(token));
}

function matchesWhen(info, when, now) {
  if (when === 'all') return true;
  if (info.startsAt === null) return false;

  const diff = info.startsAt - now;
  if (when === 'past') return diff < 0;
  if (when === 'week') return diff >= 0 && diff <= 7 * DAY_MS;
  if (when === 'month') return diff >= 0 && diff <= 30 * DAY_MS;
  return true;
}

// omit: ข้ามตัวกรองหนึ่งตัว ใช้คำนวณตัวเลขบนชิปแต่ละอัน
export function applyEventFilters(
  events,
  filters,
  { omit = null, extraText = null } = {},
) {
  const now = Date.now();

  return events.filter((event) => {
    const info = normalize(event);

    if (omit !== 'q' && filters.q) {
      const haystack = [
        info.name,
        info.place,
        CATEGORY_META[info.category].label,
        info.category, // พิมพ์ tech / design / career / community ก็เจอ
        STATE_LABEL[getEventState(event)],
        extraText ? extraText(event) : '',
      ].join(' ');

      if (!matchesTokens(haystack, filters.q)) return false;
    }

    if (
      omit !== 'status' &&
      filters.status !== 'all' &&
      (filters.status === 'open'
        ? !['open', 'nearfull'].includes(getEventState(event))
        : getEventState(event) !== filters.status)
    ) {
      return false;
    }

    if (omit !== 'cat' && filters.cat !== 'all' && info.category !== filters.cat) {
      return false;
    }

    if (omit !== 'when' && !matchesWhen(info, filters.when, now)) {
      return false;
    }

    return true;
  });
}

export function sortEvents(events, sort) {
  const now = Date.now();
  const list = events.map((event) => ({ event, info: normalize(event) }));

  list.sort((a, b) => {
    if (sort === 'popular') return b.info.registered - a.info.registered;
    if (sort === 'fill') return b.info.percent - a.info.percent;
    if (sort === 'name') return a.info.name.localeCompare(b.info.name, 'th');

    // soon: งานที่ยังไม่ถึงเรียงจากใกล้สุด แล้วตามด้วยงานที่ผ่านไปแล้ว (ล่าสุดก่อน)
    const aTime = a.info.startsAt;
    const bTime = b.info.startsAt;
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    const aUpcoming = aTime >= now;
    const bUpcoming = bTime >= now;
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    return aUpcoming ? aTime - bTime : bTime - aTime;
  });

  return list.map((item) => item.event);
}

// ตัวเลขบนชิปแต่ละตัว นับโดยคงตัวกรองอื่นไว้ ผู้ใช้จึงเห็นก่อนว่ากดแล้วจะเหลือกี่รายการ
export function getFacetCounts(events, filters, options = {}) {
  const countBy = (omit, keys, pick) => {
    const base = applyEventFilters(events, filters, { ...options, omit });
    return keys.reduce((result, key) => {
      result[key] = base.filter((event) => pick(event, key)).length;
      return result;
    }, {});
  };

  return {
    status: countBy(
      'status',
      STATUS_OPTIONS.map((o) => o.key),
      (event, key) =>
        key === 'all'
          ? true
          : key === 'open'
            ? ['open', 'nearfull'].includes(getEventState(event))
            : getEventState(event) === key,
    ),
    cat: countBy(
      'cat',
      ['all', ...Object.keys(CATEGORY_META)],
      (event, key) => key === 'all' || normalize(event).category === key,
    ),
  };
}
