import { useState } from "react";
import {
  Search, Bell, MapPin, Wallet, FileText, Wrench, Phone,
  MessageSquare, Download, ChevronRight, CheckCircle2, Clock,
  AlertTriangle, X,
} from "lucide-react";
import type { User } from "../../services/api";
import { Sidebar, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";

// ---------- Types ----------
interface Payment {
  id: number;
  paidOn: string | null; // ISO date, null if not yet paid
  dueDate: string;
  amount: number;
  status: "PAID" | "DUE" | "OVERDUE";
}

interface MaintenanceRequest {
  id: number;
  title: string;
  raisedOn: string;
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED";
}

interface CurrentRentalData {
  roomTitle: string;
  roomArea: string;
  roomType: string;
  sizeSqft: number;
  furnished: boolean;
  images: string[];
  monthlyRent: number;
  deposit: number;
  moveInDate: string;
  leaseEndDate: string;
  nextPaymentDue: string;
  ownerName: string;
  ownerPhone: string;
  ownerImg: string;
  payments: Payment[];
  maintenanceRequests: MaintenanceRequest[];
}

interface CurrentRentalProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

// ---------- Sample data (replace with API data from GET /api/rentals/current) ----------
const RENTAL: CurrentRentalData | null = {
  roomTitle: "Shanti Niwas, Baneshwor",
  roomArea: "Baneshwor, Kathmandu",
  roomType: "Single Room",
  sizeSqft: 250,
  furnished: true,
  images: [
    "/images/rooms/luxury-2bhk.jpg",
    "/images/rooms/studio-koteshwor.jpg",
    "/images/rooms/modern-flat.jpg",
  ],
  monthlyRent: 8500,
  deposit: 17000,
  moveInDate: "2026-02-01",
  leaseEndDate: "2027-01-31",
  nextPaymentDue: "2026-08-28",
  ownerName: "Bishnu Adhikari",
  ownerPhone: "+977 98XXXXXXXX",
  ownerImg: "/images/avatars/owner-placeholder.jpg",
  payments: [
    { id: 1, paidOn: "2026-07-01", dueDate: "2026-07-01", amount: 8500, status: "PAID" },
    { id: 2, paidOn: "2026-06-01", dueDate: "2026-06-01", amount: 8500, status: "PAID" },
    { id: 3, paidOn: "2026-05-02", dueDate: "2026-05-01", amount: 8500, status: "PAID" },
  ],
  maintenanceRequests: [
    { id: 1, title: "Kitchen tap leaking", raisedOn: "2026-07-20", status: "IN_PROGRESS" },
    { id: 2, title: "Bedroom light not working", raisedOn: "2026-06-10", status: "RESOLVED" },
  ],
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function CurrentRental({ user, onLogout, onNavigate }: CurrentRentalProps) {
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  return (
    <div className="flex min-h-screen w-full bg-[#EEF1F8] text-stone-900">
      <Sidebar
        active="Current Rental"
        onNavigate={handleNavigate}
        onSettings={() => onNavigate("settings")}
        onLogout={onLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-end gap-4 border-b border-stone-200/60 px-4 py-4 pl-14 sm:px-8 sm:pl-8">
          <button className="text-stone-500 hover:text-stone-700">
            <Search size={18} />
          </button>
          <button onClick={() => onNavigate("notifications")} className="relative text-stone-500 hover:text-stone-700">
            <Bell size={18} />
          </button>
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-stone-200">
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName ?? "U"}`}
              alt={user.fullName}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="flex-1 px-4 pb-8 sm:px-8">
          <div className="pt-2">
            <h1 className="text-2xl font-bold sm:text-3xl">Current Rental</h1>
            <p className="mt-1 text-sm text-stone-500">Everything about your active lease, in one place.</p>
          </div>

          {!RENTAL ? (
            <NoRentalState onNavigate={onNavigate} />
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left/main column */}
              <div className="flex flex-col gap-6 lg:col-span-2">
                <RoomGallery rental={RENTAL} />
                <LeaseDetailsCard rental={RENTAL} />
                <PaymentHistoryCard rental={RENTAL} />
                <MaintenanceCard
                  requests={RENTAL.maintenanceRequests}
                  onNewRequest={() => setMaintenanceOpen(true)}
                />
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-6">
                <PaymentDueCard rental={RENTAL} />
                <OwnerCard rental={RENTAL} />
                <ActionsCard />
              </div>
            </div>
          )}
        </div>
      </div>

      {maintenanceOpen && <MaintenanceRequestModal onClose={() => setMaintenanceOpen(false)} />}
    </div>
  );
}

function RoomGallery({ rental }: { rental: CurrentRentalData }) {
  const [active, setActive] = useState(0);

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <img src={rental.images[active]} alt={rental.roomTitle} className="h-56 w-full object-cover sm:h-72" />
      <div className="flex gap-2 p-3">
        {rental.images.map((img, i) => (
          <button
            key={img}
            onClick={() => setActive(i)}
            className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${
              active === i ? "border-blue-600" : "border-transparent"
            }`}
          >
            <img src={img} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <div className="border-t border-stone-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-stone-900">{rental.roomTitle}</h2>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
            Active
          </span>
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
          <MapPin size={11} /> {rental.roomArea}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-500">
          <span className="rounded-md bg-stone-100 px-2 py-0.5">{rental.roomType}</span>
          <span className="rounded-md bg-stone-100 px-2 py-0.5">{rental.sizeSqft} sq.ft</span>
          <span className="rounded-md bg-stone-100 px-2 py-0.5">{rental.furnished ? "Furnished" : "Unfurnished"}</span>
        </div>
      </div>
    </div>
  );
}

function LeaseDetailsCard({ rental }: { rental: CurrentRentalData }) {
  const start = new Date(rental.moveInDate).getTime();
  const end = new Date(rental.leaseEndDate).getTime();
  const now = Date.now();
  const progressPct = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <h2 className="mb-4 text-sm font-semibold text-stone-900">Lease Details</h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Monthly Rent" value={`Rs. ${rental.monthlyRent.toLocaleString()}`} />
        <Field label="Deposit" value={`Rs. ${rental.deposit.toLocaleString()}`} />
        <Field label="Move-in Date" value={formatDate(rental.moveInDate)} />
        <Field label="Lease Ends" value={formatDate(rental.leaseEndDate)} />
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-xs text-stone-400">
          <span>LEASE PROGRESS</span>
          <span className="font-medium text-blue-600">{progressPct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <button className="mt-5 flex items-center gap-1.5 rounded-lg border border-stone-200 px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50">
        <FileText size={13} />
        View Lease Agreement
        <Download size={12} className="ml-0.5" />
      </button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-stone-800">{value}</p>
    </div>
  );
}

function PaymentHistoryCard({ rental }: { rental: CurrentRentalData }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-900">Payment History</h2>
        <button className="text-xs font-medium text-blue-600 hover:underline">View All</button>
      </div>

      <div className="flex flex-col divide-y divide-stone-100">
        {rental.payments.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  p.status === "PAID" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                }`}
              >
                {p.status === "PAID" ? <CheckCircle2 size={14} /> : <Clock size={14} />}
              </span>
              <div>
                <p className="text-xs font-medium text-stone-800">
                  {p.paidOn ? `Paid on ${formatDate(p.paidOn)}` : `Due ${formatDate(p.dueDate)}`}
                </p>
                <p className="text-[11px] text-stone-400">Rent for {formatDate(p.dueDate)}</p>
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold text-stone-800">
              Rs. {p.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MaintenanceCard({
  requests,
  onNewRequest,
}: {
  requests: MaintenanceRequest[];
  onNewRequest: () => void;
}) {
  const statusStyle: Record<MaintenanceRequest["status"], string> = {
    PENDING: "bg-amber-50 text-amber-600",
    IN_PROGRESS: "bg-blue-50 text-blue-600",
    RESOLVED: "bg-emerald-50 text-emerald-600",
  };
  const statusLabel: Record<MaintenanceRequest["status"], string> = {
    PENDING: "Pending",
    IN_PROGRESS: "In Progress",
    RESOLVED: "Resolved",
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-900">Maintenance Requests</h2>
        <button
          onClick={onNewRequest}
          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
        >
          <Wrench size={12} /> Report an Issue
        </button>
      </div>

      {requests.length === 0 ? (
        <p className="py-4 text-center text-xs text-stone-400">No maintenance requests yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-stone-100">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <p className="text-xs font-medium text-stone-800">{r.title}</p>
                <p className="text-[11px] text-stone-400">Raised on {formatDate(r.raisedOn)}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle[r.status]}`}>
                {statusLabel[r.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentDueCard({ rental }: { rental: CurrentRentalData }) {
  const days = daysUntil(rental.nextPaymentDue);
  const isUrgent = days <= 5;

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${
        isUrgent ? "border-amber-200 bg-amber-50" : "border-stone-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <Wallet size={16} className={isUrgent ? "text-amber-600" : "text-stone-500"} />
        <h2 className="text-sm font-semibold text-stone-900">Next Payment</h2>
      </div>

      <p className="mt-3 text-2xl font-bold text-stone-900">Rs. {rental.monthlyRent.toLocaleString()}</p>
      <p className={`mt-1 text-xs font-medium ${isUrgent ? "text-amber-700" : "text-stone-500"}`}>
        {isUrgent && <AlertTriangle size={11} className="mr-1 inline" />}
        Due {formatDate(rental.nextPaymentDue)} · {days} day{days === 1 ? "" : "s"} left
      </p>

      <button className="mt-4 w-full rounded-lg bg-stone-900 py-2.5 text-sm font-medium text-white hover:bg-stone-800">
        Pay Now
      </button>
    </div>
  );
}

function OwnerCard({ rental }: { rental: CurrentRentalData }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-stone-900">Owner</h2>
      <div className="flex items-center gap-3">
        <img src={rental.ownerImg} alt={rental.ownerName} className="h-11 w-11 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-stone-800">{rental.ownerName}</p>
          <p className="truncate text-xs text-stone-400">{rental.ownerPhone}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-200 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50">
          <Phone size={13} /> Call
        </button>
        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-stone-900 py-2 text-xs font-medium text-white hover:bg-stone-800">
          <MessageSquare size={13} /> Message
        </button>
      </div>
    </div>
  );
}

function ActionsCard() {
  const actions = [
    { label: "Renew Lease", desc: "Extend your stay before it ends" },
    { label: "Submit Vacate Notice", desc: "Let your owner know you're moving out" },
  ];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-stone-900">Lease Actions</h2>
      <div className="flex flex-col divide-y divide-stone-100">
        {actions.map((a) => (
          <button key={a.label} className="flex items-center justify-between gap-2 py-3 text-left">
            <div>
              <p className="text-xs font-medium text-stone-800">{a.label}</p>
              <p className="text-[11px] text-stone-400">{a.desc}</p>
            </div>
            <ChevronRight size={14} className="shrink-0 text-stone-300" />
          </button>
        ))}
      </div>
    </div>
  );
}

function MaintenanceRequestModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-900">Report an Issue</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={18} />
          </button>
        </div>

        <label className="mb-3 block text-xs font-medium text-stone-500">
          Issue title
          <input
            type="text"
            placeholder="e.g. Kitchen tap leaking"
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="mb-4 block text-xs font-medium text-stone-500">
          Description
          <textarea
            rows={3}
            placeholder="Describe the issue in a bit more detail..."
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none"
          />
        </label>

        <button
          onClick={onClose}
          className="w-full rounded-lg bg-stone-900 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
        >
          Submit Request
        </button>
      </div>
    </div>
  );
}

function NoRentalState({ onNavigate }: { onNavigate: (view: TenantView) => void }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
      <p className="text-sm text-stone-500">You don't have an active rental right now.</p>
      <button
        onClick={() => onNavigate("findProperty" as TenantView)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
      >
        Find Rooms
      </button>
    </div>
  );
}
