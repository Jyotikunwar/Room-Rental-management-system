import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { api, getUser, setToken, setUser as persistUser, type User } from "./services/api";

import LandingPage from "./components/Landing/LandingPage";
import LoginPage from "./components/Landing/LoginPage";
import SignupPage from "./components/Landing/SignupPage";

import TenantDashboard from "./components/Tenant/TenantDashboard";
import FindProperty from "./components/Tenant/FindProperty";
import SavedRooms from "./components/Tenant/SavedRooms";
import MyRequests from "./components/Tenant/MyRequests";
import CurrentRentalPage from "./components/Tenant/CurrentRentalPage";
import PaymentsPage from "./components/Tenant/PaymentsPage";
import MessagesPage from "./components/Tenant/MessagesPage";
import NotificationsPage from "./components/Tenant/NotificationsPage";
import SettingsPage from "./components/Tenant/SettingsPage";
import LandlordDashboard from "./components/Landlord/Landlorddashboard";
import AdminDashboard from "./components/Admin/AdminDashboard";

import type { TenantView } from "./components/Tenant/navigation";
import "./App.css";

// Where each role lands after login / when hitting a route they don't own.
function roleHome(user: User): string {
  if (user.role === "LANDLORD") return "/landlord";
  if (user.role === "ADMIN") return "/admin";
  return "/dashboard";
}

// ---------------------------------------------------------------------
// Logged-out routes (redirect away if already authenticated)
// ---------------------------------------------------------------------
function LandingRoute() {
  const navigate = useNavigate();
  return (
    <LandingPage
      onLogin={() => navigate("/login")}
      onSignup={() => navigate("/signup")}
      onPostProperty={() => navigate("/signup")}
      onBrowseRooms={() => navigate("/signup")}
    />
  );
}

function LoginRoute({ onLoggedIn }: { onLoggedIn: (u: User) => void }) {
  const navigate = useNavigate();
  return (
    <LoginPage
      onLogin={async (email, password) => {
        const res = await api.login(email, password);
        if (!res.success) {
          throw new Error(res.message || "Invalid email or password.");
        }
        setToken(res.token);
        persistUser(res.user);
        onLoggedIn(res.user);
        navigate(roleHome(res.user), { replace: true });
      }}
      onNavigateToSignup={() => navigate("/signup")}
    />
  );
}

function SignupRoute({ onLoggedIn }: { onLoggedIn: (u: User) => void }) {
  const navigate = useNavigate();
  return (
    <SignupPage
      onSignup={async ({ fullName, email, password, role }) => {
        const res = await api.signup({ fullName, email, password, role });
        if (!res.success) {
          throw new Error(res.message || "Couldn't create your account.");
        }
        setToken(res.token);
        persistUser(res.user);
        onLoggedIn(res.user);
        navigate(roleHome(res.user), { replace: true });
      }}
      onNavigateToLogin={() => navigate("/login")}
    />
  );
}

// ---------------------------------------------------------------------
// Tenant: one URL per view, so back/forward/refresh/deep-links all work.
// ---------------------------------------------------------------------
const VIEW_TO_PATH: Record<TenantView, string> = {
  dashboard: "dashboard",
  search: "search",
  saved: "saved",
  requests: "requests",
  rental: "rental",
  payments: "payments",
  messages: "messages",
  notifications: "notifications",
  settings: "settings",
};

function TenantRoutes({ user, onLogout }: { user: User; onLogout: () => void }) {
  const navigate = useNavigate();
  const onNavigate = (view: TenantView) => navigate(`/${VIEW_TO_PATH[view]}`);
  const sharedProps = { user, onLogout, onNavigate };

  return (
    <Routes>
      <Route path="dashboard" element={<TenantDashboard {...sharedProps} />} />
      <Route path="search" element={<FindProperty {...sharedProps} />} />
      <Route path="saved" element={<SavedRooms {...sharedProps} />} />
      <Route path="requests" element={<MyRequests {...sharedProps} />} />
      <Route path="rental" element={<CurrentRentalPage {...sharedProps} />} />
      <Route path="payments" element={<PaymentsPage {...sharedProps} />} />
      <Route path="messages" element={<MessagesPage {...sharedProps} />} />
      <Route path="notifications" element={<NotificationsPage {...sharedProps} />} />
      <Route path="settings" element={<SettingsPage {...sharedProps} />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

// ---------------------------------------------------------------------
// App shell — decides which routes exist based on auth + role.
// ---------------------------------------------------------------------
function App() {
  const [user, setUser] = useState<User | null>(getUser());

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* ---- Logged-out only: landing / login / signup ---- */}
        <Route
          path="/"
          element={user ? <Navigate to={roleHome(user)} replace /> : <LandingRoute />}
        />
        <Route
          path="/login"
          element={user ? <Navigate to={roleHome(user)} replace /> : <LoginRoute onLoggedIn={setUser} />}
        />
        <Route
          path="/signup"
          element={user ? <Navigate to={roleHome(user)} replace /> : <SignupRoute onLoggedIn={setUser} />}
        />

        {/* ---- Landlord ---- */}
        <Route
          path="/landlord"
          element={
            user?.role === "LANDLORD" ? (
              <LandlordDashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to={user ? roleHome(user) : "/login"} replace />
            )
          }
        />

        {/* ---- Admin ---- */}
        <Route
          path="/admin"
          element={
            user?.role === "ADMIN" ? (
              <AdminDashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to={user ? roleHome(user) : "/login"} replace />
            )
          }
        />

        {/* ---- Tenant (nested routes: /dashboard, /search, /saved, ...) ---- */}
        <Route
          path="/*"
          element={
            user?.role === "TENANT" ? (
              <TenantRoutes user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to={user ? roleHome(user) : "/login"} replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
