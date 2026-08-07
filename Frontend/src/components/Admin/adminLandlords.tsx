import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Bell,
  UserPlus,
  ChevronDown,
  Mail,
  Phone,
  MoreVertical,
  MessageSquare,
  Pencil,
} from "lucide-react";
import { api, type User } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";

// NOTE: mirrors the interfaces added to api.ts — see comment above this file.
interface LandlordProfile {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  propertyCount: number;
  tenantCount: number;
  lastActiveAt?: string;
}

interface LandlordDirectoryStats {
  totalLandlords: number;
  activePortfolios: number;
  pendingApprovals: number;
  totalRevenue: number;
}

interface AdminLandlordsProps {
  user: User;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onAddLandlord?: () => void;
}

const PAGE_SIZE = 3;

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-600",
  INACTIVE: "bg-gray-100 text-gray-500",
  PENDING: "bg-amber-50 text-amber-600",
};

const EMPTY_STATS: LandlordDirectoryStats = {
  totalLandlords: 0,
  activePortfolios: 0,
  pendingApprovals: 0,
  totalRevenue: 0,
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "—";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diffMs / (1000 * 60 * 60));
  if (hrs < 1) return "Just now";
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AdminLandlords({ onLogout, activeRoute, onNavigate, onAddLandlord }: AdminLandlordsProps) {
  const [landlords, setLandlords] = useState<LandlordProfile[]>([]);
  const [stats, setStats] = useState<LandlordDirectoryStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [portfolioFilter, setPortfolioFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"NAME" | "PROPERTIES" | "TENANTS" | "RECENT">("NAME");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setLoadFailed(false);
    try {
      // NOTE: (api as any) because getLandlords/getLandlordStats aren't in
      // api.ts yet — see the snippet above this component.
      const [landlordsRes, statsRes] = await Promise.all([
        (api as any).getLandlords?.(),
        (api as any).getLandlordStats?.(),
      ]);
      if (landlordsRes?.success) {
        setLandlords(landlordsRes.landlords || []);
      } else {
        setLoadFailed(true);
      }
      if (statsRes?.success && statsRes.stats) {
        setStats({ ...EMPTY_STATS, ...statsRes.stats });
      }
    } catch (e) {
      console.error("Failed to load landlords:", e);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }

  const filteredLandlords = useMemo(() => {
    let result = landlords.filter((l) => {
      const matchesStatus = statusFilter === "ALL" || l.status === statusFilter;
      const matchesPortfolio =
        portfolioFilter === "ALL" ||
        (portfolioFilter === "SMALL" && l.propertyCount <= 3) ||
        (portfolioFilter === "MEDIUM" && l.propertyCount > 3 && l.propertyCount <= 10) ||
        (portfolioFilter === "LARGE" && l.propertyCount > 10);
      return matchesStatus && matchesPortfolio;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "NAME") return a.fullName.localeCompare(b.fullName);
      if (sortBy === "PROPERTIES") return b.propertyCount - a.propertyCount;
      if (sortBy === "TENANTS") return b.tenantCount - a.tenantCount;
      // RECENT
      return new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime();
    });

    return result;
  }, [landlords, statusFilter, portfolioFilter, sortBy]);

  const visibleLandlords = filteredLandlords.slice(0, visibleCount);
  const hasMore = visibleCount < filteredLandlords.length;

  const summaryCards = [
    { label: "Total Landlords", value: stats.totalLandlords.toString() },
    { label: "Active Portfolios", value: stats.activePortfolios.toString() },
    { label: "Pending Approvals", value: stats.pendingApprovals.toString() },
    { label: "Total Revenue", value: `Rs. ${stats.totalRevenue.toLocaleString()}` },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} />
      <div className="flex-1">
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Search properties, tenants..."
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-gray-900"
            />
          </div>
          <div className="flex gap-3">
            <button className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button
              onClick={onAddLandlord}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <UserPlus size={16} />
              Add Landlord
            </button>
          </div>
        </header>

        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Landlords</h1>
            <p className="mt-1 text-sm text-gray-500">Manage and view landlord portfolios and details.</p>
          </div>

          {loadFailed && !loading && (
            <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Couldn't load landlord data — this backend endpoint likely doesn't exist yet
              (see the comment at the top of <code>adminLandlords.tsx</code> for what to add).
            </div>
          )}

          {/* Summary cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{loading ? "—" : card.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "ALL", label: "All" },
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
                { value: "PENDING", label: "Pending" },
              ]}
            />
            <FilterSelect
              label="Portfolio Size"
              value={portfolioFilter}
              onChange={setPortfolioFilter}
              options={[
                { value: "ALL", label: "All" },
                { value: "SMALL", label: "1–3 properties" },
                { value: "MEDIUM", label: "4–10 properties" },
                { value: "LARGE", label: "11+ properties" },
              ]}
            />
            <FilterSelect
              label="Sort By"
              value={sortBy}
              onChange={(v) => setSortBy(v as typeof sortBy)}
              options={[
                { value: "NAME", label: "Name" },
                { value: "PROPERTIES", label: "Properties" },
                { value: "TENANTS", label: "Tenants" },
                { value: "RECENT", label: "Recently Active" },
              ]}
            />
          </div>

          {/* Landlord cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              <p className="col-span-full py-8 text-center text-sm text-gray-400">Loading landlords...</p>
            ) : visibleLandlords.length === 0 ? (
              <p className="col-span-full py-8 text-center text-sm text-gray-400">No landlords match your filters.</p>
            ) : (
              visibleLandlords.map((l) => (
                <div key={l.id} className="relative rounded-2xl border border-gray-200 bg-white p-5">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === l.id ? null : l.id)}
                    className="absolute right-4 top-4 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="More options"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openMenuId === l.id && (
                    <div className="absolute right-4 top-10 z-10 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      <button className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                        View Portfolio
                      </button>
                      <button className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                        Suspend Account
                      </button>
                    </div>
                  )}

                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white">
                      {initials(l.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{l.fullName}</p>
                      <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[l.status]}`}>
                        • {l.status.charAt(0) + l.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Mail size={13} className="shrink-0 text-gray-400" />
                      <span className="truncate">{l.email}</span>
                    </div>
                    {l.phone && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Phone size={13} className="shrink-0 text-gray-400" />
                        {l.phone}
                      </div>
                    )}
                  </div>

                  <div className="mb-4 grid grid-cols-2 divide-x divide-gray-100 rounded-xl bg-gray-50 py-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{l.propertyCount}</p>
                      <p className="text-[10px] text-gray-500">Properties</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{l.tenantCount}</p>
                      <p className="text-[10px] text-gray-500">Tenants</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-400">Last active {timeAgo(l.lastActiveAt)}</p>
                    <div className="flex gap-2">
                      <button className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50" aria-label="Message landlord">
                        <MessageSquare size={13} />
                      </button>
                      <button className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50" aria-label="Edit landlord">
                        <Pencil size={13} />
                      </button>
                      <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {!loading && hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="rounded-lg border border-gray-200 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Load More Landlords
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-xs font-medium text-gray-700 outline-none focus:border-gray-900"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {label}: {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  );
}