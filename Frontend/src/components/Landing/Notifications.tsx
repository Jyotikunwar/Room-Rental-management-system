import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Bell, Settings, CheckCheck, Receipt, Wrench, Info, MessageSquare,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import type { User } from "../../services/api";
import { Sidebar, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";

// ---------- Types ----------
type NotificationCategory = "PAYMENTS" | "MAINTENANCE" | "LEASE" | "MESSAGES";

interface NotificationItem {
  id: number;
  category: NotificationCategory;
  title: string;
  description: string;
  createdAt: string; // ISO datetime
  isRead: boolean;
}

interface NotificationsProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

// ---------- Sample data (replace with API data from GET /api/notifications) ----------
const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 1, category: "PAYMENTS", title: "Rent Invoice Generated",
    description: "Your rent invoice for July 2026 has been generated. Please pay before 28th July.",
    createdAt: "2026-08-06T07:00:00", isRead: false,
  },
  {
    id: 2, category: "MAINTENANCE", title: "Maintenance Scheduled",
    description: "The plumber is scheduled to visit your room tomorrow between 9 AM and 11 AM.",
    createdAt: "2026-08-06T04:00:00", isRead: false,
  },
  {
    id: 3, category: "LEASE", title: "Lease Renewal Reminder",
    description: "Your lease is expiring in 3 months. Contact support for renewal options.",
    createdAt: "2026-08-05T10:00:00", isRead: true,
  },
  {
    id: 4, category: "MESSAGES", title: "New Message from Landlord",
    description: "Rajesh Kumar sent you a new message regarding the maintenance request.",
    createdAt: "2026-08-04T09:00:00", isRead: true,
  },
];

const TOTAL_RESULTS = 24;
const PAGE_SIZE = 4;

const FILTERS: { label: string; value: "ALL" | "UNREAD" | NotificationCategory }[] = [
  { label: "All", value: "ALL" },
  { label: "Unread", value: "UNREAD" },
  { label: "Payments", value: "PAYMENTS" },
  { label: "Maintenance", value: "MAINTENANCE" },
];

const CATEGORY_ICON: Record<NotificationCategory, { icon: ReactNode; bg: string }> = {
  PAYMENTS: { icon: <Receipt size={15} />, bg: "bg-blue-50 text-blue-600" },
  MAINTENANCE: { icon: <Wrench size={15} />, bg: "bg-blue-50 text-blue-600" },
  LEASE: { icon: <Info size={15} />, bg: "bg-stone-100 text-stone-500" },
  MESSAGES: { icon: <MessageSquare size={15} />, bg: "bg-stone-100 text-stone-500" },
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default function Notifications({ user, onLogout, onNavigate }: NotificationsProps) {
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | NotificationCategory>("ALL");
  const [notifications, setNotifications] = useState<NotificationItem[]>(NOTIFICATIONS);
  const [page, setPage] = useState(1);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filtered = useMemo(() => {
    if (filter === "ALL") return notifications;
    if (filter === "UNREAD") return notifications.filter((n) => !n.isRead);
    return notifications.filter((n) => n.category === filter);
  }, [notifications, filter]);

  const totalPages = Math.max(1, Math.ceil(TOTAL_RESULTS / PAGE_SIZE));

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    // TODO: call api.markAllNotificationsRead()
  };

  const markOneRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    // TODO: call api.markNotificationRead(id)
  };

  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  return (
    <div className="flex min-h-screen w-full bg-[#F4F6FB] text-stone-900">
      <Sidebar
        active="Notifications"
        onNavigate={handleNavigate}
        onSettings={() => onNavigate("settings")}
        onLogout={onLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3.5 pl-14 sm:px-8 sm:pl-8">
          <h1 className="truncate text-base font-semibold text-stone-900">RoomRent Manager</h1>
          <div className="flex shrink-0 items-center gap-4">
            <button className="relative text-blue-600 hover:text-blue-700">
              <Bell size={18} />
            </button>
            <button onClick={() => onNavigate("settings")} className="text-stone-500 hover:text-stone-700">
              <Settings size={18} />
            </button>
            <div className="h-8 w-8 overflow-hidden rounded-full bg-stone-200">
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName ?? "U"}`}
                alt={user.fullName}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-6 sm:px-8">
          {/* Header */}
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Notifications</h2>
              <p className="mt-1 text-sm text-stone-500">
                You have {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-stone-800"
              >
                <CheckCheck size={14} />
                Mark all as read
              </button>
              <button
                onClick={() => onNavigate("settings")}
                className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                <Settings size={14} />
                Settings
              </button>
            </div>
          </div>

          {/* Filter pills */}
          <div className="mb-5 -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  filter === f.value
                    ? "bg-blue-600 text-white"
                    : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Notification list */}
          <div className="flex flex-col gap-3">
            {filtered.map((n) => {
              const { icon, bg } = CATEGORY_ICON[n.category];
              return (
                <button
                  key={n.id}
                  onClick={() => markOneRead(n.id)}
                  className={`flex items-start gap-3 rounded-xl border bg-white p-4 text-left transition-colors ${
                    n.isRead ? "border-stone-200" : "border-stone-200 border-l-4 border-l-blue-600"
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                    {icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className={`text-sm ${n.isRead ? "font-medium text-stone-700" : "font-semibold text-stone-900"}`}>
                        {n.title}
                      </p>
                      <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">{n.description}</p>
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
                <p className="text-sm text-stone-400">No notifications here.</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-stone-500">
              Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, TOTAL_RESULTS)} of {TOTAL_RESULTS} results
            </p>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  // show first, last, current +/-1, and ellipsis for gaps
  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 disabled:opacity-40"
      >
        <ChevronLeft size={14} />
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-xs text-stone-400">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium ${
              page === p ? "bg-blue-600 text-white" : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 disabled:opacity-40"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
