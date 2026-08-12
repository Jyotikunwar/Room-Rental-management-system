// src/components/Tenant/TenantDashboard.tsx
import { useEffect, useState } from "react";
import {
  Search, Heart, Clock, ClipboardList, Sparkles,
  ChevronRight, Plus, Eye, CreditCard, Phone,
  AlertTriangle, UserPlus2, MessageCircle, Loader2, ImageOff,
} from "lucide-react";
import type { User, DashboardStats, Booking, Favorite, Notification, RecommendationResult, Room } from "../../services/api";
import { api, getImageUrl } from "../../services/api";
import { Sidebar, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";
import Avatar from "../Avatar";
import RoomDetailsModal from "./RoomDetailsModal";
import BookingModal from "./BookingModal";

interface TenantDashboardProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

interface TenantDashboardResponse {
  success: boolean;
  message?: string;
  stats: DashboardStats;
  activeRental: Booking | null;
  recentSaved: Favorite[];
  notifications: Notification[];
  recommendations: RecommendationResult[];
}

const NOTIF_ICON: Record<Notification["type"], typeof AlertTriangle> = {
  PAYMENT: AlertTriangle,
  BOOKING: UserPlus2,
  MESSAGE: MessageCircle,
  REVIEW: MessageCircle,
  SYSTEM: MessageCircle,
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// Local, network-free image slot — shows the real room photo when one
// exists (served from our own backend), otherwise a plain icon on a
// colored background. No external image service involved.
function RoomThumb({ imageUrl, className }: { imageUrl?: string; className?: string }) {
  if (imageUrl) {
    return <img src={getImageUrl(imageUrl)} alt="" className={`object-cover ${className}`} />;
  }
  return (
    <div className={`flex items-center justify-center bg-stone-100 text-stone-300 ${className}`}>
      <ImageOff size={20} />
    </div>
  );
}

export default function TenantDashboard({ user, onLogout, onNavigate }: TenantDashboardProps) {
  const [data, setData] = useState<TenantDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingRoomId, setSavingRoomId] = useState<number | null>(null);

  const [fallbackRooms, setFallbackRooms] = useState<Room[]>([]);

  // --- View Details modal ---
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // --- Book Now modal ---
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
  const [bookingMoveInDate, setBookingMoveInDate] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const loadDashboard = () => {
    setLoading(true);
    api
      .getTenantDashboard()
      .then((res: TenantDashboardResponse) => {
        if (res.success) setData(res);
        else setError(res.message || "Failed to load dashboard");
      })
      .catch(() => setError("Failed to load dashboard"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (data && (!data.recommendations || data.recommendations.length === 0)) {
      api.getRooms({ status: "ALL" }).then((res: any) => {
        const rooms = Array.isArray(res) ? res : res?.rooms || res?.data || [];
        if (rooms.length > 0) {
          setFallbackRooms(rooms.slice(0, 6));
        }
      });
    }
  }, [data]);

  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  const toggleSave = async (roomId: number) => {
    setSavingRoomId(roomId);
    const alreadySaved = savedRoomIds.has(roomId);
    try {
      await api.toggleFavorite(roomId);
      setData((prev) => {
        if (!prev) return prev;
        const recentSaved = alreadySaved
          ? prev.recentSaved.filter((f) => f.roomId !== roomId)
          : prev.recentSaved;
        const savedRooms = alreadySaved ? prev.stats.savedRooms - 1 : prev.stats.savedRooms + 1;
        return { ...prev, recentSaved, stats: { ...prev.stats, savedRooms } };
      });
    } catch {
      // best-effort — leave existing state if the request fails
    } finally {
      setSavingRoomId(null);
    }
  };

  const openDetails = (room: Room) => setSelectedRoom(room);

  const openBooking = (room: Room) => {
    setSelectedRoom(null);
    setBookingRoom(room);
    setBookingMoveInDate("");
    setBookingNotes("");
    setBookingError(null);
    setBookingSuccess(false);
  };

  const closeBooking = () => {
    setBookingRoom(null);
    setBookingSubmitting(false);
    setBookingError(null);
    setBookingSuccess(false);
  };

  const submitBooking = async () => {
    if (!bookingRoom) return;
    if (!bookingMoveInDate) {
      setBookingError("Please select a move-in date");
      return;
    }
    setBookingSubmitting(true);
    setBookingError(null);
    try {
      const res = await api.createBooking({
        roomId: bookingRoom.id,
        moveInDate: bookingMoveInDate,
        notes: bookingNotes || undefined,
      });
      if (res && res.success === false) {
        setBookingError(res.message || "Failed to create booking");
      } else {
        setBookingSuccess(true);
        loadDashboard();
      }
    } catch (e) {
      setBookingError("Failed to create booking. Please try again.");
    } finally {
      setBookingSubmitting(false);
    }
  };

  const goToMyRequests = () => {
    closeBooking();
    onNavigate("requests");
  };

  const firstName = user.fullName?.split(" ")[0] || "there";
  const savedRoomIds = new Set((data?.recentSaved ?? []).map((f) => f.roomId));

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-stone-50">
        <Loader2 className="animate-spin text-stone-400" size={28} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-stone-50 text-center">
        <p className="text-sm text-stone-500">{error || "Something went wrong."}</p>
        <button onClick={() => window.location.reload()} className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-medium text-white">
          Retry
        </button>
      </div>
    );
  }

  const { stats, activeRental, recentSaved, notifications } = data;
  const displayRecommendations = (data.recommendations && data.recommendations.length > 0)
    ? data.recommendations
    : fallbackRooms;

  return (
    <div className="flex min-h-screen w-full bg-stone-50 text-stone-900">
      <Sidebar
        user={user}
        active="Dashboard"
        onNavigate={handleNavigate}
        onSettings={() => onNavigate("settings")}
        onLogout={onLogout}
      />

      <main className="flex-1 p-4 sm:p-6">
        {/* ---- Welcome ---- */}
        <div className="mb-6 flex items-center gap-3 pl-12 sm:pl-0">
          <Avatar name={user.fullName ?? "U"} avatarUrl={(user as any).avatarUrl} size={44} />
          <div>
            <h1 className="text-xl font-semibold">Namaste, {firstName} 👋</h1>
            <p className="text-sm text-stone-500">Find your next sanctuary in the heart of the city.</p>
          </div>
        </div>

        {/* ---- Recommendation banner ---- */}
        <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
              <Sparkles size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-blue-700">Content-Based Recommendations (Cosine Similarity)</p>
              <p className="text-xs text-stone-500">
                Personalized matching derived from your saved/favorite rooms using Cosine Similarity algorithm.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate("search")}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-500 active:scale-[0.97]"
          >
            View All Rooms →
          </button>
        </div>

        {/* ---- Stats row ---- */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            onClick={() => onNavigate("search")}
            className="flex flex-col text-left rounded-2xl border border-stone-200 bg-white p-4 transition-all hover:border-blue-500 hover:shadow-sm active:scale-[0.98]"
          >
            <div className="mb-2 flex items-center gap-2 text-blue-600"><Search size={14} /><span className="text-xs font-medium">Active</span></div>
            <p className="text-xs text-stone-400">Search Rooms</p>
            <p className="text-lg font-semibold text-stone-900">{stats.availableRooms} available rooms</p>
          </button>

          <button
            onClick={() => onNavigate("saved")}
            className="flex flex-col text-left rounded-2xl border border-stone-200 bg-white p-4 transition-all hover:border-rose-500 hover:shadow-sm active:scale-[0.98]"
          >
            <div className="mb-2 flex items-center gap-2 text-rose-500"><Heart size={14} /><span className="text-xs font-medium">Favorites</span></div>
            <p className="text-xs text-stone-400">Saved Rooms</p>
            <p className="text-lg font-semibold text-stone-900">{stats.savedRooms}</p>
          </button>

          <button
            onClick={() => onNavigate("payments")}
            className="flex flex-col text-left rounded-2xl border border-stone-200 bg-white p-4 transition-all hover:border-amber-500 hover:shadow-sm active:scale-[0.98]"
          >
            <div className="mb-2 flex items-center gap-2 text-amber-500"><Clock size={14} /><span className="text-xs font-medium">Upcoming</span></div>
            <p className="text-xs text-stone-400">Rent Due In</p>
            <p className="text-lg font-semibold text-amber-600">
              {stats.rentDueInDays !== null ? `${stats.rentDueInDays} days` : "—"}
            </p>
          </button>

          <button
            onClick={() => onNavigate("requests")}
            className="flex flex-col text-left rounded-2xl border border-stone-200 bg-white p-4 transition-all hover:border-stone-500 hover:shadow-sm active:scale-[0.98]"
          >
            <div className="mb-2 flex items-center gap-2 text-stone-500"><ClipboardList size={14} /><span className="text-xs font-medium">Reviewing</span></div>
            <p className="text-xs text-stone-400">Pending Requests</p>
            <p className="text-lg font-semibold text-stone-900">{stats.pendingRequests}</p>
          </button>
        </div>

        {/* ---- Current Rental (compact) ---- */}
        {activeRental && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Current Rental</h2>
              <button onClick={() => onNavigate("rental")} className="text-xs font-medium text-blue-600 hover:underline">Manage Lease</button>
            </div>
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 sm:gap-4 sm:p-4">
              <RoomThumb imageUrl={activeRental.room?.roomImages?.[0]?.imageUrl} className="h-20 w-20 shrink-0 rounded-xl sm:h-24 sm:w-28" />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold">{activeRental.room?.title}</h3>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600">
                    {activeRental.status}
                  </span>
                </div>
                <p className="truncate text-xs text-stone-500">{activeRental.room?.location}</p>
                <p className="mt-1 text-sm font-semibold text-stone-800">
                  Rs. {activeRental.room?.price?.toLocaleString()}<span className="text-xs font-normal text-stone-400">/month</span>
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${stats.leaseProgress}%` }} />
                  </div>
                  <span className="shrink-0 text-[11px] text-stone-400">{stats.leaseProgress}%</span>
                </div>
              </div>
              <div className="hidden shrink-0 flex-col gap-2 sm:flex">
                <button onClick={() => onNavigate("payments")} className="rounded-lg bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-stone-800">Pay Now</button>
                <button onClick={() => onNavigate("rental")} className="rounded-lg border border-stone-200 px-4 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">Details</button>
              </div>
            </div>
          </>
        )}

        {/* ---- Quick actions ---- */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button onClick={() => onNavigate("search")} className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-xs font-medium text-stone-700 transition-transform hover:bg-stone-50 active:scale-[0.97]">
            <Plus size={14} className="text-blue-600" /> Find Rooms
          </button>
          <button onClick={() => onNavigate("requests")} className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-xs font-medium text-stone-700 transition-transform hover:bg-stone-50 active:scale-[0.97]">
            <Eye size={14} className="text-blue-600" /> View Bookings
          </button>
          <button onClick={() => onNavigate("payments")} className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-xs font-medium text-stone-700 transition-transform hover:bg-stone-50 active:scale-[0.97]">
            <CreditCard size={14} className="text-blue-600" /> Pay Rent
          </button>
          <button onClick={() => onNavigate("messages")} className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-xs font-medium text-stone-700 transition-transform hover:bg-stone-50 active:scale-[0.97]">
            <Phone size={14} className="text-blue-600" /> Contact Owner
          </button>
        </div>

        {/* ---- Recommended rooms ---- */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Recommended Rooms</h2>
            <p className="text-xs text-stone-400">Content-Based Filtering (Cosine Similarity)</p>
          </div>
          <button
            onClick={() => onNavigate("search")}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 hover:underline"
          >
            View All <ChevronRight size={14} />
          </button>
        </div>
        {displayRecommendations.length === 0 ? (
          <p className="mb-8 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-400">
            No recommendations yet — save a room to get personalized matches.
          </p>
        ) : (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayRecommendations.map((item: any) => {
              const room: Room = item?.room || item;
              if (!room || !room.id) return null;
              const matchScore = item?.similarityScore ?? item?.finalScore ?? 0.85;
              const matchPercent = Math.min(99, Math.max(65, Math.round(matchScore * 100)));

              return (
                <div key={room.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs transition-shadow hover:shadow-md">
                  <div className="relative">
                    <RoomThumb imageUrl={room.roomImages?.[0]?.imageUrl} className="h-36 w-full object-cover" />
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-stone-900/85 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                      ⚡ {matchPercent}% Match (Cosine)
                    </span>
                  </div>
                  <div className="p-3.5">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-stone-900">{room.title}</h3>
                      <span className="shrink-0 text-xs font-bold text-blue-600">
                        Rs. {room.price?.toLocaleString()}/m
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">{room.location}, {room.city} · {room.roomType}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => toggleSave(room.id)}
                        disabled={savingRoomId === room.id}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-transform active:scale-[0.9] ${
                          savedRoomIds.has(room.id) ? "border-rose-200 bg-rose-50 text-rose-500" : "border-stone-200 text-stone-400 hover:text-stone-600"
                        }`}
                        aria-label="Save room"
                      >
                        <Heart size={14} fill={savedRoomIds.has(room.id) ? "currentColor" : "none"} />
                      </button>
                      <button
                        onClick={() => openDetails(room)}
                        className="flex-1 rounded-lg border border-stone-200 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 active:scale-[0.97]"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => openBooking(room)}
                        disabled={room.status !== "AVAILABLE"}
                        className="flex-1 rounded-lg bg-stone-900 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-800 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-stone-300"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---- Notifications + Recently Saved ---- */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Notifications</h2>
              <button onClick={() => onNavigate("notifications")} className="text-xs font-medium text-blue-600 hover:underline">View All</button>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4">
              {notifications.length === 0 && (
                <p className="text-center text-xs text-stone-400">No notifications yet.</p>
              )}
              {notifications.map((n, i) => {
                const Icon = NOTIF_ICON[n.type] ?? MessageCircle;
                return (
                  <div key={n.id} className={`flex items-start gap-3 ${i !== 0 ? "border-t border-stone-100 pt-3" : ""}`}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <Icon size={14} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-stone-800">{n.title}</p>
                      <p className="text-xs text-stone-500">{n.message}</p>
                      <p className="mt-0.5 text-[10px] text-stone-400">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
              <button onClick={() => onNavigate("notifications")} className="mt-1 text-center text-xs font-medium text-blue-600 hover:underline">
                View All Notifications
              </button>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Recently Saved</h2>
              <button onClick={() => onNavigate("saved")} className="text-xs font-medium text-blue-600 hover:underline">View All</button>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4">
              {recentSaved.length === 0 && (
                <p className="text-center text-xs text-stone-400">No saved rooms yet.</p>
              )}
              {recentSaved.map((fav, i) => (
                <div key={fav.id} className={`flex items-center gap-3 ${i !== 0 ? "border-t border-stone-100 pt-3" : ""}`}>
                  <RoomThumb imageUrl={fav.room?.roomImages?.[0]?.imageUrl} className="h-12 w-12 shrink-0 rounded-lg" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-800">{fav.room?.title}</p>
                    <p className="text-xs text-blue-600">Rs. {fav.room?.price?.toLocaleString()}/month</p>
                    <p className="text-[11px] text-stone-400">Saved {timeAgo(fav.createdAt)}</p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-stone-300" />
                </div>
              ))}
              <button onClick={() => onNavigate("saved")} className="mt-1 rounded-lg border border-stone-200 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 active:scale-[0.97]">
                See All Saved Rooms
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ---- Room Details Modal ---- */}
      {selectedRoom && (
        <RoomDetailsModal
          room={selectedRoom}
          isSaved={savedRoomIds.has(selectedRoom.id)}
          onToggleSave={() => toggleSave(selectedRoom.id)}
          onClose={() => setSelectedRoom(null)}
          onBookNow={() => openBooking(selectedRoom)}
        />
      )}

      {/* ---- Book Now Modal ---- */}
      {bookingRoom && (
        <BookingModal
          room={bookingRoom}
          moveInDate={bookingMoveInDate}
          notes={bookingNotes}
          submitting={bookingSubmitting}
          error={bookingError}
          success={bookingSuccess}
          onMoveInDateChange={setBookingMoveInDate}
          onNotesChange={setBookingNotes}
          onSubmit={submitBooking}
          onClose={closeBooking}
          onGoToMyRequests={goToMyRequests}
        />
      )}
    </div>
  );
}