import { Settings } from "lucide-react";
import type { User } from "../../services/api";
import { TenantPlaceholder } from "./TenantPlaceholder";
import type { TenantView } from "./navigation";

interface SettingsPageProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

export default function SettingsPage({ user, onLogout, onNavigate }: SettingsPageProps) {
  return (
    <TenantPlaceholder
      user={user}
      onLogout={onLogout}
      onNavigate={onNavigate}
      active="Settings"
      icon={Settings}
      title="Settings"
      description="Manage your profile, notification preferences, and account security here."
    />
  );
}
