import { useState } from "react";
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
import { AdminDashboard } from "./components/Admin/AdminDashboard";

import type { TenantView } from "./components/Tenant/navigation";
import "./App.css";

// Screens shown before the person is logged in.
type AuthView = "landing" | "login" | "signup";

function App() {
  const [user, setUser] = useState<User | null>(getUser());
  const [authView, setAuthView] = useState<AuthView>("landing");
  const [tenantView, setTenantView] = useState<TenantView>("dashboard");

  // ---------------------------------------------------------------------
  // Logged out: Landing -> Login / Signup
  // ---------------------------------------------------------------------
  if (!user) {
    if (authView === "login") {
      return (
        <LoginPage
          onLogin={async (email, password) => {
            const res = await api.login(email, password);
            if (!res.success) {
              throw new Error(res.message || "Invalid email or password.");
            }
            setToken(res.token);
            persistUser(res.user);
            setUser(res.user);
          }}
          onNavigateToSignup={() => setAuthView("signup")}
        />
      );
    }

    if (authView === "signup") {
      return (
        <SignupPage
          onSignup={async ({ fullName, email, password, role }) => {
            const res = await api.signup({ fullName, email, password, role });
            if (!res.success) {
              throw new Error(res.message || "Couldn't create your account.");
            }
            setToken(res.token);
            persistUser(res.user);
            setUser(res.user);
          }}
          onNavigateToLogin={() => setAuthView("login")}
        />
      );
    }

    // authView === "landing"
    return (
      <LandingPage
        onLogin={() => setAuthView("login")}
        onSignup={() => setAuthView("signup")}
        onPostProperty={() => setAuthView("signup")}
        onBrowseRooms={() => setAuthView("signup")}
      />
    );
  }

  // ---------------------------------------------------------------------
  // Logged in
  // ---------------------------------------------------------------------
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setTenantView("dashboard");
    setAuthView("landing");
  };

  // ---- Role-based routing ----
  if (user.role === "LANDLORD") {
    return <LandlordDashboard user={user} onLogout={handleLogout} />;
  }

  if (user.role === "ADMIN") {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  if (user.role === "TENANT") {
    // setTenantView already matches the (view: TenantView) => void shape
    // every tenant page expects, so it's passed straight through as onNavigate.
    const sharedProps = { user, onLogout: handleLogout, onNavigate: setTenantView };

    switch (tenantView) {
      case "search":
        return <FindProperty {...sharedProps} />;
      case "saved":
        return <SavedRooms {...sharedProps} />;
      case "requests":
        return <MyRequests {...sharedProps} />;
      case "rental":
        return <CurrentRentalPage {...sharedProps} />;
      case "payments":
        return <PaymentsPage {...sharedProps} />;
      case "messages":
        return <MessagesPage {...sharedProps} />;
      case "notifications":
        return <NotificationsPage {...sharedProps} />;
      case "settings":
        return <SettingsPage {...sharedProps} />;
      default:
        return <TenantDashboard {...sharedProps} />;
    }
  }

  // Fallback for any unrecognized role
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 text-center">
      <h1 className="text-2xl font-semibold text-stone-900">Welcome, {user.fullName}</h1>
      <p className="mt-2 max-w-md text-sm text-stone-500">
        We couldn't find a dashboard for your account role ({user.role}).
      </p>
      <button
        onClick={handleLogout}
        className="mt-6 rounded-xl bg-stone-900 px-6 py-3 text-sm font-medium text-white hover:bg-stone-800"
      >
        Switch Account
      </button>
    </div>
  );
}

export default App;
