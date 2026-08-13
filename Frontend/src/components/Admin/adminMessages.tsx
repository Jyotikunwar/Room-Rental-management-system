import type { User } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";
import MessagesInbox from "../Common/MessagesInbox";

export { openAdminMessage } from "./adminMessageSession";

interface AdminMessagesProps {
  user: User;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
}

export default function AdminMessages({ user, onLogout, activeRoute, onNavigate }: AdminMessagesProps) {
  return (
    <MessagesInbox
      mode="admin"
      user={user}
      topSearchPlaceholder="Search properties, tenants..."
      sidebar={
        <AdminSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} brandSubtitle="ADMIN" />
      }
    />
  );
}
