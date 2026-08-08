import { useEffect, useState } from "react";
import {
  Search, Heart, Clock, ClipboardList, MapPin, Sparkles,
  ChevronLeft, ChevronRight, Plus, Eye, CreditCard, Phone,
  AlertTriangle, UserPlus2, MessageCircle, Loader2,
} from "lucide-react";
import type { User, DashboardStats, Booking, Favorite, Notification, RecommendationResult } from "../../services/api";
import { api } from "../../services/api";
import { Sidebar, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";

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

const CITY_SUGGESTIONS = ["Kathmandu", "Pokhara", "Lalitpur", "Bhaktapur"];

interface PlaceSuggestion {
  display_name: string;
  place_id: number;
}

// Free geocoding (OpenStreetMap Nominatim, no API key) so the location field
// isn't limited to a hardcoded city list — any real place can be searched.
async function fetchPlaceSuggestions(q: string): Promise<PlaceSuggestion[]> {
  if (q.trim().length < 2) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=np&limit=6&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  return res.json();
}
const BUDGETS = [
  { label: "Any Budget", min: 0, max: Infinity },
  { label: "Under Rs. 8,000", min: 0, max: 8000 },
  { label: "Rs. 8,000 - 15,000", min: 8000, max: 15000 },
  { label: "Above Rs. 15,000", min: 15000, max: Infinity },
];
const ROOM_TYPES = [
  { label: "Any Type", value: "" },
  { label: "Single Room", value: "SINGLE" },
  { label: "Double Room", value: "DOUBLE" },
  { label: "Flat", value: "FLAT" },
  { label: "Apartment", value: "APARTMENT" },
];

// Passed to FindProperty via sessionStorage since this app doesn't use a router —
// FindProperty reads "tenantSearchFilters" once on mount to pre-apply these.
function stashSearchFilters(filters: Record<string, unknown>) {
  sessionStorage.setItem("tenantSearchFilters", JSON.stringify(filters));
}

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

export default function TenantDashboard({ user, onLogout, onNavigate }: TenantDashboardProps) {
  const [data, setData] = useState<TenantDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingRoomId, setSavingRoomId] = useState<number | null>(null);

  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false);
  const [budgetLabel, setBudgetLabel] = useState(BUDGETS[0].label);
  const [roomType, setRoomType] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getTenantDashboard()
      .then((res: TenantDashboardResponse) => {
        if (cancelled) return;
        if (res.success) setData(res);
        else setError(res.message || "Failed to load dashboard");
      })
      .catch(() => !cancelled && setError("Failed to load dashboard"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced live place search as the user types in the location field.
  useEffect(() => {
    if (city.trim().length < 2) {
      setPlaceSuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetchPlaceSuggestions(city)
        .then((results) => setPlaceSuggestions(results))
        .catch(() => setPlaceSuggestions([]));
    }, 400);
    return () => clearTimeout(timeout);
  }, [city]);

  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  const toggleSave = async (roomId: number) => {
    setSavingRoomId(roomId);
    try {
      await api.toggleFavorite(roomId);
      const res: TenantDashboardResponse = await api.getTenantDashboard();
      if (res.success) setData(res);
    } catch {
      // best-effort — leave existing state if the request fails
    } finally {
      setSavingRoomId(null);
    }
  };

  const runSearch = () => {
    const budget = BUDGETS.find((b) => b.label === budgetLabel) || BUDGETS[0];
    stashSearchFilters({
      query,
      city: city.trim(),
      minPrice: budget.min,
      maxPrice: budget.max === Infinity ? undefined : budget.max,
      roomType,
    });
    onNavigate("search");
  };

  const viewMatches = () => {
    stashSearchFilters({ query: data?.stats.preferredLocation ?? "" });
    onNavigate("search");
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

  const { stats, activeRental, recentSaved, notifications, recommendations } = data;

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
        {/* ---- Top bar: functional search + filters ---- */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 pl-14 sm:pl-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
            <Search size={16} className="shrink-0 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Search rooms by area..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="relative flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-stone-600">
              <MapPin size={14} className="shrink-0 text-stone-400" />
              <input
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setShowPlaceSuggestions(true);
                }}
                onFocus={() => setShowPlaceSuggestions(true)}
                onBlur={() => setTimeout(() => setShowPlaceSuggestions(false), 150)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Any city or area"
                className="w-32 bg-transparent outline-none placeholder:text-stone-400 sm:w-40"
              />

              {showPlaceSuggestions && (city.trim().length >= 2 ? placeSuggestions.length > 0 : true) && (
                <div className="absolute left-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
                  {city.trim().length < 2 && (
                    <>
                      <p className="px-3 pt-2 text-[10px] font-medium uppercase text-stone-400">Popular</p>
                      {CITY_SUGGESTIONS.map((c) => (
                        <button
                          key={c}
                          onMouseDown={() => {
                            setCity(c);
                            setShowPlaceSuggestions(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
                        >
                          <MapPin size={13} className="shrink-0 text-stone-400" /> {c}
                        </button>
                      ))}
                    </>
                  )}
                  {placeSuggestions.map((p) => (
                    <button
                      key={p.place_id}
                      onMouseDown={() => {
                        setCity(p.display_name.split(",")[0]);
                        setShowPlaceSuggestions(false);
                      }}
                      className="flex w-full items-start gap-2 border-t border-stone-50 px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 first:border-t-0"
                    >
                      <MapPin size={13} className="mt-0.5 shrink-0 text-stone-400" />
                      <span className="truncate">{p.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </label>
            <select
              value={budgetLabel}
              onChange={(e) => setBudgetLabel(e.target.value)}
              className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-stone-600 outline-none"
            >
              {BUDGETS.map((b) => (
                <option key={b.label} value={b.label}>{b.label}</option>
              ))}
            </select>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-stone-600 outline-none"
            >
              {ROOM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button
              onClick={runSearch}
              className="rounded-lg bg-stone-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 active:scale-[0.97]"
            >
              Search
            </button>
          </div>
        </div>

        {/* ---- Welcome ---- */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Namaste, {firstName} 👋</h1>
          <p className="text-sm text-stone-500">Find your next sanctuary in the heart of the city.</p>
        </div>

        {/* ---- Recommendation banner ---- */}
        <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
              <Sparkles size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-blue-700">Recommended Based On Your Preferences</p>
              <p className="text-xs text-stone-500">
                Because you searched <span className="font-medium text-blue-600">{stats.preferredLocation}</span> · {stats.locationMatches} New Rooms Available
              </p>
            </div>
          </div>
          <button
            onClick={viewMatches}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-500 active:scale-[0.97]"
          >
            View Matches
          </button>
        </div>

        {/* ---- Stats row ---- */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-stone-400"><Search size={14} /><span className="text-xs">Active</span></div>
            <p className="text-xs text-stone-400">Search Rooms</p>
            <p className="text-lg font-semibold">{stats.availableRooms} available rooms</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-rose-400"><Heart size={14} /><span className="text-xs">Favorites</span></div>
            <p className="text-xs text-stone-400">Saved Rooms</p>
            <p className="text-lg font-semibold">{stats.savedRooms}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-amber-500"><Clock size={14} /><span className="text-xs">Upcoming</span></div>
            <p className="text-xs text-stone-400">Rent Due In</p>
            <p className="text-lg font-semibold text-amber-600">
              {stats.rentDueInDays !== null ? `${stats.rentDueInDays} days` : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-stone-400"><ClipboardList size={14} /><span className="text-xs">Reviewing</span></div>
            <p className="text-xs text-stone-400">Pending Requests</p>
            <p className="text-lg font-semibold">{stats.pendingRequests}</p>
          </div>
        </div>

        {/* ---- Current Rental (compact) ---- */}
        {activeRental && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Current Rental</h2>
              <button onClick={() => onNavigate("rental")} className="text-xs font-medium text-blue-600 hover:underline">Manage Lease</button>
            </div>
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 sm:gap-4 sm:p-4">
              <img
                src={activeRental.room?.roomImages?.[0]?.imageUrl || "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&q=80"}
                alt={activeRental.room?.title}
                className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-28"
              />
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
          <h2 className="text-base font-semibold">Recommended Rooms</h2>
          <div className="flex gap-1.5">
            <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50">
              <ChevronLeft size={14} />
            </button>
            <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        {recommendations.length === 0 ? (
          <p className="mb-8 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-400">
            No recommendations yet — save a room to get personalized matches.
          </p>
        ) : (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map(({ room }) => (
              <div key={room.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <img
                  src={room.roomImages?.[0]?.imageUrl || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80"}
                  alt={room.title}
                  className="h-32 w-full object-cover"
                />
                <div className="p-3">
                  <h3 className="text-sm font-semibold">{room.title}</h3>
                  <p className="text-xs text-stone-500">{room.location} · {room.roomType}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => toggleSave(room.id)}
                      disabled={savingRoomId === room.id}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-transform active:scale-[0.9] ${
                        savedRoomIds.has(room.id) ? "border-rose-200 bg-rose-50 text-rose-500" : "border-stone-200 text-stone-400"
                      }`}
                      aria-label="Save room"
                    >
                      <Heart size={14} fill={savedRoomIds.has(room.id) ? "currentColor" : "none"} />
                    </button>
                    <button className="flex-1 rounded-lg border border-stone-200 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 active:scale-[0.97]">
                      View Details
                    </button>
                    <button className="flex-1 rounded-lg bg-stone-900 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-800 active:scale-[0.97]">
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
                  <img
                    src={fav.room?.roomImages?.[0]?.imageUrl || "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=200&q=80"}
                    alt={fav.room?.title}
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
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
    </div>
  );
}
