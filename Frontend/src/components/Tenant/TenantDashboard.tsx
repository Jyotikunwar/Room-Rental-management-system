import { useState } from "react";
import {
  Search, Heart, Clock, ClipboardList, MapPin, ChevronDown, Sparkles,
  ChevronLeft, ChevronRight, Plus, Eye, CreditCard, Phone,
  AlertTriangle, UserPlus2, MessageCircle,
} from "lucide-react";
import type { User } from "../../services/api";
import { Sidebar, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";

interface TenantDashboardProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

// ---------- Types ----------
interface Room {
  id: number;
  title: string;
  area: string;
  floor: string;
  tag: string;
  price: number;
  img: string;
}

// ---------- Sample data (replace with data fetched from your api/services layer) ----------
const RECOMMENDED_ROOMS: Room[] = [
  { id: 1, title: "Modern Flat, Lazimpat", area: "Lazimpat", floor: "2nd Floor", tag: "Fully Furnished", price: 15000, img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80" },
  { id: 2, title: "Heritage Room, Patan", area: "Patan", floor: "Quiet Area", tag: "Wi-Fi Included", price: 8500, img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80" },
  { id: 3, title: "Rooftop Studio, Koteshwor", area: "Koteshwor", floor: "Top Floor", tag: "Solar Backup", price: 11000, img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80" },
];

const CURRENT_RENTAL = {
  title: "Shanti Niwas, Baneshwor",
  type: "Single room · 250 sq.ft",
  price: 8500,
  nextPayment: "28 July",
  leaseProgress: 75,
  img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80",
};

const NOTIFICATIONS = [
  { id: 1, icon: AlertTriangle, tone: "text-amber-500 bg-amber-50", title: "Rent payment due on 28 July", subtitle: "5 days remaining to avoid late fees." },
  { id: 2, icon: UserPlus2, tone: "text-blue-500 bg-blue-50", title: "New room in Baneshwor", subtitle: "Matches your budget and room type filters." },
  { id: 3, icon: MessageCircle, tone: "text-stone-500 bg-stone-100", title: "Owner replied", subtitle: "The owner of Kalanki room responded to your query." },
];

const RECENTLY_SAVED = [
  { id: 1, title: "Room in Kalanki", price: 6000, savedAgo: "Saved 2 days ago", img: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=200&q=80" },
  { id: 2, title: "Flat in Chabahil", price: 15000, savedAgo: "Saved 5 days ago", img: "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=200&q=80" },
];

export default function TenantDashboard({ user, onLogout, onNavigate }: TenantDashboardProps) {
  const [query, setQuery] = useState("");
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  const toggleSave = (id: number) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  const firstName = user.fullName?.split(" ")[0] || "there";

  return (
    <div className="flex min-h-screen w-full bg-stone-50 text-stone-900">
      <Sidebar
        active="Dashboard"
        onNavigate={handleNavigate}
        onSettings={() => onNavigate("settings")}
        onLogout={onLogout}
      />

      <main className="flex-1 p-4 sm:p-6">
        {/* ---- Top bar ---- */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-3 pl-14 sm:flex-row sm:items-center sm:gap-3 sm:pl-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-stone-100 px-3 py-2">
            <Search size={16} className="shrink-0 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rooms..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-stone-600 hover:bg-stone-50">
              <MapPin size={14} /> Kathmandu <ChevronDown size={13} />
            </button>
            <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-stone-600 hover:bg-stone-50">
              Budget <ChevronDown size={13} />
            </button>
            <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-stone-600 hover:bg-stone-50">
              Room Type <ChevronDown size={13} />
            </button>
            <button className="rounded-lg bg-stone-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-800">
              Search
            </button>
            <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-stone-600 hover:bg-stone-50">
              <span className="h-5 w-5 rounded-full bg-stone-200 bg-cover" style={{ backgroundImage: `url(https://api.dicebear.com/7.x/initials/svg?seed=${firstName})` }} />
              {firstName} <ChevronDown size={13} />
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
                Because you searched <span className="font-medium text-blue-600">Baneshwor</span> · 3 New Rooms Available
              </p>
            </div>
          </div>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500">
            View Matches
          </button>
        </div>

        {/* ---- Stats row ---- */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-stone-400"><Search size={14} /><span className="text-xs">Active</span></div>
            <p className="text-xs text-stone-400">Search Rooms</p>
            <p className="text-lg font-semibold">124 available rooms</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-rose-400"><Heart size={14} /><span className="text-xs">Favorites</span></div>
            <p className="text-xs text-stone-400">Saved Rooms</p>
            <p className="text-lg font-semibold">6</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-amber-500"><Clock size={14} /><span className="text-xs">Upcoming</span></div>
            <p className="text-xs text-stone-400">Rent Due In</p>
            <p className="text-lg font-semibold text-amber-600">5 days</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-stone-400"><ClipboardList size={14} /><span className="text-xs">Reviewing</span></div>
            <p className="text-xs text-stone-400">Pending Requests</p>
            <p className="text-lg font-semibold">1</p>
          </div>
        </div>

        {/* ---- Current Rental ---- */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Current Rental</h2>
          <button onClick={() => onNavigate("rental")} className="text-xs font-medium text-blue-600 hover:underline">
            Manage Lease
          </button>
        </div>
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row">
          <img src={CURRENT_RENTAL.img} alt={CURRENT_RENTAL.title} className="h-40 w-full rounded-xl object-cover sm:w-48" />
          <div className="flex flex-1 flex-col">
            <div className="mb-1 flex items-start justify-between">
              <h3 className="text-sm font-semibold">{CURRENT_RENTAL.title}</h3>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600">Active</span>
            </div>
            <p className="text-xs text-stone-500">{CURRENT_RENTAL.type}</p>
            <p className="mt-1 text-sm font-semibold text-stone-800">
              Rs. {CURRENT_RENTAL.price.toLocaleString()}<span className="text-xs font-normal text-stone-400">/month</span>
            </p>
            <p className="mt-1 text-xs text-stone-500">Next Payment · {CURRENT_RENTAL.nextPayment}</p>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-[11px] text-stone-400">
                <span className="font-medium text-stone-500">Lease Progress</span>
                <span>{CURRENT_RENTAL.leaseProgress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${CURRENT_RENTAL.leaseProgress}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-stone-400">
                <span>Move In</span>
                <span>Lease Ends</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={() => onNavigate("payments")} className="rounded-lg bg-stone-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-stone-800">
                Pay Now
              </button>
              <button onClick={() => onNavigate("rental")} className="rounded-lg border border-stone-200 px-4 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">
                View Details
              </button>
            </div>
          </div>
        </div>

        {/* ---- Quick actions ---- */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button onClick={() => onNavigate("search")} className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-xs font-medium text-stone-700 hover:bg-stone-50">
            <Plus size={14} className="text-blue-600" /> Find Rooms
          </button>
          <button onClick={() => onNavigate("requests")} className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-xs font-medium text-stone-700 hover:bg-stone-50">
            <Eye size={14} className="text-blue-600" /> View Bookings
          </button>
          <button onClick={() => onNavigate("payments")} className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-xs font-medium text-stone-700 hover:bg-stone-50">
            <CreditCard size={14} className="text-blue-600" /> Pay Rent
          </button>
          <button onClick={() => onNavigate("messages")} className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-xs font-medium text-stone-700 hover:bg-stone-50">
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
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RECOMMENDED_ROOMS.map((room) => (
            <div key={room.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <img src={room.img} alt={room.title} className="h-32 w-full object-cover" />
              <div className="p-3">
                <h3 className="text-sm font-semibold">{room.title}</h3>
                <p className="text-xs text-stone-500">{room.floor} · {room.tag}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => toggleSave(room.id)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                      savedIds.has(room.id) ? "border-rose-200 bg-rose-50 text-rose-500" : "border-stone-200 text-stone-400"
                    }`}
                    aria-label="Save room"
                  >
                    <Heart size={14} fill={savedIds.has(room.id) ? "currentColor" : "none"} />
                  </button>
                  <button className="flex-1 rounded-lg border border-stone-200 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">
                    View Details
                  </button>
                  <button className="flex-1 rounded-lg bg-stone-900 py-1.5 text-xs font-medium text-white hover:bg-stone-800">
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ---- Notifications + Recently Saved ---- */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Notifications</h2>
              <button onClick={() => onNavigate("notifications")} className="text-xs font-medium text-blue-600 hover:underline">
                View All
              </button>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4">
              {NOTIFICATIONS.map((n, i) => (
                <div key={n.id} className={`flex items-start gap-3 ${i !== 0 ? "border-t border-stone-100 pt-3" : ""}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${n.tone}`}>
                    <n.icon size={14} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-stone-800">{n.title}</p>
                    <p className="text-xs text-stone-500">{n.subtitle}</p>
                  </div>
                </div>
              ))}
              <button onClick={() => onNavigate("notifications")} className="mt-1 text-center text-xs font-medium text-blue-600 hover:underline">
                View All Notifications
              </button>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Recently Saved</h2>
              <button onClick={() => onNavigate("saved")} className="text-xs font-medium text-blue-600 hover:underline">
                View All
              </button>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4">
              {RECENTLY_SAVED.map((room, i) => (
                <div key={room.id} className={`flex items-center gap-3 ${i !== 0 ? "border-t border-stone-100 pt-3" : ""}`}>
                  <img src={room.img} alt={room.title} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-800">{room.title}</p>
                    <p className="text-xs text-blue-600">Rs. {room.price.toLocaleString()}/month</p>
                    <p className="text-[11px] text-stone-400">{room.savedAgo}</p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-stone-300" />
                </div>
              ))}
              <button onClick={() => onNavigate("saved")} className="mt-1 rounded-lg border border-stone-200 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">
                See All Saved Rooms
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
