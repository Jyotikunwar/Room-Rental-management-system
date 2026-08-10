import { useState } from "react";
import { MapPin, Search, Loader2, Star, X } from "lucide-react";
import type { Room } from "../../services/api";
import { api } from "../../services/api";

export interface LandingSearchValues {
  location: string;
  budget: string;
  roomType: string;
  timeframe: string;
}

interface LandingSearchBarProps {
  onSearch?: (values: LandingSearchValues) => void;
}

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

function parseBudget(budget: string): { minPrice?: number; maxPrice?: number } {
  if (!budget) return {};
  if (budget === "20000+") return { minPrice: 20000 };
  const [min, max] = budget.split("-").map(Number);
  return { minPrice: min, maxPrice: max };
}

export default function LandingSearchBar({ onSearch }: LandingSearchBarProps) {
  const [values, setValues] = useState<LandingSearchValues>({
    location: "",
    budget: "",
    roomType: "",
    timeframe: "",
  });

  const [results, setResults] = useState<Room[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof LandingSearchValues>(key: K, value: LandingSearchValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const runSearch = async () => {
    onSearch?.(values);
    setLoading(true);
    setError(null);
    try {
      const { minPrice, maxPrice } = parseBudget(values.budget);
      const params: Record<string, any> = { status: "AVAILABLE" };
      if (values.location.trim()) params.search = values.location.trim();
      if (values.roomType) params.roomType = values.roomType;
      if (minPrice != null) params.minPrice = minPrice;
      if (maxPrice != null) params.maxPrice = maxPrice;

      const res = await api.getRooms(params);
      if (res && res.success === false) {
        setError(res.message || "Failed to search rooms");
        setResults([]);
      } else {
        const list = Array.isArray(res) ? res : res?.rooms || res?.data || [];
        setResults(list);
      }
    } catch {
      setError("Failed to search rooms. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => setResults(null);

  return (
    <div>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={values.location}
              onChange={(e) => update("location", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="City or neighborhood"
              className="h-11 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-gray-900"
            />
          </div>

          <select
            value={values.budget}
            onChange={(e) => update("budget", e.target.value)}
            className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-600 outline-none focus:border-gray-900"
          >
            <option value="">Any Budget</option>
            <option value="0-5000">Under Rs. 5,000</option>
            <option value="5000-10000">Rs. 5,000 – 10,000</option>
            <option value="10000-20000">Rs. 10,000 – 20,000</option>
            <option value="20000+">Rs. 20,000+</option>
          </select>

          <select
            value={values.roomType}
            onChange={(e) => update("roomType", e.target.value)}
            className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-600 outline-none focus:border-gray-900"
          >
            <option value="">Any Type</option>
            <option value="SINGLE">Single Room</option>
            <option value="DOUBLE">Double Room</option>
            <option value="FLAT">Flat</option>
            <option value="APARTMENT">Apartment</option>
          </select>

          <button
            onClick={runSearch}
            disabled={loading}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </button>
        </div>
      </div>

      {/* ---- Inline results ---- */}
      {results !== null && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {loading
                ? "Searching..."
                : error
                ? error
                : `${results.length} room${results.length === 1 ? "" : "s"} found${
                    values.location ? ` in "${values.location}"` : ""
                  }`}
            </p>
            <button onClick={clearResults} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700">
              <X size={13} /> Clear
            </button>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
              <p className="text-sm text-gray-500">No rooms found. Try a different location or budget.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((room) => {
                const rating = avgRating(room);
                return (
                  <div key={room.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    <div className="relative h-36 w-full bg-gray-100">
                      {room.roomImages?.[0] ? (
                        <img
                          src={resolveImageUrl(room.roomImages[0].imageUrl)}
                          alt={room.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-400">No image</div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold text-gray-900">{room.title}</h3>
                        {rating !== null && (
                          <span className="flex shrink-0 items-center gap-0.5 text-xs text-amber-500">
                            <Star size={12} fill="currentColor" /> {rating}
                          </span>
                        )}
                      </div>
                      <p className="mb-1.5 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={11} /> {room.location}, {room.city}
                      </p>
                      <p className="text-sm font-semibold text-blue-700">
                        Rs. {room.price.toLocaleString()}
                        <span className="text-xs font-normal text-gray-400">/month</span>
                      </p>
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
