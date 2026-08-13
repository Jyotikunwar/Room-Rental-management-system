import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Banknote,
  Wrench,
  Building2,
  Users,
  MessageSquare,
  RefreshCw,
  X,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Clock,
  RotateCcw,
  ArrowRight,
  Activity,
  ChevronLeft,
  ChevronRight,
  Bell,
} from "lucide-react";
import { api, type LandlordActivityEntry, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

interface LandlordActivityProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
  onAddProperty?: () => void;
}

type CategoryFilter = "ALL" | "PAYMENT" | "MAINTENANCE" | "PROPERTY" | "TENANT" | "MESSAGE" | "SYSTEM";

const CATEGORY_TABS: { key: CategoryFilter; label: string; icon: any }[] = [
  { key: "ALL", label: "All Activity", icon: Activity },
  { key: "PAYMENT", label: "Payments", icon: Banknote },
  { key: "MAINTENANCE", label: "Maintenance", icon: Wrench },
  { key: "PROPERTY", label: "Properties", icon: Building2 },
  { key: "TENANT", label: "Tenants", icon: Users },
  { key: "MESSAGE", label: "Messages", icon: MessageSquare },
  { key: "SYSTEM", label: "System", icon: Bell },
];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  PAYMENT: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  MAINTENANCE: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  PROPERTY: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  TENANT: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  MESSAGE: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  SYSTEM: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
};

const PAGE_SIZE = 10;

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function LandlordActivity({
  user,
  onLogout,
  activeRoute,
  onNavigate,
  onAddProperty,
}: LandlordActivityProps) {
  const [entries, setEntries] = useState<LandlordActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [headerSearch, setHeaderSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [selectedAudit, setSelectedAudit] = useState<LandlordActivityEntry | null>(null);
  const [page, setPage] = useState(1);
  const [backendStats, setBackendStats] = useState<{
    total: number;
    messages: number;
    payments: number;
    maintenance: number;
  }>({ total: 0, messages: 0, payments: 0, maintenance: 0 });
  const [backendCategoryCounts, setBackendCategoryCounts] = useState<Record<string, number>>({});

  const [toast, setToast] = useState<{ message: string; type?: "info" | "success" | "warning" } | null>(null);

  const showToast = (msg: string, type: "info" | "success" | "warning" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(headerSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [headerSearch]);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (category !== "ALL") params.category = category;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await api.getLandlordActivity(params);
      if (res?.success) {
        setEntries(res.entries || []);
        if (res.stats) setBackendStats(res.stats);
        if (res.categoryCounts) setBackendCategoryCounts(res.categoryCounts);
      } else {
        setEntries([]);
      }
    } catch (e) {
      console.error("Failed to load landlord activity feed:", e);
      showToast("Backend connection error loading activity feed", "warning");
    } finally {
      setLoading(false);
    }
  }, [category, debouncedSearch]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    setPage(1);
  }, [category, debouncedSearch]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: entries.length,
      PAYMENT: 0,
      MAINTENANCE: 0,
      PROPERTY: 0,
      TENANT: 0,
      MESSAGE: 0,
      SYSTEM: 0,
      ...backendCategoryCounts,
    };
    if (!backendCategoryCounts || Object.keys(backendCategoryCounts).length === 0) {
      entries.forEach((e) => {
        if (e.category && counts[e.category] !== undefined) {
          counts[e.category]++;
        }
      });
    }
    return counts;
  }, [entries, backendCategoryCounts]);

  const handleActionNavigate = (entry: LandlordActivityEntry) => {
    const targetRoute = entry.metadata?.targetRoute as LandlordRoute;
    if (targetRoute) {
      onNavigate(targetRoute);
    } else if (entry.category === "PAYMENT") {
      onNavigate("payments");
    } else if (entry.category === "MAINTENANCE") {
      onNavigate("maintenance");
    } else if (entry.category === "PROPERTY") {
      onNavigate("properties");
    } else if (entry.category === "TENANT") {
      onNavigate("tenants");
    } else if (entry.category === "MESSAGE") {
      onNavigate("messages");
    } else {
      onNavigate("dashboard");
    }
  };

  const handleResetFilters = () => {
    setHeaderSearch("");
    setDebouncedSearch("");
    setCategory("ALL");
    setPage(1);
  };

  const isFilterActive = debouncedSearch !== "" || category !== "ALL";

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const pagedEntries = useMemo(
    () => entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [entries, page]
  );
  const rangeStart = entries.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, entries.length);

  function pageNumbers(): (number | "ellipsis")[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, "ellipsis", totalPages];
    if (page >= totalPages - 2) return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
    return [1, "ellipsis", page, "ellipsis", totalPages];
  }

  const statCards = [
    { label: "Total Events", value: backendStats.total || entries.length, hint: "Logged activity events", icon: Activity, bg: "bg-slate-100 text-slate-700" },
    { label: "New Messages", value: backendStats.messages, hint: "Tenant inquiries & messages", icon: MessageSquare, bg: "bg-indigo-50 text-indigo-700" },
    { label: "Payments Received", value: backendStats.payments, hint: "Paid rent & settlements", icon: Banknote, bg: "bg-emerald-50 text-emerald-700" },
    { label: "Maintenance Updates", value: backendStats.maintenance, hint: "Pending tickets & requests", icon: Wrench, bg: "bg-amber-50 text-amber-700" },
  ];

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50/80 font-sans text-gray-900">
      <LandlordSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} user={user} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-xs font-semibold shadow-2xl transition-all animate-in slide-in-from-top-3 ${
              toast.type === "warning"
                ? "bg-amber-600 text-white"
                : toast.type === "info"
                ? "bg-blue-600 text-white"
                : "bg-emerald-600 text-white"
            }`}
          >
            {toast.type === "warning" ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Top Sticky Header */}
        <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-gray-200/80 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-3.5 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="relative w-full sm:max-w-md">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Search recent activity, title, room, tenant..."
              className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50/80 pl-9 pr-8 text-xs outline-none focus:border-gray-900 focus:bg-white transition-all"
            />
            {headerSearch && (
              <button
                onClick={() => setHeaderSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => {
                loadActivity();
                showToast("Activity feed refreshed", "info");
              }}
              disabled={loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-2xs"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {onAddProperty && (
              <button
                onClick={onAddProperty}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gray-900 px-4 text-xs font-semibold text-white hover:bg-gray-800 transition-all shadow-xs"
              >
                + New Property
              </button>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Page Heading & Description */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Landlord Activity Log</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Real-time audit trail of payments, maintenance requests, room bookings, tenant inquiries, and system updates.
              </p>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {statCards.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs transition-all hover:border-gray-300">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400">{c.label}</p>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${c.bg}`}>
                      <Icon size={14} />
                    </div>
                  </div>
                  <p className="mt-2 text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                    {loading ? "—" : c.value}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500 truncate">{c.hint}</p>
                </div>
              );
            })}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center justify-between border-b border-gray-200/80 pb-3 gap-2 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5 shrink-0">
              {CATEGORY_TABS.map((tab) => {
                const Icon = tab.icon;
                const count = categoryCounts[tab.key] || 0;
                const active = category === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setCategory(tab.key)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all shrink-0 ${
                      active
                        ? "bg-gray-900 text-white shadow-xs"
                        : "bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon size={13} className={active ? "text-white" : "text-gray-400"} />
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 shrink-0"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Activity Feed Container */}
          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-2xs overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 space-y-3">
                <RefreshCw size={24} className="animate-spin text-gray-400" />
                <p className="text-xs font-medium">Fetching recent landlord activity logs...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 mb-3">
                  <Activity size={24} />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">No activity records found</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  {isFilterActive
                    ? "No activity logs match your current search keywords or selected category filter."
                    : "No activity events logged yet for your property portfolio."}
                </p>
                {isFilterActive && (
                  <button
                    onClick={handleResetFilters}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-xs transition-all"
                  >
                    <RotateCcw size={13} />
                    <span>Clear Search & Filters</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pagedEntries.map((entry) => {
                  const style = CATEGORY_STYLES[entry.category] || CATEGORY_STYLES.SYSTEM;
                  const TabObj = CATEGORY_TABS.find((t) => t.key === entry.category);
                  const CategoryIcon = TabObj?.icon || Activity;

                  return (
                    <div
                      key={entry.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-gray-50/70 transition-all"
                    >
                      {/* Left side: Icon, category, title, description */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${style.bg} ${style.text} ${style.border} shadow-2xs`}
                        >
                          <CategoryIcon size={18} />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}
                            >
                              {entry.category}
                            </span>

                            {entry.status && (
                              <span className="inline-flex items-center rounded-md bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                                {entry.status}
                              </span>
                            )}

                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Clock size={11} />
                              {timeAgo(entry.createdAt)}
                            </span>
                          </div>

                          <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {entry.title}
                          </h3>

                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{entry.description}</p>
                        </div>
                      </div>

                      {/* Right side: Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => setSelectedAudit(entry)}
                          className="inline-flex h-8 items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-all shadow-2xs"
                        >
                          <span>View Details</span>
                        </button>

                        <button
                          onClick={() => handleActionNavigate(entry)}
                          className="inline-flex h-8 items-center gap-1 rounded-xl bg-gray-900 px-3 text-xs font-semibold text-white hover:bg-gray-800 transition-all shadow-2xs"
                        >
                          <span>{entry.metadata?.actionText || "Take Action"}</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Bar */}
            {!loading && entries.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-gray-100 bg-gray-50/50 px-4 py-3 gap-3">
                <p className="text-xs text-gray-500">
                  Showing <span className="font-semibold text-gray-900">{rangeStart}</span> to{" "}
                  <span className="font-semibold text-gray-900">{rangeEnd}</span> of{" "}
                  <span className="font-semibold text-gray-900">{entries.length}</span> activity entries
                </p>

                <div className="flex items-center gap-1 self-end sm:self-auto">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  {pageNumbers().map((n, idx) =>
                    n === "ellipsis" ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={`h-8 min-w-[32px] rounded-lg px-2 text-xs font-semibold transition-all ${
                          page === n
                            ? "bg-gray-900 text-white shadow-xs"
                            : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {n}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all"
                    aria-label="Next Page"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Activity Details Audit Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                      (CATEGORY_STYLES[selectedAudit.category] || CATEGORY_STYLES.SYSTEM).bg
                    } ${(CATEGORY_STYLES[selectedAudit.category] || CATEGORY_STYLES.SYSTEM).text} ${
                      (CATEGORY_STYLES[selectedAudit.category] || CATEGORY_STYLES.SYSTEM).border
                    }`}
                  >
                    {selectedAudit.category}
                  </span>
                  {selectedAudit.status && (
                    <span className="inline-flex items-center rounded-md bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                      {selectedAudit.status}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-gray-900">{selectedAudit.title}</h2>
              </div>
              <button
                onClick={() => setSelectedAudit(null)}
                className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 text-xs text-gray-700">
              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-1">
                <p className="font-semibold text-gray-900">Event Description</p>
                <p className="text-gray-600 leading-relaxed">{selectedAudit.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Timestamp</p>
                  <p className="font-semibold text-gray-900 mt-0.5">
                    {new Date(selectedAudit.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                  <p className="text-[10px] uppercase font-bold text-gray-400">Time Ago</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{timeAgo(selectedAudit.createdAt)}</p>
                </div>
              </div>

              {selectedAudit.metadata && (
                <div className="rounded-2xl border border-gray-100 p-4 space-y-2">
                  <p className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Event Metadata</p>
                  <div className="space-y-1.5">
                    {Object.entries(selectedAudit.metadata).map(([key, val]) => {
                      if (val === undefined || val === null) return null;
                      return (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-400 capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                          <span className="font-semibold text-gray-900 truncate max-w-[200px]">{String(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                onClick={() => setSelectedAudit(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const audit = selectedAudit;
                  setSelectedAudit(null);
                  handleActionNavigate(audit);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition-all shadow-xs"
              >
                <span>Go to {selectedAudit.metadata?.targetRoute || selectedAudit.category} Section</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}