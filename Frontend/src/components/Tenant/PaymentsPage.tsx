import type { ReactNode } from "react";
import {
  Bell, HelpCircle, AlertTriangle, Filter, Download,
  FileText, ClipboardList, ShieldCheck, Landmark, Smartphone,
  CheckCircle2, Trash2, Plus,
} from "lucide-react";
import type { User } from "../../services/api";
import { Sidebar, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";

// ---------- Types ----------
type PaymentStatus = "SUCCESS" | "FAILED";

interface PaymentRow {
  id: number;
  date: string; // ISO date
  description: string;
  amount: number;
  method: string;
  status: PaymentStatus;
  invoiceUrl: string | null; // null when there's nothing to download (e.g. failed payment)
}

interface PaymentMethod {
  id: number;
  type: "bank" | "esewa";
  label: string;
  sublabel: string; // e.g. "Default", "Linked"
  isDefault: boolean;
}

interface PaymentsData {
  nextPaymentDue: number;
  nextPaymentDate: string; // ISO date
  actionRequired: boolean;
  totalPaidThisYear: number;
  pendingDues: number;
  securityDeposit: number;
  history: PaymentRow[];
  methods: PaymentMethod[];
}

interface PaymentsProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

// ---------- Sample data (replace with API data from GET /api/payments) ----------
const PAYMENTS: PaymentsData = {
  nextPaymentDue: 15000,
  nextPaymentDate: "2026-07-28",
  actionRequired: true,
  totalPaidThisYear: 105000,
  pendingDues: 15000,
  securityDeposit: 30000,
  history: [
    { id: 1, date: "2026-06-28", description: "June Rent", amount: 15000, method: "Bank Transfer", status: "SUCCESS", invoiceUrl: "/invoices/1.pdf" },
    { id: 2, date: "2026-05-28", description: "May Rent + Maintenance", amount: 17500, method: "eSewa", status: "SUCCESS", invoiceUrl: "/invoices/2.pdf" },
    { id: 3, date: "2026-04-28", description: "April Rent", amount: 15000, method: "Card ending in 4242", status: "FAILED", invoiceUrl: null },
    { id: 4, date: "2026-04-29", description: "April Rent (Retry)", amount: 15000, method: "Bank Transfer", status: "SUCCESS", invoiceUrl: "/invoices/4.pdf" },
  ],
  methods: [
    { id: 1, type: "bank", label: "Bank Transfer", sublabel: "Default", isDefault: true },
    { id: 2, type: "esewa", label: "eSewa Wallet", sublabel: "Linked", isDefault: false },
  ],
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Payments({ user, onLogout, onNavigate }: PaymentsProps) {
  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  return (
    <div className="flex min-h-screen w-full bg-[#F4F6FB] text-stone-900">
      <Sidebar
        active="Payments"
        onNavigate={handleNavigate}
        onSettings={() => onNavigate("settings")}
        onLogout={onLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3.5 pl-14 sm:px-8 sm:pl-8">
          <h1 className="truncate text-base font-semibold text-stone-900">Horizon Management System</h1>
          <div className="flex shrink-0 items-center gap-4">
            <button className="text-stone-500 hover:text-stone-700">
              <Bell size={18} />
            </button>
            <button className="text-stone-500 hover:text-stone-700">
              <HelpCircle size={18} />
            </button>
            <div className="h-8 w-8 overflow-hidden rounded-full bg-stone-200">
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName ?? "U"}`}
                alt={user.fullName}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-6 sm:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">Payments</h2>
          <p className="mt-1 text-sm text-stone-500">Manage your rent, deposits, and payment history.</p>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left column */}
            <div className="flex flex-col gap-6 lg:col-span-2">
              <NextPaymentCard data={PAYMENTS} />
              <PaymentHistoryCard rows={PAYMENTS.history} />
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-6">
              <StatCard
                icon={<FileText size={16} />}
                iconBg="bg-blue-50 text-blue-600"
                label="Total Paid This Year"
                value={`Rs. ${PAYMENTS.totalPaidThisYear.toLocaleString()}`}
              />
              <StatCard
                icon={<ClipboardList size={16} />}
                iconBg="bg-rose-50 text-rose-500"
                label="Pending Dues"
                value={`Rs. ${PAYMENTS.pendingDues.toLocaleString()}`}
              />
              <StatCard
                icon={<ShieldCheck size={16} />}
                iconBg="bg-emerald-50 text-emerald-600"
                label="Security Deposit"
                value={`Rs. ${PAYMENTS.securityDeposit.toLocaleString()}`}
              />
              <PaymentMethodsCard methods={PAYMENTS.methods} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NextPaymentCard({ data }: { data: PaymentsData }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-900">Next Payment Due</h2>
        {data.actionRequired && (
          <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-600">
            <AlertTriangle size={11} />
            Action Required
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-stone-400">Due Date: {formatDate(data.nextPaymentDate)}</p>

      <p className="mt-3 text-3xl font-bold text-stone-900 sm:text-4xl">
        Rs. {data.nextPaymentDue.toLocaleString()}
      </p>

      <button className="mt-4 rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800">
        Pay Now
      </button>
    </div>
  );
}

function PaymentHistoryCard({ rows }: { rows: PaymentRow[] }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-900">Payment History</h2>
        <button className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-700">
          <Filter size={13} />
          Filter
        </button>
      </div>

      {/* Horizontally scrollable on narrow screens so the table never breaks layout */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[560px] border-collapse text-left text-xs">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-stone-400">
              <th className="pb-2.5 pr-3 font-medium">Date</th>
              <th className="pb-2.5 pr-3 font-medium">Description</th>
              <th className="pb-2.5 pr-3 font-medium">Amount</th>
              <th className="pb-2.5 pr-3 font-medium">Method</th>
              <th className="pb-2.5 pr-3 font-medium">Status</th>
              <th className="pb-2.5 font-medium">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-3 pr-3 text-stone-600">{formatDate(row.date)}</td>
                <td className="py-3 pr-3 font-medium text-stone-800">{row.description}</td>
                <td className="py-3 pr-3 text-stone-600">Rs. {row.amount.toLocaleString()}</td>
                <td className="py-3 pr-3 text-stone-600">{row.method}</td>
                <td className="py-3 pr-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      row.status === "SUCCESS" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    {row.status === "SUCCESS" ? "Success" : "Failed"}
                  </span>
                </td>
                <td className="py-3">
                  {row.invoiceUrl ? (
                    <a href={row.invoiceUrl} download className="text-blue-600 hover:text-blue-700">
                      <Download size={15} />
                    </a>
                  ) : (
                    <Download size={15} className="text-stone-300" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 border-t border-stone-100 pt-3 text-center">
        <button className="text-xs font-medium text-blue-600 hover:underline">View All Transactions</button>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
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

function PaymentMethodsCard({ methods }: { methods: PaymentMethod[] }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-stone-900">Payment Methods</h2>

      <div className="flex flex-col gap-2.5">
        {methods.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50/60 px-3 py-2.5"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                m.type === "bank" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
              }`}
            >
              {m.type === "bank" ? <Landmark size={16} /> : <Smartphone size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-stone-800">{m.label}</p>
              <p className="text-[11px] text-stone-400">{m.sublabel}</p>
            </div>
            {m.isDefault ? (
              <CheckCircle2 size={16} className="shrink-0 text-blue-600" />
            ) : (
              <button className="shrink-0 text-stone-400 hover:text-rose-500">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-stone-200 py-2.5 text-xs font-medium text-stone-700 hover:bg-stone-50">
        <Plus size={13} />
        Add New Method
      </button>
    </div>
  );
}
