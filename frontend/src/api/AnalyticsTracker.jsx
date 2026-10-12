import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsService } from './analyticsService.js';

// ป้องกันการส่งข้อมูลซ้ำจาก React StrictMode
const recordedVisits = new Set();

const PUBLIC_PATHS = [
  '/',
  '/events',
  '/UpcomingEventsPage',
  '/MyRegistrationsPage',
  '/MyTicketsPage',
];

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname;
    const eventMatch = pathname.match(/^\/event-detail\/(\d+)\/?$/);
    const isPublicPage =
      PUBLIC_PATHS.includes(pathname) || Boolean(eventMatch);

    if (!isPublicPage) {
      return;
    }

    const visitKey = `${location.key}:${pathname}`;

    if (recordedVisits.has(visitKey)) {
      return;
    }

    recordedVisits.add(visitKey);

    const recordVisits = async () => {
      try {
        await analyticsService.recordSiteVisit();

        if (eventMatch) {
          await analyticsService.recordEventVisit(eventMatch[1]);
        }
      } catch (error) {
        console.error('Failed to record analytics visit:', error);
      }
    };

    recordVisits();
  }, [location.key, location.pathname]);

  return null;
}
