import { useEffect, useState } from "react";
import {
  Bell, MapPin, Wallet, Wrench, Phone,
  MessageSquare, ChevronRight,
  AlertTriangle, X, Loader2, Search,
} from "lucide-react";
import type { User, Booking, Payment } from "../../services/api";
import { api, getImageUrl } from "../../services/api";
import { Sidebar, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";
import Avatar from "../Avatar";
interface CurrentRentalProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function roomImages(booking: Booking): string[] {
  const imgs = booking.room?.roomImages?.map((i) => getImageUrl(i.imageUrl) || "") ?? [];
  return imgs.filter(Boolean).length > 0 ? imgs.filter(Boolean) : ["/images/rooms/placeholder.jpg"];
}

export default function CurrentRental({ user, onLogout, onNavigate }: CurrentRentalProps) {
  const [rental, setRental] = useState<Booking | null | undefined>(undefined); // undefined = loading
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadData = () => {
    Promise.all([api.getCurrentRental(), api.getMyPayments()])
      .then(([rentalRes, paymentsRes]) => {
        if (rentalRes.success === false) throw new Error(rentalRes.message || "Couldn't load your rental.");
        setRental(rentalRes.rental ?? null);
        const allPayments: Payment[] = Array.isArray(paymentsRes) ? paymentsRes : paymentsRes.payments ?? [];
        setPayments(
          rentalRes.rental ? allPayments.filter((p) => p.bookingId === rentalRes.rental.id) : []
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your rental."));
  };

  useEffect(() => {
    loadData();
  }, []);

  const showComingSoon = () => {
    setToast("This feature isn't available yet.");
    setTimeout(() => setToast(null), 2500);
  };

  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  return (
    <div className="flex min-h-screen w-full bg-[#EEF1F8] text-stone-900">
      <Sidebar active="Current Rental" user={user} onNavigate={handleNavigate} onSettings={() => onNavigate("settings")} onLogout={onLogout} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-end gap-4 border-b border-stone-200/60 px-4 py-4 pl-14 sm:px-8 sm:pl-8">
          <button className="text-stone-500 hover:text-stone-700"><Search size={18} /></button>
          <button onClick={() => onNavigate("notifications")} className="relative text-stone-500 hover:text-stone-700"><Bell size={18} /></button>
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-stone-200">
            <Avatar name={user.fullName ?? "U"} avatarUrl={(user as any).avatarUrl} size={32} />
          </div>
        </div>

        <div className="flex-1 px-4 pb-8 sm:px-8">
          <div className="pt-2">
            <h1 className="text-2xl font-bold sm:text-3xl">Current Rental</h1>
            <p className="mt-1 text-sm text-stone-500">Everything about your active lease, in one place.</p>
          </div>

          {rental === undefined ? (
            <div className="mt-6 flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-stone-400" /></div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-600">{error}</div>
          ) : !rental ? (
            <NoRentalState onNavigate={onNavigate} />
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="flex flex-col gap-6 lg:col-span-2">
                <RoomGallery rental={rental} />
                <LeaseDetailsCard rental={rental} />
                <MaintenanceCard rental={rental} onNewRequest={() => setMaintenanceOpen(true)} />
              </div>

              <div className="flex flex-col gap-6">
                <PaymentDueCard payment={payments.find((p) => p.status !== "PAID")} />
                <OwnerCard rental={rental} />
                <ActionsCard onComingSoon={showComingSoon} />
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-stone-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {maintenanceOpen && rental && (
        <MaintenanceRequestModal
          bookingId={rental.id}
          onClose={() => setMaintenanceOpen(false)}
          onSubmitted={() => {
            setMaintenanceOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function RoomGallery({ rental }: { rental: Booking }) {
  const [active, setActive] = useState(0);
  const images = roomImages(rental);

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <img src={images[active]} alt={rental.room?.title} className="h-56 w-full object-cover sm:h-72" />
      {images.length > 1 && (
        <div className="flex gap-2 p-3">
          {images.map((img, i) => (
            <button key={img} onClick={() => setActive(i)} className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${active === i ? "border-blue-600" : "border-transparent"}`}>
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="border-t border-stone-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-stone-900">{rental.room?.title}</h2>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
            {rental.status === "APPROVED" ? "Active" : rental.status}
          </span>
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
          <MapPin size={11} /> {rental.room?.location}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-500">
          <span className="rounded-md bg-stone-100 px-2 py-0.5">{rental.room?.roomType}</span>
        </div>
      </div>
    </div>
  );
}

function LeaseDetailsCard({ rental }: { rental: Booking }) {
  const end = rental.endDate ?? new Date(new Date(rental.moveInDate).getTime() + 1000 * 60 * 60 * 24 * 365).toISOString();
  const start = new Date(rental.moveInDate).getTime();
  const endMs = new Date(end).getTime();
  const now = Date.now();
  const progressPct = Math.min(100, Math.max(0, Math.round(((now - start) / (endMs - start)) * 100)));

  const securityDeposit = (rental.room as any)?.securityDeposit;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <h2 className="mb-4 text-sm font-semibold text-stone-900">Lease Details</h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Monthly Rent" value={`Rs. ${rental.room?.price.toLocaleString()}`} />
        <Field label="Deposit" value={securityDeposit != null ? `Rs. ${securityDeposit.toLocaleString()}` : "—"} />
        <Field label="Move-in Date" value={formatDate(rental.moveInDate)} />
        <Field label="Lease Ends" value={rental.endDate ? formatDate(rental.endDate) : "Not set"} />
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
      {/* NOTE: no lease-document storage in the backend yet, so "View Lease Agreement" is omitted until that exists. */}
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

function MaintenanceCard({ rental, onNewRequest }: { rental: Booking; onNewRequest: () => void }) {
  const complaints = (rental as any).complaints ?? [];
  const statusStyle: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-600",
    IN_PROGRESS: "bg-blue-50 text-blue-600",
    RESOLVED: "bg-emerald-50 text-emerald-600",
    REJECTED: "bg-rose-50 text-rose-600",
  };
  const statusLabel: Record<string, string> = {
    PENDING: "Pending", IN_PROGRESS: "In Progress", RESOLVED: "Resolved", REJECTED: "Rejected",
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-900">Maintenance Requests</h2>
        <button onClick={onNewRequest} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
          <Wrench size={12} /> Report an Issue
        </button>
      </div>

      {complaints.length === 0 ? (
        <p className="py-4 text-center text-xs text-stone-400">No maintenance requests yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-stone-100">
          {complaints.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <p className="text-xs font-medium text-stone-800">{c.title}</p>
                <p className="text-[11px] text-stone-400">Raised on {formatDate(c.createdAt)}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle[c.status]}`}>{statusLabel[c.status]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentDueCard({ payment }: { payment: Payment | undefined }) {
  if (!payment) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-stone-500" />
          <h2 className="text-sm font-semibold text-stone-900">Next Payment</h2>
        </div>
        <p className="mt-3 text-sm text-stone-500">No payment currently due.</p>
      </div>
    );
  }

  const days = daysUntil(payment.createdAt);
  const isUrgent = days <= 5;

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${isUrgent ? "border-amber-200 bg-amber-50" : "border-stone-200 bg-white"}`}>
      <div className="flex items-center gap-2">
        <Wallet size={16} className={isUrgent ? "text-amber-600" : "text-stone-500"} />
        <h2 className="text-sm font-semibold text-stone-900">Next Payment</h2>
      </div>

      <p className="mt-3 text-2xl font-bold text-stone-900">Rs. {payment.amount.toLocaleString()}</p>
      <p className={`mt-1 text-xs font-medium ${isUrgent ? "text-amber-700" : "text-stone-500"}`}>
        {isUrgent && <AlertTriangle size={11} className="mr-1 inline" />}
        Status: {payment.status}
      </p>
    </div>
  );
}

function OwnerCard({ rental }: { rental: Booking }) {
  const landlord = rental.room?.landlord;
  if (!landlord) return null;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-stone-900">Owner</h2>
      <div className="flex items-center gap-3">
        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${landlord.fullName}`} alt={landlord.fullName} className="h-11 w-11 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-stone-800">{landlord.fullName}</p>
          <p className="truncate text-xs text-stone-400">{landlord.phone || landlord.email}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        {landlord.phone ? (
          <a href={`tel:${landlord.phone}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-200 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50">
            <Phone size={13} /> Call
          </a>
        ) : (
          <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-100 py-2 text-xs font-medium text-stone-300">
            <Phone size={13} /> No number
          </span>
        )}
        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-stone-900 py-2 text-xs font-medium text-white hover:bg-stone-800">
          <MessageSquare size={13} /> Message
        </button>
      </div>
    </div>
  );
}

function ActionsCard({ onComingSoon }: { onComingSoon: () => void }) {
  const actions = [
    { label: "Renew Lease", desc: "Extend your stay before it ends" },
    { label: "Submit Vacate Notice", desc: "Let your owner know you're moving out" },
  ];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-stone-900">Lease Actions</h2>
      <div className="flex flex-col divide-y divide-stone-100">
        {actions.map((a) => (
          <button key={a.label} onClick={onComingSoon} className="flex items-center justify-between gap-2 py-3 text-left">
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

function MaintenanceRequestModal({ bookingId, onClose, onSubmitted }: { bookingId: number; onClose: () => void; onSubmitted: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError("Please fill in both fields.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.reportMaintenanceIssue(bookingId, title.trim(), description.trim());
      if (res.success === false) throw new Error(res.message || "Couldn't submit the request.");
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit the request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-900">Report an Issue</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={18} /></button>
        </div>

        {error && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">{error}</div>}

        <label className="mb-3 block text-xs font-medium text-stone-500">
          Issue title
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Kitchen tap leaking" className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none" />
        </label>

        <label className="mb-4 block text-xs font-medium text-stone-500">
          Description
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue in a bit more detail..." className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none" />
        </label>

        <button onClick={handleSubmit} disabled={submitting} className="w-full rounded-lg bg-stone-900 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60">
          {submitting ? "Submitting..." : "Submit Request"}
        </button>
      </div>
    </div>
  );
}

function NoRentalState({ onNavigate }: { onNavigate: (view: TenantView) => void }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
      <p className="text-sm text-stone-500">You don't have an active rental right now.</p>
      <button onClick={() => onNavigate("search")} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
        Find Rooms
      </button>
    </div>
  );
}
