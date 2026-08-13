import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Star,
  MessageSquare,
  Sparkles,
  Trash2,
  RefreshCw,
  Plus,
  X,
  CheckCircle2,
  ShieldAlert,
  Building2,
  User,
  Send,
  Loader2,
  Search,
  Pencil,
} from "lucide-react";
import { api, type User as UserType } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

interface LandlordReviewsProps {
  user: UserType;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
}

type Tab = "PROPERTY" | "TENANT";

interface PropertyReviewItem {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  user?: { id: number; fullName: string; email?: string };
  room?: { id: number; title: string; city?: string; location?: string };
}

interface TenantReviewItem {
  id: string | number;
  tenantId: number;
  tenantName: string;
  tenantEmail?: string;
  roomTitle: string;
  rating: number;
  comment: string;
  createdAt: string;
}

function StarRow({
  rating,
  interactive = false,
  onSelect,
}: {
  rating: number;
  interactive?: boolean;
  onSelect?: (r: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type={interactive ? "button" : "button"}
          disabled={!interactive}
          onClick={() => interactive && onSelect?.(i)}
          className={`${interactive ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}`}
        >
          <Star
            size={14}
            className={i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}
          />
        </button>
      ))}
    </div>
  );
}

export default function LandlordReviews({
  user,
  onLogout,
  activeRoute,
  onNavigate,
}: LandlordReviewsProps) {
  const [propertyReviews, setPropertyReviews] = useState<PropertyReviewItem[]>([]);
  const [tenantBookings, setTenantBookings] = useState<any[]>([]);
  const [tenantReviews, setTenantReviews] = useState<TenantReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("PROPERTY");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal & Edit State for Tenant Reviews
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | number | null>(null);
  const [selectedTenantBookingId, setSelectedTenantBookingId] = useState<number | "">("");
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type?: "info" | "success" | "warning" } | null>(null);

  const showToast = (msg: string, type: "info" | "success" | "warning" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getLandlordReviews();
      if (res?.success) {
        // Enforce landlord property ownership safety filter
        const ownedReviews = (res.reviews || []).filter(
          (r: any) => !r.room?.landlordId || r.room.landlordId === user.id || user.role === "ADMIN"
        );
        setPropertyReviews(ownedReviews);
        setTenantBookings(res.tenantBookings || []);
      } else {
        setPropertyReviews([]);
      }
    } catch (e) {
      console.error("Failed to load landlord reviews:", e);
      showToast("Error loading reviews feed", "warning");
    } finally {
      setLoading(false);
    }
  }, [user.id, user.role]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Open modal for creating new tenant review
  function openCreateModal() {
    setEditingReviewId(null);
    setSelectedTenantBookingId("");
    setNewRating(5);
    setNewComment("");
    setShowAddModal(true);
  }

  // Open modal for editing an existing tenant review written by landlord
  function openEditModal(rev: TenantReviewItem) {
    setEditingReviewId(rev.id);
    const booking = tenantBookings.find((b) => b.tenant?.id === rev.tenantId || b.tenantId === rev.tenantId);
    if (booking) {
      setSelectedTenantBookingId(booking.id);
    }
    setNewRating(rev.rating);
    setNewComment(rev.comment);
    setShowAddModal(true);
  }

  // Handle deleting a tenant review written by landlord
  function handleDeleteTenantReview(reviewId: string | number) {
    if (!window.confirm("Are you sure you want to delete this tenant review?")) return;
    setTenantReviews((prev) => prev.filter((r) => r.id !== reviewId));
    showToast("Tenant review deleted successfully", "info");
  }

  // Handle submitting (create or edit) review for a tenant
  async function handleSaveTenantReview(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) {
      showToast("Please write a review comment", "warning");
      return;
    }

    setSubmittingReview(true);
    try {
      if (editingReviewId) {
        // EDIT existing tenant review
        setTenantReviews((prev) =>
          prev.map((r) =>
            r.id === editingReviewId
              ? { ...r, rating: newRating, comment: newComment.trim() }
              : r
          )
        );
        showToast("Tenant review updated successfully!", "success");
      } else {
        // CREATE new tenant review
        if (!selectedTenantBookingId) {
          showToast("Please select a tenant to review", "warning");
          setSubmittingReview(false);
          return;
        }

        const booking = tenantBookings.find((b) => b.id === Number(selectedTenantBookingId));
        if (!booking) return;

        const newReviewItem: TenantReviewItem = {
          id: `trev-${Date.now()}`,
          tenantId: booking.tenant?.id || booking.tenantId,
          tenantName: booking.tenant?.fullName || "Tenant",
          tenantEmail: booking.tenant?.email,
          roomTitle: booking.room?.title || "Property",
          rating: newRating,
          comment: newComment.trim(),
          createdAt: new Date().toISOString(),
        };

        setTenantReviews((prev) => [newReviewItem, ...prev]);
        showToast(`Review submitted for tenant ${newReviewItem.tenantName}!`, "success");
      }

      setShowAddModal(false);
      setEditingReviewId(null);
      setSelectedTenantBookingId("");
      setNewRating(5);
      setNewComment("");
    } catch (err) {
      console.error("Failed to save tenant review:", err);
      showToast("Failed to save review for tenant", "warning");
    } finally {
      setSubmittingReview(false);
    }
  }

  // Filtered lists
  const filteredPropertyReviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return propertyReviews;
    return propertyReviews.filter(
      (r) =>
        r.room?.title?.toLowerCase().includes(q) ||
        r.user?.fullName?.toLowerCase().includes(q) ||
        r.comment?.toLowerCase().includes(q)
    );
  }, [propertyReviews, searchQuery]);

  const filteredTenantReviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tenantReviews;
    return tenantReviews.filter(
      (r) =>
        r.tenantName.toLowerCase().includes(q) ||
        r.roomTitle.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q)
    );
  }, [tenantReviews, searchQuery]);

  // Overall Stats
  const stats = useMemo(() => {
    const allRatings = propertyReviews.map((r) => r.rating);
    const avgRating = allRatings.length ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 5.0;
    const highlyRated = propertyReviews.filter((r) => r.rating >= 4).length;

    return {
      avgRating,
      totalPropertyReviews: propertyReviews.length,
      totalTenantReviews: tenantReviews.length,
      highlyRated,
    };
  }, [propertyReviews, tenantReviews]);

  const statCards = [
    { label: "Avg Property Rating", value: `${stats.avgRating.toFixed(1)} / 5`, icon: Star, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Property Reviews Received", value: stats.totalPropertyReviews, icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Tenants Reviewed", value: stats.totalTenantReviews, icon: User, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "High Rating (4★+)", value: stats.highlyRated, icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50/80 font-sans text-gray-900">
      <LandlordSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} user={user} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-xs font-semibold shadow-2xl transition-all animate-in slide-in-from-top-3 ${
              toast.type === "warning"
                ? "bg-amber-600 text-white"
                : toast.type === "info"
                ? "bg-blue-600 text-white"
                : "bg-emerald-600 text-white"
            }`}
          >
            {toast.type === "warning" ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Top Header */}
        <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-gray-200/80 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-3.5 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="relative w-full sm:max-w-md">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviews by property, tenant or keywords..."
              className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50/80 pl-9 pr-8 text-xs outline-none focus:border-gray-900 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => {
                loadReviews();
                showToast("Reviews feed refreshed", "info");
              }}
              disabled={loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-2xs"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={openCreateModal}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gray-900 px-4 text-xs font-semibold text-white hover:bg-gray-800 transition-all shadow-xs"
            >
              <Plus size={14} />
              <span>Review Tenant</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Title & Description */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Reviews & Ratings Management</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              View tenant feedback on your properties (Owner: {user.fullName}) and manage reviews submitted for your tenants.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {statCards.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-2xs transition-all hover:border-gray-300">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400">{c.label}</p>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${c.bg}`}>
                      <Icon size={14} className={c.color} />
                    </div>
                  </div>
                  <p className="mt-2 text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                    {loading ? "—" : c.value}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Main Card Container */}
          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-2xs overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-5 pt-4 gap-6">
              <button
                onClick={() => setTab("PROPERTY")}
                className={`pb-3 text-xs font-bold transition-all border-b-2 ${
                  tab === "PROPERTY"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                Property Reviews Received ({propertyReviews.length})
              </button>
              <button
                onClick={() => setTab("TENANT")}
                className={`pb-3 text-xs font-bold transition-all border-b-2 ${
                  tab === "TENANT"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                Tenant Reviews Submitted ({tenantReviews.length})
              </button>
            </div>

            {/* Tab 1: Property Reviews (Reviews from Tenants - VIEW ONLY) */}
            {tab === "PROPERTY" ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      <th className="py-3 px-4">Property Title</th>
                      <th className="py-3 px-4">Reviewer Tenant</th>
                      <th className="py-3 px-4">Rating</th>
                      <th className="py-3 px-4">Tenant Feedback / Comment</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-xs text-gray-400">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <RefreshCw size={20} className="animate-spin text-gray-400" />
                            <span>Loading property reviews...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredPropertyReviews.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-xs text-gray-400">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <MessageSquare size={24} className="text-gray-300" />
                            <p className="font-semibold text-gray-700">No property reviews found</p>
                            <p className="text-gray-400 max-w-xs">
                              {searchQuery
                                ? "No reviews match your search query."
                                : "You haven't received any reviews on your listed properties yet."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPropertyReviews.map((rev) => (
                        <tr key={rev.id} className="group hover:bg-gray-50/70 transition-all">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <Building2 size={15} className="text-gray-400 shrink-0" />
                              <span className="font-bold text-gray-900 text-xs">
                                {rev.room?.title || "Property Listing"}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-xs font-semibold text-gray-700">
                            {rev.user?.fullName || "Verified Tenant"}
                          </td>

                          <td className="py-3.5 px-4">
                            <StarRow rating={rev.rating} />
                          </td>

                          <td className="py-3.5 px-4 text-xs text-gray-600 max-w-xs leading-relaxed">
                            "{rev.comment || "No comment provided."}"
                          </td>

                          <td className="py-3.5 px-4 text-xs text-gray-400">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                              Verified Review
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Tab 2: Tenant Reviews (Reviews Submitted BY Landlord - EDIT & DELETE ALLOWED) */
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      <th className="py-3 px-4">Tenant Name</th>
                      <th className="py-3 px-4">Rented Property</th>
                      <th className="py-3 px-4">Rating</th>
                      <th className="py-3 px-4">Landlord Feedback</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTenantReviews.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-xs text-gray-400">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <User size={24} className="text-gray-300" />
                            <p className="font-semibold text-gray-700">No tenant reviews submitted yet</p>
                            <p className="text-gray-400 max-w-xs">
                              Click "+ Review Tenant" to leave feedback and ratings for your active or past tenants.
                            </p>
                            <button
                              onClick={openCreateModal}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition-all shadow-xs"
                            >
                              <Plus size={14} />
                              <span>Review Tenant Now</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredTenantReviews.map((rev) => (
                        <tr key={rev.id} className="group hover:bg-gray-50/70 transition-all">
                          <td className="py-3.5 px-4 font-bold text-gray-900 text-xs">
                            {rev.tenantName}
                          </td>

                          <td className="py-3.5 px-4 text-xs font-medium text-gray-700">
                            {rev.roomTitle}
                          </td>

                          <td className="py-3.5 px-4">
                            <StarRow rating={rev.rating} />
                          </td>

                          <td className="py-3.5 px-4 text-xs text-gray-600 max-w-xs leading-relaxed">
                            "{rev.comment}"
                          </td>

                          <td className="py-3.5 px-4 text-xs text-gray-400">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Tenant Review Button */}
                              <button
                                onClick={() => openEditModal(rev)}
                                className="inline-flex h-8 items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-all shadow-2xs"
                                title="Edit Tenant Review"
                              >
                                <Pencil size={13} />
                                <span>Edit</span>
                              </button>

                              {/* Delete Tenant Review Button */}
                              <button
                                onClick={() => handleDeleteTenantReview(rev.id)}
                                className="inline-flex h-8 items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-all shadow-2xs"
                                title="Delete Tenant Review"
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal: Submit / Edit Review for Tenant */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingReviewId ? "Edit Tenant Review" : "Review & Rate Tenant"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingReviewId
                    ? "Update your rating and feedback for this tenant."
                    : "Submit feedback for an active tenant on your properties."}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTenantReview} className="space-y-4 text-xs">
              {/* Tenant Selection */}
              <div className="space-y-1.5">
                <label className="font-bold text-gray-700 block">Select Tenant</label>
                {tenantBookings.length === 0 ? (
                  <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    No active tenants found. You need approved room bookings to review a tenant.
                  </p>
                ) : (
                  <select
                    value={selectedTenantBookingId}
                    onChange={(e) => setSelectedTenantBookingId(Number(e.target.value))}
                    required
                    disabled={Boolean(editingReviewId)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/80 p-2.5 text-xs font-semibold text-gray-900 outline-none focus:border-gray-900 focus:bg-white disabled:opacity-60 transition-all"
                  >
                    <option value="">-- Choose Tenant --</option>
                    {tenantBookings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.tenant?.fullName || `Tenant #${b.tenantId}`} — {b.room?.title || "Property"}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Star Rating */}
              <div className="space-y-1.5">
                <label className="font-bold text-gray-700 block">Tenant Rating (1 to 5 Stars)</label>
                <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <StarRow rating={newRating} interactive={true} onSelect={(r) => setNewRating(r)} />
                  <span className="font-bold text-gray-900 text-xs">{newRating} / 5 Stars</span>
                </div>
              </div>

              {/* Comment Text */}
              <div className="space-y-1.5">
                <label className="font-bold text-gray-700 block">Review Comment / Feedback</label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write your experience with this tenant (e.g. timely rent payments, clean room maintenance...)"
                  rows={4}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/80 p-3 text-xs outline-none focus:border-gray-900 focus:bg-white transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview || (tenantBookings.length === 0 && !editingReviewId)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-all shadow-xs"
                >
                  {submittingReview ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Send size={13} />
                  )}
                  <span>{editingReviewId ? "Update Review" : "Submit Review"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}