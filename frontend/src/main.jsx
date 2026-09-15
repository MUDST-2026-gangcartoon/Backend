import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
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

function AdminRoute({ children }) {
  const { isLoggedIn, user } = useAuth();
  const role = user?.role?.toLowerCase();

  if (!isLoggedIn || role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

function StaffRoute({ children }) {
  const { isLoggedIn, user } = useAuth();
  const role = user?.role?.toLowerCase();

  if (!isLoggedIn || role !== 'staff') {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <>
      <Routes>
        {/* หน้าแรกของผู้ใช้ทั่วไป */}
        <Route path="/" element={<UpcomingEventsPage />} />

        {/* Admin: เข้าได้เฉพาะบัญชี mock ที่เป็น Admin */}
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

        {/* Staff: เข้าได้เฉพาะบัญชี mock ที่เป็น Staff */}
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

        <Route path="/event-detail" element={<EventDetailPage />} />
        <Route path="/event-detail/:eventId" element={<EventDetailPage />} />
        <Route path="/MyRegistrationsPage" element={<MyRegistrationsPage />} />
        <Route path="/MyTicketsPage" element={<MyTicketsPage />} />
        <Route path="/UpcomingEventsPage" element={<UpcomingEventsPage />} />
        <Route path="/events" element={<UpcomingEventsPage />} />

        {/* ไม่พบ route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
