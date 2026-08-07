import { useEffect, useMemo, useState } from "react";
import { Search, ChevronDown, ChevronLeft, ChevronRight, Download, Wallet, TrendingUp, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { api, type Booking, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

interface LandlordPaymentsProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
}

const PAGE_SIZE = 4;
const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-green-50 text-green-600",
  PENDING: "bg-amber-50 text-amber-600",
  OVERDUE: "bg-red-50 text-red-600",
  FAILED: "bg-red-50 text-red-600",
};

export default function LandlordPayments({ user, onLogout, activeRoute, onNavigate }: LandlordPaymentsProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [monthFilter, setMonthFilter] = useState("ALL");
  const [propertyFilter, setPropertyFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [platformFee, setPlatformFee] = useState<{ amount: number; percent: number } | null>(null);
  const [payingFee, setPayingFee] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.getLandlordBookings();
      if (res.success) setBookings(res.bookings || []);
      // NOTE: getPlatformFeeStatus doesn't exist yet — see api.ts additions.
      const feeRes = await (api as any).getPlatformFeeStatus?.();
      if (feeRes?.success) setPlatformFee(feeRes.fee);
    } catch (e) {
      console.error("Failed to load payments:", e);
    } finally {
      setLoading(false);
    }
  }

  const rows = useMemo(() => bookings.filter((b) => b.payment), [bookings]);
  const properties = useMemo(() => Array.from(new Set(rows.map((r) => r.room?.title).filter(Boolean))) as string[], [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQuery = !q || r.tenant?.fullName?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "ALL" || r.payment?.status === statusFilter;
      const matchesProperty = propertyFilter === "ALL" || r.room?.title === propertyFilter;
      return matchesQuery && matchesStatus && matchesProperty;
    });
  }, [rows, search, statusFilter, propertyFilter]);

  useEffect(() => setPage(1), [search, statusFilter, monthFilter, propertyFilter]);

  const stats = useMemo(() => {
    const totalRevenue = rows.filter((r) => r.payment?.status === "PAID").reduce((s, r) => s + (r.payment?.amount || 0), 0);
    const pending = rows.filter((r) => r.payment?.status === "PENDING").reduce((s, r) => s + (r.payment?.amount || 0), 0);
    const pendingCount = rows.filter((r) => r.payment?.status === "PENDING").length;
    const overdue = rows.filter((r) => r.payment?.status === "FAILED").reduce((s, r) => s + (r.payment?.amount || 0), 0);
    return { totalRevenue, pending, pendingCount, overdue };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filtered.length);

  function handleExport() {
    const csvRows = [
      ["Tenant", "Property", "Amount", "Status", "Payment Date"],
      ...filtered.map((r) => [
        r.tenant?.fullName || `Tenant #${r.tenantId}`,
        r.room?.title || "",
        (r.payment?.amount || 0).toString(),
        r.payment?.status || "",
        r.payment?.paidAt ? new Date(r.payment.paidAt).toLocaleDateString() : "",
      ]),
    ];
    const csv = csvRows.map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payments.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handlePayFee() {
    setPayingFee(true);
    try {
      const res = await (api as any).payPlatformFee?.();
      if (res?.success) await loadData();
    } catch (e) {
      console.error("Failed to pay platform fee:", e);
    } finally {
      setPayingFee(false);
    }
  }

  const summaryCards = [
    { label: "Total Revenue", value: `Rs. ${stats.totalRevenue.toLocaleString()}`, icon: Wallet, iconBg: "bg-blue-50 text-blue-600", hint: "+12.5% vs last year", hintColor: "text-green-600" },
    { label: "This Month's Income", value: `Rs. ${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, iconBg: "bg-green-50 text-green-600", hint: "85% Collected", hintColor: "text-gray-400" },
    { label: "Pending Payments", value: `Rs. ${stats.pending.toLocaleString()}`, icon: Clock, iconBg: "bg-amber-50 text-amber-600", hint: `From ${stats.pendingCount} tenants`, hintColor: "text-gray-400" },
    { label: "Overdue Payments", value: `Rs. ${stats.overdue.toLocaleString()}`, icon: AlertTriangle, iconBg: "bg-red-50 text-red-600", hint: stats.overdue > 0 ? "Requires immediate action" : undefined, hintColor: "text-red-600", danger: true },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} user={user} />
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Payments Management</h1>
          <p className="mt-1 text-sm text-gray-500">Track and manage rent payments from your tenants.</p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className={`rounded-2xl border p-4 ${c.danger ? "border-red-200 bg-red-50/40" : "border-gray-200 bg-white"}`}>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{c.label}</p>
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${c.iconBg}`}><Icon size={14} /></div>
                </div>
                <p className={`mt-2 text-xl font-bold ${c.danger ? "text-red-600" : "text-gray-900"}`}>{loading ? "—" : c.value}</p>
                {c.hint && <p className={`mt-1 text-[11px] ${c.hintColor}`}>{c.hint}</p>}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Tenant..."
                className="h-9 w-full rounded-lg border border-gray-200 pl-8 pr-3 text-sm outline-none focus:border-gray-900"
              />
            </div>
            <Select value={statusFilter} onChange={setStatusFilter} options={[
              { value: "ALL", label: "Payment Status" },
              { value: "PAID", label: "Paid" },
              { value: "PENDING", label: "Pending" },
              { value: "FAILED", label: "Overdue" },
            ]} />
            <Select value={monthFilter} onChange={setMonthFilter} options={[{ value: "ALL", label: "Month" }]} />
            <Select value={propertyFilter} onChange={setPropertyFilter} options={[{ value: "ALL", label: "Property" }, ...properties.map((p) => ({ value: p, label: p }))]} />
            <button onClick={handleExport} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
              <Download size={13} /> Export
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="pb-3 font-medium">Tenant</th>
                  <th className="pb-3 font-medium">Property</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Payment Date</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-400">Loading payments...</td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-400">No payments found.</td></tr>
                ) : (
                  paged.map((b) => (
                    <tr key={b.id} className="border-t border-gray-100">
                      <td className="py-3 font-medium text-gray-900">{b.tenant?.fullName || `Tenant #${b.tenantId}`}</td>
                      <td className="py-3 text-gray-700">{b.room?.title || "—"}</td>
                      <td className="py-3 text-gray-700">Rs. {(b.payment?.amount || 0).toLocaleString()}</td>
                      <td className="py-3 text-gray-500">{b.payment?.paidAt ? new Date(b.payment.paidAt).toLocaleDateString() : "—"}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[b.payment?.status || "PENDING"]}`}>
                          {b.payment?.status || "Pending"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {b.payment?.status === "PENDING" ? (
                          <button className="text-xs font-medium text-blue-600 hover:underline">Remind</button>
                        ) : (
                          <button className="text-xs font-medium text-gray-600 hover:underline">View</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && filtered.length > 0 && (
            <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row">
              <p className="text-xs text-gray-500">Showing {rangeStart} to {rangeEnd} of {filtered.length} entries</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft size={14} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
                  <button key={p} onClick={() => setPage(p)} className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium ${page === p ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>{p}</button>
                ))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>

        {/* Platform fee — NOTE: 5% platform fee concept is new, needs backend billing logic. */}
        <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Platform Fee Payment</h3>
            <p className="mt-1 text-xs text-gray-500">
              Total Platform Fee ({platformFee?.percent ?? 5}%) for this month: Rs. {(platformFee?.amount ?? 0).toLocaleString()}.
              This fee is calculated based on total rent collected from all properties during the current billing cycle.
            </p>
          </div>
          <button
            onClick={handlePayFee}
            disabled={payingFee}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {payingFee && <Loader2 size={14} className="animate-spin" />}
            Pay to Admin
          </button>
        </div>
      </div>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-xs font-medium text-gray-700 outline-none focus:border-gray-900">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  );
}