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
  Eye,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { api, type AdminReviewEntry, type AdminReviewStats, type User, getImageUrl } from "../../services/api";
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
  PROPERTY: "bg-purple-50 text-purple-600 border border-purple-100",
  LANDLORD: "bg-blue-50 text-blue-600 border border-blue-100",
  TENANT: "bg-amber-50 text-amber-600 border border-amber-100",
};

const EMPTY_STATS: AdminReviewStats = {
  totalReviews: 0,
  averageRating: 0,
  positiveReviews: 0,
  negativeReviews: 0,
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
      ))}
    </div>
  );
}

export default function AdminReviews({ onLogout, activeRoute, onNavigate, onAddProperty }: AdminReviewsProps) {
  const [reviews, setReviews] = useState<AdminReviewEntry[]>([]);
  const [stats, setStats] = useState<AdminReviewStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [headerSearch, setHeaderSearch] = useState("");
  const [targetFilter, setTargetFilter] = useState<TargetFilter>("ALL");
  const [ratingFilter, setRatingFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Modal states
  const [selectedReview, setSelectedReview] = useState<AdminReviewEntry | null>(null);
  const [deletingReview, setDeletingReview] = useState<AdminReviewEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [reviewsRes, statsRes] = await Promise.all([
        api.getAdminReviews(),
        api.getAdminReviewStats(),
      ]);
      if (reviewsRes?.success) {
        setReviews(reviewsRes.reviews || []);
      }
      if (statsRes?.success && statsRes.stats) {
        setStats({ ...EMPTY_STATS, ...statsRes.stats });
      }
    } catch (e) {
      console.error("Failed to load reviews:", e);
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  async function handleDeleteReview() {
    if (!deletingReview) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteAdminReview(deletingReview.id);
      if (res?.success) {
        setReviews((prev) => prev.filter((r) => r.id !== deletingReview.id));
        showToast("Review removed successfully.");
        // Refetch updated stats
        const statsRes = await api.getAdminReviewStats();
        if (statsRes?.success && statsRes.stats) {
          setStats({ ...EMPTY_STATS, ...statsRes.stats });
        }
      } else {
        showToast(res?.message || "Failed to delete review.");
      }
    } catch (err) {
      console.error("Error deleting review:", err);
      showToast("Error deleting review.");
    } finally {
      setIsDeleting(false);
      setDeletingReview(null);
      setOpenMenuId(null);
    }
  }

  const filteredReviews = useMemo(() => {
    const q = headerSearch.trim().toLowerCase();
    return reviews.filter((r) => {
      const matchesQuery =
        !q ||
        r.reviewerName.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q) ||
        (r.targetName && r.targetName.toLowerCase().includes(q));
      const matchesTarget = targetFilter === "ALL" || r.targetType === targetFilter;
      const matchesRating =
        ratingFilter === "ALL" ||
        (ratingFilter === "5" && r.rating === 5) ||
        (ratingFilter === "4" && r.rating === 4) ||
        (ratingFilter === "3" && r.rating === 3) ||
        (ratingFilter === "LOW" && r.rating <= 2);

      return matchesQuery && matchesTarget && matchesRating;
    });
  }, [reviews, headerSearch, targetFilter, ratingFilter]);

  useEffect(() => {
    setPage(1);
  }, [headerSearch, targetFilter, ratingFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / pageSize));
  const pagedReviews = filteredReviews.slice((page - 1) * pageSize, page * pageSize);
  const rangeStart = filteredReviews.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, filteredReviews.length);

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
      hint: stats.totalReviewsGrowthPct != null ? `+${stats.totalReviewsGrowthPct}% this month` : "Overall reviews",
      hintColor: stats.totalReviewsGrowthPct != null && stats.totalReviewsGrowthPct >= 0 ? "text-green-600" : "text-gray-400",
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
      hint: "4-5 stars rating",
      hintColor: "text-green-600 font-medium",
    },
    {
      label: "Negative Reviews",
      value: stats.negativeReviews.toLocaleString(),
      icon: ThumbsDown,
      iconBg: "bg-red-50 text-red-600",
      hint: "1-2 stars rating",
      hintColor: stats.negativeReviews > 0 ? "text-red-500 font-medium" : "text-gray-400",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50 font-sans">
      <AdminSidebar
        active={activeRoute}
        onNavigate={onNavigate}
        onLogout={onLogout}
        brandName="Horizon"
        brandSubtitle="MANAGEMENT CONSOLE"
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between sticky top-0 z-20 shadow-sm">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Search reviewer, comment, property..."
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-gray-900 focus:bg-white transition-colors"
            />
          </div>
          <div className="flex gap-3 items-center">
            <button className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50" aria-label="Notifications">
              <Bell size={18} />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6 flex-1">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="mb-4 rounded-xl bg-gray-900 text-white px-4 py-3 text-sm font-medium shadow-md flex items-center justify-between">
              <span>{toastMessage}</span>
              <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
          )}

          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reviews Management</h1>
              <p className="mt-1 text-sm text-gray-500">Monitor, review, and manage feedback submitted across your platform.</p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{card.label}</p>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${card.iconBg}`}>
                      <Icon size={16} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-2xl font-bold text-gray-900">{loading ? "—" : card.value}</p>
                    {card.showStars && !loading && <StarRow rating={Math.round(stats.averageRating)} size={14} />}
                  </div>
                  {card.hint && <p className={`mt-1 text-[11px] ${card.hintColor}`}>{card.hint}</p>}
                </div>
              );
            })}
          </div>

          {/* Filters & Control bar */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Target filter tabs */}
            <div className="flex flex-wrap items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-sm w-fit">
              {TARGET_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setTargetFilter(tab.key)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                    targetFilter === tab.key ? "bg-gray-900 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Rating Filter & Page Size */}
            <div className="flex items-center gap-3">
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 outline-none focus:border-gray-900"
              >
                <option value="ALL">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="LOW">1-2 Stars (Low)</option>
              </select>

              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 outline-none focus:border-gray-900"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
              </select>
            </div>
          </div>

          {/* Recent reviews table */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Platform Reviews</h2>
              <span className="text-xs text-gray-500 font-medium">
                {filteredReviews.length} {filteredReviews.length === 1 ? "review" : "reviews"} found
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100">
                    <th className="pb-3 font-semibold">Reviewer</th>
                    <th className="pb-3 font-semibold">Rating</th>
                    <th className="pb-3 font-semibold">Comment</th>
                    <th className="pb-3 font-semibold">Target / Property</th>
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-900 border-t-transparent mb-2" />
                        <p>Loading reviews...</p>
                      </td>
                    </tr>
                  ) : pagedReviews.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        <Star className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                        <p className="text-sm font-medium text-gray-600">No reviews found</p>
                        <p className="text-xs text-gray-400 mt-1">Try resetting search or filter criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    pagedReviews.map((rev) => {
                      const avatarSrc = rev.reviewerAvatarUrl ? getImageUrl(rev.reviewerAvatarUrl) : undefined;
                      return (
                        <tr key={rev.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 pr-3">
                            <div className="flex items-center gap-3">
                              {avatarSrc ? (
                                <img
                                  src={avatarSrc}
                                  alt={rev.reviewerName}
                                  className="h-8 w-8 rounded-full object-cover border border-gray-200"
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-[10px] font-semibold text-white">
                                  {initials(rev.reviewerName)}
                                </div>
                              )}
                              <span className="font-medium text-gray-900 truncate max-w-[140px] sm:max-w-none">
                                {rev.reviewerName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 whitespace-nowrap">
                            <StarRow rating={rev.rating} />
                          </td>
                          <td className="max-w-xs py-3.5 pr-4">
                            <p className="truncate text-gray-600 text-xs sm:text-sm" title={rev.comment}>
                              "{rev.comment || "No written comment"}"
                            </p>
                          </td>
                          <td className="py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${TARGET_BADGE_STYLE[rev.targetType] || TARGET_BADGE_STYLE.PROPERTY}`}>
                                {rev.targetType.toLowerCase()}
                              </span>
                              {rev.targetName && (
                                <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]" title={rev.targetName}>
                                  {rev.targetName}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(rev.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="py-3.5 text-right relative">
                            <div className="relative inline-block text-left">
                              <button
                                onClick={() => setOpenMenuId(openMenuId === rev.id ? null : rev.id)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                aria-label="More actions"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {openMenuId === rev.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setOpenMenuId(null)}
                                  />
                                  <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-gray-200 bg-white py-1 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                                    <button
                                      onClick={() => {
                                        setSelectedReview(rev);
                                        setOpenMenuId(null);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                      <Eye size={14} className="text-gray-400" />
                                      View Details
                                    </button>
                                    <button
                                      onClick={() => {
                                        setDeletingReview(rev);
                                        setOpenMenuId(null);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                      <Trash2 size={14} className="text-red-500" />
                                      Remove Review
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {!loading && filteredReviews.length > 0 && (
              <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row">
                <p className="text-xs text-gray-500">
                  Showing <span className="font-semibold text-gray-700">{rangeStart}</span> to{" "}
                  <span className="font-semibold text-gray-700">{rangeEnd}</span> of{" "}
                  <span className="font-semibold text-gray-700">{filteredReviews.length}</span> entries
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
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
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
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
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
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

      {/* VIEW DETAILS MODAL */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-gray-900">Review Details</h3>
              <button
                onClick={() => setSelectedReview(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Reviewer info */}
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                  {initials(selectedReview.reviewerName)}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">{selectedReview.reviewerName}</h4>
                  <p className="text-xs text-gray-400">
                    Submitted on {new Date(selectedReview.createdAt).toLocaleDateString("en-US", {
                      dateStyle: "full",
                    })}
                  </p>
                </div>
              </div>

              {/* Target & Rating */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-gray-100 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Rating Score</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xl font-bold text-gray-900">{selectedReview.rating}/5</span>
                    <StarRow rating={selectedReview.rating} size={14} />
                  </div>
                </div>
                <div className="border border-gray-100 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">Target Entity</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800 truncate">
                    {selectedReview.targetName || selectedReview.targetType}
                  </p>
                </div>
              </div>

              {/* Review Comment */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Reviewer Comment</p>
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-700 italic leading-relaxed">
                  "{selectedReview.comment || "No detailed written feedback was left for this review."}"
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedReview(null)}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Remove Review</h3>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to permanently delete the review by{" "}
              <span className="font-semibold text-gray-900">{deletingReview.reviewerName}</span> for{" "}
              <span className="font-semibold text-gray-900">{deletingReview.targetName || "Property"}</span>?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingReview(null)}
                disabled={isDeleting}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteReview}
                disabled={isDeleting}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}