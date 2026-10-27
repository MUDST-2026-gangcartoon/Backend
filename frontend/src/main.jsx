
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

import ProfilePage from './pages/ProfilePage.jsx';
import { normalizeRole, homeForRole } from './utils/roleAccess.js';
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
import PaymentHistoryPage from './pages/user/PaymentHistoryPage.jsx';

// ต้องนำเข้าเป็นไฟล์สุดท้าย เพื่อให้สไตล์มือถือทับสไตล์ของแต่ละหน้า
import './mobile-shell.css';
import './popup-theme.css';

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

// ตัวป้องกัน Route ตามบทบาท
// allow: บทบาทที่เข้าได้ ('guest' = ยังไม่ล็อกอิน)
// บทบาทอื่นจะถูกส่งกลับหน้าแรกของบทบาทตัวเอง จึงข้ามพื้นที่กันไม่ได้
function RoleRoute({ allow, children }) {
  const {
    isLoggedIn,
    user,
    isAuthLoading,
    authError,
    retrySessionCheck,
  } = useAuth();

  if (isAuthLoading) {
    return <div role="status">กำลังตรวจสอบ session...</div>;
  }

  if (authError) {
    return (
      <AuthVerificationError
        message={authError}
        onRetry={retrySessionCheck}
      />
    );
  }

  const role = isLoggedIn ? normalizeRole(user) : 'guest';
  const effectiveRole = role === '' ? 'guest' : role;

  if (!allow.includes(effectiveRole)) {
    return <Navigate to={homeForRole(effectiveRole)} replace />;
  }

  return children;
}

const AdminRoute = ({ children }) => (
  <RoleRoute allow={['admin']}>{children}</RoleRoute>
);
const StaffRoute = ({ children }) => (
  <RoleRoute allow={['staff']}>{children}</RoleRoute>
);
// พื้นที่ผู้ใช้ทั่วไป: เฉพาะผู้เยี่ยมชมและ user
const UserRoute = ({ children }) => (
  <RoleRoute allow={['guest', 'user']}>{children}</RoleRoute>
);

function AppRoutes() {
  return (
    <Routes>
      {/* ผู้ใช้ทั่วไป */}
      <Route path="/" element={<UserRoute><UpcomingEventsPage /></UserRoute>} />
      <Route path="/event-detail" element={<UserRoute><EventDetailPage /></UserRoute>} />
      <Route path="/event-detail/:eventId" element={<UserRoute><EventDetailPage /></UserRoute>} />
      <Route path="/MyRegistrationsPage" element={<UserRoute><MyRegistrationsPage /></UserRoute>} />
      <Route path="/MyTicketsPage" element={<UserRoute><MyTicketsPage /></UserRoute>} />
      <Route path="/payment-history" element={<UserRoute><PaymentHistoryPage /></UserRoute>} />
      <Route path="/UpcomingEventsPage" element={<UserRoute><UpcomingEventsPage /></UserRoute>} />
      <Route path="/events" element={<UserRoute><UpcomingEventsPage /></UserRoute>} />
      <Route path="/upcoming-events" element={<UserRoute><UpcomingEventsPage /></UserRoute>} />

      {/* โปรไฟล์ของตนเอง: ทุกบทบาทที่ล็อกอินแล้ว (แก้ได้เฉพาะบัญชีตัวเอง) */}
      <Route
        path="/profile"
        element={
          <RoleRoute allow={['user', 'admin', 'staff']}>
            <ProfilePage />
          </RoleRoute>
        }
      />

      {/* Admin เท่านั้น */}
      <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
      <Route path="/manage-events" element={<AdminRoute><ManageEventsPage /></AdminRoute>} />

      {/* Staff เท่านั้น */}
      <Route path="/staff/checkin" element={<StaffRoute><EventCheckinSelectPage /></StaffRoute>} />
      <Route path="/staff/checkin/:eventId" element={<StaffRoute><CheckinAttendeesPage /></StaffRoute>} />

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
