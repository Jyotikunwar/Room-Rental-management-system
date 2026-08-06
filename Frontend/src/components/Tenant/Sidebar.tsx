import { useState } from "react";
import {
  LayoutDashboard, Search, Heart, ClipboardList, Building2, CreditCard,
  MessageSquare, Bell, Settings, LogOut, X, Menu,
} from "lucide-react";

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
  active: SidebarActive;
  onNavigate: (label: NavLabel) => void;
  onSettings: () => void;
  onLogout: () => void;
}

export function Sidebar({ active, onNavigate, onSettings, onLogout }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavList = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => {
              onNavigate(label);
              onItemClick?.();
            }}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
              active === label ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>
      <div className="mt-4 flex flex-col gap-1 border-t border-stone-200 pt-4">
        <button
          onClick={() => {
            onSettings();
            onItemClick?.();
          }}
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
            active === "Settings" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          <Settings size={16} /> Settings
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-stone-600 hover:bg-stone-100"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger — fixed so it's available on every page that renders Sidebar */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 shadow-sm sm:hidden"
        aria-label="Open menu"
      >
        <Menu size={17} />
      </button>

      {/* Desktop — sticky */}
      <aside className="sticky top-0 hidden h-screen w-56 flex-col overflow-y-auto border-r border-stone-200 bg-white p-4 sm:flex">
        <div className="mb-6 px-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400">Premium Living</p>
        </div>
        <NavList />
      </aside>

      {/* Mobile — slide-in drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div className="absolute inset-0 bg-stone-900/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between px-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400">Premium Living</p>
              <button onClick={() => setMobileOpen(false)} className="text-stone-400 hover:text-stone-600" aria-label="Close menu">
                <X size={18} />
              </button>
            </div>
            <NavList onItemClick={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
