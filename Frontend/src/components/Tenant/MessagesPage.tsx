import type { User } from "../../services/api";
import type { TenantView } from "./navigation";
import { Sidebar, type NavLabel } from "./Sidebar";
import MessagesInbox from "../Common/MessagesInbox";

const LABEL_TO_VIEW: Record<NavLabel, TenantView> = {
  Dashboard: "dashboard",
  "Find Property": "search",
  "Saved Rooms": "saved",
  "My Requests": "requests",
  "Current Rental": "rental",
  Payments: "payments",
  Messages: "messages",
  Notifications: "notifications",
};

interface MessagesPageProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

export default function MessagesPage({ user, onLogout, onNavigate }: MessagesPageProps) {
  const handleNavigate = (label: NavLabel) => onNavigate(LABEL_TO_VIEW[label]);

  return (
    <MessagesInbox
      mode="tenant"
      user={user}
      topSearchPlaceholder="Search properties, landlords..."
      onBellClick={() => onNavigate("notifications")}
      sidebar={
        <Sidebar
          user={user}
          active="Messages"
          onNavigate={handleNavigate}
          onSettings={() => onNavigate("settings")}
          onLogout={onLogout}
        />
      }
    />
  );
}
