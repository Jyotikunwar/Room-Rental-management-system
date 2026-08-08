import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell, HelpCircle, AlertTriangle, Search, Download,
  FileText, ClipboardList, ShieldCheck, Landmark, Smartphone,
  CheckCircle2, Loader2, X, Banknote,
} from "lucide-react";
import type { User, Payment, TenantDashboardData } from "../../services/api";
import { api } from "../../services/api";
import { Sidebar, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";

interface PaymentsProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

type StatusFilter = "ALL" | "PAID" | "PENDING" | "FAILED" | "REFUNDED";

const STATUS_STYLE: Record<Payment["status"], string> = {
  PAID: "bg-emerald-50 text-emerald-600",
  PENDING: "bg-amber-50 text-amber-600",
  FAILED: "bg-rose-50 text-rose-600",
  REFUNDED: "bg-blue-50 text-blue-600",
};

const METHOD_ICON: Record<Payment["paymentMethod"], typeof Landmark> = {
  BANK: Landmark,
  ESEWA: Smartphone,
  KHALTI: Smartphone,
  CASH: Banknote,
};

const METHOD_LABEL: Record<Payment["paymentMethod"], string> = {
  BANK: "Bank Transfer",
  ESEWA: "eSewa",
  KHALTI: "Khalti",
  CASH: "Cash",
};

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PaymentsPage({ user, onLogout, onNavigate }: PaymentsProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dashboard, setDashboard] = useState<TenantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<Payment["paymentMethod"]>("ESEWA");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([api.getMyPayments(), api.getTenantDashboard()])
      .then(([paymentsRes, dashboardRes]) => {
        if (paymentsRes.success) setPayments(paymentsRes.payments || []);
        else setError(paymentsRes.message || "Failed to load payments");
        if (dashboardRes.success) setDashboard(dashboardRes);
      })
      .catch(() => setError("Failed to load payments"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  const filteredHistory = useMemo(() => {
    return payments.filter((p) => {
      const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
      const desc = p.booking?.room?.title || "Rent Payment";
      const matchesQuery =
        query.trim() === "" ||
        desc.toLowerCase().includes(query.toLowerCase()) ||
        METHOD_LABEL[p.paymentMethod].toLowerCase().includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [payments, query, statusFilter]);

  const currentYear = new Date().getFullYear();
  const totalPaidThisYear = payments
    .filter((p) => p.status === "PAID" && p.paidAt && new Date(p.paidAt).getFullYear() === currentYear)
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingDues = payments.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + p.amount, 0);

  const activeRental = dashboard?.activeRental ?? null;
  // NOTE: the shared Room interface in services/api.ts doesn't expose securityDeposit
  // yet even though the Prisma model has it — add it there for a typed value here.
  const securityDeposit = (activeRental?.room as unknown as { securityDeposit?: number } | undefined)?.securityDeposit ?? null;

  const nextPaymentDue = activeRental?.totalAmount ?? null;
  const nextPaymentDate = dashboard?.stats.nextPaymentDate ?? null;
  const actionRequired = (dashboard?.stats.rentDueInDays ?? null) !== null && (dashboard?.stats.rentDueInDays ?? 99) <= 7;

  const openPayModal = () => {
    setPayError(null);
    setPayModalOpen(true);
  };

  const submitPayment = async () => {
    if (!activeRental) return;
    setPaying(true);
    setPayError(null);
    try {
      const res = await api.createPayment(activeRental.id, payMethod);
      if (res.success) {
        setPayModalOpen(false);
        loadData();
      } else {
        setPayError(res.message || "Payment failed. Please try again.");
      }
    } catch {
      setPayError("Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#F4F6FB] text-stone-900">
      <Sidebar active="Payments" onNavigate={handleNavigate} onSettings={() => onNavigate("settings")} onLogout={onLogout} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3.5 pl-14 sm:px-8 sm:pl-8">
          <h1 className="truncate text-base font-semibold text-stone-900">Horizon Management System</h1>
          <div className="flex shrink-0 items-center gap-4">
            <button onClick={() => onNavigate("notifications")} className="text-stone-500 hover:text-stone-700">
              <Bell size={18} />
            </button>
            <button className="text-stone-500 hover:text-stone-700">
              <HelpCircle size={18} />
            </button>
            <button onClick={onLogout} className="h-8 w-8 overflow-hidden rounded-full bg-stone-200">
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName ?? "U"}`}
                alt={user.fullName}
                className="h-full w-full object-cover"
              />
            </button>
          </div>
        </div>

        <div className="flex-1 px-4 py-6 sm:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">Payments</h2>
          <p className="mt-1 text-sm text-stone-500">Manage your rent, deposits, and payment history.</p>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="animate-spin text-stone-400" size={26} />
            </div>
          ) : error ? (
            <p className="mt-10 text-center text-sm text-stone-400">{error}</p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left column */}
              <div className="flex flex-col gap-6 lg:col-span-2">
                {activeRental && nextPaymentDue !== null ? (
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="text-sm font-semibold text-stone-900">Next Payment Due</h2>
                      {actionRequired && (
                        <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-600">
                          <AlertTriangle size={11} />
                          Action Required
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-stone-400">Due Date: {formatDate(nextPaymentDate)}</p>
                    <p className="mt-3 text-3xl font-bold text-stone-900 sm:text-4xl">
                      Rs. {nextPaymentDue.toLocaleString()}
                    </p>
                    <button
                      onClick={openPayModal}
                      className="mt-4 rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
                    >
                      Pay Now
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center">
                    <p className="text-sm text-stone-500">No active rental — nothing due right now.</p>
                  </div>
                )}

                {/* Payment history */}
                <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-sm font-semibold text-stone-900">Payment History</h2>
                    <div className="flex flex-1 items-center gap-2 sm:max-w-xs">
                      <div className="flex flex-1 items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1.5">
                        <Search size={13} className="shrink-0 text-stone-400" />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search payments..."
                          className="w-full bg-transparent text-xs outline-none placeholder:text-stone-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {(["ALL", "PAID", "PENDING", "FAILED", "REFUNDED"] as StatusFilter[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                          statusFilter === s ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                        }`}
                      >
                        {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>

                  <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                    <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-wide text-stone-400">
                          <th className="pb-2.5 pr-3 font-medium">Date</th>
                          <th className="pb-2.5 pr-3 font-medium">Description</th>
                          <th className="pb-2.5 pr-3 font-medium">Amount</th>
                          <th className="pb-2.5 pr-3 font-medium">Method</th>
                          <th className="pb-2.5 pr-3 font-medium">Status</th>
                          <th className="pb-2.5 font-medium">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filteredHistory.map((row) => (
                          <tr key={row.id}>
                            <td className="py-3 pr-3 text-stone-600">{formatDate(row.paidAt || row.createdAt)}</td>
                            <td className="py-3 pr-3 font-medium text-stone-800">{row.booking?.room?.title || "Rent Payment"}</td>
                            <td className="py-3 pr-3 text-stone-600">Rs. {row.amount.toLocaleString()}</td>
                            <td className="py-3 pr-3 text-stone-600">{METHOD_LABEL[row.paymentMethod]}</td>
                            <td className="py-3 pr-3">
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLE[row.status]}`}>
                                {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
                              </span>
                            </td>
                            <td className="py-3">
                              {row.status === "PAID" && row.transactionId ? (
                                <span title={`Transaction: ${row.transactionId}`} className="text-blue-600">
                                  <Download size={15} />
                                </span>
                              ) : (
                                <Download size={15} className="text-stone-300" />
                              )}
                            </td>
                          </tr>
                        ))}
                        {filteredHistory.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-stone-400">
                              No payments match your search.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-6">
                <StatCard icon={<FileText size={16} />} iconBg="bg-blue-50 text-blue-600" label="Total Paid This Year" value={`Rs. ${totalPaidThisYear.toLocaleString()}`} />
                <StatCard icon={<ClipboardList size={16} />} iconBg="bg-rose-50 text-rose-500" label="Pending Dues" value={`Rs. ${pendingDues.toLocaleString()}`} />
                <StatCard
                  icon={<ShieldCheck size={16} />}
                  iconBg="bg-emerald-50 text-emerald-600"
                  label="Security Deposit"
                  value={securityDeposit !== null ? `Rs. ${securityDeposit.toLocaleString()}` : "—"}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pay Now modal */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setPayModalOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Choose payment method</h3>
              <button onClick={() => setPayModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 flex flex-col gap-2">
              {(["ESEWA", "KHALTI", "BANK", "CASH"] as Payment["paymentMethod"][]).map((m) => {
                const Icon = METHOD_ICON[m];
                return (
                  <button
                    key={m}
                    onClick={() => setPayMethod(m)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                      payMethod === m ? "border-blue-600 bg-blue-50" : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    <Icon size={16} className="text-stone-500" />
                    {METHOD_LABEL[m]}
                    {payMethod === m && <CheckCircle2 size={15} className="ml-auto text-blue-600" />}
                  </button>
                );
              })}
            </div>

            {payError && <p className="mb-3 text-xs font-medium text-rose-600">{payError}</p>}

            <button
              onClick={submitPayment}
              disabled={paying}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60"
            >
              {paying && <Loader2 size={15} className="animate-spin" />}
              {paying ? "Processing..." : `Pay Rs. ${nextPaymentDue?.toLocaleString() ?? ""}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, iconBg, label, value }: { icon: ReactNode; iconBg: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium uppercase tracking-wide text-stone-400">{label}</p>
        <p className="mt-0.5 text-base font-bold text-stone-900">{value}</p>
      </div>
    </div>
  );
}
