import { Building2 } from "lucide-react";
import type { User } from "../../services/api";
import { TenantPlaceholder } from "./TenantPlaceholder";
import type { TenantView } from "./navigation";

interface CurrentRentalPageProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

export default function CurrentRentalPage({ user, onLogout, onNavigate }: CurrentRentalPageProps) {
  return (
    <TenantPlaceholder
      user={user}
      onLogout={onLogout}
      onNavigate={onNavigate}
      active="Current Rental"
      icon={Building2}
      title="Current Rental"
      description="Full lease details, move-in/move-out dates, and documents for your active rental will live here."
    />
  );
}
