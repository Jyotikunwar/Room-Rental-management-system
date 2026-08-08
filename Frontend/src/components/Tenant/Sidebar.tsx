import { useState } from "react";
import {
  LayoutDashboard, Search, Heart, ClipboardList, Building2, CreditCard,
  MessageSquare, Bell, Settings, LogOut, X, Menu,
} from "lucide-react";
import type { User } from "../../services/api";

export const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Find Rooms", icon: Search },
  { label: "Saved Rooms", icon: Heart },
  { label: "My Requests", icon: ClipboardList },
  { label: "Current Rental", icon: Building2 },
  { label: "Payments", icon: CreditCard },
  { label: "Messages", icon: MessageSquare },
  { label: "Notifications", icon: Bell },
] as const;

export type NavLabel = (typeof NAV_ITEMS)[number]["label"];

// Settings sits outside the main NAV_ITEMS list but is still a navigable
// destination, so the active state accepts it alongside NavLabel.
export type SidebarActive = NavLabel | "Settings";

interface SidebarProps {
  user: User;
  active: SidebarActive;
  onNavigate: (label: NavLabel) => void;
  onSettings: () => void;
  onLogout: () => void;
}

function initials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Sidebar({ user, active, onNavigate, onSettings, onLogout }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavList = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => {
              onNavigate(label);
              onItemClick?.();
            }}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
              active === label ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>
      <div className="mt-4 flex flex-col gap-1 border-t border-white/10 px-3 pt-4">
        <button
          onClick={() => {
            onSettings();
            onItemClick?.();
          }}
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
            active === "Settings" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Settings size={16} /> Settings
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </>
  );

  const UserHeader = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex items-center gap-3 px-5 py-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#0f172a]">
        {initials(user.fullName)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{user.fullName}</p>
        {user.email && <p className="truncate text-[11px] text-slate-400">{user.email}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-auto rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile hamburger — fixed so it's available on every page that renders Sidebar */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#0f172a] text-slate-300 shadow-sm sm:hidden"
        aria-label="Open menu"
      >
        <Menu size={17} />
      </button>

      {/* Desktop — sticky, dark navy theme */}
      <aside className="sticky top-0 hidden h-screen w-60 flex-col overflow-y-auto border-r border-white/10 bg-[#0f172a] sm:flex">
        <UserHeader />
        <div className="mb-2 px-5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Premium Living</p>
        </div>
        <NavList />
      </aside>

      {/* Mobile — slide-in drawer, same theme */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col overflow-y-auto bg-[#0f172a] shadow-xl">
            <UserHeader onClose={() => setMobileOpen(false)} />
            <div className="mb-2 px-5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Premium Living</p>
            </div>
            <NavList onItemClick={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
