import { useCallback, useEffect, useRef, useState } from 'react';

// เรียก callback ซ้ำทุก intervalMs เฉพาะเมื่อแท็บมองเห็นและออนไลน์
// และรีเฟรชทันทีเมื่อกลับมา focus / online / visibilitychange
export function useLiveRefresh(callback, { intervalMs = 10000, enabled = true } = {}) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;

    const canRun = () =>
      document.visibilityState === 'visible' && navigator.onLine !== false;

    const run = () => {
      if (canRun()) callbackRef.current?.();
    };

    const timer = intervalMs > 0 ? window.setInterval(run, intervalMs) : null;

    window.addEventListener('focus', run);
    window.addEventListener('online', run);
    document.addEventListener('visibilitychange', run);

    return () => {
      if (timer) window.clearInterval(timer);
      window.removeEventListener('focus', run);
      window.removeEventListener('online', run);
      document.removeEventListener('visibilitychange', run);
    };
  }, [enabled, intervalMs]);
}

// เวลาปัจจุบันที่อัปเดตเอง ใช้กับ countdown / ช่วงเช็กอิน
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  const tick = useCallback(() => setNow(Date.now()), []);

  useEffect(() => {
    const timer = window.setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [intervalMs, tick]);

  return now;
}
