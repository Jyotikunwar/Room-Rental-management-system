import { useEffect, useState } from "react";
import { getUser, type User } from "./services/api";
import { AuthModal } from "./components/AuthModal";
import TenantDashboard from "./components/Tenant/TenantDashboard";
import FindProperty from "./components/Tenant/FindProperty";
import SavedRooms from "./components/Tenant/SavedRooms";
import MyRequests from "./components/Tenant/MyRequests";
import CurrentRentalPage from "./components/Tenant/CurrentRentalPage";
import PaymentsPage from "./components/Tenant/PaymentsPage";
import MessagesPage from "./components/Tenant/MessagesPage";
import NotificationsPage from "./components/Tenant/NotificationsPage";
import SettingsPage from "./components/Tenant/SettingsPage";
import type { TenantView } from "./components/Tenant/navigation";
import "./App.css";

function App() {
  const [user, setUser] = useState<User | null>(getUser());
  const [showAuth, setShowAuth] = useState(false);
  const [tenantView, setTenantView] = useState<TenantView>("dashboard");

  useEffect(() => {
    if (!user) setShowAuth(true);
  }, [user]);

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-stone-400">Room Rental System</p>
          <h1 className="text-3xl font-semibold text-stone-900">Tenant Portal</h1>
          <p className="mt-2 text-sm text-stone-500">Sign in to access your dashboard, bookings, and payments.</p>
        </div>
        {showAuth && (
          <AuthModal
            onClose={() => setShowAuth(false)}
            onSuccess={(loggedInUser) => {
              setUser(loggedInUser);
              setShowAuth(false);
            }}
          />
        )}
        {!showAuth && (
          <button
            onClick={() => setShowAuth(true)}
            className="rounded-xl bg-stone-900 px-6 py-3 text-sm font-medium text-white hover:bg-stone-800"
          >
            Sign In
          </button>
        )}
      </div>
    );
  }

  if (user.role === "TENANT") {
    const handleLogout = () => {
      setUser(null);
      setTenantView("dashboard");
    };

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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 text-center">
      <h1 className="text-2xl font-semibold text-stone-900">Welcome, {user.fullName}</h1>
      <p className="mt-2 max-w-md text-sm text-stone-500">
        This view is built for tenants. Please sign in with a tenant account to see the dashboard.
      </p>
      <button
        onClick={() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        }}
        className="mt-6 rounded-xl bg-stone-900 px-6 py-3 text-sm font-medium text-white hover:bg-stone-800"
      >
        Switch Account
      </button>
    </div>
  );
}

export default App;
