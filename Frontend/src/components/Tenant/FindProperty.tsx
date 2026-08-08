import { useEffect, useMemo, useState } from "react";
import {
  Search, Bell, Heart, Plus, Minus, LocateFixed,
  Grid2x2, List as ListIcon, MapPin, Star, X,
  SlidersHorizontal, Map as MapIcon, Loader2, Calendar, Phone, Mail,
} from "lucide-react";
import type { User, Room } from "../../services/api";
import { api } from "../../services/api";
import { Sidebar, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";
import Avatar from "../Avatar";
interface FindPropertyProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

// Backend enum -> filter chip label
const ROOM_TYPES: { value: Room["roomType"]; label: string }[] = [
  { value: "SINGLE", label: "Single Room" },
  { value: "DOUBLE", label: "Double Room" },
  { value: "FLAT", label: "Flat" },
  { value: "APARTMENT", label: "Apartment" },
];

const AMENITY_OPTIONS = ["WiFi", "Parking", "Water Supply", "Attached Bathroom", "Kitchen", "Laundry", "Pet Friendly"];
const QUICK_FILTERS = ["WiFi", "Parking"];
const PRICE_MIN = 2000;
const PRICE_MAX = 50000;
// NOTE: the Prisma Room model has no dedicated "landmark" field, so this filters
// rooms whose location/address text contains the landmark keyword — a best-effort
// match, not a real geo lookup. Add a proper landmarks table/field for accuracy.
const LANDMARKS = ["College", "Hospital", "Main Road"];

// The backend (Express) serves uploaded room images from /uploads/... on its own
// origin. The Vite dev server runs on a different port, so relative image paths
// coming back from the API need the backend origin prefixed or the <img> will 404.
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:5000";

function resolveImageUrl(url?: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Images uploaded through the app are served by the backend from /uploads/...
  // Anything else (e.g. /images/rooms/Room1.png) is a static asset sitting in
  // Frontend/public and is served by the frontend's own origin, so it must NOT
  // be prefixed with the backend URL.
  if (url.startsWith("/uploads/")) return `${API_BASE_URL}${url}`;
  return url;
}

function avgRating(room: Room): number | null {
  if (!room.reviews || room.reviews.length === 0) return null;
  const sum = room.reviews.reduce((s, r) => s + r.rating, 0);
  return Math.round((sum / room.reviews.length) * 10) / 10;
}

// Deterministic pseudo-position on the mock map so pins don't jump between renders.
function mapPosition(id: number): { top: string; left: string } {
  const top = 20 + ((id * 37) % 60);
  const left = 60 + ((id * 53) % 35);
  return { top: `${top}%`, left: `${left}%` };
}

export default function FindProperty({ user, onLogout, onNavigate }: FindPropertyProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [savingId, setSavingId] = useState<number | null>(null);

  const [query, setQuery] = useState("");
  const [roomType, setRoomType] = useState<Room["roomType"] | "All">("All");
  const [availableNow, setAvailableNow] = useState(false);
  const [amenities, setAmenities] = useState<Set<string>>(new Set());
  const [quickFilters, setQuickFilters] = useState<Set<string>>(new Set());
  const [minPrice, setMinPrice] = useState(PRICE_MIN);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  // Multi-select: user can pick one OR more landmarks (School, Hospital, Main Road...)
  const [landmarks, setLandmarks] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<"newest" | "price">("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapMode, setMapMode] = useState<"map" | "satellite">("map");

  // --- View Details modal ---
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // --- Book Now modal ---
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
  const [moveInDate, setMoveInDate] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.getRooms({ status: "AVAILABLE" }), api.getFavorites()])
      .then(([roomsRes, favRes]) => {
        if (cancelled) return;
        if (roomsRes && roomsRes.success === false) {
          setError(roomsRes.message || "Failed to load rooms");
        } else {
          const roomList = Array.isArray(roomsRes) ? roomsRes : roomsRes?.rooms || roomsRes?.data || [];
          setRooms(roomList);
        }
        const favList = Array.isArray(favRes) ? favRes : favRes?.favorites || favRes?.data || [];
        setSavedIds(new Set(favList.map((f: { roomId: number }) => f.roomId)));
      })
      .catch(() => !cancelled && setError("Failed to load rooms"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleAmenity = (a: string) =>
    setAmenities((prev) => {
      const next = new Set(prev);
      next.has(a) ? next.delete(a) : next.add(a);
      return next;
    });

  const toggleQuickFilter = (q: string) =>
    setQuickFilters((prev) => {
      const next = new Set(prev);
      next.has(q) ? next.delete(q) : next.add(q);
      return next;
    });

  const toggleLandmark = (l: string) =>
    setLandmarks((prev) => {
      const next = new Set(prev);
      next.has(l) ? next.delete(l) : next.add(l);
      return next;
    });

  const toggleSave = async (roomId: number) => {
    setSavingId(roomId);
    const wasSaved = savedIds.has(roomId);
    // optimistic update
    setSavedIds((prev) => {
      const next = new Set(prev);
      wasSaved ? next.delete(roomId) : next.add(roomId);
      return next;
    });
    try {
      const res = await api.toggleFavorite(roomId);
      if (res && res.success === false) {
        // revert on failure
        setSavedIds((prev) => {
          const next = new Set(prev);
          wasSaved ? next.add(roomId) : next.delete(roomId);
          return next;
        });
      }
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        wasSaved ? next.add(roomId) : next.delete(roomId);
        return next;
      });
    } finally {
      setSavingId(null);
    }
  };

  const resetFilters = () => {
    setRoomType("All");
    setAvailableNow(false);
    setAmenities(new Set());
    setMinPrice(PRICE_MIN);
    setMaxPrice(PRICE_MAX);
    setLandmarks(new Set());
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
      if (res && res.success === false) {
        setBookingError(res.message || "Failed to create booking");
      } else {
        setBookingSuccess(true);
      }
    } catch (e) {
      setBookingError("Failed to create booking. Please try again.");
    } finally {
      setBookingSubmitting(false);
    }
  };

  const goToMyRequests = () => {
    closeBooking();
    onNavigate(NAV_LABEL_TO_VIEW["My Requests"]);
  };

  const filtered = useMemo(() => {
    let list = rooms.filter((r) => {
      const matchesQuery =
        query.trim() === "" ||
        r.location.toLowerCase().includes(query.toLowerCase()) ||
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.city.toLowerCase().includes(query.toLowerCase());
      const matchesType = roomType === "All" || r.roomType === roomType;
      const matchesAvailable = !availableNow || r.status === "AVAILABLE";
      const matchesPrice = r.price >= minPrice && r.price <= maxPrice;
      // OR match: room qualifies if it's near ANY of the selected landmarks
      const matchesLandmark =
        landmarks.size === 0 ||
        [...landmarks].some(
          (l) =>
            r.location.toLowerCase().includes(l.toLowerCase()) ||
            (r as any).address?.toLowerCase().includes(l.toLowerCase())
        );
      const roomAmenityNames = (r.roomAmenities || []).map((ra) => ra.amenity.name);
      const matchesAmenities = [...amenities].every((a) => roomAmenityNames.includes(a));
      const matchesQuick = [...quickFilters].every((q) => roomAmenityNames.includes(q));
      return matchesQuery && matchesType && matchesAvailable && matchesPrice && matchesLandmark && matchesAmenities && matchesQuick;
    });
    if (sort === "price") list = [...list].sort((a, b) => a.price - b.price);
    else list = [...list].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return list;
  }, [rooms, query, roomType, availableNow, minPrice, maxPrice, landmarks, amenities, quickFilters, sort]);

  const activeFilterCount =
    (roomType !== "All" ? 1 : 0) +
    (availableNow ? 1 : 0) +
    (minPrice !== PRICE_MIN || maxPrice !== PRICE_MAX ? 1 : 0) +
    landmarks.size +
    amenities.size;

  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  return (
    <div className="flex min-h-screen w-full bg-stone-50 text-stone-900">
      <Sidebar
        user={user}
        active="Find Rooms"
        onNavigate={handleNavigate}
        onSettings={() => onNavigate("settings")}
        onLogout={onLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-2 border-b border-stone-200 bg-white px-3 py-3 pl-14 sm:gap-4 sm:px-6 sm:pl-6">
          <h1 className="hidden shrink-0 text-lg font-semibold sm:block">Find Property</h1>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
            <Search size={16} className="shrink-0 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search neighborhood..."
              className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-stone-400"
            />
          </div>
          <button onClick={() => onNavigate("notifications")} className="relative shrink-0 text-stone-500 hover:text-stone-700">
            <Bell size={18} />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500" />
          </button>
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-stone-200">
            <Avatar name={user.fullName ?? "U"} avatarUrl={(user as any).avatarUrl} size={32} />
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-stone-200 bg-white px-3 py-2 lg:hidden">
          <button
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700"
          >
            <SlidersHorizontal size={13} />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setMapOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 xl:hidden"
          >
            <MapIcon size={13} />
            Map
          </button>
        </div>

        <div className="flex flex-1 flex-col lg:flex-row">
          {/* ---- Filters ---- */}
          <aside
            className={`
              fixed inset-0 z-40 flex justify-start bg-black/40 transition-opacity lg:static lg:z-auto lg:block lg:w-64
              lg:shrink-0 lg:border-r lg:border-stone-200 lg:bg-white lg:p-4 lg:opacity-100 lg:transition-none
              ${filtersOpen ? "opacity-100" : "pointer-events-none opacity-0 lg:pointer-events-auto"}
            `}
            onClick={(e) => {
              if (e.target === e.currentTarget) setFiltersOpen(false);
            }}
          >
            <div
              className={`
                h-full w-72 max-w-[85vw] overflow-y-auto bg-white p-4 shadow-xl transition-transform duration-200
                lg:h-auto lg:w-auto lg:max-w-none lg:translate-x-0 lg:p-0 lg:shadow-none
                ${filtersOpen ? "translate-x-0" : "-translate-x-full"}
              `}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold">Filters</span>
                <div className="flex items-center gap-3">
                  <button onClick={resetFilters} className="text-xs font-medium text-blue-600 hover:underline">
                    Reset All
                  </button>
                  <button onClick={() => setFiltersOpen(false)} className="text-stone-400 hover:text-stone-600 lg:hidden">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <label className="mb-5 flex items-center justify-between text-sm">
                <span className="text-stone-600">Available Now</span>
                <button
                  onClick={() => setAvailableNow((v) => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${availableNow ? "bg-blue-600" : "bg-stone-200"}`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      availableNow ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </label>

              <div className="mb-5">
                <p className="mb-2 text-xs font-medium text-stone-500">Price Range (NPR)</p>
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>NPR {minPrice.toLocaleString()}</span>
                  <span>NPR {maxPrice.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step={500}
                  value={minPrice}
                  onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice))}
                  className="mt-1 w-full accent-blue-600"
                />
                <input
                  type="range"
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step={500}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice))}
                  className="mt-1 w-full accent-blue-600"
                />
              </div>

              <div className="mb-5">
                <p className="mb-2 text-xs font-medium text-stone-500">Room Type</p>
                <div className="grid grid-cols-2 gap-2">
                  {ROOM_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setRoomType(roomType === t.value ? "All" : t.value)}
                      className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                        roomType === t.value ? "border-blue-600 text-blue-600" : "border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <p className="mb-2 text-xs font-medium text-stone-500">Amenities</p>
                <div className="flex flex-col gap-1.5">
                  {AMENITY_OPTIONS.map((a) => (
                    <label key={a} className="flex items-center gap-2 text-xs text-stone-600">
                      <input
                        type="checkbox"
                        checked={amenities.has(a)}
                        onChange={() => toggleAmenity(a)}
                        className="h-3.5 w-3.5 accent-blue-600"
                      />
                      {a}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-4 lg:mb-0">
                <p className="mb-2 text-xs font-medium text-stone-500">Near Landmark (select one or more)</p>
                <div className="flex flex-wrap gap-1.5">
                  {LANDMARKS.map((l) => (
                    <button
                      key={l}
                      onClick={() => toggleLandmark(l)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        landmarks.has(l) ? "bg-blue-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setFiltersOpen(false)}
                className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white lg:hidden"
              >
                Show {filtered.length} rooms
              </button>
            </div>
          </aside>

          {/* ---- Listings ---- */}
          <section className="min-w-0 flex-1 p-3 sm:p-6">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="animate-spin text-stone-400" size={26} />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 p-10 text-center">
                <p className="text-sm text-stone-500">{error}</p>
              </div>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-stone-500">
                    Showing {filtered.length} of {rooms.length} rooms
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setView("grid")}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border ${view === "grid" ? "border-blue-600 text-blue-600" : "border-stone-200 text-stone-400"}`}
                    >
                      <Grid2x2 size={14} />
                    </button>
                    <button
                      onClick={() => setView("list")}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border ${view === "list" ? "border-blue-600 text-blue-600" : "border-stone-200 text-stone-400"}`}
                    >
                      <ListIcon size={14} />
                    </button>
                  </div>
                </div>

                <div className="mb-3 -mx-3 flex items-center gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <span className="shrink-0 text-xs text-stone-400">Sort by:</span>
                  <button
                    onClick={() => setSort("newest")}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${sort === "newest" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}
                  >
                    Newest
                  </button>
                  <button
                    onClick={() => setSort("price")}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${sort === "price" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}
                  >
                    Price: Low to High
                  </button>
                  <span className="mx-1 h-4 w-px shrink-0 bg-stone-200" />
                  {QUICK_FILTERS.map((q) => (
                    <button
                      key={q}
                      onClick={() => toggleQuickFilter(q)}
                      className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        quickFilters.has(q) ? "border-blue-600 bg-blue-50 text-blue-600" : "border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>

                <div className={view === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-3"}>
                  {filtered.map((room) => {
                    const rating = avgRating(room);
                    const amenityNames = (room.roomAmenities || []).map((ra) => ra.amenity.name);
                    return (
                      <div key={room.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                        <button
                          onClick={() => openDetails(room)}
                          className="relative block h-40 w-full sm:h-44 md:h-40"
                        >
                          <img
                            src={resolveImageUrl(room.roomImages?.[0]?.imageUrl)}
                            alt={room.title}
                            className="h-full w-full object-cover"
                          />
                          {room.status === "AVAILABLE" && (
                            <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                              Available Now
                            </span>
                          )}
                        </button>
                        <div className="p-3">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <h3 className="truncate text-sm font-semibold">{room.title}</h3>
                            {rating !== null && (
                              <span className="flex shrink-0 items-center gap-0.5 text-xs text-amber-500">
                                <Star size={12} fill="currentColor" /> {rating}
                              </span>
                            )}
                          </div>
                          <p className="mb-2 flex items-center gap-1 text-xs text-stone-500">
                            <MapPin size={11} /> {room.location}, {room.city}
                          </p>
                          <p className="text-sm font-semibold text-blue-700">
                            Rs. {room.price.toLocaleString()}/month
                          </p>
                          {amenityNames.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {amenityNames.slice(0, 3).map((a) => (
                                <span key={a} className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] text-stone-500">
                                  {a}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="mt-3 grid grid-cols-2 gap-2 min-[420px]:flex">
                            <button
                              onClick={() => openBooking(room)}
                              disabled={room.status !== "AVAILABLE"}
                              className="col-span-2 rounded-lg bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-stone-300 min-[420px]:col-span-1 min-[420px]:flex-1"
                            >
                              Book Now
                            </button>
                            <button
                              onClick={() => openDetails(room)}
                              className="rounded-lg bg-stone-900 py-1.5 text-xs font-medium text-white hover:bg-stone-800 min-[420px]:flex-1"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => toggleSave(room.id)}
                              disabled={savingId === room.id}
                              className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs ${
                                savedIds.has(room.id) ? "border-rose-200 bg-rose-50 text-rose-500" : "border-stone-200 text-stone-500"
                              }`}
                            >
                              <Heart size={12} fill={savedIds.has(room.id) ? "currentColor" : "none"} /> Save
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {filtered.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 p-10 text-center">
                      <X size={20} className="text-stone-300" />
                      <p className="text-sm text-stone-500">No rooms match these filters.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <MapPanel open={mapOpen} onClose={() => setMapOpen(false)} rooms={filtered} mode={mapMode} onModeChange={setMapMode} />
        </div>
      </div>

      {/* ---- Room Details Modal ---- */}
      {selectedRoom && (
        <RoomDetailsModal
          room={selectedRoom}
          isSaved={savedIds.has(selectedRoom.id)}
          onToggleSave={() => toggleSave(selectedRoom.id)}
          onClose={() => setSelectedRoom(null)}
          onBookNow={() => openBooking(selectedRoom)}
        />
      )}

      {/* ---- Book Now Modal ---- */}
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
    </div>
  );
}

function RoomDetailsModal({
  room,
  isSaved,
  onToggleSave,
  onClose,
  onBookNow,
}: {
  room: Room;
  isSaved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
  onBookNow: () => void;
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
            {room.status === "AVAILABLE" && (
              <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                Available Now
              </span>
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
                  <Star size={14} fill="currentColor" /> {rating}{" "}
                  <span className="text-stone-400">({room.reviews?.length})</span>
                </span>
              )}
            </div>
            <p className="mb-3 flex items-center gap-1 text-sm text-stone-500">
              <MapPin size={13} /> {room.location}, {room.city}
              {(room as any).address ? ` — ${(room as any).address}` : ""}
            </p>
            <p className="mb-4 text-xl font-bold text-blue-700">
              Rs. {room.price.toLocaleString()}/month
              {(room as any).securityDeposit ? (
                <span className="ml-2 text-sm font-normal text-stone-500">
                  + Rs. {(room as any).securityDeposit.toLocaleString()} deposit
                </span>
              ) : null}
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
            onClick={onToggleSave}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-medium ${
              isSaved ? "border-rose-200 bg-rose-50 text-rose-500" : "border-stone-200 text-stone-600"
            }`}
          >
            <Heart size={15} fill={isSaved ? "currentColor" : "none"} />
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
              <img
                src={resolveImageUrl(room.roomImages?.[0]?.imageUrl)}
                alt={room.title}
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
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

function MapContent({
  rooms,
  mode,
  onModeChange,
  zoom,
  onZoomChange,
}: {
  rooms: Room[];
  mode: "map" | "satellite";
  onModeChange: (m: "map" | "satellite") => void;
  zoom: number;
  onZoomChange: (z: number) => void;
}) {
  const isSatellite = mode === "satellite";
  return (
    <div className={`relative h-full w-full overflow-hidden ${isSatellite ? "bg-stone-800" : "bg-blue-50"}`}>
      <div
        style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
        className="absolute inset-0 transition-transform duration-200"
      >
        <div
          className={`absolute inset-0 ${
            isSatellite
              ? "opacity-30 [background-image:linear-gradient(#4b5563_1px,transparent_1px),linear-gradient(90deg,#4b5563_1px,transparent_1px)]"
              : "opacity-40 [background-image:linear-gradient(#c7d7f5_1px,transparent_1px),linear-gradient(90deg,#c7d7f5_1px,transparent_1px)]"
          } [background-size:24px_24px]`}
        />

        {rooms.map((room) => {
          const pos = mapPosition(room.id);
          return (
            <span
              key={room.id}
              style={{ top: pos.top, left: pos.left }}
              className={`absolute -translate-x-1/2 -translate-y-full rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-md ${
                isSatellite ? "bg-white text-stone-900" : "bg-stone-900 text-white"
              }`}
            >
              Rs. {Math.round(room.price / 1000)}k
            </span>
          );
        })}

        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow" />
      </div>

      <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <button
          onClick={() => onZoomChange(Math.min(2.5, zoom + 0.25))}
          className="flex h-8 w-8 items-center justify-center border-b border-stone-100 text-stone-500 hover:bg-stone-50"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={() => onZoomChange(Math.max(0.75, zoom - 0.25))}
          className="flex h-8 w-8 items-center justify-center border-b border-stone-100 text-stone-500 hover:bg-stone-50"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => onZoomChange(1)}
          className="flex h-8 w-8 items-center justify-center text-stone-500 hover:bg-stone-50"
        >
          <LocateFixed size={14} />
        </button>
      </div>

      <div className="absolute bottom-3 left-3 flex overflow-hidden rounded-lg border border-stone-200 bg-white text-xs shadow-sm">
        <button
          onClick={() => onModeChange("map")}
          className={mode === "map" ? "bg-stone-900 px-3 py-1.5 font-medium text-white" : "px-3 py-1.5 text-stone-500 hover:bg-stone-50"}
        >
          Map
        </button>
        <button
          onClick={() => onModeChange("satellite")}
          className={mode === "satellite" ? "bg-stone-900 px-3 py-1.5 font-medium text-white" : "px-3 py-1.5 text-stone-500 hover:bg-stone-50"}
        >
          Satellite
        </button>
      </div>
    </div>
  );
}

function MapPanel({
  open,
  onClose,
  rooms,
  mode,
  onModeChange,
}: {
  open: boolean;
  onClose: () => void;
  rooms: Room[];
  mode: "map" | "satellite";
  onModeChange: (m: "map" | "satellite") => void;
}) {
  const [zoom, setZoom] = useState(1);

  return (
    <>
      <aside className="hidden w-80 shrink-0 border-l border-stone-200 xl:block">
        <MapContent rooms={rooms} mode={mode} onModeChange={onModeChange} zoom={zoom} onZoomChange={setZoom} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col xl:hidden">
          <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
            <span className="text-sm font-semibold">Map View</span>
            <button onClick={onClose} className="text-stone-500 hover:text-stone-700">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1">
            <MapContent rooms={rooms} mode={mode} onModeChange={onModeChange} zoom={zoom} onZoomChange={setZoom} />
          </div>
        </div>
      )}
    </>
  );
}
