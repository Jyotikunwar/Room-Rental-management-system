import { useEffect, useMemo, useState } from "react";
import { Search, Bell, UserPlus, ChevronDown, Mail, Phone, Building2, CalendarDays, MessageSquare, Pencil } from "lucide-react";
import { api, type Booking, type User } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";

interface AdminTenantsProps {
  user: User;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onAddTenant?: () => void;
}

type PaymentFilter = "ALL" | "PAID" | "PENDING" | "FAILED" | "REFUNDED";
type SortOption = "NEWEST" | "OLDEST" | "NAME";

const PAYMENT_STYLE: Record<string, string> = {
  PAID: "bg-green-50 text-green-600",
  PENDING: "bg-red-50 text-red-600",
  FAILED: "bg-red-50 text-red-600",
  REFUNDED: "bg-gray-100 text-gray-600",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

// Placeholder display ID until the backend exposes a real tenant reference
// number — formats the numeric tenantId as "T-XXXX".
function tenantDisplayId(tenantId: number) {
  return `T-${(4000 + tenantId).toString().padStart(4, "0")}`;
}

export default function AdminTenants({ onLogout, activeRoute, onNavigate, onAddTenant }: AdminTenantsProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [headerSearch, setHeaderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("NEWEST");

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setLoading(true);
    try {
      // NOTE: (api as any) because getAdminBookings isn't in api.ts yet —
      // see the snippet above this component. Falls back to the
      // landlord-scoped endpoint so the page still renders something
      // during development.
      const res = (await (api as any).getAdminBookings?.()) ?? (await api.getLandlordBookings());
      if (res?.success) setBookings(res.bookings || []);
    } catch (e) {
      console.error("Failed to load tenants:", e);
    } finally {
      setLoading(false);
    }
  }

  // One card per active (approved) tenancy — mirrors the mockup, which
  // shows current tenants with their active room and lease dates.
  const tenantBookings = useMemo(() => bookings.filter((b) => b.status === "APPROVED"), [bookings]);

  const filteredBookings = useMemo(() => {
    const q = headerSearch.trim().toLowerCase();
    let result = tenantBookings.filter((b) => {
      const matchesQuery =
        !q ||
        b.tenant?.fullName?.toLowerCase().includes(q) ||
        b.room?.title?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "ALL" || b.payment?.status === statusFilter;
      return matchesQuery && matchesStatus;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "NAME") return (a.tenant?.fullName || "").localeCompare(b.tenant?.fullName || "");
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sortBy === "NEWEST" ? bTime - aTime : aTime - bTime;
    });

    return result;
  }, [tenantBookings, headerSearch, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const uniqueTenants = new Set(tenantBookings.map((b) => b.tenantId));
    const pendingPayments = tenantBookings.filter((b) => b.payment?.status === "PENDING").length;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const newTenants = tenantBookings.filter((b) => new Date(b.createdAt).getTime() >= thirtyDaysAgo).length;
    return {
      total: uniqueTenants.size,
      activeLeases: tenantBookings.length,
      pendingPayments,
      newTenants,
    };
  }, [tenantBookings]);

  const summaryCards = [
    { label: "Total Tenants", value: stats.total.toString(), color: "text-gray-900" },
    { label: "Active Leases", value: stats.activeLeases.toString(), color: "text-gray-900" },
    { label: "Pending Payments", value: stats.pendingPayments.toString(), color: "text-amber-600" },
    { label: "New Tenants", value: stats.newTenants.toString(), color: "text-gray-900" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar
        active={activeRoute}
        onNavigate={onNavigate}
        onLogout={onLogout}
        brandName="Horizon"
        brandSubtitle="MANAGEMENT SYSTEM"
      />
      <div className="flex-1">
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Search tenants..."
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-gray-900"
            />
          </div>
          <div className="flex gap-3">
            <button className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button
              onClick={onAddTenant}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <UserPlus size={16} />
              Add Tenant
            </button>
          </div>
        </header>

        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
            <p className="mt-1 text-sm text-gray-500">Manage and monitor all system tenants.</p>
          </div>

          {/* Summary cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{card.label}</p>
                <p className={`mt-2 text-2xl font-bold ${card.color}`}>{loading ? "—" : card.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as PaymentFilter)}
              options={[
                { value: "ALL", label: "All Statuses" },
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
                { value: "NEWEST", label: "Newest" },
                { value: "OLDEST", label: "Oldest" },
                { value: "NAME", label: "Name" },
              ]}
            />
          </div>

          {/* Tenant cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              <p className="col-span-full py-8 text-center text-sm text-gray-400">Loading tenants...</p>
            ) : filteredBookings.length === 0 ? (
              <p className="col-span-full py-8 text-center text-sm text-gray-400">No tenants match your filters.</p>
            ) : (
              filteredBookings.map((booking) => {
                const tenantName = booking.tenant?.fullName || `Tenant #${booking.tenantId}`;
                const paymentStatus = booking.payment?.status || "PENDING";
                return (
                  <div key={booking.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                        {initials(tenantName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900">{tenantName}</p>
                        <p className="text-xs text-gray-400">ID: {tenantDisplayId(booking.tenantId)}</p>
                      </div>
                    </div>

                    <div className="mb-4 space-y-1.5">
                      {booking.tenant?.email && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Mail size={13} className="shrink-0 text-gray-400" />
                          <span className="truncate">{booking.tenant.email}</span>
                        </div>
                      )}
                      {booking.tenant?.phone && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Phone size={13} className="shrink-0 text-gray-400" />
                          {booking.tenant.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Building2 size={13} className="shrink-0 text-gray-400" />
                        {booking.room?.title || "—"}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <CalendarDays size={13} className="shrink-0 text-gray-400" />
                        {new Date(booking.moveInDate).toLocaleDateString()}
                        {booking.endDate ? ` - ${new Date(booking.endDate).toLocaleDateString()}` : ""}
                      </div>
                    </div>

                    <div className="mb-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${PAYMENT_STYLE[paymentStatus]}`}>
                        {paymentStatus.charAt(0) + paymentStatus.slice(1).toLowerCase()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                      <div className="flex gap-2">
                        <button className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50" aria-label="Message tenant">
                          <MessageSquare size={13} />
                        </button>
                        <button className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50" aria-label="Edit tenant">
                          <Pencil size={13} />
                        </button>
                      </div>
                      <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function FilterSelect({
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
      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  );
}