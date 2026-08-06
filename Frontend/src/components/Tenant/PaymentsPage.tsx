import { CreditCard } from "lucide-react";
import type { User } from "../../services/api";
import { TenantPlaceholder } from "./TenantPlaceholder";
import type { TenantView } from "./navigation";

interface PaymentsPageProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

export default function PaymentsPage({ user, onLogout, onNavigate }: PaymentsPageProps) {
  return (
    <TenantPlaceholder
      user={user}
      onLogout={onLogout}
      onNavigate={onNavigate}
      active="Payments"
      icon={CreditCard}
      title="Payments"
      description="Pay rent, view receipts, and see your payment history once billing is connected."
    />
  );
}
