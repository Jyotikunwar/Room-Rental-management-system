import { MessageSquare } from "lucide-react";
import type { User } from "../../services/api";
import { TenantPlaceholder } from "./TenantPlaceholder";
import type { TenantView } from "./navigation";

interface MessagesPageProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

export default function MessagesPage({ user, onLogout, onNavigate }: MessagesPageProps) {
  return (
    <TenantPlaceholder
      user={user}
      onLogout={onLogout}
      onNavigate={onNavigate}
      active="Messages"
      icon={MessageSquare}
      title="Messages"
      description="Chat with room owners directly — conversations will show up here once messaging is live."
    />
  );
}
