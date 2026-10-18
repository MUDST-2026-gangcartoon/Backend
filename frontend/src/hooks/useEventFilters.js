import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const DEFAULTS = { q: '', status: 'all', cat: 'all', when: 'all', sort: 'soon' };
const FILTER_KEYS = ['q', 'status', 'cat', 'when'];

// เก็บตัวกรองไว้ใน URL (?q=&status=&cat=&when=&sort=) จึงแชร์ลิงก์/กดย้อนกลับได้
// และช่องค้นหาบน navbar กับช่องค้นหาในหน้าใช้ค่าเดียวกัน
export function useEventFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      q: searchParams.get('q') || DEFAULTS.q,
      status: searchParams.get('status') || DEFAULTS.status,
      cat: searchParams.get('cat') || DEFAULTS.cat,
      when: searchParams.get('when') || DEFAULTS.when,
      sort: searchParams.get('sort') || DEFAULTS.sort,
    }),
    [searchParams],
  );

  const setFilter = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams);
      if (!value || value === DEFAULTS[key]) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const clear = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    FILTER_KEYS.forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const activeCount = FILTER_KEYS.filter(
    (key) => filters[key] !== DEFAULTS[key],
  ).length;

  return { filters, setFilter, clear, activeCount };
}
