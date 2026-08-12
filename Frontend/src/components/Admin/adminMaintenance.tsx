import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
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
  MessageSquare,
  RefreshCw,
  AlertTriangle,
  X,
  ShieldAlert,
  RotateCcw,
  MoreVertical,
  Trash2,
  Eye,
  User as UserIcon,
} from "lucide-react";
import { api, type MaintenanceRequest, type User } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";
import { openAdminMessage } from "./adminMessages";

interface AdminMaintenanceProps {
  user: User;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onAddTicket?: () => void;
}

const PAGE_SIZE = 6;

const PRIORITY_STYLE: Record<string, string> = {
  LOW: "bg-blue-50 text-blue-700 border-blue-200",
  MEDIUM: "bg-amber-50 text-amber-800 border-amber-200",
  HIGH: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
  RESOLVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  REJECTED: "bg-slate-100 text-slate-700 border-slate-200",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  REJECTED: "Rejected",
};

function formatTicketRef(id: number) {
  return `TKT-${(1000 + id).toString()}`;
}

export default function AdminMaintenance({ onLogout, activeRoute, onNavigate }: AdminMaintenanceProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [headerSearch, setHeaderSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState("ALL_TIME");
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Modals state
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableBookings, setAvailableBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    bookingId: "",
    title: "",
    description: "",
    status: "PENDING",
  });

  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "info" | "success" | "warning" } | null>(null);

  const showToast = (msg: string, type: "info" | "success" | "warning" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(headerSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [headerSearch]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (priorityFilter !== "ALL") params.priority = priorityFilter;
      if (dateRange !== "ALL_TIME") params.dateRange = dateRange;

      const res = await api.getAdminMaintenanceRequests(params);
      if (res?.success) {
        setRequests(res.requests || []);
      } else {
        setRequests([]);
      }
    } catch (e) {
      console.error("Failed to load maintenance tickets:", e);
      showToast("Backend connection error loading maintenance requests", "warning");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, priorityFilter, dateRange]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Load active bookings when opening Add Ticket Modal
  const handleOpenAddTicketModal = async () => {
    setShowAddModal(true);
    setLoadingBookings(true);
    try {
      const res = await api.getAdminBookings();
      if (res?.success && Array.isArray(res.bookings)) {
        setAvailableBookings(res.bookings);
        if (res.bookings.length > 0) {
          setTicketForm((prev) => ({
            ...prev,
            bookingId: String(res.bookings[0].id),
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch tenant bookings for ticket creation:", err);
      showToast("Could not load tenant bookings list", "warning");
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.bookingId || !ticketForm.title.trim() || !ticketForm.description.trim()) {
      showToast("Please select a booking and fill title/description", "warning");
      return;
    }

    setSubmittingTicket(true);
    try {
      const res = await api.createAdminMaintenanceTicket({
        bookingId: Number(ticketForm.bookingId),
        title: ticketForm.title.trim(),
        description: ticketForm.description.trim(),
        status: ticketForm.status,
      });

      if (res?.success) {
        showToast("Maintenance ticket created successfully!");
        setShowAddModal(false);
        setTicketForm({ bookingId: "", title: "", description: "", status: "PENDING" });
        loadRequests();
      } else {
        showToast(res?.message || "Failed to create ticket", "warning");
      }
    } catch (err) {
      console.error("Create ticket error:", err);
      showToast("Backend error while creating ticket", "warning");
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    setBusyId(id);
    setOpenMenuId(null);
    try {
      const res = await api.updateAdminMaintenanceStatus(id, newStatus);
      if (res?.success) {
        showToast(`Ticket #${formatTicketRef(id)} status updated to ${STATUS_LABEL[newStatus] || newStatus}`);
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: newStatus as any } : r))
        );
        if (selectedTicket?.id === id) {
          setSelectedTicket((prev: any) => (prev ? { ...prev, status: newStatus as any } : null));
        }
        loadRequests();
      } else {
        showToast(res?.message || "Failed to update status", "warning");
      }
    } catch (err) {
      console.error("Update ticket status error:", err);
      showToast("Backend error while updating status", "warning");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteTicket = async (id: number) => {
    if (!window.confirm(`Are you sure you want to delete maintenance ticket #${formatTicketRef(id)}?`)) {
      return;
    }
    setBusyId(id);
    setOpenMenuId(null);
    try {
      const res = await api.deleteAdminMaintenanceTicket(id);
      if (res?.success) {
        showToast(`Ticket #${formatTicketRef(id)} deleted`);
        if (selectedTicket?.id === id) setSelectedTicket(null);
        loadRequests();
      } else {
        showToast(res?.message || "Failed to delete ticket", "warning");
      }
    } catch (err) {
      console.error("Delete ticket error:", err);
      showToast("Error deleting ticket", "warning");
    } finally {
      setBusyId(null);
    }
  };

  const handleResetFilters = () => {
    setHeaderSearch("");
    setDebouncedSearch("");
    setPriorityFilter("ALL");
    setStatusFilter("ALL");
    setDateRange("ALL_TIME");
    setPage(1);
  };

  const isFilterActive =
    debouncedSearch !== "" ||
    priorityFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    dateRange !== "ALL_TIME";

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, priorityFilter, statusFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const pagedRequests = useMemo(
    () => requests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [requests, page]
  );
  const rangeStart = requests.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, requests.length);

  function pageNumbers(): (number | "ellipsis")[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, "ellipsis", totalPages];
    if (page >= totalPages - 2) return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
    return [1, "ellipsis", page, "ellipsis", totalPages];
  }

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === "PENDING").length,
      inProgress: requests.filter((r) => r.status === "IN_PROGRESS").length,
      resolved: requests.filter((r) => r.status === "RESOLVED").length,
    };
  }, [requests]);

  const summaryCards = [
    { label: "Total Tickets", value: stats.total, icon: Wrench, iconBg: "bg-gray-100 text-gray-700" },
    { label: "Pending", value: stats.pending, icon: Clock, iconBg: "bg-amber-50 text-amber-600 border border-amber-100" },
    { label: "In Progress", value: stats.inProgress, icon: Loader2, iconBg: "bg-blue-50 text-blue-600 border border-blue-100" },
    { label: "Resolved", value: stats.resolved, icon: CheckCircle2, iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100" },
  ];

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50/80 font-sans text-gray-900">
      <AdminSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold shadow-2xl transition-all animate-in slide-in-from-top-3 ${
              toast.type === "warning"
                ? "bg-amber-600 text-white"
                : toast.type === "info"
                ? "bg-blue-600 text-white"
                : "bg-emerald-600 text-white"
            }`}
          >
            {toast.type === "warning" ? <ShieldAlert size={18} /> : <CheckCircle2 size={18} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Global Admin Header */}
        <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-gray-200/80 bg-white/95 backdrop-blur-md px-4 py-3.5 sm:px-6 sm:py-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="relative w-full sm:max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Search ticket #, issue title, property, tenant name..."
              className="h-10 w-full rounded-2xl border border-gray-200 bg-gray-50/80 pl-10 pr-9 text-xs sm:text-sm outline-none focus:border-gray-900 focus:bg-white transition-all shadow-inner"
            />
            {headerSearch && (
              <button
                onClick={() => setHeaderSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5">
            <button
              onClick={() => loadRequests()}
              className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-xs"
              title="Refresh Data from Backend"
            >
              <RefreshCw size={15} className={loading ? "animate-spin text-blue-600" : "text-gray-500"} />
              <span className="hidden xs:inline">Refresh</span>
            </button>

            <button
              onClick={handleOpenAddTicketModal}
              className="flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-gray-800 active:scale-95 transition-all"
            >
              <Plus size={16} />
              <span>Add Ticket</span>
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-gray-900 sm:text-3xl tracking-tight">Maintenance & Incident Control</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Live backend request tracking, status updates, tenant issue resolution, and incident management.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                {requests.length} Active Ticket(s)
              </span>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-3xl border border-gray-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{card.label}</p>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${card.iconBg}`}>
                      <Icon size={17} />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-black text-gray-900 tracking-tight">{loading ? "—" : card.value}</p>
                </div>
              );
            })}
          </div>

          {/* Responsive Filter Bar */}
          <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <Wrench size={14} className="text-gray-400" />
                <span>Ticket Search & Filtering</span>
              </div>
              {isFilterActive && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors"
                >
                  <RotateCcw size={13} />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LabeledSelect
                label="Priority Level"
                value={priorityFilter}
                onChange={setPriorityFilter}
                options={[
                  { value: "ALL", label: "All Priorities" },
                  { value: "HIGH", label: "High Priority" },
                  { value: "MEDIUM", label: "Medium Priority" },
                  { value: "LOW", label: "Low Priority" },
                ]}
              />
              <LabeledSelect
                label="Status Filter"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "ALL", label: "All Statuses" },
                  { value: "PENDING", label: "Pending" },
                  { value: "IN_PROGRESS", label: "In Progress" },
                  { value: "RESOLVED", label: "Resolved" },
                  { value: "REJECTED", label: "Rejected" },
                ]}
              />
              <LabeledSelect
                label="Creation Date"
                value={dateRange}
                onChange={setDateRange}
                options={[
                  { value: "ALL_TIME", label: "All Time" },
                  { value: "LAST_7_DAYS", label: "Last 7 Days" },
                  { value: "LAST_30_DAYS", label: "Last 30 Days" },
                  { value: "THIS_YEAR", label: "This Year" },
                ]}
              />
            </div>
          </div>

          {/* Mobile Card List View (< 640px) */}
          <div className="block sm:hidden mb-6 space-y-3">
            {loading && requests.length === 0 ? (
              <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-gray-400">
                <Loader2 size={24} className="mx-auto mb-2 animate-spin text-blue-600" />
                Loading maintenance tickets from backend...
              </div>
            ) : pagedRequests.length === 0 ? (
              <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                No maintenance tickets found matching your criteria.
              </div>
            ) : (
              pagedRequests.map((req) => (
                <div key={req.id} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                    <span className="font-mono font-black text-xs text-gray-900">#{formatTicketRef(req.id)}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${PRIORITY_STYLE[req.priority]}`}>
                        {req.priority}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${STATUS_STYLE[req.status]}`}>
                        {STATUS_LABEL[req.status] || req.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{req.title || req.description.slice(0, 30)}</h4>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{req.description}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                      <span className="font-semibold text-gray-700">{req.room?.title}</span>
                      <span>{req.user?.fullName}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-1.5">
                    <button
                      onClick={() => setSelectedTicket(req)}
                      className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                    >
                      <Eye size={13} />
                      <span>Details</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {req.user?.id ? (
                        <button
                          onClick={() => {
                            openAdminMessage(req.user!.id);
                            onNavigate("messages");
                          }}
                          className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                        >
                          <MessageSquare size={13} />
                          <span>Chat</span>
                        </button>
                      ) : null}

                      {req.status !== "RESOLVED" && (
                        <button
                          onClick={() => handleUpdateStatus(req.id, "RESOLVED")}
                          className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                        >
                          <CheckCircle2 size={13} />
                          <span>Resolve</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Maintenance Data Table (>= 640px) */}
          <div className="hidden sm:block rounded-3xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="overflow-x-auto scrollbar-none">
              <table className="min-w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200/70 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    <th className="pb-3 pr-4 font-bold">Ticket ID</th>
                    <th className="pb-3 pr-4 font-bold">Property & Unit</th>
                    <th className="pb-3 pr-4 font-bold">Issue Description</th>
                    <th className="pb-3 pr-4 font-bold">Tenant</th>
                    <th className="pb-3 pr-4 font-bold">Priority</th>
                    <th className="pb-3 pr-4 font-bold">Status</th>
                    <th className="pb-3 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && requests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <Loader2 size={24} className="mx-auto mb-2 animate-spin text-blue-600" />
                        Fetching live maintenance tickets...
                      </td>
                    </tr>
                  ) : pagedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 font-medium">
                        No maintenance tickets found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    pagedRequests.map((req) => {
                      const isUpdating = busyId === req.id;
                      return (
                        <tr key={req.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3.5 pr-4 font-mono font-bold text-gray-900">
                            #{formatTicketRef(req.id)}
                          </td>
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gray-100 border border-gray-200">
                                <Building2 size={13} className="text-gray-500" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{req.room?.title || "Facility"}</p>
                                {req.room?.city && <p className="text-[10px] text-gray-400">{req.room.city}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="max-w-xs py-3.5 pr-4">
                            <p className="font-bold text-gray-900 line-clamp-1">{req.title || req.description}</p>
                            <p className="text-[11px] text-gray-500 line-clamp-1">{req.description}</p>
                          </td>
                          <td className="py-3.5 pr-4">
                            <p className="font-bold text-gray-900">{req.user?.fullName || "Tenant"}</p>
                            {req.user?.email && <p className="text-[10px] text-gray-400">{req.user.email}</p>}
                          </td>
                          <td className="py-3.5 pr-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                                PRIORITY_STYLE[req.priority] || "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {req.priority}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                                STATUS_STYLE[req.status] || "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {STATUS_LABEL[req.status] || req.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="relative inline-block text-left">
                              <button
                                onClick={() => setOpenMenuId(openMenuId === req.id ? null : req.id)}
                                disabled={isUpdating}
                                className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-50"
                                aria-label="More actions"
                              >
                                {isUpdating ? <Loader2 size={15} className="animate-spin text-blue-600" /> : <MoreVertical size={15} />}
                              </button>

                              {openMenuId === req.id && (
                                <div className="absolute right-0 top-9 z-30 w-52 rounded-2xl border border-gray-200 bg-white py-1.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
                                  <button
                                    onClick={() => {
                                      setSelectedTicket(req);
                                      setOpenMenuId(null);
                                    }}
                                    className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                  >
                                    <Eye size={14} className="text-gray-400" />
                                    <span>View Details</span>
                                  </button>

                                  {req.user?.id ? (
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        openAdminMessage(req.user!.id);
                                        onNavigate("messages");
                                      }}
                                      className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50"
                                    >
                                      <MessageSquare size={14} />
                                      <span>Message Tenant</span>
                                    </button>
                                  ) : null}

                                  <div className="my-1 border-t border-gray-100" />

                                  {req.status !== "IN_PROGRESS" && (
                                    <button
                                      onClick={() => handleUpdateStatus(req.id, "IN_PROGRESS")}
                                      className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                                    >
                                      <Loader2 size={14} />
                                      <span>Mark In Progress</span>
                                    </button>
                                  )}

                                  {req.status !== "RESOLVED" && (
                                    <button
                                      onClick={() => handleUpdateStatus(req.id, "RESOLVED")}
                                      className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                                    >
                                      <CheckCircle2 size={14} />
                                      <span>Mark Resolved</span>
                                    </button>
                                  )}

                                  {req.status !== "REJECTED" && (
                                    <button
                                      onClick={() => handleUpdateStatus(req.id, "REJECTED")}
                                      className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                      <AlertTriangle size={14} />
                                      <span>Reject Request</span>
                                    </button>
                                  )}

                                  <div className="my-1 border-t border-gray-100" />

                                  <button
                                    onClick={() => handleDeleteTicket(req.id)}
                                    className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                                  >
                                    <Trash2 size={14} />
                                    <span>Delete Ticket</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {!loading && requests.length > 0 && (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row">
                <p className="text-xs font-semibold text-gray-500">
                  Showing {rangeStart} to {rangeEnd} of {requests.length} tickets
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
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
                        className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold ${
                          page === p ? "bg-gray-900 text-white shadow-xs" : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
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

      {/* Add Maintenance Ticket Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">Add Maintenance Ticket</h3>
                <p className="text-xs text-gray-500 mt-0.5">Create a maintenance incident or repair ticket for a tenant</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="space-y-4 text-xs">
              <div>
                <label className="mb-1.5 block font-bold uppercase tracking-wider text-gray-500 text-[10px]">
                  Select Tenant / Booking *
                </label>
                {loadingBookings ? (
                  <div className="flex items-center gap-2 py-2 text-gray-400 font-medium">
                    <Loader2 size={15} className="animate-spin text-blue-600" />
                    <span>Loading tenant bookings...</span>
                  </div>
                ) : availableBookings.length === 0 ? (
                  <p className="text-rose-600 font-semibold py-1">No active tenant bookings found to create a ticket for.</p>
                ) : (
                  <select
                    value={ticketForm.bookingId}
                    onChange={(e) => setTicketForm({ ...ticketForm, bookingId: e.target.value })}
                    className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-xs font-bold text-gray-900 outline-none focus:border-gray-900"
                    required
                  >
                    {availableBookings.map((b) => (
                      <option key={b.id || b.tenantId} value={b.id}>
                        {b.tenant?.fullName || b.tenantName || "Tenant"} — {b.room?.title || "Room"} ({b.room?.location || "Property"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-1.5 block font-bold uppercase tracking-wider text-gray-500 text-[10px]">
                  Issue Title / Subject *
                </label>
                <input
                  type="text"
                  value={ticketForm.title}
                  onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                  placeholder="e.g. Water pipe leakage in bathroom"
                  className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-xs font-bold text-gray-900 outline-none focus:border-gray-900"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block font-bold uppercase tracking-wider text-gray-500 text-[10px]">
                  Detailed Description *
                </label>
                <textarea
                  rows={3}
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  placeholder="Describe the issue, location details, urgency..."
                  className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-xs font-medium text-gray-900 outline-none focus:border-gray-900"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block font-bold uppercase tracking-wider text-gray-500 text-[10px]">
                  Initial Status
                </label>
                <select
                  value={ticketForm.status}
                  onChange={(e) => setTicketForm({ ...ticketForm, status: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-xs font-bold text-gray-900 outline-none focus:border-gray-900"
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket || availableBookings.length === 0}
                  className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 font-extrabold text-white shadow-md hover:bg-gray-800 disabled:opacity-50"
                >
                  {submittingTicket ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  <span>Save Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Details Inspection Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-sm text-gray-900">#{formatTicketRef(selectedTicket.id)}</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${STATUS_STYLE[selectedTicket.status]}`}>
                  {STATUS_LABEL[selectedTicket.status] || selectedTicket.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="rounded-2xl bg-gray-50 p-4 border border-gray-200/80">
                <h4 className="font-black text-gray-900 text-sm">{selectedTicket.title || selectedTicket.description}</h4>
                <p className="mt-2 text-gray-700 leading-relaxed font-medium">{selectedTicket.description}</p>
                <p className="mt-3 text-[10px] text-gray-400 font-medium">
                  Reported on: {new Date(selectedTicket.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-400 font-medium">Property Title:</span>
                  <span className="font-bold text-gray-900">{selectedTicket.room?.title}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-400 font-medium">Tenant Name:</span>
                  <span className="font-bold text-gray-900">{selectedTicket.user?.fullName}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-400 font-medium">Tenant Email:</span>
                  <span className="font-semibold text-gray-800">{selectedTicket.user?.email || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-400 font-medium">Tenant Phone:</span>
                  <span className="font-semibold text-gray-800">{selectedTicket.user?.phone || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-400 font-medium">Assigned Landlord:</span>
                  <span className="font-semibold text-gray-800">{selectedTicket.assignedTo?.fullName || "Unassigned"}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                {selectedTicket.user?.id ? (
                  <button
                    onClick={() => {
                      openAdminMessage(selectedTicket.user.id);
                      setSelectedTicket(null);
                      onNavigate("messages");
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white shadow hover:bg-blue-700"
                  >
                    <MessageSquare size={14} />
                    <span>Message Tenant</span>
                  </button>
                ) : null}

                {selectedTicket.status !== "RESOLVED" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket.id, "RESOLVED")}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white shadow hover:bg-emerald-700"
                  >
                    <CheckCircle2 size={14} />
                    <span>Mark Resolved</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="w-full">
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</label>
      <div className="relative w-full">
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full appearance-none rounded-2xl border border-gray-200 bg-white pl-3.5 pr-8 text-xs font-bold text-gray-800 outline-none focus:border-gray-900 shadow-2xs"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>
    </div>
  );
}