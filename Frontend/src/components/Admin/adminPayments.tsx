import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Bell,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Wallet,
  Clock,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { api, type User } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";

// Mirrors the interfaces added to api.ts — see comment above this file.
interface AdminPaymentTransaction {
  id: number;
  transactionRef: string;
  customerName: string;
  payerType: "TENANT" | "LANDLORD";
  propertyTitle: string;
  amount: number;
  date: string;
  status: "PAID" | "PENDING" | "OVERDUE";
}

interface AdminPaymentStats {
  totalRevenue: number;
  revenueGrowthPct?: number;
  pendingPayments: number;
  pendingTenantCount: number;
  monthlyCollections: number;
  monthlyCollectionsLabel: string;
  overdueInvoices: number;
}

interface AdminPaymentsProps {
  user: User;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onAddPayment?: () => void;
}

const PAGE_SIZE = 4;

const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-green-50 text-green-600",
  PENDING: "bg-amber-50 text-amber-600",
  OVERDUE: "bg-red-50 text-red-600",
};

const EMPTY_STATS: AdminPaymentStats = {
  totalRevenue: 0,
  pendingPayments: 0,
  pendingTenantCount: 0,
  monthlyCollections: 0,
  monthlyCollectionsLabel: "",
  overdueInvoices: 0,
};

export default function AdminPayments({ onLogout, activeRoute, onNavigate, onAddPayment }: AdminPaymentsProps) {
  const [transactions, setTransactions] = useState<AdminPaymentTransaction[]>([]);
  const [stats, setStats] = useState<AdminPaymentStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [dateRange, setDateRange] = useState("THIS_MONTH");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("ALL");
  const [payerTypeFilter, setPayerTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setLoadFailed(false);
    try {
      // NOTE: neither of these endpoints exist yet — see the comment block
      // above this component.
      const [txRes, statsRes] = await Promise.all([
        (api as any).getAdminPayments?.(),
        (api as any).getAdminPaymentStats?.(),
      ]);
      if (txRes?.success) {
        setTransactions(txRes.transactions || []);
      } else {
        setLoadFailed(true);
      }
      if (statsRes?.success && statsRes.stats) {
        setStats({ ...EMPTY_STATS, ...statsRes.stats });
      }
    } catch (e) {
      console.error("Failed to load payments:", e);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }

  const filteredTransactions = useMemo(() => {
    const q = headerSearch.trim().toLowerCase();
    return transactions.filter((t) => {
      const matchesQuery =
        !q || t.customerName.toLowerCase().includes(q) || t.transactionRef.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
      const matchesPayerType = payerTypeFilter === "ALL" || t.payerType === payerTypeFilter;
      // NOTE: propertyTypeFilter has no matching field on AdminPaymentTransaction
      // yet (would need e.g. room.roomType passed through from the backend) —
      // left as a no-op filter for now, wired to "ALL" only.
      return matchesQuery && matchesStatus && matchesPayerType;
    });
  }, [transactions, headerSearch, statusFilter, payerTypeFilter]);

  useEffect(() => {
    setPage(1);
  }, [headerSearch, statusFilter, propertyTypeFilter, payerTypeFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const pagedTransactions = filteredTransactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filteredTransactions.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredTransactions.length);

  function pageNumbers(): (number | "ellipsis")[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, "ellipsis", totalPages];
    if (page >= totalPages - 2) return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
    return [1, "ellipsis", page, "ellipsis", totalPages];
  }

  const summaryCards = [
    {
      label: "Total Revenue",
      value: `Rs. ${stats.totalRevenue.toLocaleString()}`,
      icon: Wallet,
      iconBg: "bg-green-50 text-green-600",
      hint: stats.revenueGrowthPct != null ? `↑ ${stats.revenueGrowthPct}% from last year` : undefined,
      hintColor: "text-green-600",
    },
    {
      label: "Pending Payments",
      value: `Rs. ${stats.pendingPayments.toLocaleString()}`,
      icon: Clock,
      iconBg: "bg-amber-50 text-amber-600",
      hint: `Across ${stats.pendingTenantCount} tenants`,
      hintColor: "text-gray-400",
    },
    {
      label: "Monthly Collections",
      value: `Rs. ${stats.monthlyCollections.toLocaleString()}`,
      icon: Calendar,
      iconBg: "bg-blue-50 text-blue-600",
      hint: stats.monthlyCollectionsLabel,
      hintColor: "text-gray-400",
    },
    {
      label: "Overdue Invoices",
      value: stats.overdueInvoices.toString(),
      icon: AlertTriangle,
      iconBg: "bg-red-50 text-red-600",
      hint: stats.overdueInvoices > 0 ? "Requires immediate action" : undefined,
      hintColor: "text-red-600",
    },
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
              placeholder="Search payments, tenants..."
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-gray-900"
            />
          </div>
          <div className="flex gap-3">
            <button className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button
              onClick={onAddPayment}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Plus size={16} />
              Add Payment
            </button>
          </div>
        </header>

        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="mt-1 text-sm text-gray-500">Manage and track tenant payments, collections, and outstanding dues.</p>
          </div>

          {loadFailed && !loading && (
            <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Couldn't load payment data — this backend endpoint likely doesn't exist yet
              (see the comment at the top of <code>adminPayments.tsx</code> for what to add).
            </div>
          )}

          {/* Summary cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                  <p className="mt-2 text-xl font-bold text-gray-900">{loading ? "—" : card.value}</p>
                  {card.hint && <p className={`mt-1 text-[11px] ${card.hintColor}`}>{card.hint}</p>}
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <LabeledSelect
              label="Date Range"
              value={dateRange}
              onChange={setDateRange}
              options={[
                { value: "THIS_MONTH", label: "This Month" },
                { value: "LAST_MONTH", label: "Last Month" },
                { value: "THIS_YEAR", label: "This Year" },
                { value: "ALL_TIME", label: "All Time" },
              ]}
            />
            <LabeledSelect
              label="Payment Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "PAID", label: "Paid" },
                { value: "PENDING", label: "Pending" },
                { value: "OVERDUE", label: "Overdue" },
              ]}
            />
            <LabeledSelect
              label="Property Type"
              value={propertyTypeFilter}
              onChange={setPropertyTypeFilter}
              options={[
                { value: "ALL", label: "All Properties" },
                { value: "SINGLE", label: "Single" },
                { value: "DOUBLE", label: "Double" },
                { value: "FLAT", label: "Flat" },
                { value: "APARTMENT", label: "Apartment" },
              ]}
            />
            <LabeledSelect
              label="Payer Type"
              value={payerTypeFilter}
              onChange={setPayerTypeFilter}
              options={[
                { value: "ALL", label: "All Types" },
                { value: "TENANT", label: "Tenant" },
                { value: "LANDLORD", label: "Landlord" },
              ]}
            />
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3 font-medium">Transaction ID</th>
                    <th className="pb-3 font-medium">Customer Name</th>
                    <th className="pb-3 font-medium">Payer Type</th>
                    <th className="pb-3 font-medium">Property Details</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">Loading transactions...</td>
                    </tr>
                  ) : pagedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">No transactions match your filters.</td>
                    </tr>
                  ) : (
                    pagedTransactions.map((tx) => (
                      <tr key={tx.id} className="border-t border-gray-100">
                        <td className="py-3 font-medium text-gray-900">#{tx.transactionRef}</td>
                        <td className="py-3 text-gray-700">{tx.customerName}</td>
                        <td className="py-3 text-gray-500">{tx.payerType === "TENANT" ? "Tenant" : "Landlord"}</td>
                        <td className="py-3 text-gray-700">{tx.propertyTitle}</td>
                        <td className="py-3 text-gray-700">Rs. {tx.amount.toLocaleString()}</td>
                        <td className="py-3 text-gray-500">{new Date(tx.date).toLocaleDateString()}</td>
                        <td className="py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[tx.status]}`}>
                            {tx.status.charAt(0) + tx.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === tx.id ? null : tx.id)}
                              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                              aria-label="More actions"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {openMenuId === tx.id && (
                              <div className="absolute right-0 top-8 z-10 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                <button className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                                  View Receipt
                                </button>
                                <button className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                                  Send Reminder
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && filteredTransactions.length > 0 && (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row">
                <p className="text-xs text-gray-500">
                  Showing {rangeStart} to {rangeEnd} of {filteredTransactions.length} entries
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
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-40 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-xs font-medium text-gray-700 outline-none focus:border-gray-900"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>
    </div>
  );
}