import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Bell,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Wrench,
  Clock,
  Loader2,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { api, type MaintenanceRequest, type User } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";

interface AdminMaintenanceProps {
  user: User;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onAddTicket?: () => void;
}

const PAGE_SIZE = 4;

const PRIORITY_STYLE: Record<string, string> = {
  LOW: "bg-blue-50 text-blue-600",
  MEDIUM: "bg-amber-50 text-amber-600",
  HIGH: "bg-red-50 text-red-600",
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-600",
  IN_PROGRESS: "bg-blue-50 text-blue-600",
  RESOLVED: "bg-green-50 text-green-600",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Pending",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
};

// Placeholder display ref until the backend exposes a real ticket number.
function ticketRef(id: number) {
  return `TKT-${(1000 + id).toString()}`;
}

export default function AdminMaintenance({ onLogout, activeRoute, onNavigate, onAddTicket }: AdminMaintenanceProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState("LAST_30_DAYS");
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    setLoadFailed(false);
    try {
      // NOTE: (api as any) because getAdminMaintenanceRequests isn't in
      // api.ts yet — see the snippet above this component.
      const res = await (api as any).getAdminMaintenanceRequests?.();
      if (res?.success) {
        setRequests(res.requests || []);
      } else {
        setLoadFailed(true);
      }
    } catch (e) {
      console.error("Failed to load maintenance tickets:", e);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }

  const filteredRequests = useMemo(() => {
    const q = headerSearch.trim().toLowerCase();
    return requests.filter((r) => {
      const matchesQuery =
        !q || r.room?.title?.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
      const matchesPriority = priorityFilter === "ALL" || r.priority === priorityFilter;
      const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
      // NOTE: dateRange isn't applied yet — wire it to createdAt once the
      // backend confirms what "Last 30 Days" etc. should filter against.
      return matchesQuery && matchesPriority && matchesStatus;
    });
  }, [requests, headerSearch, priorityFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [headerSearch, priorityFilter, statusFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const pagedRequests = filteredRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filteredRequests.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredRequests.length);

  function pageNumbers(): (number | "ellipsis")[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, "ellipsis", totalPages];
    if (page >= totalPages - 2) return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
    return [1, "ellipsis", page, "ellipsis", totalPages];
  }

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === "OPEN").length,
      inProgress: requests.filter((r) => r.status === "IN_PROGRESS").length,
      completed: requests.filter((r) => r.status === "RESOLVED").length,
    };
  }, [requests]);

  const summaryCards = [
    { label: "Total Requests", value: stats.total, icon: Wrench, iconBg: "bg-gray-100 text-gray-500" },
    { label: "Pending", value: stats.pending, icon: Clock, iconBg: "bg-amber-50 text-amber-600" },
    { label: "In Progress", value: stats.inProgress, icon: Loader2, iconBg: "bg-blue-50 text-blue-600" },
    { label: "Completed", value: stats.completed, icon: CheckCircle2, iconBg: "bg-green-50 text-green-600" },
  ];

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} />
      <div className="flex-1">
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Search properties, tenants, tickets..."
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-gray-900"
            />
          </div>
          <div className="flex gap-3">
            <button className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button
              onClick={onAddTicket}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Plus size={16} />
              Add Ticket
            </button>
          </div>
        </header>

        <main className="p-6">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Maintenance Management</h1>
              <p className="mt-1 text-sm text-gray-500">Track, assign, and resolve property maintenance requests.</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500">
              <Calendar size={13} />
              Today, {todayLabel}
            </div>
          </div>

          {loadFailed && !loading && (
            <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Couldn't load maintenance tickets — this backend endpoint likely doesn't exist yet
              (see the comment at the top of <code>adminMaintenance.tsx</code> for what to add).
            </div>
          )}

          {/* Summary cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{card.label}</p>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.iconBg}`}>
                      <Icon size={14} />
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{loading ? "—" : card.value}</p>
                </div>
              );
            })}
          </div>

          {/* Tickets card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-gray-900">Maintenance Tickets</h2>
              <div className="flex flex-wrap gap-2">
                <InlineSelect
                  value={priorityFilter}
                  onChange={setPriorityFilter}
                  options={[
                    { value: "ALL", label: "All Priorities" },
                    { value: "HIGH", label: "High" },
                    { value: "MEDIUM", label: "Medium" },
                    { value: "LOW", label: "Low" },
                  ]}
                />
                <InlineSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "ALL", label: "All Statuses" },
                    { value: "OPEN", label: "Pending" },
                    { value: "IN_PROGRESS", label: "In Progress" },
                    { value: "RESOLVED", label: "Resolved" },
                  ]}
                />
                <InlineSelect
                  value={dateRange}
                  onChange={setDateRange}
                  options={[
                    { value: "LAST_7_DAYS", label: "Last 7 Days" },
                    { value: "LAST_30_DAYS", label: "Last 30 Days" },
                    { value: "ALL_TIME", label: "All Time" },
                  ]}
                  icon={Calendar}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3 font-medium">Ticket ID</th>
                    <th className="pb-3 font-medium">Property</th>
                    <th className="pb-3 font-medium">Issue Description</th>
                    <th className="pb-3 font-medium">Priority</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Assigned To</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">Loading tickets...</td>
                    </tr>
                  ) : pagedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">No tickets match your filters.</td>
                    </tr>
                  ) : (
                    pagedRequests.map((req) => (
                      <tr key={req.id} className="border-t border-gray-100">
                        <td className="py-3 font-medium text-gray-900">#{ticketRef(req.id)}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100">
                              <Building2 size={13} className="text-gray-500" />
                            </div>
                            <span className="text-gray-700">
                              {req.room?.title}
                              {req.room?.city ? `, ${req.room.city}` : ""}
                            </span>
                          </div>
                        </td>
                        <td className="max-w-xs truncate py-3 text-gray-600">{req.description}</td>
                        <td className="py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_STYLE[req.priority]}`}>
                            • {req.priority.charAt(0) + req.priority.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[req.status]}`}>
                            {STATUS_LABEL[req.status]}
                          </span>
                        </td>
                        <td className="py-3 text-gray-600">{req.assignedTo?.fullName || "Unassigned"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && filteredRequests.length > 0 && (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row">
                <p className="text-xs text-gray-500">
                  Showing {rangeStart} to {rangeEnd} of {filteredRequests.length} entries
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {pageNumbers().map((p, idx) =>
                    p === "ellipsis" ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium ${
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
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function InlineSelect({
  value,
  onChange,
  options,
  icon: Icon = ChevronDown,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: typeof ChevronDown;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-xs font-medium text-gray-700 outline-none focus:border-gray-900"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <Icon size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  );
}