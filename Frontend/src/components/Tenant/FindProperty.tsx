// src/components/Tenant/FindProperty.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Search, Bell, Heart, Plus, Minus, LocateFixed,
  Grid2x2, List as ListIcon, MapPin, Star, X,
  SlidersHorizontal, Map as MapIcon, Loader2, Sparkles,
} from "lucide-react";
import type { User, Room, RecommendationResult } from "../../services/api";
import { api } from "../../services/api";
import { Sidebar, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";
import Avatar from "../Avatar";
import { resolveImageUrl, avgRating, formatMatchPercent } from "./roomDisplayUtils";
import RoomDetailsModal from "./RoomDetailsModal";
import BookingModal from "./BookingModal";

interface FindPropertyProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

import { LocationSelector } from "../Common/LocationSelector";
import { getUserLocation, calculateHaversineDistance, formatDistance, type UserCoordinates } from "../../utils/haversine";

// Backend enum -> filter chip label
const ROOM_TYPES: { value: Room["roomType"]; label: string }[] = [
  { value: "SINGLE", label: "Single Room" },
  { value: "DOUBLE", label: "Double Room" },
  { value: "FLAT", label: "Flat" },
  { value: "APARTMENT", label: "Apartment" },
];

const AMENITY_OPTIONS = [
  "WiFi",
  "Kitchen",
  "Furnished",
  "Balcony",
  "Water",
  "Air Conditioner",
  "Parking",
  "Attached Bathroom",
  "Electricity",
  "Fully Furnished",
  "Pet Friendly",
];
const LANDMARKS = [
  "College / University",
  "Hospital / Clinic",
  "Main Road",
  "Bus Stop",
  "Market / Supermarket",
  "Park / Garden",
  "Bank / ATM",
  "Airport",
];

const LANDMARK_KEYWORDS_MAP: Record<string, string[]> = {
  "College / University": ["college", "university", "campus", "school", "academy", "institute"],
  "Hospital / Clinic": ["hospital", "clinic", "health", "medical", "pharmacy", "nursing"],
  "Main Road": ["main road", "highway", "chowk", "marg", "plaza", "avenue", "road"],
  "Bus Stop": ["bus stop", "bus station", "bus park", "micro stop", "tempo stop", "transit", "station"],
  "Market / Supermarket": ["market", "supermarket", "mart", "bazaar", "saleways", "shopping", "store", "mall"],
  "Park / Garden": ["park", "garden", "lake", "lakeside", "greenery"],
  "Bank / ATM": ["bank", "atm", "nabil", "nrb"],
  Airport: ["airport", "aerodrome", "tia"],
};

const LOCATION_LANDMARKS_MAP: Record<string, string[]> = {
  Baneshwor: ["College / University", "Hospital / Clinic", "Main Road", "Bank / ATM", "Market / Supermarket"],
  Kirtipur: ["College / University", "Hospital / Clinic", "Main Road", "Bus Stop"],
  Thamel: ["Market / Supermarket", "Main Road", "Park / Garden", "Bank / ATM"],
  Chabahil: ["College / University", "Hospital / Clinic", "Main Road", "Market / Supermarket"],
  Kalanki: ["Main Road", "Bus Stop", "Hospital / Clinic"],
  Patan: ["Hospital / Clinic", "College / University", "Market / Supermarket", "Bank / ATM"],
  Jawalakhel: ["Park / Garden", "College / University", "Hospital / Clinic", "Main Road"],
  Kupondole: ["College / University", "Main Road", "Park / Garden"],
  Satdobato: ["Main Road", "Bus Stop", "Market / Supermarket"],
  Suryabinayak: ["Hospital / Clinic", "Main Road", "Bus Stop"],
  Thimi: ["Hospital / Clinic", "Market / Supermarket"],
  Lakeside: ["Park / Garden", "Market / Supermarket", "Airport", "Main Road"],
  Birauta: ["Bus Stop", "Main Road", "Hospital / Clinic"],
  Mahendrapool: ["Market / Supermarket", "College / University", "Bank / ATM"],
  Kathmandu: ["College / University", "Hospital / Clinic", "Main Road", "Market / Supermarket"],
  Lalitpur: ["College / University", "Hospital / Clinic", "Main Road", "Park / Garden"],
  Bhaktapur: ["Hospital / Clinic", "Main Road", "Bus Stop"],
  Pokhara: ["Park / Garden", "Market / Supermarket", "Main Road", "Airport"],
};

function isRoomNearLandmark(room: Room, selectedLandmark: string): boolean {
  // 1. Check direct neighborhood mapping
  const mapped = LOCATION_LANDMARKS_MAP[room.location] || LOCATION_LANDMARKS_MAP[room.city] || [];
  if (mapped.includes(selectedLandmark)) return true;

  // 2. Check keyword aliases in room text fields
  const roomText = `${room.title} ${room.description || ""} ${room.location} ${(room as any).address || ""} ${room.city}`.toLowerCase();
  const keywords = LANDMARK_KEYWORDS_MAP[selectedLandmark] || [selectedLandmark.toLowerCase()];
  return keywords.some((kw) => roomText.includes(kw));
}

function getRoomNearbyLandmarks(room: Room): string[] {
  return LANDMARKS.filter((l) => isRoomNearLandmark(room, l));
}
const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  Baneshwor: { lat: 27.6938, lng: 85.3331 },
  Kirtipur: { lat: 27.6792, lng: 85.2754 },
  Thamel: { lat: 27.7154, lng: 85.3123 },
  Chabahil: { lat: 27.7167, lng: 85.3472 },
  Kalanki: { lat: 27.6936, lng: 85.2813 },
  Patan: { lat: 27.6738, lng: 85.3168 },
  Jawalakhel: { lat: 27.6728, lng: 85.3148 },
  Kupondole: { lat: 27.6861, lng: 85.3135 },
  Satdobato: { lat: 27.6548, lng: 85.3248 },
  Suryabinayak: { lat: 27.6631, lng: 85.4294 },
  Thimi: { lat: 27.6789, lng: 85.3789 },
  "Durbar Square": { lat: 27.6722, lng: 85.4284 },
  Lakeside: { lat: 28.2096, lng: 83.9575 },
  Birauta: { lat: 28.1882, lng: 83.9712 },
  Mahendrapool: { lat: 28.2215, lng: 83.9874 },
  Kathmandu: { lat: 27.7172, lng: 85.3240 },
  Lalitpur: { lat: 27.6670, lng: 85.3240 },
  Bhaktapur: { lat: 27.6710, lng: 85.4298 },
  Pokhara: { lat: 28.2096, lng: 83.9856 },
};

// Deterministic pseudo-position on the mock map so pins don't jump between renders.
function mapPosition(id: number): { top: string; left: string } {
  const top = 20 + ((id * 37) % 60);
  const left = 60 + ((id * 53) % 35);
  return { top: `${top}%`, left: `${left}%` };
}

export default function FindProperty({ user, onLogout, onNavigate }: FindPropertyProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [recommendationSource, setRecommendationSource] = useState<"cosine" | "popular">("popular");
  const [usingRecommendations, setUsingRecommendations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [savingId, setSavingId] = useState<number | null>(null);

  const [query, setQuery] = useState("");
  const [roomType, setRoomType] = useState<Room["roomType"] | "All">("All");
  const [availableNow, setAvailableNow] = useState(false);
  const [amenities, setAmenities] = useState<Set<string>>(new Set());
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  // Multi-select: user can pick one OR more landmarks (School, Hospital, Main Road...)
  const [landmarks, setLandmarks] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<string>("recommended");
  const [maxDistanceMeters, setMaxDistanceMeters] = useState<number>(0);
  const [userLoc, setUserLoc] = useState<UserCoordinates | null>(getUserLocation());
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

    // Check if any filters are applied
    const hasFilters = 
      query.trim() !== "" ||
      roomType !== "All" ||
      availableNow ||
      minPrice > 0 ||
      maxPrice > 0 ||
      amenities.size > 0 ||
      landmarks.size > 0 ||
      maxDistanceMeters > 0;

    // Update the usingRecommendations state
    setUsingRecommendations(!hasFilters);

    if (hasFilters) {
      // Use regular rooms API with filters - filter priority
      const queryParams: Record<string, any> = {
        status: "AVAILABLE",
        userLat: userLoc?.latitude,
        userLng: userLoc?.longitude,
        sortBy: sort,
      };
      if (maxDistanceMeters > 0) {
        queryParams.maxDistance = maxDistanceMeters / 1000;
      }

      if (query) queryParams.search = query;
      if (roomType !== "All") queryParams.roomType = roomType;
      if (minPrice > 0) queryParams.minPrice = minPrice;
      if (maxPrice > 0) queryParams.maxPrice = maxPrice;
      if (amenities.size > 0) queryParams.amenities = Array.from(amenities).join(",");

      Promise.all([api.getRooms(queryParams), api.getFavorites()])
        .then(([roomsRes, favRes]) => {
          if (cancelled) return;
          if (roomsRes && roomsRes.success === false) {
            setError(roomsRes.message || "Failed to load rooms");
          } else {
            const roomList = Array.isArray(roomsRes) ? roomsRes : roomsRes?.rooms || roomsRes?.data || [];
            setRooms(roomList);
            setRecommendations([]); // Clear recommendations when using filters
          }
          const favList = Array.isArray(favRes) ? favRes : favRes?.favorites || favRes?.data || [];
          setSavedIds(new Set(favList.map((f: { roomId: number }) => f.roomId)));
        })
        .catch(() => !cancelled && setError("Failed to load rooms"))
        .finally(() => !cancelled && setLoading(false));
    } else {
      // No filters applied - use recommendations and show all available rooms with recommended on top
      Promise.all([api.getTenantDashboard(), api.getRooms({ status: "AVAILABLE" }), api.getFavorites()])
        .then(([dashboardRes, roomsRes, favRes]) => {
          if (cancelled) return;
          if (dashboardRes && dashboardRes.success === false) {
            setError(dashboardRes.message || "Failed to load recommendations");
          } else {
            const recs = dashboardRes?.recommendations || [];
            setRecommendations(recs);
            setRecommendationSource(dashboardRes?.recommendationSource || "popular");

            const allAvailable = Array.isArray(roomsRes) ? roomsRes : roomsRes?.rooms || roomsRes?.data || [];
            const recIdSet = new Set(recs.map((rec: RecommendationResult) => rec.room?.id).filter(Boolean));
            const recRooms = recs.map((rec: RecommendationResult) => rec.room).filter(Boolean);
            const otherRooms = allAvailable.filter((r: Room) => !recIdSet.has(r.id));

            setRooms([...recRooms, ...otherRooms]);
          }
          const favList = Array.isArray(favRes) ? favRes : favRes?.favorites || favRes?.data || [];
          setSavedIds(new Set(favList.map((f: { roomId: number }) => f.roomId)));
        })
        .catch(() => !cancelled && setError("Failed to load recommendations"))
        .finally(() => !cancelled && setLoading(false));
    }

    return () => {
      cancelled = true;
    };
  }, [userLoc, sort, maxDistanceMeters, query, roomType, minPrice, maxPrice, amenities, availableNow, landmarks]);

  const toggleAmenity = (a: string) =>
    setAmenities((prev) => {
      const next = new Set(prev);
      next.has(a) ? next.delete(a) : next.add(a);
      return next;
    });

  const toggleLandmark = (l: string) =>
    setLandmarks((prev) => {
      const next = new Set(prev);
      next.has(l) ? next.delete(l) : next.add(l);
      return next;
    });

  const refreshRecommendations = () => {
    Promise.all([api.getTenantDashboard(), api.getRooms({ status: "AVAILABLE" })]).then(([dashboardRes, roomsRes]) => {
      if (!dashboardRes?.success || !Array.isArray(dashboardRes.recommendations)) return;
      const recs = dashboardRes.recommendations;
      setRecommendations(recs);
      setRecommendationSource(dashboardRes.recommendationSource || "popular");

      const allAvailable = Array.isArray(roomsRes) ? roomsRes : roomsRes?.rooms || roomsRes?.data || [];
      const recIdSet = new Set(recs.map((rec: RecommendationResult) => rec.room?.id).filter(Boolean));
      const recRooms = recs.map((rec: RecommendationResult) => rec.room).filter(Boolean);
      const otherRooms = allAvailable.filter((r: Room) => !recIdSet.has(r.id));

      setRooms([...recRooms, ...otherRooms]);
    });
  };

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
      } else if (!wasSaved && usingRecommendations) {
        refreshRecommendations();
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
    setMinPrice(0);
    setMaxPrice(0);
    setLandmarks(new Set());
    setMaxDistanceMeters(0);
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

  const recommendationMap = useMemo(() => {
    const map = new Map<number, RecommendationResult>();
    recommendations.forEach((rec) => {
      if (rec.room?.id) {
        map.set(rec.room.id, rec);
      }
    });
    return map;
  }, [recommendations]);

  const getRoomDistance = (room: Room): number => {
    if (room.distance !== undefined && room.distance !== null && !isNaN(room.distance)) {
      return room.distance;
    }
    const tenantLat = userLoc?.latitude ?? 27.6938;
    const tenantLng = userLoc?.longitude ?? 85.3331;

    let rLat = room.latitude;
    let rLng = room.longitude;

    if (!rLat || !rLng) {
      const coords = LOCATION_COORDS[room.location] || LOCATION_COORDS[room.city] || { lat: 27.7172, lng: 85.3240 };
      rLat = coords.lat;
      rLng = coords.lng;
    }

    const d = calculateHaversineDistance(tenantLat, tenantLng, rLat, rLng);
    return d !== null ? d : 0;
  };

  const getRoomPopularity = (room: Room): number => {
    const rec = recommendationMap.get(room.id);
    if (rec?.popularityScore !== undefined) return rec.popularityScore;
    if (room.popularityScore !== undefined) return room.popularityScore;
    const rating = avgRating(room) || 0;
    const favs = room.favorites?.length || 0;
    return rating * 10 + favs;
  };

  const filtered = useMemo(() => {
    let list = rooms;

    if (!usingRecommendations) {
      list = rooms.filter((r) => {
        const matchesQuery =
          query.trim() === "" ||
          r.location.toLowerCase().includes(query.toLowerCase()) ||
          r.title.toLowerCase().includes(query.toLowerCase()) ||
          r.city.toLowerCase().includes(query.toLowerCase());
        const matchesType = roomType === "All" || r.roomType === roomType;
        const matchesAvailable = !availableNow || r.status === "AVAILABLE";
        const matchesPrice =
          (minPrice > 0 ? r.price >= minPrice : true) &&
          (maxPrice > 0 ? r.price <= maxPrice : true);
        const matchesDistance =
          maxDistanceMeters === 0 || (getRoomDistance(r) * 1000) <= maxDistanceMeters;
        const matchesLandmark =
          landmarks.size === 0 ||
          [...landmarks].every((selectedLandmark) => isRoomNearLandmark(r, selectedLandmark));
        const roomAmenityNames = (r.roomAmenities || []).map((ra) => ra.amenity.name);
        const matchesAmenities = [...amenities].every((a) => roomAmenityNames.includes(a));
        return (
          matchesQuery &&
          matchesType &&
          matchesAvailable &&
          matchesPrice &&
          matchesDistance &&
          matchesLandmark &&
          matchesAmenities
        );
      });
    }

    if (sort === "popularity") {
      return [...list].sort((a, b) => getRoomPopularity(b) - getRoomPopularity(a));
    } else if (sort === "distance") {
      return [...list].sort((a, b) => getRoomDistance(a) - getRoomDistance(b));
    } else if (sort === "price" || sort === "price_asc") {
      return [...list].sort((a, b) => a.price - b.price);
    } else if (sort === "price_desc") {
      return [...list].sort((a, b) => b.price - a.price);
    } else if (sort === "newest") {
      return [...list].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    } else {
      // Default: "recommended"
      if (usingRecommendations && recommendations.length > 0) {
        const recList: Room[] = [];
        const otherList: Room[] = [];
        list.forEach((r) => {
          if (recommendationMap.has(r.id)) {
            recList.push(r);
          } else {
            otherList.push(r);
          }
        });
        recList.sort((a, b) => (recommendationMap.get(b.id)?.finalScore ?? 0) - (recommendationMap.get(a.id)?.finalScore ?? 0));
        otherList.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        return [...recList, ...otherList];
      }
      return [...list].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    }
  }, [rooms, query, roomType, availableNow, minPrice, maxPrice, landmarks, amenities, sort, usingRecommendations, recommendations, recommendationMap, userLoc, maxDistanceMeters]);

  const activeFilterCount =
    (roomType !== "All" ? 1 : 0) +
    (availableNow ? 1 : 0) +
    (minPrice > 0 || maxPrice > 0 ? 1 : 0) +
    (maxDistanceMeters > 0 ? 1 : 0) +
    landmarks.size +
    amenities.size;

  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  return (
    <div className="flex min-h-screen w-full bg-stone-50 text-stone-900">
      <Sidebar
        user={user}
        active="Find Property"
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
          <LocationSelector onLocationChange={(loc) => setUserLoc(loc)} />
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

              <div className="mb-5 flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50/70 p-3">
                <div>
                  <span className="text-xs font-semibold text-stone-800">Available Now</span>
                  <p className="text-[11px] text-stone-500">Only rooms ready for move-in</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAvailableNow((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    availableNow ? "bg-emerald-600" : "bg-stone-300"
                  }`}
                  aria-label="Toggle Available Now filter"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      availableNow ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-stone-500">Price Range (NPR)</p>
                  <span className="text-[11px] text-stone-400">No Limit</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-stone-400">Min Price</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs text-stone-400">Rs.</span>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={minPrice || ""}
                        placeholder="0"
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : Number(e.target.value);
                          setMinPrice(isNaN(val) ? 0 : Math.max(0, val));
                        }}
                        className="w-full rounded-lg border border-stone-200 bg-white py-1.5 pl-8 pr-2 text-xs font-semibold text-stone-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <span className="mt-4 text-xs font-medium text-stone-400">-</span>

                  <div className="flex-1">
                    <label className="mb-1 block text-[10px] font-semibold uppercase text-stone-400">Max Price</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs text-stone-400">Rs.</span>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={maxPrice || ""}
                        placeholder="No limit"
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : Number(e.target.value);
                          setMaxPrice(isNaN(val) ? 0 : Math.max(0, val));
                        }}
                        className="w-full rounded-lg border border-stone-200 bg-white py-1.5 pl-8 pr-2 text-xs font-semibold text-stone-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-5">
                <p className="mb-2 text-xs font-medium text-stone-500">Room Type</p>
                <div className="grid grid-cols-2 gap-2">
                  {ROOM_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
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
                    <label key={a} className="flex cursor-pointer items-center gap-2 text-xs text-stone-600 hover:text-stone-900">
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

              <div className="mb-5">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-medium text-stone-500">Max Distance Radius</p>
                  <span className="text-xs font-semibold text-stone-800">
                    {maxDistanceMeters > 0 ? `${maxDistanceMeters.toLocaleString()} m` : "Any Distance"}
                  </span>
                </div>
                
                <div className="mb-2 flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={maxDistanceMeters || ""}
                      placeholder="e.g. 2000 (meters)"
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : Number(e.target.value);
                        setMaxDistanceMeters(isNaN(val) ? 0 : Math.max(0, val));
                      }}
                      className="w-full rounded-lg border border-stone-200 bg-white py-1.5 px-3 text-xs font-semibold text-stone-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <span className="text-xs font-medium text-stone-500">meters</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {[
                    { label: "500m", value: 500 },
                    { label: "1km", value: 1000 },
                    { label: "2.5km", value: 2500 },
                    { label: "5km", value: 5000 },
                    { label: "10km", value: 10000 },
                    { label: "Any", value: 0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setMaxDistanceMeters(preset.value)}
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                        maxDistanceMeters === preset.value
                          ? "bg-blue-600 text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {maxDistanceMeters > 0 && (
                  <p className="mt-1.5 text-[11px] text-stone-500">
                    Within {(maxDistanceMeters / 1000).toFixed(1)} km from your location
                  </p>
                )}
              </div>

              <div className="mb-4 lg:mb-0">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-stone-500">Near Landmark (select one or more)</p>
                  {landmarks.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setLandmarks(new Set())}
                      className="text-[11px] font-medium text-blue-600 hover:underline"
                    >
                      Clear ({landmarks.size})
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {LANDMARKS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => toggleLandmark(l)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        landmarks.has(l)
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
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
                {usingRecommendations && (
                  <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:flex-row sm:items-center">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                        <Sparkles size={16} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-blue-700">Personalized Recommendations</p>
                        <p className="text-xs text-stone-500">
                          {recommendationSource === "cosine"
                            ? "Rooms matched to your saved favorites using cosine similarity."
                            : "Popular rooms ranked by ratings and favorites — save one to unlock personalized matches."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {usingRecommendations && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        <Sparkles size={12} />
                        {recommendationSource === "cosine" ? "Content-Based" : "Popularity Ranked"}
                      </span>
                    )}
                    <p className="text-sm text-stone-500">
                      Showing {filtered.length} {usingRecommendations ? `rooms (${recommendations.length} recommended on top)` : "of " + rooms.length + " rooms"}
                    </p>
                  </div>
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
                    onClick={() => setSort("recommended")}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${sort === "recommended" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}
                  >
                    ✨ Recommended
                  </button>
                  <button
                    onClick={() => setSort("popularity")}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${sort === "popularity" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}
                  >
                    🔥 Popularity Ranked
                  </button>
                  <button
                    onClick={() => setSort("distance")}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${sort === "distance" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}
                  >
                    📍 Nearest
                  </button>
                  <button
                    onClick={() => setSort("price_asc")}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${sort === "price_asc" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}
                  >
                    Price: Low to High
                  </button>
                  <button
                    onClick={() => setSort("price_desc")}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${sort === "price_desc" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}
                  >
                    Price: High to Low
                  </button>
                  <button
                    onClick={() => setSort("newest")}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${sort === "newest" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}
                  >
                    Newest
                  </button>
                </div>

                <div className={view === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-3"}>
                  {filtered.map((room) => {
                    const rating = avgRating(room);
                    const amenityNames = (room.roomAmenities || []).map((ra) => ra.amenity.name);
                    const recItem = usingRecommendations ? recommendationMap.get(room.id) : undefined;
                    const match = recItem ? formatMatchPercent(recItem, recommendationSource) : null;
                    return (
                      <div key={room.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xs transition-shadow hover:shadow-md">
                        <button
                          onClick={() => openDetails(room)}
                          className="relative block h-40 w-full sm:h-44 md:h-40"
                        >
                          <img
                            src={resolveImageUrl(room.roomImages?.[0]?.imageUrl)}
                            alt={room.title}
                            className="h-full w-full object-cover"
                          />
                          {match ? (
                            <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs ${
                              match.hasScore ? "bg-stone-900/85" : "bg-blue-600/85"
                            }`}>
                              {match.hasScore ? `⚡ ${match.text}` : match.text}
                            </span>
                          ) : room.status === "AVAILABLE" ? (
                            <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                              Available Now
                            </span>
                          ) : null}
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
                          <p className="mb-2 flex items-center justify-between gap-1 text-xs text-stone-500">
                            <span className="flex items-center gap-1 truncate">
                              <MapPin size={11} /> {room.location}, {room.city}
                            </span>
                            {getRoomDistance(room) < 999999 && (
                              <span className="shrink-0 text-[11px] font-medium text-blue-600">
                                {formatDistance(getRoomDistance(room))} away
                              </span>
                            )}
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

                          {getRoomNearbyLandmarks(room).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-emerald-700">
                              <span className="font-medium text-emerald-800">Near:</span>
                              {getRoomNearbyLandmarks(room).slice(0, 2).map((l) => (
                                <span key={l} className="rounded-md bg-emerald-50 px-1.5 py-0.5 border border-emerald-100 font-medium">
                                  {l}
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