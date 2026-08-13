import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Wallet,
  TrendingUp,
  Clock,
  AlertTriangle,
  Check,
  Plus,
  Printer,
  X,
  Loader2,
  FileText,
  Building2,
  ShieldAlert,
  CheckCircle,
} from "lucide-react";
import { api, type RentInvoice, type LandlordInvoiceStats, type User, type Booking } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

interface LandlordPaymentsProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
}

const PAGE_SIZE = 5;
const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  OVERDUE: "bg-rose-50 text-rose-700 border-rose-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
  REFUNDED: "bg-slate-100 text-slate-700 border-slate-200",
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
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
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
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "info" | "success" | "warning" } | null>(null);

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<RentInvoice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [approvedBookings, setApprovedBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // New Invoice Form State
  const [createBookingId, setCreateBookingId] = useState<string>("");
  const [createAmount, setCreateAmount] = useState<string>("");
  const [createPeriodStart, setCreatePeriodStart] = useState<string>("");
  const [createPeriodEnd, setCreatePeriodEnd] = useState<string>("");
  const [createDueDate, setCreateDueDate] = useState<string>("");
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  const showToast = (msg: string, type: "info" | "success" | "warning" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

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
      if (statsRes.success && statsRes.stats) setStats({ ...EMPTY_STATS, ...statsRes.stats });
    } catch (e) {
      console.error("Failed to load payments:", e);
      showToast("Error connecting to server", "warning");
    } finally {
      setLoading(false);
    }
  }

  const loadLandlordBookings = async () => {
    setLoadingBookings(true);
    try {
      const res = await api.getLandlordBookings();
      if (res?.success && Array.isArray(res.bookings)) {
        const approved = res.bookings.filter((b: Booking) => b.status === "APPROVED");
        setApprovedBookings(approved);
        if (approved.length > 0) {
          const first = approved[0];
          setCreateBookingId(String(first.id));
          setCreateAmount(String(first.room?.price || 10000));
        }
      }
    } catch (e) {
      console.error("Failed to load approved bookings:", e);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleOpenCreateModal = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];
    const dueDay = new Date(today.getFullYear(), today.getMonth(), 7).toISOString().split("T")[0];

    setCreatePeriodStart(firstDay);
    setCreatePeriodEnd(lastDay);
    setCreateDueDate(dueDay);

    loadLandlordBookings();
    setShowCreateModal(true);
  };

  const handleBookingSelectChange = (bIdStr: string) => {
    setCreateBookingId(bIdStr);
    const found = approvedBookings.find((b) => b.id === Number(bIdStr));
    if (found?.room?.price) {
      setCreateAmount(String(found.room.price));
    }
  };

  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createBookingId || !createAmount || !createDueDate || !createPeriodStart || !createPeriodEnd) {
      showToast("Please fill in all required fields", "warning");
      return;
    }

    setCreatingInvoice(true);
    try {
      const res = await api.createRentInvoice({
        bookingId: Number(createBookingId),
        amount: Number(createAmount),
        dueDate: createDueDate,
        periodStart: createPeriodStart,
        periodEnd: createPeriodEnd,
      });

      if (res?.success) {
        showToast("Rent invoice created and sent to tenant successfully!");
        setShowCreateModal(false);
        loadData();
      } else {
        showToast(res?.message || "Failed to create rent invoice", "warning");
      }
    } catch (err) {
      console.error("Failed to create invoice:", err);
      showToast("Server error when creating invoice", "warning");
    } finally {
      setCreatingInvoice(false);
    }
  };

  const properties = useMemo(
    () => Array.from(new Set(invoices.map((i) => i.booking?.room?.title).filter(Boolean))) as string[],
    [invoices]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      const tenantName = inv.booking?.tenant?.fullName?.toLowerCase() || "";
      const roomTitle = inv.booking?.room?.title?.toLowerCase() || "";
      const monthStr = monthLabel(inv.periodStart).toLowerCase();
      const matchesQuery = !q || tenantName.includes(q) || roomTitle.includes(q) || monthStr.includes(q);

      const matchesStatus = statusFilter === "ALL" || inv.effectiveStatus === statusFilter;
      const matchesProperty = propertyFilter === "ALL" || inv.booking?.room?.title === propertyFilter;
      return matchesQuery && matchesStatus && matchesProperty;
    });
  }, [invoices, search, statusFilter, propertyFilter]);

  useEffect(() => setPage(1), [search, statusFilter, propertyFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleExport() {
    if (filtered.length === 0) {
      showToast("No records available to export", "info");
      return;
    }
    const rows = [
      ["Invoice ID", "Tenant Name", "Tenant Email", "Property", "Rent Month", "Amount (NPR)", "Payment Method", "Due Date", "Paid Date", "Status"],
      ...filtered.map((inv) => [
        `INV-${inv.id}`,
        inv.booking?.tenant?.fullName || "",
        inv.booking?.tenant?.email || "",
        inv.booking?.room?.title || "",
        monthLabel(inv.periodStart),
        inv.amount.toString(),
        "Cash",
        formatDate(inv.dueDate),
        inv.paidAt ? formatDate(inv.paidAt) : "Unpaid",
        inv.effectiveStatus,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rent-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Rent payments summary exported to CSV");
  }

  async function handleRemind(inv: RentInvoice) {
    setRemindingId(inv.id);
    try {
      const res = await api.sendRentReminder(inv.id);
      if (res?.success) {
        showToast(`Rent reminder notification sent to ${inv.booking?.tenant?.fullName || "tenant"}!`, "info");
      } else {
        showToast(res?.message || "Failed to send reminder", "warning");
      }
    } catch (e) {
      console.error("Failed to send reminder:", e);
      showToast("Error connecting to server", "warning");
    } finally {
      setRemindingId(null);
    }
  }

  async function handleConfirmCash(inv: RentInvoice) {
    setConfirmingId(inv.id);
    try {
      const res = await api.confirmLandlordCashReceived(inv.id);
      if (res?.success) {
        showToast(`Cash payment of Rs. ${inv.amount.toLocaleString()} confirmed for ${inv.booking?.tenant?.fullName || "tenant"}!`);
        loadData();
      } else {
        showToast(res?.message || "Failed to confirm cash payment.", "warning");
      }
    } catch (e) {
      console.error("Failed to confirm cash payment:", e);
      showToast("Error connecting to server.", "warning");
    } finally {
      setConfirmingId(null);
    }
  }

  const statCardList = [
    {
      key: "ALL",
      label: "Total Revenue",
      value: `Rs. ${stats.totalRevenue.toLocaleString()}`,
      icon: Wallet,
      iconBg: "bg-blue-50 text-blue-600",
      color: "text-gray-900",
      filterTarget: "PAID",
    },
    {
      key: "THIS_MONTH",
      label: "This Month's Income",
      value: `Rs. ${stats.monthlyCollections.toLocaleString()}`,
      icon: TrendingUp,
      iconBg: "bg-emerald-50 text-emerald-600",
      color: "text-emerald-700",
      filterTarget: "PAID",
    },
    {
      key: "PENDING",
      label: "Pending Payments",
      value: `Rs. ${stats.pendingAmount.toLocaleString()}`,
      icon: Clock,
      iconBg: "bg-amber-50 text-amber-600",
      color: "text-amber-700",
      hint: `${stats.pendingCount} invoice${stats.pendingCount === 1 ? "" : "s"} awaiting`,
      filterTarget: "PENDING",
    },
    {
      key: "OVERDUE",
      label: "Overdue Payments",
      value: `Rs. ${stats.overdueAmount.toLocaleString()}`,
      icon: AlertTriangle,
      iconBg: "bg-rose-50 text-rose-600",
      color: "text-rose-700",
      danger: stats.overdueCount > 0,
      hint: stats.overdueCount > 0 ? `${stats.overdueCount} overdue requiring action` : "No overdue items",
      filterTarget: "OVERDUE",
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <LandlordSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} user={user} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Toast Feedback Banner */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold shadow-2xl animate-bounce ${
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

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Header Title & Actions */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl tracking-tight">Payments Management</h1>
              <p className="mt-0.5 text-xs sm:text-sm text-gray-500">
                Track cash collections, record invoices, and issue rent payment reminders to tenants.
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-gray-800 shadow-sm transition-all active:scale-95"
            >
              <Plus size={15} />
              <span>Create Rent Invoice</span>
            </button>
          </div>

          {/* Interactive Stat Cards Grid */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCardList.map((c) => {
              const Icon = c.icon;
              const isSelected = statusFilter === c.filterTarget;
              return (
                <div
                  key={c.label}
                  onClick={() => setStatusFilter((prev) => (prev === c.filterTarget ? "ALL" : c.filterTarget))}
                  className={`group relative rounded-2xl border p-4 shadow-sm transition-all cursor-pointer hover:shadow-md ${
                    isSelected
                      ? "border-gray-900 bg-gray-900 text-white"
                      : c.danger
                      ? "border-rose-200 bg-rose-50/40 hover:border-rose-300"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? "text-gray-300" : "text-gray-400"}`}>
                      {c.label}
                    </p>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${isSelected ? "bg-white/20 text-white" : c.iconBg}`}>
                      <Icon size={14} />
                    </div>
                  </div>
                  <p className={`mt-2 text-xl font-extrabold sm:text-2xl ${isSelected ? "text-white" : c.color}`}>
                    {loading ? "—" : c.value}
                  </p>
                  {c.hint && (
                    <p className={`mt-1 text-[11px] ${isSelected ? "text-gray-300" : c.danger ? "text-rose-600 font-medium" : "text-gray-400"}`}>
                      {c.hint}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Controls & Search Table Container */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
                <div className="relative w-full sm:max-w-xs">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tenant name or property..."
                    className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-9 pr-3 text-xs outline-none focus:border-gray-900 focus:bg-white transition-all"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={13} />
                    </button>
                  )}
                </div>

                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "ALL", label: "All Statuses" },
                    { value: "PAID", label: "Paid" },
                    { value: "PENDING", label: "Pending" },
                    { value: "OVERDUE", label: "Overdue" },
                  ]}
                />

                <Select
                  value={propertyFilter}
                  onChange={setPropertyFilter}
                  options={[{ value: "ALL", label: "All Properties" }, ...properties.map((p) => ({ value: p, label: p }))]}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-xs"
                >
                  <Download size={13} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-sm text-gray-400">
                <Loader2 size={24} className="mx-auto mb-2 animate-spin text-gray-400" />
                Loading rent payments...
              </div>
            ) : paged.length === 0 ? (
              <div className="py-14 text-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 p-6">
                <Building2 className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-gray-700">No rent invoices match your filter</p>
                <p className="text-xs text-gray-400 mt-0.5">Try adjusting your search criteria or create a new rent invoice.</p>
              </div>
            ) : (
              <>
                {/* Desktop Responsive Table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100">
                        <th className="pb-3 font-semibold">Tenant</th>
                        <th className="pb-3 font-semibold">Property</th>
                        <th className="pb-3 font-semibold">Rent Month</th>
                        <th className="pb-3 font-semibold">Amount</th>
                        <th className="pb-3 font-semibold">Method</th>
                        <th className="pb-3 font-semibold">Due Date</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paged.map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3.5 pr-3 font-semibold text-gray-900">
                            <div>
                              <p className="text-xs sm:text-sm">{inv.booking?.tenant?.fullName || `Tenant #${inv.booking?.tenant?.id || "—"}`}</p>
                              <p className="text-[11px] font-normal text-gray-400">{inv.booking?.tenant?.email}</p>
                            </div>
                          </td>
                          <td className="py-3.5 text-xs text-gray-700 font-medium whitespace-nowrap">
                            {inv.booking?.room?.title || "—"}
                          </td>
                          <td className="py-3.5 text-xs text-gray-600 whitespace-nowrap">
                            {monthLabel(inv.periodStart)}
                          </td>
                          <td className="py-3.5 text-xs font-bold text-gray-900 whitespace-nowrap">
                            Rs. {inv.amount.toLocaleString()}
                          </td>
                          <td className="py-3.5 text-xs text-gray-600 font-medium whitespace-nowrap">
                            Cash
                          </td>
                          <td className="py-3.5 text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(inv.dueDate)}
                          </td>
                          <td className="py-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${STATUS_STYLE[inv.effectiveStatus]}`}>
                              • {inv.effectiveStatus.charAt(0) + inv.effectiveStatus.slice(1).toLowerCase()}
                            </span>
                          </td>
                          <td className="py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {inv.effectiveStatus === "PENDING" || inv.effectiveStatus === "OVERDUE" ? (
                                <>
                                  <button
                                    onClick={() => handleConfirmCash(inv)}
                                    disabled={confirmingId === inv.id}
                                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
                                    title="Confirm Cash Received"
                                  >
                                    <Check size={13} />
                                    <span>{confirmingId === inv.id ? "Confirming..." : "Confirm Cash"}</span>
                                  </button>
                                  <button
                                    onClick={() => handleRemind(inv)}
                                    disabled={remindingId === inv.id}
                                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
                                    title="Send Reminder Notification"
                                  >
                                    {remindingId === inv.id ? "Sending..." : "Remind"}
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                                  Received
                                </span>
                              )}

                              <button
                                onClick={() => setSelectedInvoice(inv)}
                                className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                                title="View Receipt Details"
                              >
                                <FileText size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Cards */}
                <div className="space-y-3 md:hidden">
                  {paged.map((inv) => (
                    <div key={inv.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs">
                      <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{inv.booking?.tenant?.fullName || "Tenant"}</p>
                          <p className="text-xs text-gray-500">{inv.booking?.room?.title} · {monthLabel(inv.periodStart)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${STATUS_STYLE[inv.effectiveStatus]}`}>
                          {inv.effectiveStatus}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-gray-500">Due: {formatDate(inv.dueDate)} (Cash)</span>
                        <span className="font-extrabold text-gray-900 text-sm">Rs. {inv.amount.toLocaleString()}</span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-2.5">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
                        >
                          <FileText size={13} />
                          <span>Receipt</span>
                        </button>

                        {(inv.effectiveStatus === "PENDING" || inv.effectiveStatus === "OVERDUE") ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleConfirmCash(inv)}
                              disabled={confirmingId === inv.id}
                              className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <Check size={13} />
                              <span>{confirmingId === inv.id ? "Confirming..." : "Confirm Cash"}</span>
                            </button>
                            <button
                              onClick={() => handleRemind(inv)}
                              disabled={remindingId === inv.id}
                              className="text-xs font-bold text-blue-600 hover:underline"
                            >
                              {remindingId === inv.id ? "Sending..." : "Remind"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700">Received (Cash)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row">
                  <p className="text-xs text-gray-500 font-medium">
                    Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-colors ${
                          page === p ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* --- 1. RECEIPT / INVOICE DETAILS MODAL --- */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-gray-900" />
                <h3 className="text-base font-bold text-gray-900">Rent Receipt #INV-{selectedInvoice.id}</h3>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Billing Period</p>
                  <p className="font-bold text-gray-900 text-sm">{monthLabel(selectedInvoice.periodStart)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${STATUS_STYLE[selectedInvoice.effectiveStatus]}`}>
                  {selectedInvoice.effectiveStatus}
                </span>
              </div>

              <div className="space-y-2 border border-gray-100 rounded-xl p-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Tenant:</span>
                  <span className="font-bold text-gray-800">{selectedInvoice.booking?.tenant?.fullName || "Tenant"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Property:</span>
                  <span className="font-semibold text-gray-800">{selectedInvoice.booking?.room?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Due Date:</span>
                  <span className="font-semibold text-gray-800">{formatDate(selectedInvoice.dueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment Method:</span>
                  <span className="font-semibold text-gray-800">Cash Payment</span>
                </div>
                {selectedInvoice.paidAt && (
                  <div className="flex justify-between border-t border-gray-100 pt-1.5 text-emerald-700">
                    <span>Payment Received Date:</span>
                    <span className="font-bold">{formatDate(selectedInvoice.paidAt)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between bg-gray-900 text-white rounded-xl p-3.5">
                <span className="text-xs font-semibold">Total Amount Due</span>
                <span className="text-lg font-extrabold">Rs. {selectedInvoice.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                <Printer size={14} />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 2. CREATE NEW RENT INVOICE MODAL --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-gray-900" />
                <h3 className="text-base font-bold text-gray-900">Create Rent Invoice</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            {loadingBookings ? (
              <div className="py-10 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span>Loading active tenants...</span>
              </div>
            ) : approvedBookings.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">
                You don't have any active approved tenant leases right now.
              </div>
            ) : (
              <form onSubmit={handleCreateInvoiceSubmit} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Select Tenant / Active Lease</label>
                  <select
                    value={createBookingId}
                    onChange={(e) => handleBookingSelectChange(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/70 p-2.5 text-xs outline-none focus:border-gray-900"
                    required
                  >
                    {approvedBookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.tenant?.fullName || `Tenant #${b.tenantId}`} — {b.room?.title} (Rs. {b.room?.price?.toLocaleString()}/mo)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Rent Amount (NPR)</label>
                  <input
                    type="number"
                    value={createAmount}
                    onChange={(e) => setCreateAmount(e.target.value)}
                    placeholder="Enter monthly rent amount"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/70 p-2.5 text-xs outline-none focus:border-gray-900"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Period Start</label>
                    <input
                      type="date"
                      value={createPeriodStart}
                      onChange={(e) => setCreatePeriodStart(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/70 p-2.5 text-xs outline-none focus:border-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Period End</label>
                    <input
                      type="date"
                      value={createPeriodEnd}
                      onChange={(e) => setCreatePeriodEnd(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/70 p-2.5 text-xs outline-none focus:border-gray-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    value={createDueDate}
                    onChange={(e) => setCreateDueDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/70 p-2.5 text-xs outline-none focus:border-gray-900"
                    required
                  />
                </div>

                <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingInvoice}
                    className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {creatingInvoice ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    <span>Issue Invoice</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 appearance-none rounded-xl border border-gray-200 bg-gray-50/60 pl-3 pr-8 text-xs font-semibold text-gray-700 outline-none focus:border-gray-900 focus:bg-white transition-all cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  );
}