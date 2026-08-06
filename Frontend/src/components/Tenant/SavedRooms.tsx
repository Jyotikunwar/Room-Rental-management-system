import { useMemo, useState } from "react";
import {
  Search, Heart, MapPin, ChevronDown, Filter, Check,
} from "lucide-react";
import type { User } from "../../services/api";
import { Sidebar, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";

// ---------- Types ----------
type RoomStatus = "available" | "booked" | "loading";

interface SavedRoom {
  id: number;
  title: string;
  location: string;
  price: number;
  deposit: number;
  roomType: string;
  furnishing: string;
  savedAgo: string;
  status: RoomStatus;
  priceDropped: boolean;
  updatedToday: boolean;
  notifyPriceDrop: boolean;
  notifyAvailability: boolean;
  img: string | null;
}

interface SavedRoomsProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

// ---------- Sample data (replace with data fetched from your api/services layer) ----------
const INITIAL_SAVED_ROOMS: SavedRoom[] = [
  {
    id: 1,
    title: "Luxury Studio Room",
    location: "Baneshwor, Kathmandu",
    price: 12000,
    deposit: 24000,
    roomType: "Room",
    furnishing: "Full Furnished",
    savedAgo: "Saved 2 days ago",
    status: "available",
    priceDropped: true,
    updatedToday: true,
    notifyPriceDrop: true,
    notifyAvailability: true,
    img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80",
  },
  {
    id: 2,
    title: "Spacious 1BHK",
    location: "Maitidevi, Kathmandu",
    price: 18500,
    deposit: 37000,
    roomType: "1BHK",
    furnishing: "Unfurnished",
    savedAgo: "Saved 5 days ago",
    status: "booked",
    priceDropped: false,
    updatedToday: false,
    notifyPriceDrop: false,
    notifyAvailability: false,
    img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80",
  },
  {
    id: 3,
    title: "Parking View Deluxe",
    location: "Lazimpat, Kathmandu",
    price: 15000,
    deposit: 30000,
    roomType: "Deluxe",
    furnishing: "Semi-Furnished",
    savedAgo: "Saved 1 week ago",
    status: "available",
    priceDropped: false,
    updatedToday: false,
    notifyPriceDrop: true,
    notifyAvailability: true,
    img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80",
  },
  {
    id: 4,
    title: "Garden Terrace Flat",
    location: "Patan, Lalitpur",
    price: 9500,
    deposit: 19000,
    roomType: "Flat",
    furnishing: "Semi-Furnished",
    savedAgo: "Saved 10 days ago",
    status: "loading",
    priceDropped: false,
    updatedToday: false,
    notifyPriceDrop: false,
    notifyAvailability: false,
    img: null,
  },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Recently Saved" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export default function SavedRooms({ user, onLogout, onNavigate }: SavedRoomsProps) {
  const [rooms, setRooms] = useState<SavedRoom[]>(INITIAL_SAVED_ROOMS);
  const [query, setQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState<SortValue>("recent");
  const [sortOpen, setSortOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<Set<number>>(new Set());
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const toggleCompare = (id: number) =>
    setCompareIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const removeRoom = (id: number) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
    setCompareIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const clearAll = () => {
    setRooms([]);
    setCompareIds(new Set());
  };

  const toggleNotify = (id: number, field: "notifyPriceDrop" | "notifyAvailability") => {
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: !r[field] } : r))
    );
  };

  const filtered = useMemo(() => {
    let list = rooms.filter((r) => {
      const matchesQuery =
        query.trim() === "" ||
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.location.toLowerCase().includes(query.toLowerCase());
      const matchesAvailable = !availableOnly || r.status === "available";
      return matchesQuery && matchesAvailable;
    });
    if (sort === "price-low") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-high") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [rooms, query, availableOnly, sort]);

  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Sort";

  return (
    <div className="flex min-h-screen w-full bg-stone-50 text-stone-900">
      <Sidebar
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
            <button className="relative text-stone-500 hover:text-stone-700">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-500" />
            </button>
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-stone-200">
              <img
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName ?? "U"}`}
                alt={user.fullName}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* ---- Header ---- */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Saved Rooms ({rooms.length})</h1>
            <p className="text-sm text-stone-500">Manage and compare your favorite listings</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort dropdown */}
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

            <button onClick={clearAll} className="text-xs font-medium text-rose-500 hover:underline">
              Clear All
            </button>

            <button className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-stone-800">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
              Compare Selected ({compareIds.size})
            </button>
          </div>
        </div>

        {/* ---- Filters row ---- */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
            <Filter size={14} className="shrink-0 text-stone-400" />
            <input
              placeholder="Filter by location or price..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-stone-50">
              <MapPin size={13} /> Location <ChevronDown size={12} />
            </button>
            <button className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-stone-50">
              Budget <ChevronDown size={12} />
            </button>
            <button className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-stone-50">
              Room Type <ChevronDown size={12} />
            </button>
            <label className="flex items-center gap-1.5 text-xs text-stone-600">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={() => setAvailableOnly((v) => !v)}
                className="h-3.5 w-3.5 accent-blue-600"
              />
              Available Only
            </label>
            <button
              onClick={() => setAdvancedOpen((v) => !v)}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Advanced Filters
            </button>
          </div>
        </div>

        {/* ---- Advanced filters panel ---- */}
        {advancedOpen && (
          <div className="mb-6 grid grid-cols-1 gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-3">
            <div>
              <p className="mb-1.5 text-xs font-medium text-stone-500">Furnishing</p>
              <select className="w-full rounded-lg border border-stone-200 px-2 py-1.5 text-xs text-stone-600 outline-none">
                <option>Any</option>
                <option>Fully Furnished</option>
                <option>Semi Furnished</option>
                <option>Unfurnished</option>
              </select>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-stone-500">Deposit Range</p>
              <input type="range" min={0} max={100000} className="mt-2 w-full accent-blue-600" readOnly value={40000} />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-stone-500">Notify Preferences</p>
              <div className="flex items-center gap-4 text-xs text-stone-600">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" /> Price Drop only
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" /> Availability only
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ---- Room cards ---- */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white p-14 text-center">
            <Heart size={22} className="text-stone-300" />
            <p className="text-sm font-medium text-stone-600">No saved rooms yet</p>
            <p className="text-xs text-stone-400">Rooms you save while browsing will show up here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((room) => (
              <div key={room.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                {/* Image */}
                <div className="relative h-40 w-full bg-stone-100">
                  {room.status === "loading" || !room.img ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-stone-400">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                        <path d="M18 6h.01" />
                      </svg>
                      <span className="text-xs">Loading Preview...</span>
                    </div>
                  ) : (
                    <img src={room.img} alt={room.title} className="h-full w-full object-cover" />
                  )}

                  <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
                    {room.status === "available" && (
                      <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Available
                      </span>
                    )}
                    {room.status === "booked" && (
                      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Already Booked
                      </span>
                    )}
                    {room.priceDropped && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                        Price Dropped Rs. 500
                      </span>
                    )}
                    {room.updatedToday && (
                      <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                        Updated Today
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => removeRoom(room.id)}
                    aria-label="Remove from saved"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow-sm hover:bg-white"
                  >
                    <Heart size={14} fill="currentColor" />
                  </button>

                  {room.status !== "loading" && (
                    <label className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-stone-600">
                      <input
                        type="checkbox"
                        checked={compareIds.has(room.id)}
                        onChange={() => toggleCompare(room.id)}
                        className="h-3 w-3 accent-blue-600"
                      />
                      Compare
                    </label>
                  )}
                </div>

                {/* Body */}
                <div className="p-3">
                  <h3 className="text-sm font-semibold">{room.title}</h3>
                  <p className="mb-1.5 flex items-center gap-1 text-xs text-stone-500">
                    <MapPin size={11} /> {room.location}
                  </p>
                  <p className="text-sm font-semibold text-blue-700">
                    Rs. {room.price.toLocaleString()}
                    <span className="text-xs font-normal text-stone-400">/month</span>
                  </p>

                  <div className="mt-2 flex items-center gap-3 text-[11px] text-stone-500">
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                      Dep: Rs. {room.deposit.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
                      </svg>
                      Type: {room.roomType}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-stone-500">
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      {room.furnishing}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      {room.savedAgo}
                    </span>
                  </div>

                  {room.status !== "loading" && (
                    <div className="mt-3 border-t border-stone-100 pt-2.5">
                      <p className="mb-1.5 text-[11px] font-medium text-stone-500">Notify me about:</p>
                      <div className="flex items-center gap-4 text-[11px] text-stone-600">
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={room.notifyPriceDrop}
                            onChange={() => toggleNotify(room.id, "notifyPriceDrop")}
                            className="h-3.5 w-3.5 accent-blue-600"
                          />
                          Price Drop
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={room.notifyAvailability}
                            onChange={() => toggleNotify(room.id, "notifyAvailability")}
                            className="h-3.5 w-3.5 accent-blue-600"
                          />
                          Availability
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-col gap-2">
                    {room.status === "booked" ? (
                      <button disabled className="rounded-lg bg-stone-100 py-1.5 text-xs font-medium text-stone-400">
                        Waitlist Only
                      </button>
                    ) : (
                      <button className="rounded-lg bg-stone-900 py-1.5 text-xs font-medium text-white hover:bg-stone-800">
                        Book Now
                      </button>
                    )}
                    {room.status !== "loading" && (
                      <div className="flex gap-2">
                        <button className="flex-1 rounded-lg border border-stone-200 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">
                          View Details
                        </button>
                        <button className="flex-1 rounded-lg border border-blue-200 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50">
                          Contact Owner
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
