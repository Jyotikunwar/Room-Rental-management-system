import { Bell } from "lucide-react";
import type { User } from "../../services/api";
import { TenantPlaceholder } from "./TenantPlaceholder";
import type { TenantView } from "./navigation";

interface NotificationsPageProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

export default function NotificationsPage({ user, onLogout, onNavigate }: NotificationsPageProps) {
  return (
    <TenantPlaceholder
      user={user}
      onLogout={onLogout}
      onNavigate={onNavigate}
      active="Notifications"
      icon={Bell}
      title="Notifications"
      description="Rent reminders, price drops, and owner replies will all be collected on this page."
    />
  );
}
