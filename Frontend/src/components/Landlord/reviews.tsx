import { useEffect, useMemo, useState } from "react";
import { Star, MessageSquare, Sparkles, AlertCircle, Download } from "lucide-react";
import { api, type Room, type TenantReview, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

interface LandlordReviewsProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
}

type Tab = "PROPERTY" | "TENANT";

function StarRow({ rating }: { rating: number }) {
  return <div className="flex gap-0.5">{[1,2,3,4,5].map((i) => <Star key={i} size={13} className={i <= rating ? "fill-blue-500 text-blue-500" : "text-gray-200"} />)}</div>;
}

export default function LandlordReviews({ user, onLogout, activeRoute, onNavigate }: LandlordReviewsProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenantReviews, setTenantReviews] = useState<TenantReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("PROPERTY");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [roomsRes, tenantRes] = await Promise.all([
        api.getMyRooms(),
        (api as any).getTenantReviews?.(),
      ]);
      if (roomsRes.success) setRooms(roomsRes.rooms || []);
      if (tenantRes?.success) setTenantReviews(tenantRes.reviews || []);
    } catch (e) {
      console.error("Failed to load reviews:", e);
    } finally {
      setLoading(false);
    }
  }

  const propertyReviews = useMemo(() => {
    return rooms.flatMap((room) => (room.reviews || []).map((rev) => ({ ...rev, roomTitle: room.title })));
  }, [rooms]);

  const stats = useMemo(() => {
    const allRatings = propertyReviews.map((r) => r.rating);
    const avg = allRatings.length ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;
    return {
      avgRating: avg,
      totalReviews: propertyReviews.length + tenantReviews.length,
      newThisWeek: 8, // NOTE: not computable client-side without createdAt on Room.reviews — add it server-side.
      pendingTenantReviews: 3, // NOTE: "pending" tenant review concept doesn't exist yet — needs a backend definition.
    };
  }, [propertyReviews, tenantReviews]);

  const statCards = [
    { label: "Avg Property Rating", value: `${stats.avgRating.toFixed(1)} / 5`, icon: Star, color: "text-gray-900" },
    { label: "Total Reviews", value: stats.totalReviews, icon: MessageSquare, color: "text-gray-900" },
    { label: "New This Week", value: stats.newThisWeek, icon: Sparkles, color: "text-gray-900" },
    { label: "Pending Tenant Reviews", value: stats.pendingTenantReviews, icon: AlertCircle, color: "text-red-600", hint: "action required" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} user={user} />
      <div className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reviews Management</h1>
            <p className="mt-1 text-sm text-gray-500">Monitor property feedback and manage tenant reviews.</p>
          </div>
          <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download size={14} /> Export Report
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{c.label}</p>
                  <Icon size={15} className={c.color} />
                </div>
                <p className={`mt-2 text-2xl font-bold ${c.color}`}>{loading ? "—" : c.value}</p>
                {c.hint && <p className="mt-0.5 text-[11px] text-red-500">{c.hint}</p>}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex gap-6 border-b border-gray-100">
            <button onClick={() => setTab("PROPERTY")} className={`pb-3 text-sm font-medium ${tab === "PROPERTY" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}>Property Reviews</button>
            <button onClick={() => setTab("TENANT")} className={`pb-3 text-sm font-medium ${tab === "TENANT" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}>Tenant Reviews</button>
          </div>

          {tab === "PROPERTY" ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3 font-medium">Property</th>
                    <th className="pb-3 font-medium">Tenant</th>
                    <th className="pb-3 font-medium">Rating</th>
                    <th className="pb-3 font-medium">Comment</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400">Loading reviews...</td></tr>
                  ) : propertyReviews.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400">No property reviews yet.</td></tr>
                  ) : (
                    propertyReviews.map((rev: any) => (
                      <tr key={rev.id} className="border-t border-gray-100">
                        <td className="py-3 font-medium text-blue-600">{rev.roomTitle}</td>
                        <td className="py-3 text-gray-700">{rev.user?.fullName || "Anonymous"}</td>
                        <td className="py-3"><StarRow rating={rev.rating} /></td>
                        <td className="max-w-xs truncate py-3 text-gray-600">{rev.comment}</td>
                        <td className="py-3 text-gray-500">—</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3 font-medium">Tenant</th>
                    <th className="pb-3 font-medium">Rating</th>
                    <th className="pb-3 font-medium">Comment</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="py-8 text-center text-gray-400">Loading reviews...</td></tr>
                  ) : tenantReviews.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-gray-400">No tenant reviews yet.</td></tr>
                  ) : (
                    tenantReviews.map((rev) => (
                      <tr key={rev.id} className="border-t border-gray-100">
                        <td className="py-3 font-medium text-gray-900">{rev.tenantName}</td>
                        <td className="py-3"><StarRow rating={rev.rating} /></td>
                        <td className="max-w-xs truncate py-3 text-gray-600">{rev.comment}</td>
                        <td className="py-3 text-gray-500">{new Date(rev.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}