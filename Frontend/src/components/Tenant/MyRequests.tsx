import { useMemo, useState } from "react";
import {
  Search, Bell, MapPin, ChevronDown, Plus, User as UserIcon,
} from "lucide-react";
import type { User } from "../../services/api";
import { Sidebar, type NavLabel } from "./Sidebar";
import { NAV_LABEL_TO_VIEW, type TenantView } from "./navigation";

// ---------- Types ----------
type RequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

interface RentalRequest {
  id: number;
  roomTitle: string;
  roomArea: string;
  roomImg: string;
  monthlyRent: number;
  status: RequestStatus;
  ownerName: string;
  sentOn: string; // ISO date
}

interface MyRequestsProps {
  user: User;
  onLogout: () => void;
  onNavigate: (view: TenantView) => void;
}

// ---------- Sample data (replace with API data from GET /api/requests) ----------
const REQUESTS: RentalRequest[] = [
  {
    id: 1, roomTitle: "Luxury 2BHK", roomArea: "Baneshwor",
    roomImg: "/images/rooms/luxury-2bhk.jpg",
    monthlyRent: 18500, status: "PENDING", ownerName: "Ram Sharma", sentOn: "2026-08-02",
  },
  {
    id: 2, roomTitle: "Studio Room", roomArea: "Koteshwor",
    roomImg: "/images/rooms/studio-koteshwor.jpg",
    monthlyRent: 9000, status: "ACCEPTED", ownerName: "Hari Lama", sentOn: "2026-08-22",
  },
  {
    id: 3, roomTitle: "Modern Flat", roomArea: "Lalitpur",
    roomImg: "/images/rooms/modern-flat.jpg",
    monthlyRent: 25000, status: "REJECTED", ownerName: "Sita Karki", sentOn: "2026-07-10",
  },
];

const TABS: { label: string; value: RequestStatus | "ALL"; dot: string }[] = [
  { label: "All", value: "ALL", dot: "bg-stone-300" },
  { label: "Pending", value: "PENDING", dot: "bg-amber-400" },
  { label: "Accepted", value: "ACCEPTED", dot: "bg-emerald-400" },
  { label: "Rejected", value: "REJECTED", dot: "bg-rose-400" },
  { label: "Cancelled", value: "CANCELLED", dot: "bg-stone-300" },
];

const STATUS_BADGE: Record<RequestStatus, string> = {
  PENDING: "bg-amber-50 text-amber-600",
  ACCEPTED: "bg-emerald-50 text-emerald-600",
  REJECTED: "bg-rose-50 text-rose-600",
  CANCELLED: "bg-stone-100 text-stone-500",
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export default function MyRequests({ user, onLogout, onNavigate }: MyRequestsProps) {
  const [tab, setTab] = useState<RequestStatus | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [requests, setRequests] = useState<RentalRequest[]>(REQUESTS);

  const filtered = useMemo(() => {
    let rows = requests.filter((r) => {
      const matchesTab = tab === "ALL" || r.status === tab;
      const matchesQuery =
        query.trim() === "" ||
        r.roomTitle.toLowerCase().includes(query.toLowerCase()) ||
        r.roomArea.toLowerCase().includes(query.toLowerCase());
      return matchesTab && matchesQuery;
    });
    rows = [...rows].sort((a, b) =>
      sort === "newest"
        ? new Date(b.sentOn).getTime() - new Date(a.sentOn).getTime()
        : new Date(a.sentOn).getTime() - new Date(b.sentOn).getTime()
    );
    return rows;
  }, [requests, tab, query, sort]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: requests.length };
    for (const t of TABS) {
      if (t.value === "ALL") continue;
      c[t.value] = requests.filter((r) => r.status === t.value).length;
    }
    return c;
  }, [requests]);

  const cancelRequest = (id: number) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "CANCELLED" as RequestStatus } : r)));
    // TODO: call api.cancelRequest(id) here
  };

  const handleNavigate = (label: NavLabel) => onNavigate(NAV_LABEL_TO_VIEW[label]);

  return (
    <div className="flex min-h-screen w-full bg-[#EEF1F8] text-stone-900">
      <Sidebar
        active="My Requests"
        onNavigate={handleNavigate}
        onSettings={() => onNavigate("settings")}
        onLogout={onLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-end gap-4 border-b border-stone-200/60 bg-transparent px-4 py-4 pl-14 sm:px-8 sm:pl-8">
          <button className="text-stone-500 hover:text-stone-700">
            <Search size={18} />
          </button>
          <button onClick={() => onNavigate("notifications")} className="relative text-stone-500 hover:text-stone-700">
            <Bell size={18} />
          </button>
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-stone-200">
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName ?? "U"}`}
              alt={user.fullName}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="flex-1 px-4 pb-8 sm:px-8">
          {/* Header */}
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3 pt-2">
            <div>
              <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">My Requests</h1>
              <p className="mt-1 text-sm text-stone-500">Track your booking and rental requests</p>
            </div>
            <button className="flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800">
              <Plus size={15} />
              New Request
            </button>
          </div>

          {/* Tabs */}
          <div className="mb-4 -mx-4 flex items-center gap-5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 pb-2 text-sm font-medium transition-colors ${
                  tab === t.value
                    ? "border-stone-900 text-stone-900"
                    : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                {t.label}
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold ${
                    tab === t.value ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {counts[t.value] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Search + Sort */}
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5">
              <Search size={15} className="shrink-0 text-stone-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by room name..."
                className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
            </div>
            <div className="relative shrink-0">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
                className="w-full appearance-none rounded-xl border border-stone-200 bg-white py-2.5 pl-4 pr-9 text-sm text-stone-600 outline-none sm:w-auto"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
            </div>
          </div>

          {/* Request rows */}
          <div className="flex flex-col gap-4">
            {filtered.map((req) => (
              <RequestRow key={req.id} request={req} onCancel={() => cancelRequest(req.id)} />
            ))}

            {filtered.length === 0 && <EmptyState hasAnyRequests={requests.length > 0} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestRow({ request, onCancel }: { request: RentalRequest; onCancel: () => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 md:flex-row md:items-center md:gap-6">
      {/* Room image + title */}
      <div className="flex gap-3 md:w-52 md:shrink-0">
        <img
          src={request.roomImg}
          alt={request.roomTitle}
          className="h-20 w-20 shrink-0 rounded-xl object-cover md:h-24 md:w-24"
        />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-snug text-stone-900">{request.roomTitle}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
            <MapPin size={11} /> {request.roomArea}
          </p>
        </div>
      </div>

      {/* Info + timeline */}
      <div className="min-w-0 flex-1">
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          <InfoField label="Requested" value={`Sent on ${formatDate(request.sentOn)}`} />
          <InfoField label="Rent" value={`Rs. ${request.monthlyRent.toLocaleString()} /mo`} />
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">Owner</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-stone-700">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-stone-100 text-stone-400">
                <UserIcon size={10} />
              </span>
              <span className="truncate">{request.ownerName}</span>
            </p>
          </div>
        </div>

        <StatusTimeline status={request.status} />
      </div>

      {/* Status + actions */}
      <div className="flex items-center justify-between gap-3 md:w-40 md:shrink-0 md:flex-col md:items-end">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[request.status]}`}>
          {STATUS_LABEL[request.status]}
        </span>

        <div className="flex flex-wrap justify-end gap-2 md:w-full md:flex-col">
          {request.status === "PENDING" && (
            <button
              onClick={onCancel}
              className="rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 md:w-full"
            >
              Cancel Request
            </button>
          )}

          {request.status === "ACCEPTED" && (
            <>
              <button className="rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-stone-800 md:w-full">
                Pay Deposit
              </button>
              <button className="rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 md:w-full">
                Proceed to Lease
              </button>
            </>
          )}

          {request.status === "REJECTED" && (
            <button className="rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-stone-800 md:w-full">
              Find Similar Rooms
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-1 truncate text-xs font-medium text-stone-700">{value}</p>
    </div>
  );
}

// 4-step progress: Request Sent -> Owner Reviewing -> Accepted/Rejected -> Lease Started
// First two steps are always "reached" once a request exists (it was sent, and an
// owner is/was reviewing it). The third segment reflects the final decision.
function StatusTimeline({ status }: { status: RequestStatus }) {
  const step3Label =
    status === "ACCEPTED" ? "Accepted" : status === "REJECTED" ? "Rejected" : "Accepted/Rejected";

  const step3Color =
    status === "ACCEPTED" ? "bg-emerald-400" : status === "REJECTED" ? "bg-rose-400" : "bg-stone-200";

  const step3TextColor =
    status === "ACCEPTED"
      ? "text-emerald-600"
      : status === "REJECTED"
      ? "text-rose-600"
      : "text-stone-400";

  const steps = [
    { label: "Request Sent", barColor: "bg-stone-800", textColor: "text-stone-800" },
    { label: "Owner Reviewing", barColor: "bg-stone-800", textColor: "text-stone-800" },
    { label: step3Label, barColor: step3Color, textColor: step3TextColor },
    { label: "Lease Started", barColor: "bg-stone-200", textColor: "text-stone-400" },
  ];

  return (
    <div className="mt-4">
      <div className="flex justify-between gap-1 text-[11px] font-medium">
        {steps.map((s) => (
          <span key={s.label} className={`${s.textColor} truncate`}>
            {s.label}
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1">
        {steps.map((s, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${s.barColor}`} />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ hasAnyRequests }: { hasAnyRequests: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
      <p className="text-sm text-stone-500">
        {hasAnyRequests ? "No requests match this filter." : "You haven't sent any requests yet."}
      </p>
    </div>
  );
}
