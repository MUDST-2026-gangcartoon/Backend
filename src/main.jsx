import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import './global.css';
import './navbar.css';
import './manage-events.css';
import './drawer.css';
import ManageEventsPage from './pages/ManageEventsPage.jsx';
// import RegistrantListPage from './pages/RegistrantListPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import EventCheckinSelectPage from './pages/EventCheckinSelectPage.jsx';
import CheckinAttendeesPage from './pages/CheckinAttendeesPage.jsx';
import DevRouteSwitcher from './components/DevRouteSwitcher.jsx';
import EventDetailPage from "./pages/user/EventDetailPage.jsx";
import MyRegistrationsPage from './pages/user/MyRegistrationsPage';
import MyTicketsPage from './pages/user/MyTicketsPage';
import UpcomingEventsPage from './pages/UpcomingEventsPage';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 🔹 กรณีต้องการให้หน้าค้นหาอีเวนต์เป็นหน้าแรก ให้เปลี่ยนจาก Navigate เป็นบรรทัดนี้: */}
          {/* <Route path="/" element={<UpcomingEventsPage />} /> */}
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/manage-events" element={<ManageEventsPage />} />
          {/* <Route path="/registrants" element={<RegistrantListPage />} /> */}
          <Route path="/staff/checkin" element={<EventCheckinSelectPage />} />
          <Route path="/staff/checkin/:eventId" element={<CheckinAttendeesPage />} />
          
          {/* 🟢 เพิ่มบรรทัดนี้เพื่อรองรับ URL แบบไม่มี ID */}
          <Route path="/event-detail" element={<EventDetailPage />} />
          <Route path="/event-detail/:eventId" element={<EventDetailPage />} />

          <Route path="/MyRegistrationsPage" element={<MyRegistrationsPage />} />
          <Route path="/MyTicketsPage" element={<MyTicketsPage />} />

          <Route path="/upcoming-events" element={<UpcomingEventsPage />} />
          <Route path="/events" element={<UpcomingEventsPage />} />
        </Routes>
        <DevRouteSwitcher />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);