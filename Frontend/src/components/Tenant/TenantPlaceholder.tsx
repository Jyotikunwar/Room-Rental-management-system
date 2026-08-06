import type { LucideIcon } from "lucide-react";
import type { User } from "../../services/api";
import { Sidebar, type SidebarActive, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";

interface TenantPlaceholderProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
  active: SidebarActive;
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Generic "coming soon" screen for sidebar destinations that don't have a
 * real page yet. Keeps navigation fully wired while the real UI is built —
 * swap this out for a dedicated component whenever the feature is ready.
 */
export function TenantPlaceholder({
  user,
  onLogout,
  onNavigate,
  active,
  icon: Icon,
  title,
  description,
}: TenantPlaceholderProps) {
  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  return (
    <div className="flex min-h-screen w-full bg-stone-50 text-stone-900">
      <Sidebar
        active={active}
        onNavigate={handleNavigate}
        onSettings={() => onNavigate("settings")}
        onLogout={onLogout}
      />

      <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Icon size={24} />
        </span>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 max-w-sm text-sm text-stone-500">{description}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-stone-300">
          Signed in as {user.fullName}
        </p>
        <button
          onClick={() => onNavigate("dashboard")}
          className="mt-6 rounded-lg bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-800"
        >
          Back to Dashboard
        </button>
      </main>
    </div>
  );
}
