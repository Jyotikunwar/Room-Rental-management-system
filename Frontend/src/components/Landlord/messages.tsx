import type { User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";
import MessagesInbox from "../Common/MessagesInbox";

interface LandlordMessagesProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
}

export default function LandlordMessages({ user, onLogout, activeRoute, onNavigate }: LandlordMessagesProps) {
  return (
    <MessagesInbox
      mode="landlord"
      user={user}
      topSearchPlaceholder="Search properties, tenants..."
      sidebar={<LandlordSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} user={user} />}
    />
  );
}
