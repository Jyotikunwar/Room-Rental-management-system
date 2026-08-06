import { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Wrench,
  Mail,
  Settings,
  Menu,
  X,
} from "lucide-react";

export type LandlordRoute =
  | "dashboard"
  | "properties"
  | "tenants"
  | "payments"
  | "maintenance"
  | "messages"
  | "settings";

interface NavItem {
  key: LandlordRoute;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "properties", label: "My Properties", icon: Building2 },
  { key: "tenants", label: "Tenants", icon: Users },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "messages", label: "Messages", icon: Mail },
];

interface LandlordSidebarProps {
  active: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
  brandName?: string;
  brandSubtitle?: string;
}

// Reusable sidebar for all landlord pages. Sticky on desktop (stays in view
// while the page content scrolls); collapses into a slide-out drawer with a
// hamburger toggle on mobile so it doesn't eat screen space there.
export default function LandlordSidebar({
  active,
  onNavigate,
  brandName = "PropManage",
  brandSubtitle = "LANDLORD PRO",
}: LandlordSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleNavigate(route: LandlordRoute) {
    onNavigate(route);
    setMobileOpen(false);
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0f172a] text-slate-300">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-[#0f172a]">
          P
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{brandName}</p>
          <p className="truncate text-[10px] font-medium tracking-wider text-slate-400">{brandSubtitle}</p>
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
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleNavigate(item.key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white text-[#0f172a]"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Settings pinned to bottom */}
      <div className="border-t border-white/5 px-3 py-4">
        <button
          onClick={() => handleNavigate("settings")}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            active === "settings"
              ? "bg-white text-[#0f172a]"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Settings size={18} />
          Settings
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar with hamburger toggle */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <span className="text-sm font-semibold text-gray-900">{brandName}</span>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 shadow-xl">{sidebarContent}</div>
        </div>
      )}

      {/* Desktop sidebar — sticky so it stays in view while page content scrolls */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">{sidebarContent}</aside>
    </>
  );
}
