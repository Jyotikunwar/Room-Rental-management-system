import { useState, useMemo } from "react";
import {
  MapPin,
  Search,
  Loader2,
  Star,
  X,
  SlidersHorizontal,
  Check,
  Filter,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { Room } from "../../services/api";
import { api, getImageUrl } from "../../services/api";

export interface LandingSearchValues {
  location: string;
  city: string;
  budget: string;
  roomType: string;
  minPrice?: number;
  maxPrice?: number;
  amenities: string[];
  sortBy: string;
}

interface LandingSearchBarProps {
  onSearch?: (values: LandingSearchValues) => void;
  onSelectRoom?: (room: Room) => void;
  onBrowseRooms?: () => void;
}

const CITIES = ["All Cities", "Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara"];

const ROOM_TYPES = [
  { value: "", label: "All Room Types" },
  { value: "SINGLE", label: "Single Room" },
  { value: "DOUBLE", label: "Double Room" },
  { value: "FLAT", label: "Flat" },
  { value: "APARTMENT", label: "Apartment" },
];

const BUDGET_OPTIONS = [
  { value: "", label: "Any Budget" },
  { value: "0-5000", label: "Under Rs. 5,000" },
  { value: "5000-10000", label: "Rs. 5,000 – 10,000" },
  { value: "10000-20000", label: "Rs. 10,000 – 20,000" },
  { value: "20000+", label: "Rs. 20,000+" },
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

function avgRating(room: Room): number | null {
  if (!room.reviews || room.reviews.length === 0) return null;
  const sum = room.reviews.reduce((s, r) => s + r.rating, 0);
  return Math.round((sum / room.reviews.length) * 10) / 10;
}

function parseBudget(budget: string): { minPrice?: number; maxPrice?: number } {
  if (!budget) return {};
  if (budget === "20000+") return { minPrice: 20000 };
  const [min, max] = budget.split("-").map(Number);
  return { minPrice: min, maxPrice: max };
}

export default function LandingSearchBar({ onSearch, onSelectRoom, onBrowseRooms }: LandingSearchBarProps) {
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [roomType, setRoomType] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState("recommended");

  const [results, setResults] = useState<Room[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (city && city !== "All Cities") count++;
    if (budget) count++;
    if (roomType) count++;
    count += selectedAmenities.size;
    return count;
  }, [city, budget, roomType, selectedAmenities]);

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) => {
      const next = new Set(prev);
      if (next.has(amenity)) next.delete(amenity);
      else next.add(amenity);
      return next;
    });
  };

  const runSearch = async () => {
    setLoading(true);
    setError(null);

    const { minPrice, maxPrice } = parseBudget(budget);
    const searchParams: Record<string, any> = {
      status: "AVAILABLE",
      sortBy,
    };

    if (location.trim()) searchParams.search = location.trim();
    if (city && city !== "All Cities") searchParams.city = city;
    if (roomType) searchParams.roomType = roomType;
    if (minPrice != null) searchParams.minPrice = minPrice;
    if (maxPrice != null) searchParams.maxPrice = maxPrice;
    if (selectedAmenities.size > 0) {
      searchParams.amenities = Array.from(selectedAmenities).join(",");
    }

    onSearch?.({
      location,
      city,
      budget,
      roomType,
      minPrice,
      maxPrice,
      amenities: Array.from(selectedAmenities),
      sortBy,
    });

    try {
      const res = await api.getRooms(searchParams);
      if (res && res.success === false) {
        setError(res.message || "Failed to search rooms");
        setResults([]);
      } else {
        const list = Array.isArray(res) ? res : res?.rooms || res?.data || [];
        setResults(list);
      }
    } catch (e) {
      setError("Failed to connect to backend server. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setLocation("");
    setCity("");
    setBudget("");
    setRoomType("");
    setSelectedAmenities(new Set());
    setResults(null);
    setError(null);
  };

  return (
    <div className="w-full">
      {/* Main Search Panel Card */}
      <div className="rounded-2xl border border-gray-200/80 bg-white/95 p-4 shadow-xl shadow-blue-900/5 backdrop-blur sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-center">
          {/* Location / Keyword Input */}
          <div className="relative lg:col-span-4">
            <MapPin size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="City, area, or room title (e.g. Baneshwor)..."
              className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* City Dropdown */}
          <div className="relative lg:col-span-2">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Room Type Dropdown */}
          <div className="relative lg:col-span-2">
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              {ROOM_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>
                  {rt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Budget Dropdown */}
          <div className="relative lg:col-span-2">
            <select
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              {BUDGET_OPTIONS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons: Search & Filter Drawer Toggle */}
          <div className="flex items-center gap-2 lg:col-span-2">
            <button
              onClick={() => setFilterDrawerOpen(true)}
              className="relative flex h-12 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 active:scale-95"
              title="Advanced Filters"
            >
              <SlidersHorizontal size={16} />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              onClick={runSearch}
              disabled={loading}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95 disabled:opacity-60 shadow-lg shadow-blue-600/20"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              Search
            </button>
          </div>
        </div>

        {/* Quick Amenity Chips */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          <span className="text-xs font-medium text-gray-400">Amenities:</span>
          {AMENITY_OPTIONS.slice(0, 6).map((amenity) => {
            const isSelected = selectedAmenities.has(amenity);
            return (
              <button
                key={amenity}
                onClick={() => toggleAmenity(amenity)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  isSelected
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-gray-100/70 text-gray-600 hover:bg-gray-200/80 border border-transparent"
                }`}
              >
                {isSelected && <Check size={12} />}
                {amenity}
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Filter Drawer Modal */}
      {filterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-md flex-col bg-white p-6 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">Advanced Search Filters</h3>
              </div>
              <button
                onClick={() => setFilterDrawerOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-6">
              {/* Sort By */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Sort Results By
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "recommended", label: "Recommended" },
                    { value: "price_asc", label: "Price: Low to High" },
                    { value: "price_desc", label: "Price: High to Low" },
                    { value: "newest", label: "Newest First" },
                  ].map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSortBy(s.value)}
                      className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                        sortBy === s.value
                          ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* City Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  City / Region
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CITIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCity(c)}
                      className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                        city === c
                          ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Room Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Room Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ROOM_TYPES.map((rt) => (
                    <button
                      key={rt.value}
                      onClick={() => setRoomType(rt.value)}
                      className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                        roomType === rt.value
                          ? "border-blue-600 bg-blue-50 text-blue-700 font-semibold"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {rt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Budget (NPR)
                </label>
                <div className="space-y-1.5">
                  {BUDGET_OPTIONS.map((b) => (
                    <label key={b.value} className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="budget-drawer"
                        checked={budget === b.value}
                        onChange={() => setBudget(b.value)}
                        className="h-4 w-4 accent-blue-600"
                      />
                      {b.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Required Amenities
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AMENITY_OPTIONS.map((amenity) => {
                    const isChecked = selectedAmenities.has(amenity);
                    return (
                      <label
                        key={amenity}
                        className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs cursor-pointer transition ${
                          isChecked ? "border-blue-500 bg-blue-50/60 text-blue-700" : "border-gray-200 text-gray-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAmenity(amenity)}
                          className="h-3.5 w-3.5 accent-blue-600"
                        />
                        {amenity}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
              <button
                onClick={() => {
                  setCity("");
                  setRoomType("");
                  setBudget("");
                  setSelectedAmenities(new Set());
                }}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Reset
              </button>
              <button
                onClick={() => {
                  setFilterDrawerOpen(false);
                  runSearch();
                }}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-md shadow-blue-600/20"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Search Results Grid */}
      {results !== null && (
        <div className="mt-8 rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xl shadow-blue-900/5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Search Results
              </h3>
              <p className="text-xs text-gray-500">
                {loading
                  ? "Searching room database..."
                  : error
                  ? error
                  : `${results.length} room${results.length === 1 ? "" : "s"} found matching your query.`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {onBrowseRooms && (
                <button
                  onClick={onBrowseRooms}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Explore All <ArrowRight size={13} />
                </button>
              )}
              <button
                onClick={clearSearch}
                className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
              >
                <X size={13} /> Clear Results
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 py-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-100" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
              <Sparkles className="mx-auto mb-2 text-gray-300" size={32} />
              <p className="text-sm font-medium text-gray-700">No matching rooms found</p>
              <p className="mt-1 text-xs text-gray-500">Try adjusting your budget or searching in a different city.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((room) => {
                const rating = avgRating(room);
                const firstImg = room.roomImages?.[0]?.imageUrl;
                return (
                  <div
                    key={room.id}
                    className="group overflow-hidden rounded-2xl border border-gray-200/80 bg-white transition hover:shadow-lg hover:border-blue-300"
                  >
                    <div className="relative h-44 w-full bg-gray-100">
                      {firstImg ? (
                        <img
                          src={getImageUrl(firstImg)}
                          alt={room.title}
                          className="h-full w-full object-cover transition group-hover:scale-105 duration-300"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-400">No Image</div>
                      )}
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-slate-900/80 backdrop-blur-xs px-2.5 py-0.5 text-xs font-semibold text-white">
                        Rs. {room.price.toLocaleString()}/mo
                      </span>
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                        {room.roomType}
                      </span>
                    </div>

                    <div className="p-4">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <h4 className="truncate font-semibold text-gray-900 text-sm">{room.title}</h4>
                        {rating !== null && (
                          <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-amber-500">
                            <Star size={13} fill="currentColor" /> {rating}
                          </span>
                        )}
                      </div>

                      <p className="mb-3 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={12} className="text-gray-400" />
                        {room.location}, {room.city}
                      </p>

                      <button
                        onClick={() => (onSelectRoom ? onSelectRoom(room) : onBrowseRooms?.())}
                        className="w-full rounded-xl bg-gray-900 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
