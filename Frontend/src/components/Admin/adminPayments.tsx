import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Wallet,
  Clock,
  Calendar,
  AlertTriangle,
  Loader2,
  X,
  CheckCircle,
  FileText,
  MessageSquare,
  RefreshCw,
  Printer,
  ShieldAlert,
  Filter,
  RotateCcw,
  DollarSign,
} from "lucide-react";
import { api, type User } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";
import { openAdminMessage } from "./adminMessages";

export interface AdminPaymentTransaction {
  id: number;
  bookingId?: number;
  transactionRef: string;
  customerName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  tenantId?: number;
  payerType: "TENANT" | "LANDLORD";
  propertyTitle: string;
  roomType?: string;
  amount: number;
  date: string;
  status: "PAID" | "PENDING" | "OVERDUE" | "FAILED" | "REFUNDED";
  paymentMethodLabel?: string;
}

export interface AdminPaymentStats {
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

const PAGE_SIZE = 7;

const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-800 border-emerald-200",
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  OVERDUE: "bg-rose-100 text-rose-800 border-rose-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  REFUNDED: "bg-slate-100 text-slate-700 border-slate-200",
};

const EMPTY_STATS: AdminPaymentStats = {
  totalRevenue: 0,
  pendingPayments: 0,
  pendingTenantCount: 0,
  monthlyCollections: 0,
  monthlyCollectionsLabel: "Monthly Collections",
  overdueInvoices: 0,
};

export default function AdminPayments({ user: _user, onLogout, activeRoute, onNavigate }: AdminPaymentsProps) {
  const [transactions, setTransactions] = useState<AdminPaymentTransaction[]>([]);
  const [stats, setStats] = useState<AdminPaymentStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [headerSearch, setHeaderSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateRange, setDateRange] = useState("ALL_TIME");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("ALL");
  const [payerTypeFilter, setPayerTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Record Payment Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableBookings, setAvailableBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    bookingId: "",
    amount: "",
    paymentMethod: "Cash",
    status: "PAID",
    transactionId: "",
  });

  // Modals & Feedback
  const [selectedReceipt, setSelectedReceipt] = useState<AdminPaymentTransaction | null>(null);
  const [busyTxId, setBusyTxId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "info" | "success" | "warning" } | null>(null);

  const showToast = (msg: string, type: "info" | "success" | "warning" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(headerSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [headerSearch]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (propertyTypeFilter !== "ALL") params.propertyType = propertyTypeFilter;
      if (payerTypeFilter !== "ALL") params.payerType = payerTypeFilter;
      if (dateRange !== "ALL_TIME") params.dateRange = dateRange;

      const [txRes, statsRes] = await Promise.all([
        api.getAdminPayments(params),
        api.getAdminPaymentStats(),
      ]);

      if (txRes?.success) {
        setTransactions(txRes.transactions || []);
      } else {
        setTransactions([]);
      }

      if (statsRes?.success && statsRes.stats) {
        setStats({ ...EMPTY_STATS, ...statsRes.stats });
      }
    } catch (e) {
      console.error("Failed to load payments from backend:", e);
      showToast("Error connecting to backend payment API", "warning");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, propertyTypeFilter, payerTypeFilter, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load bookings list when opening Record Payment modal
  const handleOpenRecordPaymentModal = async () => {
    setShowAddModal(true);
    setLoadingBookings(true);
    try {
      const res = await api.getAdminBookings();
      if (res?.success && Array.isArray(res.bookings)) {
        setAvailableBookings(res.bookings);
        if (res.bookings.length > 0) {
          const first = res.bookings[0];
          setPaymentForm((prev) => ({
            ...prev,
            bookingId: first.id ? String(first.id) : "",
            amount: first.room?.price ? String(first.room.price) : "15000",
          }));
        }
      }
    } catch (err) {
      console.error("Failed to load bookings for payment modal:", err);
      showToast("Could not fetch active tenant bookings", "warning");
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleBookingChange = (bookingIdStr: string) => {
    const bId = Number(bookingIdStr);
    const selectedB = availableBookings.find((b) => b.id === bId || b.tenantId === bId);
    setPaymentForm((prev) => ({
      ...prev,
      bookingId: bookingIdStr,
      amount: selectedB?.room?.price ? String(selectedB.room.price) : prev.amount || "15000",
    }));
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.bookingId || !paymentForm.amount) {
      showToast("Please select a booking and enter an amount", "warning");
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await api.createAdminPayment({
        bookingId: Number(paymentForm.bookingId),
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        status: paymentForm.status,
        transactionId: paymentForm.transactionId.trim() || undefined,
      });

      if (res?.success) {
        showToast(res.message || "Payment recorded successfully!");
        setShowAddModal(false);
        setPaymentForm({
          bookingId: "",
          amount: "",
          paymentMethod: "Cash",
          status: "PAID",
          transactionId: "",
        });
        loadData();
      } else {
        showToast(res?.message || "Failed to record payment", "warning");
      }
    } catch (err) {
      console.error("Record payment error:", err);
      showToast("Backend connection error while saving payment", "warning");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleUpdateStatus = async (txId: number, newStatus: string) => {
    setBusyTxId(txId);
    setOpenMenuId(null);
    try {
      const res = await api.updateAdminPaymentStatus(txId, newStatus);
      if (res?.success) {
        showToast(`Payment status updated to ${newStatus}`);
        setTransactions((prev) =>
          prev.map((t) => (t.id === txId ? { ...t, status: newStatus as any } : t))
        );
        if (selectedReceipt?.id === txId) {
          setSelectedReceipt((prev) => (prev ? { ...prev, status: newStatus as any } : null));
        }
        loadData();
      } else {
        showToast(res?.message || "Failed to update payment", "warning");
      }
    } catch (e) {
      console.error("Update payment error:", e);
      showToast("Backend connection error", "warning");
    } finally {
      setBusyTxId(null);
    }
  };

  const handleClearFilters = () => {
    setHeaderSearch("");
    setDebouncedSearch("");
    setDateRange("ALL_TIME");
    setStatusFilter("ALL");
    setPropertyTypeFilter("ALL");
    setPayerTypeFilter("ALL");
    setPage(1);
  };

  const isFilterActive =
    debouncedSearch !== "" ||
    dateRange !== "ALL_TIME" ||
    statusFilter !== "ALL" ||
    propertyTypeFilter !== "ALL" ||
    payerTypeFilter !== "ALL";

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, propertyTypeFilter, payerTypeFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const pagedTransactions = useMemo(
    () => transactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [transactions, page]
  );
  const rangeStart = transactions.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, transactions.length);

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
      iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100",
      hint: stats.revenueGrowthPct != null ? `↑ ${stats.revenueGrowthPct}% vs last month` : undefined,
      hintColor: stats.revenueGrowthPct && stats.revenueGrowthPct >= 0 ? "text-emerald-600" : "text-rose-600",
    },
    {
      label: "Pending Payments",
      value: `Rs. ${stats.pendingPayments.toLocaleString()}`,
      icon: Clock,
      iconBg: "bg-amber-50 text-amber-600 border border-amber-100",
      hint: `Across ${stats.pendingTenantCount} tenant(s)`,
      hintColor: "text-amber-700",
    },
    {
      label: "Monthly Collections",
      value: `Rs. ${stats.monthlyCollections.toLocaleString()}`,
      icon: Calendar,
      iconBg: "bg-blue-50 text-blue-600 border border-blue-100",
      hint: stats.monthlyCollectionsLabel,
      hintColor: "text-gray-500",
    },
    {
      label: "Overdue Invoices",
      value: stats.overdueInvoices.toString(),
      icon: AlertTriangle,
      iconBg: "bg-rose-50 text-rose-600 border border-rose-100",
      hint: stats.overdueInvoices > 0 ? "Action required" : "All clean",
      hintColor: stats.overdueInvoices > 0 ? "text-rose-600 font-bold" : "text-gray-400",
    },
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
            {toast.type === "warning" ? <ShieldAlert size={18} /> : <CheckCircle size={18} />}
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
              placeholder="Search ref #, tenant name, email, phone, property..."
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
              onClick={() => loadData()}
              className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-xs"
              title="Refresh Data from Backend"
            >
              <RefreshCw size={15} className={loading ? "animate-spin text-blue-600" : "text-gray-500"} />
              <span className="hidden xs:inline">Refresh</span>
            </button>

            <button
              onClick={handleOpenRecordPaymentModal}
              className="flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-gray-800 active:scale-95 transition-all"
            >
              <Plus size={16} />
              <span>Record Payment</span>
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-gray-900 sm:text-3xl tracking-tight">Payments & Financial Ledger</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Live backend revenue collection, tenant transaction records, and invoice settlement.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                {transactions.length} Total Record(s)
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
                  {card.hint && <p className={`mt-1.5 text-xs font-semibold ${card.hintColor}`}>{card.hint}</p>}
                </div>
              );
            })}
          </div>

          {/* Responsive Filter Bar */}
          <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <Filter size={14} className="text-gray-400" />
                <span>Search & Filter Engine</span>
              </div>
              {isFilterActive && (
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors"
                >
                  <RotateCcw size={13} />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <LabeledSelect
                label="Date Range"
                value={dateRange}
                onChange={setDateRange}
                options={[
                  { value: "ALL_TIME", label: "All Time" },
                  { value: "THIS_MONTH", label: "This Month" },
                  { value: "LAST_MONTH", label: "Last Month" },
                  { value: "THIS_YEAR", label: "This Year" },
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
                  { value: "FAILED", label: "Failed" },
                  { value: "REFUNDED", label: "Refunded" },
                ]}
              />
              <LabeledSelect
                label="Property Type"
                value={propertyTypeFilter}
                onChange={setPropertyTypeFilter}
                options={[
                  { value: "ALL", label: "All Properties" },
                  { value: "SINGLE", label: "Single Room" },
                  { value: "DOUBLE", label: "Double Room" },
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
                  { value: "LANDLORD", label: "Landlord Payout" },
                ]}
              />
            </div>
          </div>

          {/* Mobile Card List View (< 640px) */}
          <div className="block sm:hidden mb-6 space-y-3">
            {loading && transactions.length === 0 ? (
              <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-gray-400">
                <Loader2 size={24} className="mx-auto mb-2 animate-spin text-blue-600" />
                Fetching live transactions...
              </div>
            ) : pagedTransactions.length === 0 ? (
              <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                No payments found matching your filter criteria.
              </div>
            ) : (
              pagedTransactions.map((tx) => (
                <div key={tx.id} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                    <span className="font-mono font-black text-xs text-gray-900">#{tx.transactionRef}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                        STATUS_STYLE[tx.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{tx.customerName}</p>
                      {tx.tenantEmail && <p className="text-xs text-gray-400">{tx.tenantEmail}</p>}
                      <p className="text-xs text-gray-600 font-medium mt-1">{tx.propertyTitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black text-gray-900">Rs. {tx.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400">{new Date(tx.date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-2">
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                      {tx.paymentMethodLabel || "Payment"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedReceipt(tx)}
                        className="rounded-xl border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50"
                      >
                        Receipt
                      </button>
                      {tx.status !== "PAID" && (
                        <button
                          onClick={() => handleUpdateStatus(tx.id, "PAID")}
                          className="rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                        >
                          Paid
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Transactions Data Table (>= 640px) */}
          <div className="hidden sm:block rounded-3xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="overflow-x-auto scrollbar-none">
              <table className="min-w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200/70 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    <th className="pb-3 pr-4 font-bold">Transaction Ref</th>
                    <th className="pb-3 pr-4 font-bold">Customer / Tenant</th>
                    <th className="pb-3 pr-4 font-bold">Property Unit</th>
                    <th className="pb-3 pr-4 font-bold">Amount</th>
                    <th className="pb-3 pr-4 font-bold">Channel</th>
                    <th className="pb-3 pr-4 font-bold">Date</th>
                    <th className="pb-3 pr-4 font-bold">Status</th>
                    <th className="pb-3 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading && transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        <Loader2 size={24} className="mx-auto mb-2 animate-spin text-blue-600" />
                        Fetching live payment records from backend...
                      </td>
                    </tr>
                  ) : pagedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                        No payments found matching your search and filter criteria.
                      </td>
                    </tr>
                  ) : (
                    pagedTransactions.map((tx) => {
                      const isUpdating = busyTxId === tx.id;
                      return (
                        <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3.5 pr-4 font-mono font-bold text-gray-900">
                            #{tx.transactionRef}
                          </td>
                          <td className="py-3.5 pr-4">
                            <p className="font-bold text-gray-900">{tx.customerName}</p>
                            {tx.tenantEmail && <p className="text-[11px] text-gray-400">{tx.tenantEmail}</p>}
                          </td>
                          <td className="py-3.5 pr-4">
                            <p className="font-bold text-gray-800">{tx.propertyTitle}</p>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                              {tx.roomType || "Room"}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 font-black text-gray-900">
                            Rs. {tx.amount.toLocaleString()}
                          </td>
                          <td className="py-3.5 pr-4 text-xs font-semibold text-gray-600">
                            {tx.paymentMethodLabel || "Online"}
                          </td>
                          <td className="py-3.5 pr-4 text-xs text-gray-500 font-medium">
                            {new Date(tx.date).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 pr-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                                STATUS_STYLE[tx.status] || "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="relative inline-block text-left">
                              <button
                                onClick={() => setOpenMenuId(openMenuId === tx.id ? null : tx.id)}
                                disabled={isUpdating}
                                className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-50"
                                aria-label="More actions"
                              >
                                {isUpdating ? <Loader2 size={15} className="animate-spin text-blue-600" /> : <MoreVertical size={15} />}
                              </button>

                              {openMenuId === tx.id && (
                                <div className="absolute right-0 top-9 z-30 w-48 rounded-2xl border border-gray-200 bg-white py-1.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
                                  <button
                                    onClick={() => {
                                      setSelectedReceipt(tx);
                                      setOpenMenuId(null);
                                    }}
                                    className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                                  >
                                    <FileText size={14} className="text-gray-400" />
                                    <span>View Official Receipt</span>
                                  </button>

                                  {tx.tenantId ? (
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        openAdminMessage(tx.tenantId!);
                                        onNavigate("messages");
                                      }}
                                      className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50"
                                    >
                                      <MessageSquare size={14} />
                                      <span>Message Tenant</span>
                                    </button>
                                  ) : null}

                                  <div className="my-1 border-t border-gray-100" />

                                  {tx.status !== "PAID" && (
                                    <button
                                      onClick={() => handleUpdateStatus(tx.id, "PAID")}
                                      className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                                    >
                                      <CheckCircle size={14} />
                                      <span>Mark as Paid</span>
                                    </button>
                                  )}

                                  {tx.status !== "REFUNDED" && (
                                    <button
                                      onClick={() => handleUpdateStatus(tx.id, "REFUNDED")}
                                      className="flex w-full items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                      <RefreshCw size={14} />
                                      <span>Mark Refunded</span>
                                    </button>
                                  )}
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
            {!loading && transactions.length > 0 && (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row">
                <p className="text-xs font-semibold text-gray-500">
                  Showing {rangeStart} to {rangeEnd} of {transactions.length} payments
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

      {/* Record Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">Record New Payment</h3>
                <p className="text-xs text-gray-500 mt-0.5">Manually record a payment or settlement into backend ledger</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="mb-1.5 block font-bold uppercase tracking-wider text-gray-500 text-[10px]">
                  Select Tenant / Active Lease *
                </label>
                {loadingBookings ? (
                  <div className="flex items-center gap-2 py-2 text-gray-400 font-medium">
                    <Loader2 size={15} className="animate-spin text-blue-600" />
                    <span>Loading tenant bookings...</span>
                  </div>
                ) : availableBookings.length === 0 ? (
                  <p className="text-rose-600 font-semibold py-1">No active tenant bookings found to record payment against.</p>
                ) : (
                  <select
                    value={paymentForm.bookingId}
                    onChange={(e) => handleBookingChange(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-xs font-bold text-gray-900 outline-none focus:border-gray-900"
                    required
                  >
                    {availableBookings.map((b) => (
                      <option key={b.id || b.tenantId} value={b.id}>
                        {b.tenant?.fullName || b.tenantName || "Tenant"} — {b.room?.title || "Room"} (Rs. {b.room?.price?.toLocaleString() || b.totalAmount || 15000})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block font-bold uppercase tracking-wider text-gray-500 text-[10px]">
                    Amount (Rs.) *
                  </label>
                  <div className="relative">
                    <DollarSign size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      placeholder="e.g. 15000"
                      className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-xs font-bold text-gray-900 outline-none focus:border-gray-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block font-bold uppercase tracking-wider text-gray-500 text-[10px]">
                    Payment Channel
                  </label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full rounded-2xl border border-gray-200 bg-white p-2.5 text-xs font-bold text-gray-900 outline-none focus:border-gray-900"
                  >
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block font-bold uppercase tracking-wider text-gray-500 text-[10px]">
                    Payment Status
                  </label>
                  <select
                    value={paymentForm.status}
                    onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value })}
                    className="w-full rounded-2xl border border-gray-200 bg-white p-2.5 text-xs font-bold text-gray-900 outline-none focus:border-gray-900"
                  >
                    <option value="PAID">Paid / Completed</option>
                    <option value="PENDING">Pending Settlement</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block font-bold uppercase tracking-wider text-gray-500 text-[10px]">
                    Tx Ref # (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentForm.transactionId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                    placeholder="Auto-generated if empty"
                    className="w-full rounded-2xl border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-900 outline-none focus:border-gray-900"
                  />
                </div>
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
                  disabled={submittingPayment || availableBookings.length === 0}
                  className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 font-extrabold text-white shadow-md hover:bg-gray-800 disabled:opacity-50"
                >
                  {submittingPayment ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  <span>Save Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Official Payment Receipt</h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-5 rounded-2xl bg-gray-900 p-5 text-white shadow-md">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Transaction Amount</p>
              <p className="mt-1 text-2xl font-black">Rs. {selectedReceipt.amount.toLocaleString()}</p>
              <div className="mt-3 flex items-center justify-between border-t border-gray-800 pt-3 text-xs">
                <span className="text-gray-400 font-mono">Ref: #{selectedReceipt.transactionRef}</span>
                <span className="font-extrabold text-emerald-400">{selectedReceipt.status}</span>
              </div>
            </div>

            <div className="mb-6 space-y-2.5 text-xs text-gray-700">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400 font-medium">Payer Name:</span>
                <span className="font-bold text-gray-900">{selectedReceipt.customerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400 font-medium">Payer Email:</span>
                <span className="font-semibold text-gray-800">{selectedReceipt.tenantEmail || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400 font-medium">Property Unit:</span>
                <span className="font-semibold text-gray-800">{selectedReceipt.propertyTitle}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400 font-medium">Payment Date:</span>
                <span className="font-semibold text-gray-800">{new Date(selectedReceipt.date).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-400 font-medium">Payment Channel:</span>
                <span className="font-semibold text-gray-800">{selectedReceipt.paymentMethodLabel || "Online Transfer"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-xs font-bold text-white shadow hover:bg-gray-800 transition-all"
              >
                <Printer size={15} />
                <span>Print Receipt</span>
              </button>
              {selectedReceipt.status !== "PAID" && (
                <button
                  onClick={() => handleUpdateStatus(selectedReceipt.id, "PAID")}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition-all"
                >
                  <CheckCircle size={15} />
                  <span>Mark Paid</span>
                </button>
              )}
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