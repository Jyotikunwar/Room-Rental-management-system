import { useState } from "react";
import {
  LayoutDashboard, Search, Heart, ClipboardList, Building2, CreditCard,
  MessageSquare, Bell, Settings, LogOut, X, Menu,
} from "lucide-react";
import type { User } from "../../services/api";
import Avatar from "../Avatar";

export const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Find Property", icon: Search },
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
  active: NavLabel | string;
  onNavigate: (label: NavLabel) => void;
  onSettings: () => void;
  onLogout: () => void;
}

// Same dark-navy palette, width, and sticky-full-height behavior as
// AdminSidebar so Tenant and Admin feel like one consistent product.
export function Sidebar({ user, active, onNavigate, onSettings, onLogout }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleNavigate(label: NavLabel) {
    onNavigate(label);
    setMobileOpen(false);
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0f172a] text-slate-300">
      {/* Profile */}
      <div className="flex items-center gap-3 px-5 py-6">
        <Avatar name={user.fullName ?? "U"} avatarUrl={(user as any).avatarUrl} size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{user.fullName ?? "User"}</p>
          <p className="truncate text-[10px] font-medium tracking-wider text-slate-400">TENANT</p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto rounded-md p-1 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.label;
          return (
            <button
              key={item.label}
              onClick={() => handleNavigate(item.label)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-white text-[#0f172a]" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Settings + Logout pinned to bottom */}
      <div className="space-y-1 border-t border-white/5 px-3 py-4">
        <button
          onClick={() => {
            onSettings();
            setMobileOpen(false);
          }}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            active === "Settings" ? "bg-white text-[#0f172a]" : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Settings size={18} />
          Settings
        </button>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <span className="text-sm font-semibold text-gray-900">RoomRent</span>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 shadow-xl">{sidebarContent}</div>
        </div>
      )}

      {/* Desktop — sticky, full height, same width as AdminSidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">{sidebarContent}</aside>
    </>
  );
}
