import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Banknote,
  Wrench,
  Building2,
  Users,
  UserCog,
  RefreshCw,
  Loader2,
  X,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Clock,
  RotateCcw,
  ArrowRight,
  Activity,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api, type User as UserType } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";

interface AdminActivityProps {
  user: UserType;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onAddProperty?: () => void;
}

type CategoryFilter = "ALL" | "PAYMENT" | "MAINTENANCE" | "PROPERTY" | "TENANT" | "LANDLORD";

const CATEGORY_TABS: { key: CategoryFilter; label: string; icon: any }[] = [
  { key: "ALL", label: "All Activity", icon: Activity },
  { key: "PAYMENT", label: "Payments", icon: Banknote },
  { key: "MAINTENANCE", label: "Maintenance", icon: Wrench },
  { key: "PROPERTY", label: "Properties", icon: Building2 },
  { key: "TENANT", label: "Tenants", icon: Users },
  { key: "LANDLORD", label: "Landlords", icon: UserCog },
];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  PAYMENT: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  MAINTENANCE: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  PROPERTY: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  TENANT: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  LANDLORD: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
};

const PAGE_SIZE = 10;

export default function AdminActivity({ onLogout, activeRoute, onNavigate }: AdminActivityProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [headerSearch, setHeaderSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [selectedAudit, setSelectedAudit] = useState<any | null>(null);
  const [page, setPage] = useState(1);

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

      const res = await api.getAdminActivity(params);
      if (res?.success) {
        setEntries(res.entries || []);
      } else {
        setEntries([]);
      }
    } catch (e) {
      console.error("Failed to load admin activity log:", e);
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
      LANDLORD: 0,
    };
    entries.forEach((e) => {
      if (e.category && counts[e.category] !== undefined) {
        counts[e.category]++;
      }
    });
    return counts;
  }, [entries]);

  const handleActionNavigate = (entry: any) => {
    const route = entry.metadata?.targetRoute;
    if (route) {
      onNavigate(route as AdminRoute);
    } else if (entry.category === "PAYMENT") {
      onNavigate("payments");
    } else if (entry.category === "MAINTENANCE") {
      onNavigate("maintenance");
    } else if (entry.category === "PROPERTY") {
      onNavigate("properties");
    } else if (entry.category === "TENANT") {
      onNavigate("tenants");
    } else if (entry.category === "LANDLORD") {
      onNavigate("landlords");
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

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50/80 font-sans text-gray-900">
      <AdminSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} />

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

        {/* Header */}
        <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-gray-200/80 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-3.5 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="relative w-full sm:max-w-md">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Search audit trail, title, reference..."
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

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <button
              onClick={() => loadActivity()}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
              title="Refresh Activity Log"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : "text-gray-500"} />
              <span className="hidden xs:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 lg:p-6">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-xl font-black text-gray-900 sm:text-2xl tracking-tight">System Activity Audit Log</h1>
              <p className="mt-0.5 text-xs text-gray-500">
                Compact live audit list for payments, properties, maintenance, and user events.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                {entries.length} Events Logged
              </span>
            </div>
          </div>

          {/* Compact Category Tabs */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-2xs">
            <div className="flex flex-wrap gap-1">
              {CATEGORY_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = category === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setCategory(tab.key)}
                    className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all ${
                      isActive
                        ? "bg-gray-900 text-white shadow-2xs"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon size={13} className={isActive ? "text-white" : "text-gray-400"} />
                    <span>{tab.label}</span>
                    {categoryCounts[tab.key] > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                          isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {categoryCounts[tab.key]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Compact Activity List View */}
          <div className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 shadow-2xs">
            {loading && entries.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                <Loader2 size={22} className="mx-auto mb-2 animate-spin text-blue-600" />
                Loading live backend activity...
              </div>
            ) : pagedEntries.length === 0 ? (
              <div className="py-12 text-center text-gray-500 font-medium text-xs">
                No activity logs found matching your filter.
              </div>
            ) : (
              <div className="space-y-2">
                {pagedEntries.map((entry, index) => {
                  const style = CATEGORY_STYLES[entry.category] || {
                    bg: "bg-gray-50",
                    text: "text-gray-700",
                    border: "border-gray-200",
                  };

                  const eventIcon =
                    entry.category === "PAYMENT" ? (
                      <Banknote size={14} />
                    ) : entry.category === "MAINTENANCE" ? (
                      <Wrench size={14} />
                    ) : entry.category === "PROPERTY" ? (
                      <Building2 size={14} />
                    ) : entry.category === "TENANT" ? (
                      <Users size={14} />
                    ) : entry.category === "LANDLORD" ? (
                      <UserCog size={14} />
                    ) : (
                      <Activity size={14} />
                    );

                  return (
                    <div
                      key={entry.id || index}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white p-2.5 hover:bg-gray-50/80 transition-all hover:border-gray-200 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${style.bg} ${style.text} ${style.border}`}
                        >
                          {eventIcon}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-gray-900 text-xs truncate max-w-[240px] sm:max-w-md">
                              {entry.title}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.2 text-[9px] font-black border ${style.bg} ${style.text} ${style.border}`}
                            >
                              {entry.category}
                            </span>
                            {entry.status && (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.2 text-[9px] font-bold text-gray-600">
                                {entry.status}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 truncate mt-0.5 max-w-[300px] sm:max-w-xl">
                            {entry.description}
                          </p>
                        </div>
                      </div>

                      {/* Right Meta & Quick Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {new Date(entry.createdAt).toLocaleDateString()}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedAudit(entry)}
                            className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                            title="Audit Info"
                          >
                            Info
                          </button>
                          <button
                            onClick={() => handleActionNavigate(entry)}
                            className="rounded-lg bg-gray-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-gray-800 flex items-center gap-1 transition-all"
                          >
                            <span>Action</span>
                            <ArrowRight size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Compact Pagination */}
            {!loading && entries.length > 0 && (
              <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs">
                <p className="text-[11px] text-gray-500 font-medium">
                  Showing {rangeStart} to {rangeEnd} of {entries.length} items
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  {pageNumbers().map((p, idx) =>
                    p === "ellipsis" ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-[11px] text-gray-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold ${
                          page === p ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Activity Details Audit Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl border border-gray-100">
            <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs sm:text-sm text-gray-900">Audit Info</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold text-gray-700">
                  {selectedAudit.category}
                </span>
              </div>
              <button
                onClick={() => setSelectedAudit(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-2xl bg-gray-900 p-3.5 text-white shadow-xs">
                <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Event Title</p>
                <p className="mt-0.5 text-sm font-black">{selectedAudit.title}</p>
                <p className="mt-1.5 text-xs text-gray-300 font-medium">{selectedAudit.description}</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-400 font-medium">Category:</span>
                  <span className="font-bold text-gray-900">{selectedAudit.category}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-400 font-medium">Status Flag:</span>
                  <span className="font-bold text-gray-900">{selectedAudit.status || "COMPLETED"}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-400 font-medium">Logged Timestamp:</span>
                  <span className="font-semibold text-gray-800">{new Date(selectedAudit.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-400 font-medium">Unique Audit Ref:</span>
                  <span className="font-mono text-gray-700 font-bold text-[11px]">{selectedAudit.id}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelectedAudit(null)}
                  className="rounded-xl border border-gray-200 px-3.5 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const entry = selectedAudit;
                    setSelectedAudit(null);
                    handleActionNavigate(entry);
                  }}
                  className="flex items-center gap-1 rounded-xl bg-gray-900 px-3.5 py-2 font-extrabold text-white shadow hover:bg-gray-800 text-xs"
                >
                  <span>Go to Screen</span>
                  <ExternalLink size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
