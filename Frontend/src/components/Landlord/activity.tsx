import { useEffect, useMemo, useState } from "react";
import { Activity, MessageSquare, Banknote, Wrench, Building2 } from "lucide-react";
import { api, type LandlordActivityEntry, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

interface LandlordActivityProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
  onAddProperty?: () => void;
}

type Category = "ALL" | "MESSAGE" | "PAYMENT" | "MAINTENANCE" | "SYSTEM";

const TABS: { key: Category; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "MESSAGE", label: "Messages" },
  { key: "PAYMENT", label: "Payments" },
  { key: "MAINTENANCE", label: "Maintenance" },
  { key: "SYSTEM", label: "System" },
];

const ICON: Record<string, typeof MessageSquare> = { MESSAGE: MessageSquare, PAYMENT: Banknote, MAINTENANCE: Wrench, SYSTEM: Building2 };
const STYLE: Record<string, string> = { MESSAGE: "bg-blue-50 text-blue-600", PAYMENT: "bg-green-50 text-green-600", MAINTENANCE: "bg-red-50 text-red-600", SYSTEM: "bg-purple-50 text-purple-600" };

function timeAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

export default function LandlordActivity({ user, onLogout, activeRoute, onNavigate, onAddProperty }: LandlordActivityProps) {
  const [entries, setEntries] = useState<LandlordActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState<Category>("ALL");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setPage(1);
    setEntries([]);
    setHasMore(true);
    load(1, category, true);
  }, [category]);

  async function load(pageNum: number, cat: Category, replace: boolean) {
    replace ? setLoading(true) : setLoadingMore(true);
    try {
      const res = await (api as any).getLandlordActivity?.({ category: cat === "ALL" ? undefined : cat, page: pageNum });
      if (res?.success) {
        const list: LandlordActivityEntry[] = res.entries || [];
        setEntries((prev) => (replace ? list : [...prev, ...list]));
        setHasMore(list.length > 0);
      }
    } catch (e) {
      console.error("Failed to load activity:", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const stats = useMemo(() => ({
    total: entries.length,
    messages: entries.filter((e) => e.category === "MESSAGE").length,
    payments: entries.filter((e) => e.category === "PAYMENT").length,
    maintenance: entries.filter((e) => e.category === "MAINTENANCE").length,
  }), [entries]);

  const statCards = [
    { label: "Total Events", value: stats.total, hint: "+12% this week", icon: Activity },
    { label: "New Messages", value: stats.messages, hint: "3 unread", icon: MessageSquare },
    { label: "Payments Received", value: stats.payments, hint: "Last 7 Days", icon: Banknote },
    { label: "Maintenance Updates", value: stats.maintenance, hint: "2 pending", icon: Wrench },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} user={user} />
      <div className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Recent Activity</h1>
          <button onClick={onAddProperty} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">+ New Property</button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{c.label}</p>
                  <Icon size={14} className="text-gray-300" />
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900">{loading ? "—" : c.value}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">{c.hint}</p>
              </div>
            );
          })}
        </div>

        <div className="mb-6 flex w-fit gap-1 rounded-full border border-gray-200 bg-white p-1">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setCategory(tab.key)} className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${category === tab.key ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-1 text-base font-semibold text-gray-900">Activity Feed</h2>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <p className="py-8 text-center text-sm text-gray-400">Loading activity...</p>
            ) : entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No activity found.</p>
            ) : (
              entries.map((e) => {
                const Icon = ICON[e.category] || Activity;
                return (
                  <div key={e.id} className="flex items-start gap-3 py-4">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${STYLE[e.category]}`}><Icon size={16} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{e.title}</p>
                        <span className="text-xs text-gray-400">{timeAgo(e.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-500">{e.description}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {!loading && hasMore && (
            <div className="mt-2 flex justify-center border-t border-gray-100 pt-4">
              <button onClick={() => { const next = page + 1; setPage(next); load(next, category, false); }} disabled={loadingMore} className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50">
                {loadingMore ? "Loading..." : "Load More Activity"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}