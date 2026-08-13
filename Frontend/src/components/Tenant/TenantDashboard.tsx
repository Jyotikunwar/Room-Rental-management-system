// src/components/Tenant/TenantDashboard.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search, Heart, Clock, ClipboardList, Sparkles,
  ChevronRight, Plus, Eye, CreditCard, Phone,
  AlertTriangle, UserPlus2, MessageCircle, Loader2,
} from "lucide-react";
import type { User, DashboardStats, Booking, Favorite, Notification, RecommendationResult, Room } from "../../services/api";
import { api } from "../../services/api";
import { Sidebar, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";
import Avatar from "../Avatar";
import RoomDetailsModal from "./RoomDetailsModal";
import BookingModal from "./BookingModal";
import ProfileIncompleteModal from "./ProfileIncompleteModal";
import { formatMatchPercent, getRoomPrimaryImageUrl } from "./roomDisplayUtils";
import { getMissingTenantProfileSections } from "./tenantUtils";

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
  recommendationSource?: "cosine" | "popular";
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

function RoomThumb({ room, className }: { room?: Room | null; className?: string }) {
  const src = getRoomPrimaryImageUrl(room);
  return <img src={src} alt="" className={`object-cover ${className}`} />;
}

export default function TenantDashboard({ user, onLogout, onNavigate }: TenantDashboardProps) {
  const [data, setData] = useState<TenantDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingRoomId, setSavingRoomId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedRoomIds, setSavedRoomIds] = useState<Set<number>>(new Set());

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
  const [bookingMoveInDate, setBookingMoveInDate] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [missingSections, setMissingSections] = useState<string[]>([]);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const loadDashboard = useCallback(() => {
    setLoading(true);
    api
      .getTenantDashboard()
      .then((res: TenantDashboardResponse) => {
        if (res.success) {
          setData(res);
          setSavedRoomIds((prev) => {
            const next = new Set(prev);
            res.recentSaved?.forEach((f) => next.add(f.roomId));
            return next;
          });
        } else setError(res.message || "Failed to load dashboard");
      })
      .catch(() => setError("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const refreshRecommendations = useCallback(() => {
    api.getTenantDashboard().then((res: TenantDashboardResponse) => {
      if (!res.success || !Array.isArray(res.recommendations)) return;
      setData((prev) =>
        prev
          ? {
              ...prev,
              recommendations: res.recommendations,
              recommendationSource: res.recommendationSource,
            }
          : res
      );
    });
  }, []);

  const loadFavorites = useCallback(() => {
    api.getFavorites().then((res) => {
      const favList = Array.isArray(res) ? res : res?.favorites || res?.data || [];
      setSavedRoomIds(new Set(favList.map((f: Favorite) => f.roomId)));
    }).catch(() => {
      // non-fatal — heart state may be stale until retry
    });
  }, []);

  useEffect(() => {
    loadDashboard();
    loadFavorites();
  }, [loadDashboard, loadFavorites]);

  const displayRecommendations = useMemo(() => {
    const recs = data?.recommendations ?? [];
    return [...recs].sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));
  }, [data?.recommendations]);
  const recommendationSource = data?.recommendationSource ?? "popular";
  const hasCosineRecs = recommendationSource === "cosine";

  const findRoomById = useCallback(
    (roomId: number): Room | undefined => {
      for (const rec of displayRecommendations) {
        if (rec.room?.id === roomId) return rec.room;
      }
      const fromRecent = data?.recentSaved.find((f) => f.roomId === roomId)?.room;
      if (fromRecent) return fromRecent;
      if (data?.activeRental?.room?.id === roomId) return data.activeRental.room;
      return undefined;
    },
    [displayRecommendations, data]
  );

  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  const toggleSave = async (roomId: number) => {
    setSavingRoomId(roomId);
    setSaveError(null);
    const alreadySaved = savedRoomIds.has(roomId);

    setSavedRoomIds((prev) => {
      const next = new Set(prev);
      if (alreadySaved) next.delete(roomId);
      else next.add(roomId);
      return next;
    });

    try {
      const res = await api.toggleFavorite(roomId);
      if (res?.success === false) throw new Error(res.message || "Failed to update saved room");

      setData((prev) => {
        if (!prev) return prev;
        const savedRooms = alreadySaved
          ? Math.max(0, prev.stats.savedRooms - 1)
          : prev.stats.savedRooms + 1;

        let recentSaved = [...prev.recentSaved];
        if (alreadySaved) {
          recentSaved = recentSaved.filter((f) => f.roomId !== roomId);
        } else {
          const room = findRoomById(roomId);
          if (room) {
            recentSaved = [
              {
                id: res.favorite?.id ?? Date.now(),
                userId: user.id,
                roomId,
                createdAt: new Date().toISOString(),
                room,
              },
              ...recentSaved.filter((f) => f.roomId !== roomId),
            ].slice(0, 4);
          }
        }

        return { ...prev, recentSaved, stats: { ...prev.stats, savedRooms } };
      });

      if (!alreadySaved) {
        refreshRecommendations();
      }
    } catch {
      setSaveError("Could not update saved room. Please try again.");
      setSavedRoomIds((prev) => {
        const next = new Set(prev);
        if (alreadySaved) next.add(roomId);
        else next.delete(roomId);
        return next;
      });
    } finally {
      setSavingRoomId(null);
    }
  };

  const openDetails = (room: Room) => setSelectedRoom(room);

  const openBooking = (room: Room) => {
    const missing = getMissingTenantProfileSections(user);
    if (missing.length > 0) {
      setMissingSections(missing);
      setProfileModalOpen(true);
      return;
    }
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
    } catch {
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
        <div className="mb-6 flex items-center gap-3 pl-12 sm:pl-0">
          <Avatar name={user.fullName ?? "U"} avatarUrl={(user as { avatarUrl?: string }).avatarUrl} size={44} />
          <div>
            <h1 className="text-xl font-semibold">Namaste, {firstName} 👋</h1>
            <p className="text-sm text-stone-500">Find your next sanctuary in the heart of the city.</p>
          </div>
        </div>

        <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
              <Sparkles size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-blue-700">Personalized Recommendations</p>
              <p className="text-xs text-stone-500">
                {hasCosineRecs
                  ? "Rooms matched to your saved favorites using cosine similarity."
                  : "Popular rooms ranked by ratings and favorites — save one to unlock personalized matches."}
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

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            onClick={() => onNavigate("search")}
            className="flex flex-col rounded-2xl border border-stone-200 bg-white p-4 text-left transition-all hover:border-blue-500 hover:shadow-sm active:scale-[0.98]"
          >
            <div className="mb-2 flex items-center gap-2 text-blue-600"><Search size={14} /><span className="text-xs font-medium">Active</span></div>
            <p className="text-xs text-stone-400">Search Rooms</p>
            <p className="text-lg font-semibold text-stone-900">{stats.availableRooms} available rooms</p>
          </button>

          <button
            onClick={() => onNavigate("saved")}
            className="flex flex-col rounded-2xl border border-stone-200 bg-white p-4 text-left transition-all hover:border-rose-500 hover:shadow-sm active:scale-[0.98]"
          >
            <div className="mb-2 flex items-center gap-2 text-rose-500"><Heart size={14} /><span className="text-xs font-medium">Favorites</span></div>
            <p className="text-xs text-stone-400">Saved Rooms</p>
            <p className="text-lg font-semibold text-stone-900">{stats.savedRooms}</p>
          </button>

          <button
            onClick={() => onNavigate("payments")}
            className="flex flex-col rounded-2xl border border-stone-200 bg-white p-4 text-left transition-all hover:border-amber-500 hover:shadow-sm active:scale-[0.98]"
          >
            <div className="mb-2 flex items-center gap-2 text-amber-500"><Clock size={14} /><span className="text-xs font-medium">Upcoming</span></div>
            <p className="text-xs text-stone-400">Rent Due In</p>
            <p className="text-lg font-semibold text-amber-600">
              {stats.rentDueInDays !== null ? `${stats.rentDueInDays} days` : "—"}
            </p>
          </button>

          <button
            onClick={() => onNavigate("requests")}
            className="flex flex-col rounded-2xl border border-stone-200 bg-white p-4 text-left transition-all hover:border-stone-500 hover:shadow-sm active:scale-[0.98]"
          >
            <div className="mb-2 flex items-center gap-2 text-stone-500"><ClipboardList size={14} /><span className="text-xs font-medium">Reviewing</span></div>
            <p className="text-xs text-stone-400">Pending Requests</p>
            <p className="text-lg font-semibold text-stone-900">{stats.pendingRequests}</p>
          </button>
        </div>

        {activeRental?.room && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Current Rental</h2>
              <button onClick={() => onNavigate("rental")} className="text-xs font-medium text-blue-600 hover:underline">Manage Lease</button>
            </div>
            <div className="mb-2 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 sm:mb-6 sm:gap-4 sm:p-4">
              <RoomThumb room={activeRental.room} className="h-20 w-20 shrink-0 rounded-xl sm:h-24 sm:w-28" />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold">{activeRental.room.title}</h3>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600">
                    {activeRental.status}
                  </span>
                </div>
                <p className="truncate text-xs text-stone-500">
                  {activeRental.room.location}{activeRental.room.city ? `, ${activeRental.room.city}` : ""}
                </p>
                <p className="mt-1 text-sm font-semibold text-stone-800">
                  Rs. {activeRental.room.price?.toLocaleString()}<span className="text-xs font-normal text-stone-400">/month</span>
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${stats.leaseProgress}%` }} />
                  </div>
                  <span className="shrink-0 text-[11px] text-stone-400">{stats.leaseProgress}% lease</span>
                </div>
              </div>
              <div className="hidden shrink-0 flex-col gap-2 sm:flex">
                <button onClick={() => onNavigate("payments")} className="rounded-lg bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-stone-800">Pay Now</button>
                <button onClick={() => openDetails(activeRental.room!)} className="rounded-lg border border-stone-200 px-4 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">Details</button>
              </div>
            </div>
            <div className="mb-6 flex gap-2 sm:hidden">
              <button onClick={() => onNavigate("payments")} className="flex-1 rounded-lg bg-stone-900 py-2 text-xs font-medium text-white hover:bg-stone-800">Pay Now</button>
              <button onClick={() => openDetails(activeRental.room!)} className="flex-1 rounded-lg border border-stone-200 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50">Details</button>
            </div>
          </>
        )}

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

        {saveError && (
          <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {saveError}
          </div>
        )}

        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Recommended Rooms</h2>
            <p className="text-xs text-stone-400">
              {hasCosineRecs ? "Based on rooms you've saved" : "Most popular rooms right now"}
            </p>
          </div>
          <button
            onClick={() => onNavigate("search")}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 hover:underline"
          >
            View All <ChevronRight size={14} />
          </button>
        </div>

        {displayRecommendations.length === 0 ? (
          <div className="mb-8 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
            <p className="text-sm text-stone-400">
              No rooms to recommend right now.
            </p>
            <button
              type="button"
              onClick={() => onNavigate("search")}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500"
            >
              Browse All Rooms
            </button>
          </div>
        ) : (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayRecommendations.map((item) => {
              const room = item.room;
              if (!room?.id) return null;
              const match = formatMatchPercent(item, recommendationSource);
              const isSaved = savedRoomIds.has(room.id);

              return (
                <div key={room.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs transition-shadow hover:shadow-md">
                  <div className="relative">
                    <RoomThumb room={room} className="h-36 w-full object-cover" />
                    <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs ${
                      match.hasScore ? "bg-stone-900/85" : "bg-blue-600/85"
                    }`}>
                      {match.hasScore ? `⚡ ${match.text}` : match.text}
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
                        type="button"
                        onClick={() => toggleSave(room.id)}
                        disabled={savingRoomId === room.id}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-transform active:scale-[0.9] disabled:opacity-50 ${
                          isSaved ? "border-rose-200 bg-rose-50 text-rose-500" : "border-stone-200 text-stone-400 hover:text-rose-500"
                        }`}
                        aria-label={isSaved ? "Remove from saved" : "Save room"}
                        title={isSaved ? "Saved" : "Save room"}
                      >
                        {savingRoomId === room.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Heart size={14} fill={isSaved ? "currentColor" : "none"} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openDetails(room)}
                        className="flex-1 rounded-lg border border-stone-200 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 active:scale-[0.97]"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
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
                <button
                  key={fav.id}
                  type="button"
                  onClick={() => fav.room && openDetails(fav.room)}
                  className={`flex w-full items-center gap-3 text-left transition-colors hover:bg-stone-50 ${i !== 0 ? "border-t border-stone-100 pt-3" : ""}`}
                >
                  <RoomThumb room={fav.room} className="h-12 w-12 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-800">{fav.room?.title}</p>
                    <p className="text-xs text-blue-600">Rs. {fav.room?.price?.toLocaleString()}/month</p>
                    <p className="text-[11px] text-stone-400">Saved {timeAgo(fav.createdAt)}</p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-stone-300" />
                </button>
              ))}
              <button onClick={() => onNavigate("saved")} className="mt-1 rounded-lg border border-stone-200 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 active:scale-[0.97]">
                See All Saved Rooms
              </button>
            </div>
          </div>
        </div>
      </main>

      {selectedRoom && (
        <RoomDetailsModal
          room={selectedRoom}
          isSaved={savedRoomIds.has(selectedRoom.id)}
          onToggleSave={() => toggleSave(selectedRoom.id)}
          onClose={() => setSelectedRoom(null)}
          onBookNow={() => openBooking(selectedRoom)}
        />
      )}

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

      {/* ---- Profile Incomplete Redirect Modal ---- */}
      {profileModalOpen && (
        <ProfileIncompleteModal
          missingSections={missingSections}
          onClose={() => setProfileModalOpen(false)}
          onGoToSettings={() => {
            setProfileModalOpen(false);
            onNavigate("settings");
          }}
        />
      )}
    </div>
  );
}
