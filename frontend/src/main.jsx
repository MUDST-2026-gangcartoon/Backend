
import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import {
  AuthProvider,
  useAuth,
} from './context/AuthContext.jsx';

import AnalyticsTracker from './api/AnalyticsTracker.jsx';

import './global.css';
import './navbar.css';
import './manage-events.css';
import './drawer.css';

import ManageEventsPage from './pages/ManageEventsPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import EventCheckinSelectPage from './pages/EventCheckinSelectPage.jsx';
import CheckinAttendeesPage from './pages/CheckinAttendeesPage.jsx';

import EventDetailPage from './pages/user/EventDetailPage.jsx';
import MyRegistrationsPage from './pages/user/MyRegistrationsPage';
import MyTicketsPage from './pages/user/MyTicketsPage';
import UpcomingEventsPage from './pages/user/UpcomingEventsPage';
import NotFoundPage from './pages/NotFoundPage.jsx';

// แสดงข้อผิดพลาดเมื่อตรวจสอบ session ไม่สำเร็จ
function AuthVerificationError({ message, onRetry }) {
  return (
    <div role="alert">
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        ลองตรวจสอบอีกครั้ง
      </button>
    </div>
  );
}

// Route สำหรับ Admin
function AdminRoute({ children }) {
  const {
    isLoggedIn,
    user,
    isAuthLoading,
    authError,
    retrySessionCheck,
  } = useAuth();

  const role = user?.role?.toLowerCase();

  // รอให้ Backend ตรวจสอบ session เสร็จก่อน
  if (isAuthLoading) {
    return <div role="status">กำลังตรวจสอบ session...</div>;
  }

  // หากตรวจสอบไม่ได้ อย่าเพิ่ง redirect ผู้ใช้
  if (authError) {
    return (
      <AuthVerificationError
        message={authError}
        onRetry={retrySessionCheck}
      />
    );
  }

  // อนุญาตเฉพาะ Admin
  if (!isLoggedIn || role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Route สำหรับ Staff และ Admin
function StaffRoute({ children }) {
  const {
    isLoggedIn,
    user,
    isAuthLoading,
    authError,
    retrySessionCheck,
  } = useAuth();

  const role = user?.role?.toLowerCase();

  // รอให้ Backend ตรวจสอบ session เสร็จก่อน
  if (isAuthLoading) {
    return <div role="status">กำลังตรวจสอบ session...</div>;
  }

  // หากตรวจสอบไม่ได้ ให้ผู้ใช้ลองใหม่
  if (authError) {
    return (
      <AuthVerificationError
        message={authError}
        onRetry={retrySessionCheck}
      />
    );
  }

  // Staff และ Admin สามารถเข้า Check-in ได้
  if (!isLoggedIn || !['staff', 'admin'].includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* หน้าแรกของผู้ใช้ทั่วไป */}
      <Route path="/" element={<UpcomingEventsPage />} />

      {/* Admin */}
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        }
      />

      <Route
        path="/manage-events"
        element={
          <AdminRoute>
            <ManageEventsPage />
          </AdminRoute>
        }
      />

      {/* Staff และ Admin: Check-in */}
      <Route
        path="/staff/checkin"
        element={
          <StaffRoute>
            <EventCheckinSelectPage />
          </StaffRoute>
        }
      />

      <Route
        path="/staff/checkin/:eventId"
        element={
          <StaffRoute>
            <CheckinAttendeesPage />
          </StaffRoute>
        }
      />

      {/* หน้าสำหรับผู้ใช้ทั่วไป */}
      <Route path="/event-detail" element={<EventDetailPage />} />
      <Route path="/event-detail/:eventId" element={<EventDetailPage />} />
      <Route path="/MyRegistrationsPage" element={<MyRegistrationsPage />} />
      <Route path="/MyTicketsPage" element={<MyTicketsPage />} />
      <Route path="/UpcomingEventsPage" element={<UpcomingEventsPage />} />
      <Route path="/events" element={<UpcomingEventsPage />} />
      <Route path="/upcoming-events" element={<UpcomingEventsPage />} />
      {/* ไม่พบ Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <AnalyticsTracker />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
