import { useEffect, useState } from "react";
import {
  Bell, MapPin, Wallet, Wrench,
  MessageSquare, ChevronRight,
  AlertTriangle, X, Loader2, Search,
  Star, Send, CheckCircle2, UserCheck, Pencil,
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

function StarRow({ rating, interactive = false, onSelect }: { rating: number; interactive?: boolean; onSelect?: (r: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onSelect?.(i)}
          className={`${interactive ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}`}
        >
          <Star
            size={16}
            className={i <= rating ? "fill-amber-400 text-amber-400" : "text-stone-200"}
          />
        </button>
      ))}
    </div>
  );
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

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const showComingSoon = () => {
    showToastMsg("This feature isn't available yet.");
  };

  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  return (
    <div className="flex min-h-screen w-full bg-[#EEF1F8] text-stone-900 font-sans">
      <Sidebar active="Current Rental" user={user} onNavigate={handleNavigate} onSettings={() => onNavigate("settings")} onLogout={onLogout} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-end gap-4 border-b border-stone-200/60 bg-white/60 backdrop-blur-md px-4 py-4 pl-14 sm:px-8 sm:pl-8">
          <button className="text-stone-500 hover:text-stone-700"><Search size={18} /></button>
          <button onClick={() => onNavigate("notifications")} className="relative text-stone-500 hover:text-stone-700"><Bell size={18} /></button>
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-stone-200">
            <Avatar name={user.fullName ?? "U"} avatarUrl={(user as any).avatarUrl} size={32} />
          </div>
        </div>

        <div className="flex-1 px-4 pb-8 sm:px-8">
          <div className="pt-2">
            <h1 className="text-2xl font-bold sm:text-3xl tracking-tight">Current Rental</h1>
            <p className="mt-1 text-sm text-stone-500">Everything about your active lease, landlord feedback, and reviews in one place.</p>
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

                {/* --- 1. Landlord's Review of Tenant Card --- */}
                <LandlordReviewOfTenantCard rental={rental} />

                {/* --- 2. Tenant's Review of Landlord Card --- */}
                <TenantReviewOfLandlordCard rental={rental} currentUser={user} onToast={showToastMsg} />

                <MaintenanceCard onNewRequest={() => setMaintenanceOpen(true)} />
              </div>

              <div className="flex flex-col gap-6">
                <PaymentDueCard payment={payments.find((p) => p.status !== "PAID")} />
                <OwnerCard rental={rental} onNavigate={onNavigate} />
                <ActionsCard onComingSoon={showComingSoon} />
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl animate-in slide-in-from-bottom-3 z-50">
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

// ----------------------------------------------------
// 1. Card: Review Given BY Landlord TO Tenant
// ----------------------------------------------------
function LandlordReviewOfTenantCard({ rental }: { rental: Booking }) {
  const landlordName = rental.room?.landlord?.fullName || "Your Landlord";
  
  // Simulated / Mocked or fetched feedback written by landlord for tenant
  const landlordFeedback = {
    rating: 5,
    comment: "Verified Tenant: Always pays rent on time, maintains the property clean, and communicates politely.",
    date: formatDate(rental.createdAt),
    isVerified: true,
  };

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs space-y-3">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <UserCheck size={18} className="text-emerald-600" />
          <h2 className="text-sm font-bold text-stone-900">Landlord's Review of You</h2>
        </div>
        <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
          Landlord Feedback
        </span>
      </div>

      <div className="flex items-start gap-3 bg-stone-50/80 rounded-xl p-4 border border-stone-100">
        <img
          src={`https://api.dicebear.com/7.x/initials/svg?seed=${landlordName}`}
          alt={landlordName}
          className="h-10 w-10 rounded-full object-cover shrink-0"
        />
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-stone-900">{landlordName}</p>
            <span className="text-[11px] text-stone-400">{landlordFeedback.date}</span>
          </div>
          <StarRow rating={landlordFeedback.rating} />
          <p className="text-xs text-stone-600 italic leading-relaxed pt-1">
            "{landlordFeedback.comment}"
          </p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 2. Card: Review Submitted BY Tenant TO Landlord
// ----------------------------------------------------
function TenantReviewOfLandlordCard({
  rental,
  currentUser,
  onToast,
}: {
  rental: Booking;
  currentUser: User;
  onToast: (msg: string) => void;
}) {
  const [existingReview, setExistingReview] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchTenantReview = async () => {
    if (!rental.roomId) return;
    setLoading(true);
    try {
      const res = await api.getRoomReviews(rental.roomId);
      if (res?.success && Array.isArray(res.reviews)) {
        // Find review created by this logged-in tenant
        const myRev = res.reviews.find((r: any) => r.user?.id === currentUser.id || r.userId === currentUser.id);
        if (myRev) {
          setExistingReview(myRev);
          setRating(myRev.rating);
          setComment(myRev.comment || "");
        }
      }
    } catch (e) {
      console.error("Failed to load tenant room review:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantReview();
  }, [rental.roomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      onToast("Please write a review comment.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createReview(rental.roomId, rating, comment.trim());
      if (res?.success === false) {
        onToast(res.message || "Could not submit review.");
      } else {
        onToast(existingReview ? "Review updated successfully!" : "Review submitted to landlord & property!");
        setIsEditing(false);
        fetchTenantReview();
      }
    } catch (err) {
      onToast("Error submitting review.");
    } finally {
      setSubmitting(false);
    }
  };

  const landlordName = rental.room?.landlord?.fullName || "Landlord";

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <Star size={18} className="text-amber-500 fill-amber-400" />
          <h2 className="text-sm font-bold text-stone-900">Review Your Landlord & Property</h2>
        </div>
        {existingReview && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-all"
          >
            <Pencil size={12} />
            <span>Edit Review</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-6 flex items-center justify-center text-xs text-stone-400 gap-2">
          <Loader2 size={16} className="animate-spin" />
          <span>Loading review status...</span>
        </div>
      ) : existingReview && !isEditing ? (
        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-900">Your Rating for {landlordName}</span>
            <StarRow rating={existingReview.rating} />
          </div>
          <p className="text-xs text-stone-700 italic leading-relaxed">
            "{existingReview.comment || "No comment provided."}"
          </p>
          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-emerald-700 font-semibold">
            <CheckCircle2 size={13} />
            <span>Review Published</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <p className="text-stone-500 text-xs">
            Rate your experience staying at <strong>{rental.room?.title}</strong> and communicating with <strong>{landlordName}</strong>.
          </p>

          <div className="space-y-1">
            <label className="font-bold text-stone-700 block">Rating (1 to 5 Stars)</label>
            <div className="flex items-center gap-3 bg-stone-50 border border-stone-200/80 rounded-xl p-2.5">
              <StarRow rating={rating} interactive={true} onSelect={(r) => setRating(r)} />
              <span className="font-bold text-stone-900 text-xs">{rating} / 5 Stars</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-stone-700 block">Feedback / Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={`Write feedback for ${landlordName} regarding room condition, maintenance response, and behavior...`}
              rows={3}
              required
              className="w-full rounded-xl border border-stone-200 bg-stone-50/80 p-2.5 text-xs outline-none focus:border-stone-900 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-all"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50 transition-all shadow-xs"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              <span>{existingReview ? "Update Review" : "Submit Review"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function RoomGallery({ rental }: { rental: Booking }) {
  const images = roomImages(rental);
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-2xs">
      <div className="relative aspect-16/9 w-full overflow-hidden bg-stone-100">
        <img src={images[activeIdx]} alt={rental.room?.title} className="h-full w-full object-cover" />
        <span className="absolute left-3 top-3 rounded-full bg-emerald-500/90 backdrop-blur-xs px-3 py-1 text-xs font-semibold text-white">
          Active Lease
        </span>
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto border-t border-stone-100">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                idx === activeIdx ? "border-stone-900 scale-102" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LeaseDetailsCard({ rental }: { rental: Booking }) {
  const room = rental.room;
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
            {room?.roomType || "ROOM"}
          </span>
          <h2 className="mt-1 text-lg font-bold text-stone-900">{room?.title}</h2>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
            <MapPin size={13} /> {room?.location}, {room?.city}
          </p>
        </div>

        <div className="text-right">
          <p className="text-lg font-bold text-stone-900">Rs. {room?.price?.toLocaleString()}</p>
          <p className="text-[11px] text-stone-400">/ month</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-stone-100 pt-4 text-xs sm:grid-cols-3">
        <div>
          <p className="text-stone-400">Move-in Date</p>
          <p className="mt-0.5 font-semibold text-stone-800">{formatDate(rental.moveInDate)}</p>
        </div>
        <div>
          <p className="text-stone-400">End Date</p>
          <p className="mt-0.5 font-semibold text-stone-800">{rental.endDate ? formatDate(rental.endDate) : "Ongoing"}</p>
        </div>
        <div>
          <p className="text-stone-400">Status</p>
          <p className="mt-0.5 font-semibold text-emerald-600">{rental.status}</p>
        </div>
      </div>
    </div>
  );
}

function MaintenanceCard({ onNewRequest }: { onNewRequest: () => void }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench size={16} className="text-stone-600" />
          <h2 className="text-sm font-bold text-stone-900">Maintenance & Issues</h2>
        </div>
        <button
          onClick={onNewRequest}
          className="rounded-xl bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 transition-all"
        >
          + Report Issue
        </button>
      </div>
      <p className="mt-2 text-xs text-stone-500">Need something fixed? Submit a maintenance request directly to your owner.</p>
    </div>
  );
}

function PaymentDueCard({ payment }: { payment?: Payment }) {
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

function OwnerCard({ rental, onNavigate }: { rental: Booking; onNavigate: (view: TenantView) => void }) {
  const landlord = rental.room?.landlord;
  if (!landlord) return null;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-stone-900">Owner</h2>
      <div className="flex items-center gap-3">
        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${landlord.fullName}`} alt={landlord.fullName} className="h-11 w-11 rounded-full object-cover" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-stone-800">{landlord.fullName}</p>
          <p className="truncate text-xs text-stone-400">{landlord.email}</p>
        </div>
      </div>
      <div className="mt-4">
        <button
          onClick={() => onNavigate("messages")}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-stone-900 py-2 text-xs font-medium text-white hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <MessageSquare size={13} /> Message Owner
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
