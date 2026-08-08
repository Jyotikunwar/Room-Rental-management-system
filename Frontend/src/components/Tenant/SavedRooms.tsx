import { useEffect, useMemo, useState } from "react";
import {
  Search, Heart, MapPin, ChevronDown, Filter, Check, X, Star,
  Calendar, Phone, Mail, Loader2, Send,
} from "lucide-react";
import type { User, Room } from "../../services/api";
import { api } from "../../services/api";
import { Sidebar, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";
import Avatar from "../Avatar";
interface SavedRoomsProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

interface FavoriteEntry {
  id: number;
  roomId: number;
  createdAt: string;
  room: Room;
}

// Images uploaded through the app are served by the backend from /uploads/...
// Static assets placed in Frontend/public (e.g. /images/rooms/Room1.png) are
// served by the frontend's own origin and must NOT be prefixed.
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:5000";

function resolveImageUrl(url?: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/uploads/")) return `${API_BASE_URL}${url}`;
  return url;
}

function avgRating(room: Room): number | null {
  if (!room.reviews || room.reviews.length === 0) return null;
  const sum = room.reviews.reduce((s, r) => s + r.rating, 0);
  return Math.round((sum / room.reviews.length) * 10) / 10;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Saved today";
  if (days === 1) return "Saved 1 day ago";
  if (days < 7) return `Saved ${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "Saved 1 week ago" : `Saved ${weeks} weeks ago`;
}

const SORT_OPTIONS = [
  { value: "recent", label: "Recently Saved" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export default function SavedRooms({ user, onLogout, onNavigate }: SavedRoomsProps) {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const [query, setQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState<SortValue>("recent");
  const [sortOpen, setSortOpen] = useState(false);

  // ---- Details modal ----
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // ---- Booking modal ----
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
  const [moveInDate, setMoveInDate] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // ---- Contact owner modal ----
  const [contactRoom, setContactRoom] = useState<Room | null>(null);
  const [contactMessage, setContactMessage] = useState("");
  const [contactSending, setContactSending] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSent, setContactSent] = useState(false);

  const loadFavorites = () => {
    setLoading(true);
    setError(null);
    api
      .getFavorites()
      .then((res) => {
        if (res && res.success === false) {
          setError(res.message || "Failed to load saved rooms");
          return;
        }
        const list = Array.isArray(res) ? res : res?.favorites || res?.data || [];
        setFavorites(list);
      })
      .catch(() => setError("Failed to load saved rooms"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const removeFavorite = async (roomId: number, favoriteId: number) => {
    setRemovingId(favoriteId);
    const prev = favorites;
    setFavorites((f) => f.filter((x) => x.id !== favoriteId));
    try {
      const res = await api.toggleFavorite(roomId);
      if (res && res.success === false) setFavorites(prev);
    } catch {
      setFavorites(prev);
    } finally {
      setRemovingId(null);
    }
  };

  const clearAll = async () => {
    const prev = favorites;
    setFavorites([]);
    try {
      await Promise.all(prev.map((f) => api.toggleFavorite(f.roomId)));
    } catch {
      setFavorites(prev);
    }
  };

  const openDetails = (room: Room) => setSelectedRoom(room);

  const openBooking = (room: Room) => {
    setSelectedRoom(null);
    setBookingRoom(room);
    setMoveInDate("");
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
    if (!moveInDate) {
      setBookingError("Please select a move-in date");
      return;
    }
    setBookingSubmitting(true);
    setBookingError(null);
    try {
      const res = await api.createBooking({
        roomId: bookingRoom.id,
        moveInDate,
        notes: bookingNotes || undefined,
      });
      if (res && res.success === false) setBookingError(res.message || "Failed to create booking");
      else setBookingSuccess(true);
    } catch {
      setBookingError("Failed to create booking. Please try again.");
    } finally {
      setBookingSubmitting(false);
    }
  };

  const goToMyRequests = () => {
    closeBooking();
    onNavigate(NAV_LABEL_TO_VIEW["My Requests"]);
  };

  const openContact = (room: Room) => {
    setSelectedRoom(null);
    setContactRoom(room);
    setContactMessage("");
    setContactError(null);
    setContactSent(false);
  };

  const closeContact = () => {
    setContactRoom(null);
    setContactSending(false);
    setContactError(null);
    setContactSent(false);
  };

  const sendContactMessage = async () => {
    if (!contactRoom) return;
    if (!contactMessage.trim()) {
      setContactError("Please write a message");
      return;
    }
    setContactSending(true);
    setContactError(null);
    try {
      const res = await api.sendInquiry(contactRoom.id, contactMessage.trim());
      if (res && res.success === false) setContactError(res.message || "Failed to send message");
      else setContactSent(true);
    } catch {
      setContactError("Failed to send message. Please try again.");
    } finally {
      setContactSending(false);
    }
  };

  const filtered = useMemo(() => {
    let list = favorites.filter((f) => {
      const r = f.room;
      const matchesQuery =
        query.trim() === "" ||
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.location.toLowerCase().includes(query.toLowerCase()) ||
        r.city.toLowerCase().includes(query.toLowerCase());
      const matchesAvailable = !availableOnly || r.status === "AVAILABLE";
      return matchesQuery && matchesAvailable;
    });
    if (sort === "price-low") list = [...list].sort((a, b) => a.room.price - b.room.price);
    if (sort === "price-high") list = [...list].sort((a, b) => b.room.price - a.room.price);
    if (sort === "recent") list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [favorites, query, availableOnly, sort]);

  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Sort";

  return (
    <div className="flex min-h-screen w-full bg-stone-50 text-stone-900">
      <Sidebar
        user={user}
        active="Saved Rooms"
        onNavigate={handleNavigate}
        onSettings={() => onNavigate("settings")}
        onLogout={onLogout}
      />

      <main className="flex-1 p-4 sm:p-6">
        {/* ---- Top bar ---- */}
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 pl-14 sm:pl-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
            <Search size={16} className="shrink-0 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search saved items..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
            />
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onNavigate("notifications")} className="relative text-stone-500 hover:text-stone-700">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500" />
            </button>
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-stone-200">
             <Avatar name={user.fullName ?? "U"} avatarUrl={(user as any).avatarUrl} size={32} />
            </div>
          </div>
        </div>

        {/* ---- Header ---- */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Saved Rooms ({favorites.length})</h1>
            <p className="text-sm text-stone-500">Manage your favorite listings</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setSortOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
              >
                Sort by: <span className="text-stone-800">{sortLabel}</span>
                <ChevronDown size={13} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full z-10 mt-1 w-48 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSort(opt.value);
                        setSortOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-stone-50 ${
                        sort === opt.value ? "font-medium text-blue-600" : "text-stone-600"
                      }`}
                    >
                      {opt.label}
                      {sort === opt.value && <Check size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {favorites.length > 0 && (
              <button onClick={clearAll} className="text-xs font-medium text-rose-500 hover:underline">
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* ---- Filters row ---- */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
            <Filter size={14} className="shrink-0 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by location..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-stone-600">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={() => setAvailableOnly((v) => !v)}
              className="h-3.5 w-3.5 accent-blue-600"
            />
            Available Only
          </label>
        </div>

        {/* ---- Room cards ---- */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-stone-400" size={26} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white p-14 text-center">
            <p className="text-sm text-stone-500">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white p-14 text-center">
            <Heart size={22} className="text-stone-300" />
            <p className="text-sm font-medium text-stone-600">No saved rooms yet</p>
            <p className="text-xs text-stone-400">Rooms you save while browsing will show up here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((f) => {
              const room = f.room;
              const rating = avgRating(room);
              return (
                <div key={f.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                  {/* Image */}
                  <button onClick={() => openDetails(room)} className="relative block h-40 w-full bg-stone-100">
                    {room.roomImages && room.roomImages.length > 0 ? (
                      <img
                        src={resolveImageUrl(room.roomImages[0].imageUrl)}
                        alt={room.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-stone-400">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        <span className="text-xs">No image</span>
                      </div>
                    )}

                    <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
                      {room.status === "AVAILABLE" && (
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Available
                        </span>
                      )}
                      {room.status === "BOOKED" && (
                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Already Booked
                        </span>
                      )}
                      {room.status === "UNDER_MAINTENANCE" && (
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Under Maintenance
                        </span>
                      )}
                    </div>

                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite(room.id, f.id);
                      }}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow-sm hover:bg-white"
                    >
                      {removingId === f.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Heart size={14} fill="currentColor" />
                      )}
                    </span>
                  </button>

                  {/* Body */}
                  <div className="p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold">{room.title}</h3>
                      {rating !== null && (
                        <span className="flex shrink-0 items-center gap-0.5 text-xs text-amber-500">
                          <Star size={12} fill="currentColor" /> {rating}
                        </span>
                      )}
                    </div>
                    <p className="mb-1.5 flex items-center gap-1 text-xs text-stone-500">
                      <MapPin size={11} /> {room.location}, {room.city}
                    </p>
                    <p className="text-sm font-semibold text-blue-700">
                      Rs. {room.price.toLocaleString()}
                      <span className="text-xs font-normal text-stone-400">/month</span>
                    </p>

                    <div className="mt-2 flex items-center gap-3 text-[11px] text-stone-500">
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
                        </svg>
                        {room.roomType}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-stone-500">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      {timeAgo(f.createdAt)}
                    </div>

                    <div className="mt-3 flex flex-col gap-2">
                      {room.status !== "AVAILABLE" ? (
                        <button disabled className="rounded-lg bg-stone-100 py-1.5 text-xs font-medium text-stone-400">
                          {room.status === "BOOKED" ? "Already Booked" : "Unavailable"}
                        </button>
                      ) : (
                        <button
                          onClick={() => openBooking(room)}
                          className="rounded-lg bg-stone-900 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
                        >
                          Book Now
                        </button>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDetails(room)}
                          className="flex-1 rounded-lg border border-stone-200 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => openContact(room)}
                          className="flex-1 rounded-lg border border-blue-200 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                        >
                          Contact Owner
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ---- Room Details Modal ---- */}
      {selectedRoom && (
        <RoomDetailsModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onBookNow={() => openBooking(selectedRoom)}
          onContactOwner={() => openContact(selectedRoom)}
        />
      )}

      {/* ---- Booking Modal ---- */}
      {bookingRoom && (
        <BookingModal
          room={bookingRoom}
          moveInDate={moveInDate}
          notes={bookingNotes}
          submitting={bookingSubmitting}
          error={bookingError}
          success={bookingSuccess}
          onMoveInDateChange={setMoveInDate}
          onNotesChange={setBookingNotes}
          onSubmit={submitBooking}
          onClose={closeBooking}
          onGoToMyRequests={goToMyRequests}
        />
      )}

      {/* ---- Contact Owner Modal ---- */}
      {contactRoom && (
        <ContactOwnerModal
          room={contactRoom}
          message={contactMessage}
          sending={contactSending}
          error={contactError}
          sent={contactSent}
          onMessageChange={setContactMessage}
          onSend={sendContactMessage}
          onClose={closeContact}
        />
      )}
    </div>
  );
}

function RoomDetailsModal({
  room,
  onClose,
  onBookNow,
  onContactOwner,
}: {
  room: Room;
  onClose: () => void;
  onBookNow: () => void;
  onContactOwner: () => void;
}) {
  const rating = avgRating(room);
  const images = room.roomImages && room.roomImages.length > 0 ? room.roomImages : [];
  const amenityNames = (room.roomAmenities || []).map((ra) => ra.amenity.name);
  const [activeImage, setActiveImage] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white sm:max-w-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <span className="text-sm font-semibold">Room Details</span>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-700">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="relative h-56 w-full bg-stone-100 sm:h-72">
            {images.length > 0 ? (
              <img
                src={resolveImageUrl(images[activeImage]?.imageUrl)}
                alt={room.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-stone-400">No images</div>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {images.map((img, i) => (
                <button
                  key={img.id ?? i}
                  onClick={() => setActiveImage(i)}
                  className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                    activeImage === i ? "border-blue-600" : "border-transparent"
                  }`}
                >
                  <img src={resolveImageUrl(img.imageUrl)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="p-4">
            <div className="mb-1 flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold">{room.title}</h2>
              {rating !== null && (
                <span className="flex shrink-0 items-center gap-0.5 text-sm text-amber-500">
                  <Star size={14} fill="currentColor" /> {rating}
                </span>
              )}
            </div>
            <p className="mb-3 flex items-center gap-1 text-sm text-stone-500">
              <MapPin size={13} /> {room.location}, {room.city}
            </p>
            <p className="mb-4 text-xl font-bold text-blue-700">
              Rs. {room.price.toLocaleString()}/month
            </p>

            {room.description && <p className="mb-4 text-sm text-stone-600">{room.description}</p>}

            {amenityNames.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-stone-500">Amenities</p>
                <div className="flex flex-wrap gap-1.5">
                  {amenityNames.map((a) => (
                    <span key={a} className="rounded-md bg-stone-100 px-2.5 py-1 text-xs text-stone-600">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {room.landlord && (
              <div className="mb-4 rounded-xl border border-stone-200 p-3">
                <p className="mb-1 text-xs font-medium text-stone-500">Landlord</p>
                <p className="text-sm font-semibold">{room.landlord.fullName}</p>
                <div className="mt-1 flex flex-col gap-1 text-xs text-stone-500">
                  {room.landlord.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={11} /> {room.landlord.phone}
                    </span>
                  )}
                  {room.landlord.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={11} /> {room.landlord.email}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-t border-stone-200 p-3">
          <button
            onClick={onContactOwner}
            className="flex-1 rounded-lg border border-blue-200 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            Contact Owner
          </button>
          <button
            onClick={onBookNow}
            disabled={room.status !== "AVAILABLE"}
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {room.status === "AVAILABLE" ? "Book Now" : "Not Available"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingModal({
  room,
  moveInDate,
  notes,
  submitting,
  error,
  success,
  onMoveInDateChange,
  onNotesChange,
  onSubmit,
  onClose,
  onGoToMyRequests,
}: {
  room: Room;
  moveInDate: string;
  notes: string;
  submitting: boolean;
  error: string | null;
  success: boolean;
  onMoveInDateChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onGoToMyRequests: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <span className="text-sm font-semibold">{success ? "Booking Requested" : "Book This Room"}</span>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-700">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Calendar size={22} />
            </div>
            <p className="text-sm text-stone-600">
              Your booking request for <span className="font-semibold">{room.title}</span> has been sent to the
              landlord. You'll be notified once it's approved.
            </p>
            <button
              onClick={onGoToMyRequests}
              className="mt-2 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
            >
              View My Requests
            </button>
          </div>
        ) : (
          <div className="p-4">
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-stone-200 p-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                {room.roomImages?.[0] && (
                  <img
                    src={resolveImageUrl(room.roomImages[0].imageUrl)}
                    alt={room.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{room.title}</p>
                <p className="text-xs text-stone-500">Rs. {room.price.toLocaleString()}/month</p>
              </div>
            </div>

            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-medium text-stone-500">Move-in Date</span>
              <input
                type="date"
                min={today}
                value={moveInDate}
                onChange={(e) => onMoveInDateChange(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label className="mb-4 block">
              <span className="mb-1 block text-xs font-medium text-stone-500">Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                rows={3}
                placeholder="Anything the landlord should know..."
                className="w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>

            {error && <p className="mb-3 text-xs text-rose-500">{error}</p>}

            <button
              onClick={onSubmit}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? "Sending Request..." : "Confirm Booking Request"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ContactOwnerModal({
  room,
  message,
  sending,
  error,
  sent,
  onMessageChange,
  onSend,
  onClose,
}: {
  room: Room;
  message: string;
  sending: boolean;
  error: string | null;
  sent: boolean;
  onMessageChange: (v: string) => void;
  onSend: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <span className="text-sm font-semibold">{sent ? "Message Sent" : "Contact Owner"}</span>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-700">
            <X size={20} />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Send size={20} />
            </div>
            <p className="text-sm text-stone-600">
              Your message about <span className="font-semibold">{room.title}</span> has been sent to{" "}
              {room.landlord?.fullName || "the landlord"}.
            </p>
            <button
              onClick={onClose}
              className="mt-2 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-4">
            <div className="mb-4 rounded-xl border border-stone-200 p-3">
              <p className="text-sm font-semibold">{room.landlord?.fullName || "Landlord"}</p>
              <p className="text-xs text-stone-500">Re: {room.title}</p>
            </div>

            <label className="mb-4 block">
              <span className="mb-1 block text-xs font-medium text-stone-500">Message</span>
              <textarea
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                rows={4}
                placeholder={`Hi, I'm interested in "${room.title}"...`}
                className="w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>

            {error && <p className="mb-3 text-xs text-rose-500">{error}</p>}

            <button
              onClick={onSend}
              disabled={sending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {sending && <Loader2 size={14} className="animate-spin" />}
              {sending ? "Sending..." : "Send Message"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
