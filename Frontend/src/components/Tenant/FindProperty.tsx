import { useMemo, useState } from "react";
import {
  Search, Bell, Heart, Plus, Minus, LocateFixed,
  Wifi, Car, Grid2x2, List as ListIcon, MapPin, Star, X,
} from "lucide-react";
import type { User } from "../../services/api";
import { Sidebar, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";

// ---------- Types ----------
interface Listing {
  id: number;
  title: string;
  area: string;
  price: number;
  deposit: number;
  rating: number;
  roomType: "Single Room" | "Flat" | "1 BHK" | "Shared";
  amenities: ("WiFi" | "Parking" | "Kitchen")[];
  availableNow: boolean;
  img: string;
  mapLabel: string;
  top: string; // position on the mock map, in %
  left: string;
}

interface FindPropertyProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

// ---------- Sample data (replace with API data) ----------
const LISTINGS: Listing[] = [
  {
    id: 1, title: "Luxury 2BHK", area: "Baneshwor", price: 18500, deposit: 37000,
    rating: 4.9, roomType: "Flat", amenities: ["WiFi", "Parking", "Kitchen"],
    availableNow: true, img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80",
    mapLabel: "Rs. 18.5k", top: "28%", left: "78%",
  },
  {
    id: 2, title: "Modern Studio", area: "Koteshwor", price: 22000, deposit: 40000,
    rating: 4.6, roomType: "1 BHK", amenities: ["WiFi", "Kitchen"],
    availableNow: true, img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80",
    mapLabel: "Rs. 22k", top: "40%", left: "90%",
  },
  {
    id: 3, title: "Cozy Single Room", area: "Kalanki", price: 12000, deposit: 20000,
    rating: 4.3, roomType: "Single Room", amenities: ["WiFi"],
    availableNow: false, img: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=600&q=80",
    mapLabel: "Rs. 12k", top: "72%", left: "88%",
  },
  {
    id: 4, title: "Shared Flat, Female Only", area: "Patan", price: 15000, deposit: 25000,
    rating: 4.5, roomType: "Shared", amenities: ["WiFi", "Parking"],
    availableNow: true, img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80",
    mapLabel: "Rs. 15k", top: "58%", left: "68%",
  },
];

const ROOM_TYPES: Listing["roomType"][] = ["Single Room", "Flat", "1 BHK", "Shared"];
const AMENITY_OPTIONS = ["Free WiFi", "Parking Space", "Water Supply", "Attached Bathroom", "Kitchen", "Laundry", "Pet Friendly"];
const LANDMARKS = ["College", "Hospital", "Main Road"];
const QUICK_FILTERS = ["WiFi", "Parking", "Female Only"];

export default function FindProperty({ user, onLogout, onNavigate }: FindPropertyProps) {
  const [query, setQuery] = useState("");
  const [roomType, setRoomType] = useState<Listing["roomType"] | "All">("All");
  const [availableNow, setAvailableNow] = useState(false);
  const [amenities, setAmenities] = useState<Set<string>>(new Set());
  const [quickFilters, setQuickFilters] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<"newest" | "price">("newest");

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

  const toggleSave = (id: number) =>
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const filtered = useMemo(() => {
    let rooms = LISTINGS.filter((r) => {
      const matchesQuery = query.trim() === "" || r.area.toLowerCase().includes(query.toLowerCase()) || r.title.toLowerCase().includes(query.toLowerCase());
      const matchesType = roomType === "All" || r.roomType === roomType;
      const matchesAvailable = !availableNow || r.availableNow;
      const matchesQuick = [...quickFilters].every((q) => (r.amenities as string[]).includes(q) || q === "Female Only");
      return matchesQuery && matchesType && matchesAvailable && matchesQuick;
    });
    if (sort === "price") rooms = [...rooms].sort((a, b) => a.price - b.price);
    return rooms;
  }, [query, roomType, availableNow, quickFilters, sort]);

  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  return (
    <div className="flex min-h-screen w-full bg-stone-50 text-stone-900">
      <Sidebar
        active="Find Rooms"
        onNavigate={handleNavigate}
        onSettings={() => onNavigate("settings")}
        onLogout={onLogout}
      />

      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-4 border-b border-stone-200 bg-white px-4 py-3 pl-14 sm:px-6 sm:pl-6">
          <h1 className="text-lg font-semibold">Find Property</h1>
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
            <Search size={16} className="shrink-0 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search neighborhood (e.g. Baneshwor, Kalanki)..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
            />
          </div>
          <button onClick={() => onNavigate("notifications")} className="relative text-stone-500 hover:text-stone-700">
            <Bell size={18} />
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

        {/* Body: filters | listings | map */}
        <div className="flex flex-1 flex-col lg:flex-row">
          {/* ---- Filters sidebar ---- */}
          <aside className="w-full shrink-0 border-b border-stone-200 bg-white p-4 lg:w-64 lg:border-b-0 lg:border-r">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold">Filters</span>
              <button
                onClick={() => {
                  setRoomType("All");
                  setAvailableNow(false);
                  setAmenities(new Set());
                }}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Reset All
              </button>
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
                <span>NPR 2,000</span>
                <span>NPR 50,000</span>
              </div>
              <input type="range" min={2000} max={50000} className="mt-1 w-full accent-blue-600" readOnly value={26000} />
            </div>

            <div className="mb-5">
              <p className="mb-2 text-xs font-medium text-stone-500">Deposit Range (NPR)</p>
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span>NPR 0</span>
                <span>NPR 100,000</span>
              </div>
              <input type="range" min={0} max={100000} className="mt-1 w-full accent-blue-600" readOnly value={40000} />
            </div>

            <div className="mb-5">
              <p className="mb-2 text-xs font-medium text-stone-500">Room Type</p>
              <div className="grid grid-cols-2 gap-2">
                {ROOM_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setRoomType(roomType === t ? "All" : t)}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                      roomType === t ? "border-blue-600 text-blue-600" : "border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <p className="mb-2 text-xs font-medium text-stone-500">Furnishing</p>
              <select className="w-full rounded-lg border border-stone-200 px-2 py-1.5 text-xs text-stone-600 outline-none">
                <option>Any</option>
                <option>Fully Furnished</option>
                <option>Semi Furnished</option>
                <option>Unfurnished</option>
              </select>
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

            <div>
              <p className="mb-2 text-xs font-medium text-stone-500">Near Landmark</p>
              <div className="flex flex-wrap gap-1.5">
                {LANDMARKS.map((l) => (
                  <span key={l} className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] text-stone-600">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </aside>

          {/* ---- Listings ---- */}
          <section className="flex-1 p-4 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-stone-500">
                Showing 1–{filtered.length} of {LISTINGS.length} rooms in <span className="font-medium text-stone-700">Kathmandu</span>
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

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-stone-400">Sort by:</span>
              <button
                onClick={() => setSort("newest")}
                className={`rounded-full px-3 py-1 text-xs font-medium ${sort === "newest" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}
              >
                Newest
              </button>
              <button
                onClick={() => setSort("price")}
                className={`rounded-full px-3 py-1 text-xs font-medium ${sort === "price" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}
              >
                Price: Low to High
              </button>

              <span className="mx-1 h-4 w-px bg-stone-200" />

              {QUICK_FILTERS.map((q) => (
                <button
                  key={q}
                  onClick={() => toggleQuickFilter(q)}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    quickFilters.has(q) ? "border-blue-600 bg-blue-50 text-blue-600" : "border-stone-200 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {q === "WiFi" && <Wifi size={11} />}
                  {q === "Parking" && <Car size={11} />}
                  {q}
                </button>
              ))}
            </div>

            <div className={view === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-3"}>
              {filtered.map((room) => (
                <div key={room.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                  <div className="relative h-40 w-full">
                    <img src={room.img} alt={room.title} className="h-full w-full object-cover" />
                    {room.availableNow && (
                      <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Available Now
                      </span>
                    )}
                    <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                      Compare
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{room.title}</h3>
                      <span className="flex items-center gap-0.5 text-xs text-amber-500">
                        <Star size={12} fill="currentColor" /> {room.rating}
                      </span>
                    </div>
                    <p className="mb-2 flex items-center gap-1 text-xs text-stone-500">
                      <MapPin size={11} /> {room.area}
                    </p>
                    <p className="text-sm font-semibold text-blue-700">
                      Rs. {room.price.toLocaleString()}/month
                      <span className="ml-2 text-xs font-normal text-stone-400">Deposit Rs. {room.deposit.toLocaleString()}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {room.amenities.map((a) => (
                        <span key={a} className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] text-stone-500">
                          {a}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-500">
                        Book Now
                      </button>
                      <button className="flex-1 rounded-lg bg-stone-900 py-1.5 text-xs font-medium text-white hover:bg-stone-800">
                        View Details
                      </button>
                      <button
                        onClick={() => toggleSave(room.id)}
                        className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs ${
                          savedIds.has(room.id) ? "border-rose-200 bg-rose-50 text-rose-500" : "border-stone-200 text-stone-500"
                        }`}
                      >
                        <Heart size={12} fill={savedIds.has(room.id) ? "currentColor" : "none"} /> Save
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 p-10 text-center">
                  <X size={20} className="text-stone-300" />
                  <p className="text-sm text-stone-500">No rooms match these filters.</p>
                </div>
              )}
            </div>
          </section>

          {/* ---- Map (mock) ---- */}
          <aside className="relative hidden w-80 shrink-0 border-l border-stone-200 bg-blue-50 xl:block">
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(#c7d7f5_1px,transparent_1px),linear-gradient(90deg,#c7d7f5_1px,transparent_1px)] [background-size:24px_24px]" />

            {LISTINGS.map((room) => (
              <span
                key={room.id}
                style={{ top: room.top, left: room.left }}
                className="absolute -translate-x-1/2 -translate-y-full rounded-full bg-stone-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md"
              >
                {room.mapLabel}
              </span>
            ))}

            <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow" />

            <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
              <button className="flex h-8 w-8 items-center justify-center border-b border-stone-100 text-stone-500 hover:bg-stone-50">
                <Plus size={14} />
              </button>
              <button className="flex h-8 w-8 items-center justify-center border-b border-stone-100 text-stone-500 hover:bg-stone-50">
                <Minus size={14} />
              </button>
              <button className="flex h-8 w-8 items-center justify-center text-stone-500 hover:bg-stone-50">
                <LocateFixed size={14} />
              </button>
            </div>

            <div className="absolute bottom-3 left-3 flex overflow-hidden rounded-lg border border-stone-200 bg-white text-xs shadow-sm">
              <button className="bg-stone-900 px-3 py-1.5 font-medium text-white">Map</button>
              <button className="px-3 py-1.5 text-stone-500 hover:bg-stone-50">Satellite</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
