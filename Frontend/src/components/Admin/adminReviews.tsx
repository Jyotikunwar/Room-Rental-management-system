import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Bell,
  Plus,
  Star,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api, type AdminReviewEntry, type AdminReviewStats, type User } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";

interface AdminReviewsProps {
  user: User;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onAddProperty?: () => void;
}

type TargetFilter = "ALL" | "PROPERTY" | "LANDLORD" | "TENANT";

const TARGET_TABS: { key: TargetFilter; label: string }[] = [
  { key: "ALL", label: "All Reviews" },
  { key: "PROPERTY", label: "Property Reviews" },
  { key: "LANDLORD", label: "Landlord Reviews" },
  { key: "TENANT", label: "Tenant Reviews" },
];

const TARGET_BADGE_STYLE: Record<string, string> = {
  PROPERTY: "bg-purple-50 text-purple-600",
  LANDLORD: "bg-blue-50 text-blue-600",
  TENANT: "bg-amber-50 text-amber-600",
};

const PAGE_SIZE = 3;

const EMPTY_STATS: AdminReviewStats = {
  totalReviews: 0,
  averageRating: 0,
  positiveReviews: 0,
  negativeReviews: 0,
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("");
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} className={i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
      ))}
    </div>
  );
}

export default function AdminReviews({ onLogout, activeRoute, onNavigate, onAddProperty }: AdminReviewsProps) {
  const [reviews, setReviews] = useState<AdminReviewEntry[]>([]);
  const [stats, setStats] = useState<AdminReviewStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [targetFilter, setTargetFilter] = useState<TargetFilter>("ALL");
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setLoadFailed(false);
    try {
      const [reviewsRes, statsRes] = await Promise.all([
        api.getAdminReviews(),
        api.getAdminReviewStats(),
      ]);
      if (reviewsRes?.success) {
        setReviews(reviewsRes.reviews || []);
      } else {
        setLoadFailed(true);
      }
      if (statsRes?.success && statsRes.stats) {
        setStats({ ...EMPTY_STATS, ...statsRes.stats });
      }
    } catch (e) {
      console.error("Failed to load reviews:", e);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }

  const filteredReviews = useMemo(() => {
    const q = headerSearch.trim().toLowerCase();
    return reviews.filter((r) => {
      const matchesQuery =
        !q || r.reviewerName.toLowerCase().includes(q) || r.comment.toLowerCase().includes(q);
      const matchesTarget = targetFilter === "ALL" || r.targetType === targetFilter;
      return matchesQuery && matchesTarget;
    });
  }, [reviews, headerSearch, targetFilter]);

  useEffect(() => {
    setPage(1);
  }, [headerSearch, targetFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / PAGE_SIZE));
  const pagedReviews = filteredReviews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filteredReviews.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredReviews.length);

  function pageNumbers(): (number | "ellipsis")[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, "ellipsis", totalPages];
    if (page >= totalPages - 2) return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
    return [1, "ellipsis", page, "ellipsis", totalPages];
  }

  const summaryCards = [
    {
      label: "Total Reviews",
      value: stats.totalReviews.toLocaleString(),
      icon: Star,
      iconBg: "bg-blue-50 text-blue-600",
      hint: stats.totalReviewsGrowthPct != null ? `+${stats.totalReviewsGrowthPct}% this month` : undefined,
      hintColor: "text-green-600",
    },
    {
      label: "Average Rating",
      value: stats.averageRating.toFixed(1),
      icon: Star,
      iconBg: "bg-amber-50 text-amber-600",
      hint: "Across all properties",
      hintColor: "text-gray-400",
      showStars: true,
    },
    {
      label: "Positive Reviews",
      value: stats.positiveReviews.toLocaleString(),
      icon: ThumbsUp,
      iconBg: "bg-green-50 text-green-600",
      hint: "4-5 stars",
      hintColor: "text-gray-400",
    },
    {
      label: "Negative Reviews",
      value: stats.negativeReviews.toLocaleString(),
      icon: ThumbsDown,
      iconBg: "bg-red-50 text-red-600",
      hint: "1-2 stars",
      hintColor: "text-gray-400",
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar
        active={activeRoute}
        onNavigate={onNavigate}
        onLogout={onLogout}
        brandName="Horizon"
        brandSubtitle="MANAGEMENT CONSOLE"
      />
      <div className="flex-1">
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Search reviews..."
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
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Reviews Management</h1>
            <p className="mt-1 text-sm text-gray-500">Monitor and respond to feedback across your portfolio.</p>
          </div>

          {loadFailed && !loading && (
            <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Couldn't load review data — this backend endpoint likely doesn't exist yet
              (see the comment above <code>getAdminReviews</code> in <code>api.ts</code>).
            </div>
          )}

          {/* Summary cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{card.label}</p>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.iconBg}`}>
                      <Icon size={14} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-2xl font-bold text-gray-900">{loading ? "—" : card.value}</p>
                    {card.showStars && !loading && <StarRow rating={Math.round(stats.averageRating)} />}
                  </div>
                  {card.hint && <p className={`mt-1 text-[11px] ${card.hintColor}`}>{card.hint}</p>}
                </div>
              );
            })}
          </div>

          {/* Target filter tabs */}
          <div className="mb-6 flex flex-wrap items-center gap-1 rounded-full border border-gray-200 bg-white p-1 w-fit">
            {TARGET_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTargetFilter(tab.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  targetFilter === tab.key ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Recent reviews table */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Recent Reviews</h2>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View All →</button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3 font-medium">Reviewer</th>
                    <th className="pb-3 font-medium">Rating</th>
                    <th className="pb-3 font-medium">Comment</th>
                    <th className="pb-3 font-medium">Target</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">Loading reviews...</td>
                    </tr>
                  ) : pagedReviews.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">No reviews match your filters.</td>
                    </tr>
                  ) : (
                    pagedReviews.map((rev) => (
                      <tr key={rev.id} className="border-t border-gray-100">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-[10px] font-semibold text-white">
                              {initials(rev.reviewerName)}
                            </div>
                            <span className="font-medium text-gray-900">{rev.reviewerName}</span>
                          </div>
                        </td>
                        <td className="py-3"><StarRow rating={rev.rating} /></td>
                        <td className="max-w-xs truncate py-3 text-gray-600">"{rev.comment}"</td>
                        <td className="py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TARGET_BADGE_STYLE[rev.targetType]}`}>
                            {rev.targetType.charAt(0) + rev.targetType.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="py-3 text-gray-500">{new Date(rev.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === rev.id ? null : rev.id)}
                              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                              aria-label="More actions"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {openMenuId === rev.id && (
                              <div className="absolute right-0 top-8 z-10 w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                <button className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                                  View
                                </button>
                                <button className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && filteredReviews.length > 0 && (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row">
                <p className="text-xs text-gray-500">
                  Showing {rangeStart} to {rangeEnd} of {filteredReviews.length} entries
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {pageNumbers().map((p, idx) =>
                    p === "ellipsis" ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium ${
                          page === p ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}