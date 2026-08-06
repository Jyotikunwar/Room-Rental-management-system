import { useMemo, useState } from "react";
import {
  Bell, Settings, Check, Video, Wrench, Info, MessageSquare,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import type { User } from "../../services/api";
import type { TenantView } from "./navigation";
import { Sidebar, type NavLabel } from "./Sidebar";

interface NotificationsPageProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

// Maps the Sidebar's display labels to this app's TenantView route keys.
const LABEL_TO_VIEW: Record<NavLabel, TenantView> = {
  "Dashboard": "dashboard",
  "Find Rooms": "search",
  "Saved Rooms": "saved",
  "My Requests": "requests",
  "Current Rental": "rental",
  "Payments": "payments",
  "Messages": "messages",
  "Notifications": "notifications",
};

type Category = "All" | "Unread" | "Payments" | "Maintenance";

interface Notification {
  id: number;
  icon: typeof Video;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  category: "Payments" | "Maintenance" | "General";
}

// ---------- Sample data (replace with data fetched from your api/services layer) ----------
const NOTIFICATIONS: Notification[] = [
  {
    id: 1, icon: Video, title: "Rent Invoice Generated",
    description: "Your rent invoice for July 2026 has been generated. Please pay before 28th July.",
    time: "2 hours ago", unread: true, category: "Payments",
  },
  {
    id: 2, icon: Wrench, title: "Maintenance Scheduled",
    description: "The plumber is scheduled to visit your room tomorrow between 9 AM and 11 AM.",
    time: "5 hours ago", unread: true, category: "Maintenance",
  },
  {
    id: 3, icon: Info, title: "Lease Renewal Reminder",
    description: "Your lease is expiring in 3 months. Contact support for renewal options.",
    time: "Yesterday", unread: false, category: "General",
  },
  {
    id: 4, icon: MessageSquare, title: "New Message from Landlord",
    description: "Rajesh Kumar sent you a new message regarding the maintenance request.",
    time: "2 days ago", unread: false, category: "General",
  },
];

const CATEGORIES: Category[] = ["All", "Unread", "Payments", "Maintenance"];
const TOTAL_RESULTS = 24;
const PAGE_SIZE = 4;

export default function NotificationsPage({ user, onLogout, onNavigate }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [page, setPage] = useState(1);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const filtered = useMemo(() => {
    if (activeCategory === "All") return notifications;
    if (activeCategory === "Unread") return notifications.filter((n) => n.unread);
    return notifications.filter((n) => n.category === activeCategory);
  }, [notifications, activeCategory]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const totalPages = Math.max(1, Math.ceil(TOTAL_RESULTS / PAGE_SIZE));

  const handleNavigate = (label: NavLabel) => onNavigate(LABEL_TO_VIEW[label]);

  return (
    <div className="flex min-h-screen w-full bg-stone-50 text-stone-900">
      <Sidebar active="Notifications" onNavigate={handleNavigate} onLogout={onLogout} />

      <div className="flex-1">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 pl-14 sm:px-6 sm:pl-6">
          <h1 className="text-lg font-semibold text-stone-700">RoomRent Manager</h1>
          <div className="flex items-center gap-4">
            <button className="relative text-blue-600 hover:text-blue-700" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <button
              onClick={() => onNavigate("settings")}
              className="text-stone-400 hover:text-stone-600"
              aria-label="Settings"
            >
              <Settings size={19} />
            </button>
            <button
              onClick={onLogout}
              className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-stone-200"
              aria-label="Account"
            >
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName ?? "U"}`}
                alt={user.fullName}
                className="h-full w-full object-cover"
              />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Notifications</h2>
            <p className="text-sm text-stone-500">You have {unreadCount} unread notifications.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-stone-800"
            >
              <Check size={13} /> Mark all as read
            </button>
            <button
              onClick={() => onNavigate("settings")}
              className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
            >
              <Settings size={13} /> Settings
            </button>
          </div>
        </div>

        {/* Category filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === c
                  ? "bg-blue-600 text-white"
                  : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mb-4 border-t border-stone-200" />

        {/* Notification list */}
        <div className="flex flex-col gap-3">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm ${
                n.unread ? "border-l-4 border-blue-500 border-y-stone-200 border-r-stone-200" : "border-stone-200"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <n.icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-900">{n.title}</p>
                <p className="text-sm text-stone-500">{n.description}</p>
              </div>
              <span
                className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  n.unread ? "bg-blue-50 text-blue-600" : "text-stone-400"
                }`}
              >
                {n.time}
              </span>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-stone-400">No notifications in this category.</p>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-stone-500">
            Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, TOTAL_RESULTS)} of {TOTAL_RESULTS} results
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium ${
                  page === p ? "bg-blue-600 text-white" : "border border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {p}
              </button>
            ))}
            <span className="px-1 text-stone-400">…</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
