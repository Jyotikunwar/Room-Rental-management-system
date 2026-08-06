import { ClipboardList } from "lucide-react";
import type { User } from "../../services/api";
import { TenantPlaceholder } from "./TenantPlaceholder";
import type { TenantView } from "./navigation";

interface MyRequestsProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

export default function MyRequests({ user, onLogout, onNavigate }: MyRequestsProps) {
  return (
    <TenantPlaceholder
      user={user}
      onLogout={onLogout}
      onNavigate={onNavigate}
      active="My Requests"
      icon={ClipboardList}
      title="My Requests"
      description="Track booking requests and their status here — pending, approved, or declined by owners."
    />
  );
}
