import { useEffect, useMemo, useState } from "react";
import { Search, Star, Building2 } from "lucide-react";
import { api, type Room, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

interface LandlordReviewsProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
}

interface ReviewRow {
  id: number;
  rating: number;
  comment?: string;
  reviewerName: string;
  roomTitle: string;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} className={i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
      ))}
    </div>
  );
}

export default function LandlordReviews({ user, onLogout, activeRoute, onNavigate }: LandlordReviewsProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    setLoading(true);
    try {
      const res = await api.getMyRooms();
      if (res.success) setRooms(res.rooms || []);
    } catch (e) {
      console.error("Failed to load rooms:", e);
    } finally {
      setLoading(false);
    }
  }

  const reviewRows = useMemo<ReviewRow[]>(() => {
    return rooms.flatMap((room) =>
      (room.reviews || []).map((rev) => ({
        id: rev.id,
        rating: rev.rating,
        comment: rev.comment,
        reviewerName: rev.user?.fullName || "Anonymous tenant",
        roomTitle: room.title,
      }))
    );
  }, [rooms]);

  const filteredReviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reviewRows;
    return reviewRows.filter(
      (r) => r.roomTitle.toLowerCase().includes(q) || r.reviewerName.toLowerCase().includes(q)
    );
  }, [reviewRows, searchQuery]);

  const averageRating = useMemo(() => {
    if (reviewRows.length === 0) return 0;
    return reviewRows.reduce((sum, r) => sum + r.rating, 0) / reviewRows.length;
  }, [reviewRows]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar active={activeRoute} onNavigate={onNavigate} />
      <div className="flex-1">
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviews..."
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-gray-900"
            />
          </div>
          <button
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onLogout}
          >
            Logout
          </button>
        </header>

        <main className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
              <p className="mt-1 text-sm text-gray-500">What tenants are saying about your properties.</p>
            </div>
            {!loading && reviewRows.length > 0 && (
              <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2">
                <StarRow rating={Math.round(averageRating)} />
                <span className="text-sm font-semibold text-gray-900">{averageRating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({reviewRows.length})</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {loading ? (
              <p className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
                Loading reviews...
              </p>
            ) : filteredReviews.length === 0 ? (
              <p className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
                {reviewRows.length === 0 ? "No reviews yet." : "No reviews match your search."}
              </p>
            ) : (
              filteredReviews.map((rev) => (
                <div key={rev.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{rev.reviewerName}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                        <Building2 size={12} />
                        {rev.roomTitle}
                      </div>
                    </div>
                    <StarRow rating={rev.rating} />
                  </div>
                  {rev.comment && <p className="mt-2 text-sm text-gray-600">{rev.comment}</p>}
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}