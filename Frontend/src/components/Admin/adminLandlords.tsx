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
  X,
  Loader2,
  Building2,
} from "lucide-react";
import { api, type User } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";
import { openAdminMessage } from "./adminMessages";

interface LandlordRoom {
  id: number;
  title: string;
  status: string;
  price: number;
}

interface LandlordProfile {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  propertyCount: number;
  tenantCount: number;
  lastActiveAt?: string;
  rooms?: LandlordRoom[];
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
  const [busyId, setBusyId] = useState<number | null>(null);

  const [detailsLandlord, setDetailsLandlord] = useState<LandlordProfile | null>(null);
  const [editLandlord, setEditLandlord] = useState<LandlordProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setLoadFailed(false);
    try {
      const [landlordsRes, statsRes] = await Promise.all([
        api.getLandlords(),
        api.getLandlordStats(),
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

  const handleToggleStatus = async (landlord: LandlordProfile) => {
    setOpenMenuId(null);
    setBusyId(landlord.id);
    const suspending = landlord.status !== "INACTIVE";
    try {
      const res = await api.toggleLandlordStatus(landlord.id, !suspending);
      if (res.success === false) throw new Error(res.message);
      setLandlords((prev) =>
        prev.map((l) => (l.id === landlord.id ? { ...l, status: suspending ? "INACTIVE" : (l.propertyCount === 0 ? "PENDING" : "ACTIVE") } : l))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't update landlord status.");
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (landlord: LandlordProfile) => {
    setEditLandlord(landlord);
    setEditName(landlord.fullName);
    setEditPhone(landlord.phone ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editLandlord) return;
    setEditSaving(true);
    try {
      const res = await api.updateLandlordProfile(editLandlord.id, { fullName: editName, phone: editPhone });
      if (res.success === false) throw new Error(res.message);
      setLandlords((prev) => prev.map((l) => (l.id === editLandlord.id ? { ...l, fullName: editName, phone: editPhone } : l)));
      setEditLandlord(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't update landlord.");
    } finally {
      setEditSaving(false);
    }
  };

  const filteredLandlords = useMemo(() => {
    const q = headerSearch.trim().toLowerCase();
    let result = landlords.filter((l) => {
      const matchesSearch = q === "" || l.fullName.toLowerCase().includes(q) || l.email.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "ALL" || l.status === statusFilter;
      const matchesPortfolio =
        portfolioFilter === "ALL" ||
        (portfolioFilter === "SMALL" && l.propertyCount <= 3) ||
        (portfolioFilter === "MEDIUM" && l.propertyCount > 3 && l.propertyCount <= 10) ||
        (portfolioFilter === "LARGE" && l.propertyCount > 10);
      return matchesSearch && matchesStatus && matchesPortfolio;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "NAME") return a.fullName.localeCompare(b.fullName);
      if (sortBy === "PROPERTIES") return b.propertyCount - a.propertyCount;
      if (sortBy === "TENANTS") return b.tenantCount - a.tenantCount;
      return new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime();
    });

    return result;
  }, [landlords, headerSearch, statusFilter, portfolioFilter, sortBy]);

  const visibleLandlords = filteredLandlords.slice(0, visibleCount);
  const hasMore = visibleCount < filteredLandlords.length;

  const summaryCards = [
    { label: "Total Landlords", value: stats.totalLandlords.toString() },
    { label: "Active Portfolios", value: stats.activePortfolios.toString() },
    { label: "Pending Approvals", value: stats.pendingApprovals.toString() },
    { label: "Total Revenue", value: `Rs. ${stats.totalRevenue.toLocaleString()}` },
  ];

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50 font-sans">
      <AdminSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} />
      <div className="flex-1">
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Search landlords by name or email..."
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
              Couldn't load landlord data. Please try again shortly.
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
            {headerSearch && (
              <span className="text-xs text-gray-400">
                {filteredLandlords.length} result{filteredLandlords.length === 1 ? "" : "s"} for "{headerSearch}"
              </span>
            )}
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
                    {busyId === l.id ? <Loader2 size={16} className="animate-spin" /> : <MoreVertical size={16} />}
                  </button>
                  {openMenuId === l.id && (
                    <div className="absolute right-4 top-10 z-10 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          setDetailsLandlord(l);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        View Portfolio
                      </button>
                      <button
                        onClick={() => handleToggleStatus(l)}
                        className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        {l.status === "INACTIVE" ? "Reactivate Account" : "Suspend Account"}
                      </button>
                    </div>
                  )}

                  <div
                    onClick={() => {
                      openAdminMessage(l.id);
                      onNavigate("messages");
                    }}
                    className="mb-3 flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white group-hover:bg-blue-600 transition-colors shadow-sm">
                      {initials(l.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{l.fullName}</p>
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
                      <button
                        onClick={() => {
                          openAdminMessage(l.id);
                          onNavigate("messages");
                        }}
                        className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
                        aria-label="Message landlord"
                      >
                        <MessageSquare size={13} />
                        <span>Message</span>
                      </button>
                      <button
                        onClick={() => openEdit(l)}
                        className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
                        aria-label="Edit landlord"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDetailsLandlord(l)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
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

      {/* ---- Details / Portfolio modal ---- */}
      {detailsLandlord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">{detailsLandlord.fullName}'s Portfolio</h3>
              <button onClick={() => setDetailsLandlord(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-xl bg-blue-50/70 p-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                  {initials(detailsLandlord.fullName)}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">{detailsLandlord.fullName}</p>
                  <p className="text-[11px] text-gray-500">{detailsLandlord.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setDetailsLandlord(null);
                  openAdminMessage(detailsLandlord.id);
                  onNavigate("messages");
                }}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm"
              >
                <MessageSquare size={13} />
                <span>Send Message</span>
              </button>
            </div>

            {!detailsLandlord.rooms || detailsLandlord.rooms.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">No properties listed yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-gray-100">
                {detailsLandlord.rooms.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                        <Building2 size={14} />
                      </span>
                      <p className="text-sm font-medium text-gray-800">{r.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-700">Rs. {r.price.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400">{r.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- Edit modal ---- */}
      {editLandlord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Edit Landlord</h3>
              <button onClick={() => setEditLandlord(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <label className="mb-3 block text-xs font-medium text-gray-500">
              Full Name
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
              />
            </label>
            <label className="mb-4 block text-xs font-medium text-gray-500">
              Phone
              <input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
              />
            </label>
            <button
              onClick={handleSaveEdit}
              disabled={editSaving}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {editSaving && <Loader2 size={13} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      )}
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
