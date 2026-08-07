import { useEffect, useMemo, useState } from "react";
import { Search, Bell, Plus, MessageSquare, Banknote, Wrench, Building2, Users, UserCog } from "lucide-react";
import { api, type AdminActivityEntry, type User } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";

interface AdminActivityProps {
  user: User;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onAddProperty?: () => void;
}

type CategoryFilter = "ALL" | "PAYMENT" | "MAINTENANCE" | "PROPERTY" | "TENANT" | "LANDLORD";

const CATEGORY_TABS: { key: CategoryFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PAYMENT", label: "Payments" },
  { key: "MAINTENANCE", label: "Maintenance" },
  { key: "PROPERTY", label: "Properties" },
  { key: "TENANT", label: "Tenants" },
  { key: "LANDLORD", label: "Landlords" },
];

const CATEGORY_ICON: Record<string, typeof MessageSquare> = {
  PAYMENT: Banknote,
  MAINTENANCE: Wrench,
  PROPERTY: Building2,
  TENANT: Users,
  LANDLORD: UserCog,
  MESSAGE: MessageSquare,
};

const CATEGORY_STYLE: Record<string, string> = {
  PAYMENT: "bg-green-50 text-green-600",
  MAINTENANCE: "bg-amber-50 text-amber-600",
  PROPERTY: "bg-purple-50 text-purple-600",
  TENANT: "bg-blue-50 text-blue-600",
  LANDLORD: "bg-blue-50 text-blue-600",
  MESSAGE: "bg-blue-50 text-blue-600",
};

const STATUS_STYLE: Record<string, string> = {
  Completed: "bg-green-50 text-green-600",
  Pending: "bg-amber-50 text-amber-600",
  Resolved: "bg-green-50 text-green-600",
};

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / (1000 * 60));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const PAGE_SIZE = 4;

export default function AdminActivity({ onLogout, activeRoute, onNavigate, onAddProperty }: AdminActivityProps) {
  const [entries, setEntries] = useState<AdminActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [headerSearch, setHeaderSearch] = useState("");

  useEffect(() => {
    setPage(1);
    setEntries([]);
    setHasMore(true);
    loadActivity(1, category, true);
  }, [category]);

  async function loadActivity(pageNum: number, cat: CategoryFilter, replace: boolean) {
    if (replace) setLoading(true);
    else setLoadingMore(true);
    setLoadFailed(false);
    try {
      // NOTE: getAdminActivity doesn't exist yet — see the api.ts snippet
      // above this component.
      const res = await (api as any).getAdminActivity?.({
        category: cat === "ALL" ? undefined : cat,
        page: pageNum,
        limit: PAGE_SIZE,
      });
      if (res?.success) {
        const newEntries: AdminActivityEntry[] = res.entries || [];
        setEntries((prev) => (replace ? newEntries : [...prev, ...newEntries]));
        setHasMore(newEntries.length === PAGE_SIZE);
      } else {
        setLoadFailed(true);
        setHasMore(false);
      }
    } catch (e) {
      console.error("Failed to load activity:", e);
      setLoadFailed(true);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    loadActivity(nextPage, category, false);
  }

  const filteredEntries = useMemo(() => {
    const q = headerSearch.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
  }, [entries, headerSearch]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar
        active={activeRoute}
        onNavigate={onNavigate}
        onLogout={onLogout}
        brandName="Horizon"
        brandSubtitle="MANAGEMENT SYSTEM"
      />
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
              onClick={onAddProperty}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Plus size={16} />
              Add Property
            </button>
          </div>
        </header>

        <main className="p-6">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Recent Activity</h1>

          {/* Category tabs */}
          <div className="mb-6 flex flex-wrap items-center gap-1 rounded-full border border-gray-200 bg-white p-1 w-fit">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCategory(tab.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  category === tab.key ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loadFailed && !loading && (
            <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Couldn't load the activity feed — this backend endpoint likely doesn't exist yet
              (see the comment at the top of <code>adminActivity.tsx</code> for what to add).
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">Activity Log</h2>
              <p className="text-sm text-gray-500">Overview of recent system events and actions.</p>
            </div>

            <div className="divide-y divide-gray-100">
              {loading ? (
                <p className="py-8 text-center text-sm text-gray-400">Loading activity...</p>
              ) : filteredEntries.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No activity found.</p>
              ) : (
                filteredEntries.map((entry) => {
                  const Icon = CATEGORY_ICON[entry.category] || MessageSquare;
                  return (
                    <div key={entry.id} className="flex items-start gap-3 py-4">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${CATEGORY_STYLE[entry.category]}`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">{entry.title}</p>
                          <span className="shrink-0 text-xs text-gray-400">{timeAgo(entry.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500">{entry.description}</p>
                        {entry.status && (
                          <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[entry.status] || "bg-gray-100 text-gray-600"}`}>
                            {entry.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {!loading && hasMore && (
              <div className="mt-2 flex justify-center border-t border-gray-100 pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : "Load More Activity"}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}