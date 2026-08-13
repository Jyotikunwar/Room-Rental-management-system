import { useEffect, useMemo, useState } from "react";
import {
  Search, Bell, MapPin, ChevronDown, User as UserIcon, Loader2, X,
} from "lucide-react";
import type { User, Booking, Room } from "../../services/api";
import { api, getImageUrl } from "../../services/api";
import { Sidebar, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";
import Avatar from "../Avatar";
// ---------- Types ----------
// The UI groups bookings into these 4 buckets. The backend's BookingStatus
// has 5 values (PENDING/APPROVED/REJECTED/CANCELLED/COMPLETED) — COMPLETED
// is folded into "Accepted" here since there's no separate "lease finished"
// tab in this design yet.
type RequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

interface MyRequestsProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

const TABS: { label: string; value: RequestStatus | "ALL"; dot: string }[] = [
  { label: "All", value: "ALL", dot: "bg-stone-300" },
  { label: "Pending", value: "PENDING", dot: "bg-amber-400" },
  { label: "Accepted", value: "ACCEPTED", dot: "bg-emerald-400" },
  { label: "Rejected", value: "REJECTED", dot: "bg-rose-400" },
  { label: "Cancelled", value: "CANCELLED", dot: "bg-stone-300" },
];

const STATUS_BADGE: Record<RequestStatus, string> = {
  PENDING: "bg-amber-50 text-amber-600",
  ACCEPTED: "bg-emerald-50 text-emerald-600",
  REJECTED: "bg-rose-50 text-rose-600",
  CANCELLED: "bg-stone-100 text-stone-500",
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

function mapStatus(bookingStatus: Booking["status"]): RequestStatus {
  if (bookingStatus === "APPROVED" || bookingStatus === "COMPLETED") return "ACCEPTED";
  if (bookingStatus === "REJECTED") return "REJECTED";
  if (bookingStatus === "CANCELLED") return "CANCELLED";
  return "PENDING";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function roomImage(room?: Room) {
  const url = room?.roomImages?.[0]?.imageUrl;
  return url ? getImageUrl(url) || "/images/rooms/placeholder.jpg" : "/images/rooms/placeholder.jpg";
}

export default function MyRequests({ user, onLogout, onNavigate }: MyRequestsProps) {
  const [bookings, setBookings] = useState<Booking[] | undefined>(undefined); // undefined = loading
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<RequestStatus | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const loadData = () => {
    api
      .getTenantBookings()
      .then((res) => {
        if (res.success === false) throw new Error(res.message || "Couldn't load your requests.");
        setBookings(res.bookings || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your requests."));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    if (!bookings) return [];
    let rows = bookings.filter((b) => {
      const status = mapStatus(b.status);
      const matchesTab = tab === "ALL" || status === tab;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        q === "" ||
        b.room?.title.toLowerCase().includes(q) ||
        b.room?.location.toLowerCase().includes(q);
      return matchesTab && matchesQuery;
    });
    rows = [...rows].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sort === "newest" ? bTime - aTime : aTime - bTime;
    });
    return rows;
  }, [bookings, tab, query, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: bookings?.length ?? 0 };
    for (const t of TABS) {
      if (t.value === "ALL") continue;
      c[t.value] = bookings?.filter((b) => mapStatus(b.status) === t.value).length ?? 0;
    }
    return c;
  }, [bookings]);

  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  return (
    <div className="flex min-h-screen w-full bg-[#EEF1F8] text-stone-900">
      <Sidebar active="My Requests" user={user} onNavigate={handleNavigate} onSettings={() => onNavigate("settings")} onLogout={onLogout} />

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
          <div className="mb-5 pt-2">
            <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">My Requests</h1>
            <p className="mt-1 text-sm text-stone-500">Track your booking and rental requests</p>
          </div>

          {/* Tabs */}
          <div className="mb-4 -mx-4 flex items-center gap-5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 pb-2 text-sm font-medium transition-colors ${
                  tab === t.value ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                {t.label}
                <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold ${
                  tab === t.value ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-500"
                }`}>
                  {counts[t.value] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Search + Sort */}
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5">
              <Search size={15} className="shrink-0 text-stone-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by room name or area..."
                className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
            </div>
            <div className="relative shrink-0">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
                className="w-full appearance-none rounded-xl border border-stone-200 bg-white py-2.5 pl-4 pr-9 text-sm text-stone-600 outline-none sm:w-auto"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
            </div>
          </div>

          {/* Content */}
          {bookings === undefined ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-stone-400" /></div>
          ) : error ? (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-600">{error}</div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((booking) => (
                <RequestRow key={booking.id} booking={booking} onNavigate={onNavigate} onChanged={loadData} />
              ))}
              {filtered.length === 0 && <EmptyState hasAny={(bookings?.length ?? 0) > 0} onNavigate={onNavigate} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RequestRow({
  booking,
  onNavigate,
  onChanged,
}: {
  booking: Booking;
  onNavigate: (view: TenantView) => void;
  onChanged: () => void;
}) {
  const status = mapStatus(booking.status);
  const room = booking.room;
  const [cancelling, setCancelling] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [similarOpen, setSimilarOpen] = useState(false);

  async function handleCancel() {
    if (!confirm("Cancel this request?")) return;
    setCancelling(true);
    try {
      const res = await api.cancelBooking(booking.id);
      if (res.success === false) throw new Error(res.message);
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Couldn't cancel the request.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        <div className="flex gap-3 md:w-52 md:shrink-0">
          <img src={roomImage(room)} alt={room?.title} className="h-20 w-20 shrink-0 rounded-xl object-cover md:h-24 md:w-24" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-snug text-stone-900">{room?.title ?? "Room"}</h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
              <MapPin size={11} /> {room?.location}
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            <InfoField label="Requested" value={`Sent on ${formatDate(booking.createdAt)}`} />
            <InfoField label="Rent" value={`Rs. ${room?.price.toLocaleString() ?? "—"} /mo`} />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">Owner</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-stone-700">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-stone-100 text-stone-400">
                  <UserIcon size={10} />
                </span>
                <span className="truncate">{room?.landlord?.fullName ?? "—"}</span>
              </p>
            </div>
          </div>

          <StatusTimeline status={status} />
        </div>

        <div className="flex items-center justify-between gap-3 md:w-40 md:shrink-0 md:flex-col md:items-end">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[status]}`}>
            {STATUS_LABEL[status]}
          </span>

          <div className="flex flex-wrap justify-end gap-2 md:w-full md:flex-col">
            {status === "PENDING" && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 md:w-full"
              >
                {cancelling ? "Cancelling..." : "Cancel Request"}
              </button>
            )}

            {status === "ACCEPTED" && (
              <>
                <button
                  onClick={() => setPayOpen((v) => !v)}
                  className="rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-stone-800 md:w-full"
                >
                  Pay Deposit
                </button>
                <button
                  onClick={() => onNavigate("rental")}
                  className="rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 md:w-full"
                >
                  Proceed to Lease
                </button>
              </>
            )}

            {status === "REJECTED" && (
              <button
                onClick={() => setSimilarOpen((v) => !v)}
                className="rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-stone-800 md:w-full"
              >
                Find Similar Rooms
              </button>
            )}
          </div>
        </div>
      </div>

      {payOpen && (
        <PayDepositPanel bookingId={booking.id} onClose={() => setPayOpen(false)} onPaid={onChanged} />
      )}

      {similarOpen && room && (
        <SimilarRoomsPanel currentRoomId={room.id} roomType={room.roomType} city={room.city} onClose={() => setSimilarOpen(false)} />
      )}
    </div>
  );
}

function PayDepositPanel({ bookingId, onClose, onPaid }: { bookingId: number; onClose: () => void; onPaid: () => void }) {
  const [method, setMethod] = useState<"ESEWA" | "KHALTI" | "BANK" | "CASH">("CASH");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setPaying(true);
    setError(null);
    try {
      const res = await api.createPayment(bookingId, method);
      if (res.success === false) throw new Error(res.message || "Payment failed.");
      onPaid();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-stone-700">Pay Deposit</p>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={14} /></button>
      </div>
      {error && <p className="mb-2 text-xs font-medium text-rose-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as typeof method)}
          className="rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-xs text-stone-600 outline-none"
        >
          <option value="CASH">Cash</option>
        </select>
        <button
          onClick={handlePay}
          disabled={paying}
          className="rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-60"
        >
          {paying ? "Processing..." : "Confirm Payment"}
        </button>
      </div>
    </div>
  );
}

function SimilarRoomsPanel({
  currentRoomId,
  roomType,
  city,
  onClose,
}: {
  currentRoomId: number;
  roomType: string;
  city: string;
  onClose: () => void;
}) {
  const [rooms, setRooms] = useState<Room[] | undefined>(undefined);

  useEffect(() => {
    api
      .getRooms({ roomType, city, status: "AVAILABLE" })
      .then((res) => {
        const list: Room[] = res.rooms || [];
        setRooms(list.filter((r) => r.id !== currentRoomId).slice(0, 3));
      })
      .catch(() => setRooms([]));
  }, [currentRoomId, roomType, city]);

  return (
    <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-stone-700">Similar Rooms</p>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={14} /></button>
      </div>

      {rooms === undefined ? (
        <p className="text-xs text-stone-400">Loading...</p>
      ) : rooms.length === 0 ? (
        <p className="text-xs text-stone-400">No similar rooms available right now.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {rooms.map((r) => (
            <div key={r.id} className="rounded-lg border border-stone-200 bg-white p-2.5">
              <img src={roomImage(r)} alt={r.title} className="h-20 w-full rounded-md object-cover" />
              <p className="mt-2 truncate text-xs font-semibold text-stone-800">{r.title}</p>
              <p className="truncate text-[11px] text-stone-500">{r.location}, {r.city}</p>
              <p className="mt-1 text-xs font-semibold text-stone-800">Rs. {r.price.toLocaleString()}/mo</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-1 truncate text-xs font-medium text-stone-700">{value}</p>
    </div>
  );
}

function StatusTimeline({ status }: { status: RequestStatus }) {
  const step3Label = status === "ACCEPTED" ? "Accepted" : status === "REJECTED" ? "Rejected" : "Accepted/Rejected";
  const step3Color = status === "ACCEPTED" ? "bg-emerald-400" : status === "REJECTED" ? "bg-rose-400" : "bg-stone-200";
  const step3TextColor = status === "ACCEPTED" ? "text-emerald-600" : status === "REJECTED" ? "text-rose-600" : "text-stone-400";

  const steps = [
    { label: "Request Sent", barColor: "bg-stone-800", textColor: "text-stone-800" },
    { label: "Owner Reviewing", barColor: "bg-stone-800", textColor: "text-stone-800" },
    { label: step3Label, barColor: step3Color, textColor: step3TextColor },
    { label: "Lease Started", barColor: "bg-stone-200", textColor: "text-stone-400" },
  ];

  return (
    <div className="mt-4">
      <div className="flex justify-between gap-1 text-[11px] font-medium">
        {steps.map((s) => (
          <span key={s.label} className={`${s.textColor} truncate`}>{s.label}</span>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1">
        {steps.map((s, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${s.barColor}`} />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ hasAny, onNavigate }: { hasAny: boolean; onNavigate: (view: TenantView) => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
      <p className="text-sm text-stone-500">
        {hasAny ? "No requests match this filter." : "You haven't sent any requests yet."}
      </p>
      {!hasAny && (
        <button
          onClick={() => onNavigate("search")}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Find Rooms
        </button>
      )}
    </div>
  );
}
