import { useEffect, useMemo, useState } from "react";
import { Search, ChevronDown, ChevronLeft, ChevronRight, Download, Wallet, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { api, type RentInvoice, type LandlordInvoiceStats, type User } from "../../services/api";
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
  REFUNDED: "bg-gray-100 text-gray-600",
};

const EMPTY_STATS: LandlordInvoiceStats = {
  totalRevenue: 0,
  monthlyCollections: 0,
  pendingAmount: 0,
  pendingCount: 0,
  overdueAmount: 0,
  overdueCount: 0,
};

function monthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function LandlordPayments({ user, onLogout, activeRoute, onNavigate }: LandlordPaymentsProps) {
  const [invoices, setInvoices] = useState<RentInvoice[]>([]);
  const [stats, setStats] = useState<LandlordInvoiceStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [propertyFilter, setPropertyFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [remindingId, setRemindingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [invRes, statsRes] = await Promise.all([
        api.getLandlordRentInvoices(),
        api.getLandlordInvoiceStats(),
      ]);
      if (invRes.success) setInvoices(invRes.invoices || []);
      if (statsRes.success) setStats({ ...EMPTY_STATS, ...statsRes.stats });
    } catch (e) {
      console.error("Failed to load payments:", e);
    } finally {
      setLoading(false);
    }
  }

  const properties = useMemo(
    () => Array.from(new Set(invoices.map((i) => i.booking?.room?.title).filter(Boolean))) as string[],
    [invoices]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      const matchesQuery = !q || inv.booking?.tenant?.fullName?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "ALL" || inv.effectiveStatus === statusFilter;
      const matchesProperty = propertyFilter === "ALL" || inv.booking?.room?.title === propertyFilter;
      return matchesQuery && matchesStatus && matchesProperty;
    });
  }, [invoices, search, statusFilter, propertyFilter]);

  useEffect(() => setPage(1), [search, statusFilter, propertyFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleExport() {
    const rows = [
      ["Tenant", "Property", "Rent Month", "Amount", "Due Date", "Payment Date", "Status"],
      ...filtered.map((inv) => [
        inv.booking?.tenant?.fullName || "",
        inv.booking?.room?.title || "",
        monthLabel(inv.periodStart),
        inv.amount.toString(),
        new Date(inv.dueDate).toLocaleDateString(),
        inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : "",
        inv.effectiveStatus,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rent-payments.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleRemind(invoiceId: number) {
    setRemindingId(invoiceId);
    try {
      await api.sendRentReminder(invoiceId);
    } catch (e) {
      console.error("Failed to send reminder:", e);
    } finally {
      setRemindingId(null);
    }
  }

  const summaryCards = [
    { label: "Total Revenue", value: `Rs. ${stats.totalRevenue.toLocaleString()}`, icon: Wallet, iconBg: "bg-blue-50 text-blue-600" },
    { label: "This Month's Income", value: `Rs. ${stats.monthlyCollections.toLocaleString()}`, icon: TrendingUp, iconBg: "bg-green-50 text-green-600" },
    { label: "Pending Payments", value: `Rs. ${stats.pendingAmount.toLocaleString()}`, icon: Clock, iconBg: "bg-amber-50 text-amber-600", hint: `From ${stats.pendingCount} invoice${stats.pendingCount === 1 ? "" : "s"}` },
    { label: "Overdue Payments", value: `Rs. ${stats.overdueAmount.toLocaleString()}`, icon: AlertTriangle, iconBg: "bg-red-50 text-red-600", danger: stats.overdueCount > 0, hint: stats.overdueCount > 0 ? "Requires immediate action" : undefined },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} user={user} />
      <div className="flex-1 p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Payments Management</h1>
          <p className="mt-1 text-sm text-gray-500">Track and manage recurring rent payments from your tenants.</p>
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
                {c.hint && <p className={`mt-1 text-[11px] ${c.danger ? "text-red-600" : "text-gray-400"}`}>{c.hint}</p>}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[180px] flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tenant..."
                className="h-9 w-full rounded-lg border border-gray-200 pl-8 pr-3 text-sm outline-none focus:border-gray-900"
              />
            </div>
            <Select value={statusFilter} onChange={setStatusFilter} options={[
              { value: "ALL", label: "Payment Status" },
              { value: "PAID", label: "Paid" },
              { value: "PENDING", label: "Pending" },
              { value: "OVERDUE", label: "Overdue" },
            ]} />
            <Select value={propertyFilter} onChange={setPropertyFilter} options={[{ value: "ALL", label: "Property" }, ...properties.map((p) => ({ value: p, label: p }))]} />
            <button onClick={handleExport} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
              <Download size={13} /> Export
            </button>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-gray-400">Loading payments...</p>
          ) : paged.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No payments found.</p>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                      <th className="pb-3 font-medium">Tenant</th>
                      <th className="pb-3 font-medium">Property</th>
                      <th className="pb-3 font-medium">Rent Month</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Due Date</th>
                      <th className="pb-3 font-medium">Payment Date</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((inv) => (
                      <tr key={inv.id} className="border-t border-gray-100">
                        <td className="py-3 font-medium text-gray-900">{inv.booking?.tenant?.fullName || "—"}</td>
                        <td className="py-3 text-gray-700">{inv.booking?.room?.title || "—"}</td>
                        <td className="py-3 text-gray-700">{monthLabel(inv.periodStart)}</td>
                        <td className="py-3 text-gray-700">Rs. {inv.amount.toLocaleString()}</td>
                        <td className="py-3 text-gray-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                        <td className="py-3 text-gray-500">{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : "—"}</td>
                        <td className="py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[inv.effectiveStatus]}`}>
                            {inv.effectiveStatus.charAt(0) + inv.effectiveStatus.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {inv.effectiveStatus === "PENDING" || inv.effectiveStatus === "OVERDUE" ? (
                            <button
                              onClick={() => handleRemind(inv.id)}
                              disabled={remindingId === inv.id}
                              className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
                            >
                              {remindingId === inv.id ? "Sending..." : "Remind"}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">Paid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {paged.map((inv) => (
                  <div key={inv.id} className="rounded-xl border border-gray-100 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{inv.booking?.tenant?.fullName || "—"}</p>
                        <p className="text-xs text-gray-400">{inv.booking?.room?.title || "—"} · {monthLabel(inv.periodStart)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[inv.effectiveStatus]}`}>
                        {inv.effectiveStatus.charAt(0) + inv.effectiveStatus.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-gray-500">Due {new Date(inv.dueDate).toLocaleDateString()}</span>
                      <span className="font-medium text-gray-900">Rs. {inv.amount.toLocaleString()}</span>
                    </div>
                    {(inv.effectiveStatus === "PENDING" || inv.effectiveStatus === "OVERDUE") && (
                      <button
                        onClick={() => handleRemind(inv.id)}
                        disabled={remindingId === inv.id}
                        className="mt-2 text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
                      >
                        {remindingId === inv.id ? "Sending..." : "Send Reminder"}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row">
                <p className="text-xs text-gray-500">Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft size={14} /></button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
                    <button key={p} onClick={() => setPage(p)} className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium ${page === p ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>{p}</button>
                  ))}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"><ChevronRight size={14} /></button>
                </div>
              </div>
            </>
          )}
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