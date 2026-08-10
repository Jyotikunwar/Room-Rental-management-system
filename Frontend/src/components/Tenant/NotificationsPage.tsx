import { useEffect, useMemo, useState } from "react";
import {
  Bell, Check, CalendarCheck, CreditCard, MessageSquare, Star, Info,
  ChevronLeft, ChevronRight, Loader2, SlidersHorizontal, X,
} from "lucide-react";
import type { User, Notification } from "../../services/api";
import { api } from "../../services/api";
import type { TenantView } from "./navigation";
import { Sidebar, type NavLabel } from "./Sidebar";
import Avatar from "../Avatar";
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

// Categories match the real NotificationType enum on the backend
// (BOOKING, PAYMENT, MESSAGE, REVIEW, SYSTEM) plus a client-side "Unread" filter.
type Category = "All" | "Unread" | "BOOKING" | "PAYMENT" | "MESSAGE" | "REVIEW" | "SYSTEM";

const CATEGORY_LABEL: Record<Category, string> = {
  All: "All",
  Unread: "Unread",
  BOOKING: "Bookings",
  PAYMENT: "Payments",
  MESSAGE: "Messages",
  REVIEW: "Reviews",
  SYSTEM: "General",
};
const CATEGORIES: Category[] = ["All", "Unread", "BOOKING", "PAYMENT", "MESSAGE", "REVIEW", "SYSTEM"];

const TYPE_ICON: Record<string, typeof Bell> = {
  BOOKING: CalendarCheck,
  PAYMENT: CreditCard,
  MESSAGE: MessageSquare,
  REVIEW: Star,
  SYSTEM: Info,
};

const PAGE_SIZE = 4;
// getNotifications only takes a single `limit` — there's no server-side page
// param, so we fetch a generous batch once and paginate client-side below.
const FETCH_LIMIT = 100;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

const PREF_TOGGLES = [
  { key: "payments", label: "Payment reminders" },
  { key: "maintenance", label: "Maintenance updates" },
  { key: "messages", label: "Messages" },
  { key: "promotions", label: "Recommendations" },
];

export default function NotificationsPage({ user, onLogout, onNavigate }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [page, setPage] = useState(1);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);

  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    payments: true, maintenance: true, messages: true, promotions: false,
  });
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSavingKey, setPrefsSavingKey] = useState<string | null>(null);

  const loadNotifications = () => {
    setLoading(true);
    setError(null);
    api
      .getNotifications(FETCH_LIMIT)
      .then((res) => {
        if (res && res.success === false) {
          setError(res.message || "Failed to load notifications");
          return;
        }
        const list = Array.isArray(res) ? res : res?.notifications || res?.data || [];
        setNotifications(list);
      })
      .catch(() => setError("Failed to load notifications"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filtered = useMemo(() => {
    if (activeCategory === "All") return notifications;
    if (activeCategory === "Unread") return notifications.filter((n) => !n.isRead);
    return notifications.filter((n) => n.type === activeCategory);
  }, [notifications, activeCategory]);

  // Reset to page 1 whenever the category filter changes, so you don't land
  // on an out-of-range page for a smaller filtered set.
  useEffect(() => {
    setPage(1);
  }, [activeCategory]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const markAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      const res = await api.markAllNotificationsRead();
      if (!res || res.success !== false) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } finally {
      setMarkingAllRead(false);
    }
  };

  const markOneAsRead = async (n: Notification) => {
    if (n.isRead) return;
    setMarkingId(n.id);
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    try {
      const res = await api.markNotificationRead(n.id);
      if (res && res.success === false) {
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: false } : x)));
      }
    } catch {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: false } : x)));
    } finally {
      setMarkingId(null);
    }
  };

  // Handle click: mark notification read (if needed) then navigate based on type
  const handleNotificationClick = async (n: Notification) => {
    try {
      if (!n.isRead) await markOneAsRead(n);
    } finally {
      // Basic routing by notification type. Extend to use ids/links from notification payload if available.
      if (n.type === "BOOKING") onNavigate("requests");
      else if (n.type === "PAYMENT") onNavigate("payments");
      else if (n.type === "MESSAGE") onNavigate("messages");
      else onNavigate("dashboard");
    }
  };

  const openPrefs = () => {
    setPrefsOpen(true);
    if (!prefsLoading) {
      setPrefsLoading(true);
      api
        .getNotificationPreferences()
        .then((res) => {
          const raw = res?.preferences || res;
          if (raw && typeof raw === "object") {
            // Server stores { email, sms, push } per category; the UI shows
            // one toggle per category, so treat "any channel on" as true.
            const asBooleans: Record<string, boolean> = {};
            for (const [key, value] of Object.entries(raw)) {
              if (value && typeof value === "object") {
                const channels = value as { email?: boolean; sms?: boolean; push?: boolean };
                asBooleans[key] = Boolean(channels.email || channels.sms || channels.push);
              }
            }
            setPrefs((cur) => ({ ...cur, ...asBooleans }));
          }
        })
        .catch(() => {})
        .finally(() => setPrefsLoading(false));
    }
  };

  // TODO: togglePref currently sends { [key]: boolean }, but the real
  // updateNotificationPreferences() expects Record<string, { email?, sms?, push? }>.
  // Waiting on the actual preferences shape from api.ts to fix this correctly —
  // see the conversation for details. Left as-is for now so the rest of the
  // page keeps compiling; this one call will still type-error until then.
  // The UI shows one toggle per category (not per channel), so flipping it
  // on/off here means "enable/disable all channels for this category" —
  // matching the { email, sms, push } shape updateNotificationPreferences expects.
  const togglePref = async (key: string) => {
    const prevValue = prefs[key];
    const nextValue = !prevValue;
    setPrefs((p) => ({ ...p, [key]: nextValue }));
    setPrefsSavingKey(key);
    try {
      const res = await api.updateNotificationPreferences({
        [key]: { email: nextValue, sms: nextValue, push: nextValue },
      });
      if (res && res.success === false) setPrefs((p) => ({ ...p, [key]: prevValue }));
    } catch {
      setPrefs((p) => ({ ...p, [key]: prevValue }));
    } finally {
      setPrefsSavingKey(null);
    }
  };

  const handleNavigate = (label: NavLabel) => onNavigate(LABEL_TO_VIEW[label]);

  return (
    <div className="flex min-h-screen w-full bg-stone-50 text-stone-900">
      <Sidebar
        active="Notifications"
        user={user}
        onNavigate={handleNavigate}
        onSettings={() => onNavigate("settings")}
        onLogout={onLogout}
      />

      <div className="flex-1">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 pl-14 sm:px-6 sm:pl-6">
          <h1 className="text-lg font-semibold text-stone-700">RoomRent Manager</h1>
          <div className="flex items-center gap-4">
            <span className="relative text-blue-600">
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </span>
            {/* Decorative only — avatar shouldn't trigger logout. Use the sidebar's logout control. */}
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-stone-200">
             <Avatar name={user.fullName ?? "U"} avatarUrl={(user as any).avatarUrl} size={32} />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          {/* Header */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-stone-900">Notifications</h2>
              <p className="text-sm text-stone-500">You have {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={markAllAsRead}
                disabled={markingAllRead || unreadCount === 0}
                className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50"
              >
                {markingAllRead ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Mark all as read
              </button>
              <button
                onClick={openPrefs}
                className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                <SlidersHorizontal size={13} /> Preferences
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
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>

          <div className="mb-4 border-t border-stone-200" />

          {/* Notification list */}
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="animate-spin text-stone-400" size={24} />
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-stone-400">{error}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {paged.map((n) => {
                const Icon = TYPE_ICON[n.type] || Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`flex items-start gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition-colors hover:bg-stone-50 ${
                      !n.isRead ? "border-l-4 border-blue-500 border-y-stone-200 border-r-stone-200" : "border-stone-200"
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-900">{n.title}</p>
                      <p className="text-sm text-stone-500">{n.message}</p>
                    </div>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      {markingId === n.id ? (
                        <Loader2 size={12} className="animate-spin text-stone-400" />
                      ) : (
                        <span
                          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            !n.isRead ? "bg-blue-50 text-blue-600" : "text-stone-400"
                          }`}
                        >
                          {timeAgo(n.createdAt)}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <p className="py-10 text-center text-sm text-stone-400">No notifications in this category.</p>
              )}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && total > 0 && (
            <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-xs text-stone-500">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} results
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
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(Math.max(0, page - 2), Math.max(0, page - 2) + 3)
                  .map((p) => (
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
          )}
        </div>
      </div>

      {/* ---- Preferences panel ---- */}
      {prefsOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <span className="text-sm font-semibold">Notification Preferences</span>
              <button onClick={() => setPrefsOpen(false)} className="text-stone-500 hover:text-stone-700">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              {prefsLoading ? (
                <div className="flex h-24 items-center justify-center">
                  <Loader2 className="animate-spin text-stone-400" size={20} />
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-stone-100">
                  {PREF_TOGGLES.map((t) => (
                    <div key={t.key} className="flex items-center justify-between gap-3 py-2.5">
                      <p className="text-sm font-medium text-stone-800">{t.label}</p>
                      <div className="flex items-center gap-2">
                        {prefsSavingKey === t.key && <Loader2 size={12} className="animate-spin text-stone-400" />}
                        <button
                          onClick={() => togglePref(t.key)}
                          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                            prefs[t.key] ? "bg-blue-600" : "bg-stone-200"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                              prefs[t.key] ? "translate-x-4" : "translate-x-0.5"
                            }`}
                        />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-stone-400">
                For email/SMS/push channel settings, visit your full Settings page.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
