import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  Mail,
  Phone,
  Building2,
  CalendarDays,
  MessageSquare,
  Pencil,
  Loader2,
  X,
  CheckCircle,
  ShieldAlert,
  Ban,
  ShieldCheck,
} from "lucide-react";
import { api, type Booking, type User } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";
import { openAdminMessage } from "./adminMessages";

interface AdminTenantsProps {
  user: User;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onAddTenant?: () => void;
}

type PaymentFilter = "ALL" | "PAID" | "PENDING" | "FAILED" | "REFUNDED";
type SortOption = "NEWEST" | "OLDEST" | "NAME";

interface TenantStats {
  total: number;
  activeLeases: number;
  pendingPayments: number;
  newTenants: number;
}

const EMPTY_STATS: TenantStats = {
  total: 0,
  activeLeases: 0,
  pendingPayments: 0,
  newTenants: 0,
};

const PAYMENT_STYLE: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-800 border-emerald-200",
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  FAILED: "bg-rose-100 text-rose-800 border-rose-200",
  REFUNDED: "bg-slate-100 text-slate-700 border-slate-200",
};

function initials(name: string) {
  if (!name) return "T";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

function tenantDisplayId(tenantId: number) {
  return `T-${(4000 + tenantId).toString().padStart(4, "0")}`;
}

export default function AdminTenants({ onLogout, activeRoute, onNavigate, onAddTenant: _onAddTenant }: AdminTenantsProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<TenantStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [headerSearch, setHeaderSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("NEWEST");

  // Modals & action states
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "info" | "success" | "warning" } | null>(null);

  const showToast = (msg: string, type: "info" | "success" | "warning" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(headerSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [headerSearch]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.getAdminTenantStats();
      if (res?.success && res.stats) setStats(res.stats);
    } catch (e) {
      console.error("Failed to load tenant stats:", e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        status: "APPROVED",
        sortBy,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== "ALL") params.paymentStatus = statusFilter;

      const res = await api.getAdminBookings(params);
      if (res?.success) setBookings(res.bookings || []);
    } catch (e) {
      console.error("Failed to load tenants:", e);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, sortBy]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleEditClick = (booking: Booking) => {
    setEditingBooking(booking);
    setEditName(booking.tenant?.fullName || "");
    setEditEmail(booking.tenant?.email || "");
    setEditPhone(booking.tenant?.phone || "");
  };

  const handleSaveEdit = async () => {
    if (!editingBooking || !editingBooking.tenant) return;
    setSavingEdit(true);
    try {
      const res = await api.updateTenantProfile(editingBooking.tenantId, {
        fullName: editName,
        email: editEmail,
        phone: editPhone,
      });
      if (res?.success) {
        showToast("Tenant profile updated successfully!");
        setBookings((prev) =>
          prev.map((b) =>
            b.tenantId === editingBooking.tenantId && b.tenant
              ? { ...b, tenant: { ...b.tenant, fullName: editName, email: editEmail, phone: editPhone } }
              : b
          )
        );
        setEditingBooking(null);
      } else {
        showToast(res?.message || "Could not update tenant profile", "warning");
      }
    } catch (e) {
      console.error("Failed to update tenant:", e);
      showToast("Backend update error", "warning");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStatus = async (booking: Booking) => {
    if (!booking.tenant) return;
    setBusyId(booking.tenantId);
    const currentlyActive = booking.tenant.isActive !== false;
    try {
      const res = await api.toggleTenantStatus(booking.tenantId, !currentlyActive);
      if (res?.success) {
        showToast(currentlyActive ? "Tenant account suspended" : "Tenant account reactivated", "info");
        setBookings((prev) =>
          prev.map((b) =>
            b.tenantId === booking.tenantId && b.tenant
              ? { ...b, tenant: { ...b.tenant, isActive: !currentlyActive } }
              : b
          )
        );
      } else {
        showToast(res?.message || "Status toggle failed", "warning");
      }
    } catch (e) {
      console.error("Toggle tenant status error:", e);
      showToast("Error updating status", "warning");
    } finally {
      setBusyId(null);
    }
  };

  const summaryCards = useMemo(
    () => [
      { label: "Total Tenants", value: stats.total.toString(), color: "text-gray-900" },
      { label: "Active Leases", value: stats.activeLeases.toString(), color: "text-emerald-700" },
      { label: "Pending Payments", value: stats.pendingPayments.toString(), color: "text-amber-600" },
      { label: "New Tenants (30d)", value: stats.newTenants.toString(), color: "text-blue-600" },
    ],
    [stats]
  );

  const isLoading = loading || statsLoading;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50 font-sans">
      <AdminSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Toast Feedback */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold shadow-xl animate-bounce ${
              toast.type === "warning"
                ? "bg-amber-600 text-white"
                : toast.type === "info"
                ? "bg-blue-600 text-white"
                : "bg-emerald-600 text-white"
            }`}
          >
            {toast.type === "warning" ? <ShieldAlert size={16} /> : <CheckCircle size={16} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Top Search & Filter Header */}
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-4 py-3.5 sm:px-6 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Search by tenant name, email, or room..."
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-8 text-xs sm:text-sm outline-none focus:border-gray-900 focus:bg-white transition-all"
            />
            {headerSearch && (
              <button
                onClick={() => setHeaderSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <button
              onClick={() => showToast("Tenant data up to date", "info")}
              className="relative rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50 transition-colors"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl tracking-tight">Tenants Directory</h1>
              <p className="mt-0.5 text-xs sm:text-sm text-gray-500">
                Manage, filter, and chat with all tenant accounts and lease records.
              </p>
            </div>
            <span className="inline-flex items-center self-start sm:self-auto rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100">
              {bookings.length} Tenant(s) Found
            </span>
          </div>

          {/* Stats Summary Cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{card.label}</p>
                <p className={`mt-2 text-xl font-extrabold sm:text-2xl ${card.color}`}>
                  {isLoading ? "—" : card.value}
                </p>
              </div>
            ))}
          </div>

          {/* Search & Filter Control Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2.5">
              <FilterSelect
                label="Payment Status"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as PaymentFilter)}
                options={[
                  { value: "ALL", label: "All Payment Statuses" },
                  { value: "PAID", label: "Paid" },
                  { value: "PENDING", label: "Pending" },
                  { value: "FAILED", label: "Failed" },
                  { value: "REFUNDED", label: "Refunded" },
                ]}
              />
              <FilterSelect
                label="Sort By"
                value={sortBy}
                onChange={(v) => setSortBy(v as SortOption)}
                options={[
                  { value: "NEWEST", label: "Newest Joined" },
                  { value: "OLDEST", label: "Oldest" },
                  { value: "NAME", label: "Name (A–Z)" },
                ]}
              />
            </div>

            {loading && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                <Loader2 size={13} className="animate-spin text-blue-600" />
                Updating Tenants...
              </span>
            )}
          </div>

          {/* Tenant Cards Responsive Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {loading && bookings.length === 0 ? (
              <div className="col-span-full py-16 text-center text-sm text-gray-400">
                <Loader2 size={24} className="mx-auto mb-2 animate-spin text-gray-400" />
                Loading tenants database...
              </div>
            ) : bookings.length === 0 ? (
              <div className="col-span-full py-16 text-center text-sm text-gray-400 rounded-2xl border border-dashed border-gray-300 bg-white p-8">
                No tenants match your current filter settings.
              </div>
            ) : (
              bookings.map((booking) => {
                const tenantName = booking.tenant?.fullName || `Tenant #${booking.tenantId}`;
                const paymentStatus = booking.payment?.status || "PENDING";
                const isSuspended = booking.tenant?.isActive === false;
                const isToggling = busyId === booking.tenantId;

                return (
                  <div
                    key={booking.id}
                    className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
                      isSuspended ? "border-red-200 bg-red-50/20" : "border-gray-200"
                    }`}
                  >
                    <div>
                      {/* Tenant Header & Avatar Click to Chat */}
                      <div
                        onClick={() => {
                          openAdminMessage(booking.tenantId);
                          onNavigate("messages");
                        }}
                        className="mb-4 flex items-center justify-between cursor-pointer"
                        title="Click to Chat with Tenant"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white shadow-sm group-hover:bg-blue-600 transition-colors">
                            {initials(tenantName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {tenantName}
                            </p>
                            <p className="text-[11px] font-mono text-gray-400">
                              {tenantDisplayId(booking.tenantId)}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                            isSuspended
                              ? "bg-red-100 text-red-700 border-red-200"
                              : PAYMENT_STYLE[paymentStatus] || "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {isSuspended ? "SUSPENDED" : paymentStatus}
                        </span>
                      </div>

                      {/* Contact Info Items */}
                      <div className="mb-4 space-y-2 border-t border-gray-100 pt-3">
                        {booking.tenant?.email && (
                          <div className="flex items-center gap-2.5 text-xs text-gray-600">
                            <Mail size={14} className="shrink-0 text-gray-400" />
                            <span className="truncate">{booking.tenant.email}</span>
                          </div>
                        )}
                        {booking.tenant?.phone && (
                          <div className="flex items-center gap-2.5 text-xs text-gray-600">
                            <Phone size={14} className="shrink-0 text-gray-400" />
                            <span className="truncate">{booking.tenant.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2.5 text-xs text-gray-700 font-medium">
                          <Building2 size={14} className="shrink-0 text-blue-600" />
                          <span className="truncate">{booking.room?.title || "No Room Assigned"}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-gray-500">
                          <CalendarDays size={14} className="shrink-0 text-gray-400" />
                          <span className="truncate">
                            Move in: {new Date(booking.moveInDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Interactive Action Buttons */}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                      <div className="flex items-center gap-1.5">
                        {/* Instant Chat Button */}
                        <button
                          onClick={() => {
                            openAdminMessage(booking.tenantId);
                            onNavigate("messages");
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
                          title="Chat with Tenant"
                        >
                          <MessageSquare size={13} />
                          <span>Chat</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleEditClick(booking)}
                          className="rounded-xl border border-gray-200 p-2 text-gray-600 hover:bg-gray-100 transition-colors"
                          title="Edit Tenant"
                        >
                          <Pencil size={14} />
                        </button>

                        {/* Suspend / Reactivate Toggle Button */}
                        <button
                          onClick={() => handleToggleStatus(booking)}
                          disabled={isToggling}
                          className={`rounded-xl border p-2 transition-colors ${
                            isSuspended
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          }`}
                          title={isSuspended ? "Reactivate Tenant Account" : "Suspend Tenant Account"}
                        >
                          {isToggling ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : isSuspended ? (
                            <ShieldCheck size={14} />
                          ) : (
                            <Ban size={14} />
                          )}
                        </button>
                      </div>

                      {/* View Details Button */}
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>

      {/* Tenant Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Tenant Full Details</h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-blue-50/70 p-4 border border-blue-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white shadow-sm">
                {initials(selectedBooking.tenant?.fullName || "")}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-gray-900">{selectedBooking.tenant?.fullName}</h4>
                <p className="text-xs text-gray-500">{selectedBooking.tenant?.email}</p>
                <p className="text-xs font-mono font-semibold text-blue-600 mt-0.5">
                  ID: {tenantDisplayId(selectedBooking.tenantId)}
                </p>
              </div>
            </div>

            <div className="mb-5 space-y-3 text-xs text-gray-700">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400">Phone:</span>
                <span className="font-semibold">{selectedBooking.tenant?.phone || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400">Assigned Property:</span>
                <span className="font-semibold text-right">{selectedBooking.room?.title || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400">Move-In Date:</span>
                <span className="font-semibold">{new Date(selectedBooking.moveInDate).toLocaleDateString()}</span>
              </div>
              {selectedBooking.endDate && (
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-400">Lease End Date:</span>
                  <span className="font-semibold">{new Date(selectedBooking.endDate).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400">Payment Status:</span>
                <span className="font-semibold text-emerald-700">{selectedBooking.payment?.status || "PENDING"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const id = selectedBooking.tenantId;
                  setSelectedBooking(null);
                  openAdminMessage(id);
                  onNavigate("messages");
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700 transition-all"
              >
                <MessageSquare size={16} />
                <span>Chat with Tenant</span>
              </button>
              <button
                onClick={() => {
                  const booking = selectedBooking;
                  setSelectedBooking(null);
                  handleEditClick(booking);
                }}
                className="rounded-xl border border-gray-200 p-2.5 text-gray-700 hover:bg-gray-50"
                title="Edit Tenant Profile"
              >
                <Pencil size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tenant Profile Modal */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Edit Tenant Profile</h3>
              <button
                onClick={() => setEditingBooking(null)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs outline-none focus:border-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs outline-none focus:border-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs outline-none focus:border-gray-900"
                />
              </div>
            </div>

            <button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-50 transition-all shadow"
            >
              {savingEdit && <Loader2 size={14} className="animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
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
    <div className="relative min-w-[140px] flex-1 sm:flex-none">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full appearance-none rounded-xl border border-gray-200 bg-white pl-3 pr-8 text-xs font-bold text-gray-700 outline-none focus:border-gray-900 shadow-sm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  );
}
