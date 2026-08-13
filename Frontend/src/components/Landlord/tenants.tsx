import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  Clock,
  ShieldAlert,
  RotateCcw,
  ChevronRight,
  UserCheck,
  UserX,
  MessageSquare,
  Eye,
} from "lucide-react";
import { api, type Booking, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

interface LandlordTenantsProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
}

type TabFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

const STATUS_BADGE: Record<string, { label: string; style: string }> = {
  PENDING: { label: "Pending Review", style: "bg-amber-50 text-amber-700 border-amber-200" },
  APPROVED: { label: "Accepted & Active", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Rejected", style: "bg-red-50 text-red-700 border-red-200" },
  CANCELLED: { label: "Cancelled", style: "bg-gray-100 text-gray-600 border-gray-200" },
  COMPLETED: { label: "Lease Ended", style: "bg-blue-50 text-blue-700 border-blue-200" },
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

export default function LandlordTenants({
  user,
  onLogout,
  activeRoute,
  onNavigate,
}: LandlordTenantsProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("ALL");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [toast, setToast] = useState<{ message: string; type?: "info" | "success" | "warning" } | null>(null);

  const showToast = (msg: string, type: "info" | "success" | "warning" = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim().toLowerCase()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getLandlordBookings();
      if (res?.success) {
        // Enforce landlord ownership client-side safety filter
        const ownedOnly = (res.bookings || []).filter(
          (b: Booking) => !b.room?.landlordId || b.room.landlordId === user.id || user.role === "ADMIN"
        );
        setBookings(ownedOnly);
      } else {
        setBookings([]);
      }
    } catch (e) {
      console.error("Failed to load landlord bookings:", e);
      showToast("Backend connection error loading tenant records", "warning");
    } finally {
      setLoading(false);
    }
  }, [user.id, user.role]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  async function handleDecision(bookingId: number, status: "APPROVED" | "REJECTED") {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    if (targetBooking?.room?.landlordId && targetBooking.room.landlordId !== user.id && user.role !== "ADMIN") {
      showToast("Access Denied: You can only accept or reject requests for your own properties", "warning");
      return;
    }

    setActingId(bookingId);
    try {
      const res = await api.updateBookingStatus(bookingId, status);
      if (res?.success) {
        showToast(
          status === "APPROVED"
            ? "Booking request accepted! Tenant has been notified and room status updated."
            : "Booking request rejected.",
          status === "APPROVED" ? "success" : "info"
        );
        if (selectedBooking?.id === bookingId) {
          setSelectedBooking((prev) => (prev ? { ...prev, status } : null));
        }
        await loadBookings();
      } else {
        showToast(res?.message || "Failed to update request status", "warning");
      }
    } catch (e) {
      console.error("Failed to update booking decision:", e);
      showToast("Error updating booking request status", "warning");
    } finally {
      setActingId(null);
    }
  }

  // Filtered lists
  const pendingRequests = useMemo(
    () => bookings.filter((b) => b.status === "PENDING"),
    [bookings]
  );
  const activeTenants = useMemo(
    () => bookings.filter((b) => b.status === "APPROVED"),
    [bookings]
  );

  const stats = useMemo(() => {
    const totalTenants = new Set(activeTenants.map((b) => b.tenantId)).size;
    const activeLeases = activeTenants.length;
    const pendingCount = pendingRequests.length;
    const rentDueCount = activeTenants.filter((b) => b.payment?.status === "PENDING").length;

    return { totalTenants, activeLeases, pendingCount, rentDueCount };
  }, [activeTenants, pendingRequests]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Tab filter
      if (activeTab === "PENDING" && b.status !== "PENDING") return false;
      if (activeTab === "APPROVED" && b.status !== "APPROVED") return false;
      if (
        activeTab === "REJECTED" &&
        b.status !== "REJECTED" &&
        b.status !== "CANCELLED" &&
        b.status !== "COMPLETED"
      )
        return false;

      // Search query filter
      if (debouncedSearch) {
        const tenantName = b.tenant?.fullName?.toLowerCase() || "";
        const tenantEmail = b.tenant?.email?.toLowerCase() || "";
        const tenantPhone = b.tenant?.phone?.toLowerCase() || "";
        const roomTitle = b.room?.title?.toLowerCase() || "";
        const reqId = `#tr-${1000 + b.id}`;
        const notes = b.notes?.toLowerCase() || "";

        return (
          tenantName.includes(debouncedSearch) ||
          tenantEmail.includes(debouncedSearch) ||
          tenantPhone.includes(debouncedSearch) ||
          roomTitle.includes(debouncedSearch) ||
          reqId.includes(debouncedSearch) ||
          notes.includes(debouncedSearch)
        );
      }
      return true;
    });
  }, [bookings, activeTab, debouncedSearch]);

  const statCards = [
    { label: "Total Active Tenants", value: stats.totalTenants, icon: Users, color: "text-gray-900", bg: "bg-gray-100" },
    { label: "Active Leases", value: stats.activeLeases, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Pending Requests", value: stats.pendingCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Rent Due", value: stats.rentDueCount, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
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
              placeholder="Search tenants, booking requests, property or email..."
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
                loadBookings();
                showToast("Booking requests refreshed", "info");
              }}
              disabled={loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-2xs"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Page Title */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Tenants & Booking Requests</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Review and accept or reject incoming booking requests for your properties only (Owner: {user.fullName}).
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

          {/* Tab Filter System */}
          <div className="flex items-center justify-between border-b border-gray-200/80 pb-3 gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 shrink-0">
              {[
                { key: "ALL", label: "All Requests & Tenants", count: bookings.length },
                { key: "PENDING", label: "New Requests (Pending)", count: pendingRequests.length, highlight: true },
                { key: "APPROVED", label: "Active Tenants", count: activeTenants.length },
                { key: "REJECTED", label: "Past / Rejected", count: bookings.filter((b) => b.status === "REJECTED" || b.status === "CANCELLED").length },
              ].map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as TabFilter)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all shrink-0 ${
                      active
                        ? "bg-gray-900 text-white shadow-xs"
                        : "bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        active
                          ? "bg-white/20 text-white"
                          : tab.highlight && tab.count > 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {(debouncedSearch || activeTab !== "ALL") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("ALL");
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 shrink-0"
              >
                <RotateCcw size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Incoming Booking Requests Banner / Standalone Card when Pending is Selected or Available */}
          {pendingRequests.length > 0 && activeTab !== "APPROVED" && activeTab !== "REJECTED" && (
            <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-white p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-amber-950">
                      {pendingRequests.length} Pending Booking Request{pendingRequests.length > 1 ? "s" : ""} Awaiting Your Decision
                    </h2>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Review tenant details and accept or reject requests to confirm room bookings.
                    </p>
                  </div>
                </div>
                {activeTab !== "PENDING" && (
                  <button
                    onClick={() => setActiveTab("PENDING")}
                    className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-all shadow-xs self-start sm:self-auto"
                  >
                    <span>View Pending Requests</span>
                    <ChevronRight size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Main Table Card */}
          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-2xs overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <h2 className="text-sm font-bold text-gray-900">
                {activeTab === "PENDING"
                  ? "Incoming Booking Applications"
                  : activeTab === "APPROVED"
                  ? "Active Tenant Roster"
                  : activeTab === "REJECTED"
                  ? "Rejected & Cancelled Requests"
                  : "All Tenant Records & Booking Requests"}
              </h2>
              <span className="text-xs text-gray-400 font-medium">
                {filteredBookings.length} record{filteredBookings.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Applicant / Tenant</th>
                    <th className="py-3 px-4">Interested Room</th>
                    <th className="py-3 px-4">Move-in Date</th>
                    <th className="py-3 px-4">Rent Amount</th>
                    <th className="py-3 px-4">Request Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-gray-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <RefreshCw size={20} className="animate-spin text-gray-400" />
                          <span>Loading tenant and booking request records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-gray-400">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Users size={24} className="text-gray-300" />
                          <p className="font-semibold text-gray-700">No records found</p>
                          <p className="text-gray-400 max-w-xs">
                            {debouncedSearch
                              ? "No tenant requests match your search criteria."
                              : "No booking requests or active tenants found for this view filter."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((b) => {
                      const badge = STATUS_BADGE[b.status] || STATUS_BADGE.PENDING;
                      const isPending = b.status === "PENDING";
                      const isActing = actingId === b.id;

                      return (
                        <tr key={b.id} className="group hover:bg-gray-50/70 transition-all">
                          <td className="py-3.5 px-4 font-semibold text-gray-900 text-xs">
                            #TR-{1000 + b.id}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white shadow-2xs">
                                {initials(b.tenant?.fullName || `T${b.tenantId}`)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 text-xs group-hover:text-blue-600 transition-colors">
                                  {b.tenant?.fullName || `Tenant #${b.tenantId}`}
                                </p>
                                <p className="text-[11px] text-gray-400 truncate">
                                  {b.tenant?.email || b.tenant?.phone || "No contact info"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="min-w-0 max-w-[180px]">
                              <p className="font-medium text-gray-900 text-xs truncate">
                                {b.room?.title || "Property"}
                              </p>
                              {b.room?.city && (
                                <p className="text-[11px] text-gray-400 truncate">
                                  {b.room.city}, {b.room.location}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-xs text-gray-600 font-medium">
                            {new Date(b.moveInDate).toLocaleDateString()}
                          </td>

                          <td className="py-3.5 px-4 text-xs font-bold text-gray-900">
                            Rs. {(b.room?.price || b.totalAmount || 0).toLocaleString()}/mo
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${badge.style}`}
                            >
                              {badge.label}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details Button */}
                              <button
                                onClick={() => setSelectedBooking(b)}
                                className="inline-flex h-8 items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-all shadow-2xs"
                                title="View Application Details"
                              >
                                <Eye size={13} />
                                <span className="hidden xl:inline">Details</span>
                              </button>

                              {/* Direct Accept / Reject Buttons for Pending Requests */}
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => handleDecision(b.id, "APPROVED")}
                                    disabled={isActing}
                                    className="inline-flex h-8 items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-xs"
                                    title="Accept Booking Request"
                                  >
                                    {isActing ? (
                                      <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                      <Check size={13} />
                                    )}
                                    <span>Accept</span>
                                  </button>

                                  <button
                                    onClick={() => handleDecision(b.id, "REJECTED")}
                                    disabled={isActing}
                                    className="inline-flex h-8 items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-all"
                                    title="Reject Booking Request"
                                  >
                                    <X size={13} />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}

                              {b.status === "APPROVED" && (
                                <button
                                  onClick={() => onNavigate("messages")}
                                  className="inline-flex h-8 items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-2xs"
                                  title="Contact Tenant"
                                >
                                  <MessageSquare size={13} />
                                  <span className="hidden xl:inline">Chat</span>
                                </button>
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
          </div>
        </main>
      </div>

      {/* Booking Request Application Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">Application #TR-{1000 + selectedBooking.id}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                      (STATUS_BADGE[selectedBooking.status] || STATUS_BADGE.PENDING).style
                    }`}
                  >
                    {(STATUS_BADGE[selectedBooking.status] || STATUS_BADGE.PENDING).label}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Booking Application Details</h2>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 text-xs text-gray-700">
              {/* Applicant Card */}
              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white shadow-xs">
                  {initials(selectedBooking.tenant?.fullName || `T${selectedBooking.tenantId}`)}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h3 className="font-bold text-gray-900 text-sm">{selectedBooking.tenant?.fullName || "Tenant Applicant"}</h3>
                  {selectedBooking.tenant?.email && (
                    <p className="flex items-center gap-1.5 text-gray-500 text-xs">
                      <Mail size={12} className="text-gray-400" />
                      <span>{selectedBooking.tenant.email}</span>
                    </p>
                  )}
                  {selectedBooking.tenant?.phone && (
                    <p className="flex items-center gap-1.5 text-gray-500 text-xs">
                      <Phone size={12} className="text-gray-400" />
                      <span>{selectedBooking.tenant.phone}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Property & Lease Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                    <Building2 size={11} /> Property Title
                  </p>
                  <p className="font-bold text-gray-900 truncate">{selectedBooking.room?.title || "Property"}</p>
                  <p className="text-[11px] font-semibold text-blue-600">
                    Rs. {(selectedBooking.room?.price || selectedBooking.totalAmount || 0).toLocaleString()}/mo
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                    <Clock size={11} /> Requested Move-in
                  </p>
                  <p className="font-bold text-gray-900">
                    {new Date(selectedBooking.moveInDate).toLocaleDateString()}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Submitted {new Date(selectedBooking.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Notes / Special Request */}
              {selectedBooking.notes && (
                <div className="rounded-2xl border border-gray-100 p-3.5 bg-amber-50/50 space-y-1">
                  <p className="font-bold text-amber-900 text-xs">Tenant Application Notes:</p>
                  <p className="text-amber-800 text-xs leading-relaxed">{selectedBooking.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer with Actions */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <button
                onClick={() => setSelectedBooking(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedBooking.status === "PENDING" ? (
                  <>
                    <button
                      onClick={() => handleDecision(selectedBooking.id, "REJECTED")}
                      disabled={actingId === selectedBooking.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-all"
                    >
                      <UserX size={13} />
                      <span>Reject Request</span>
                    </button>

                    <button
                      onClick={() => handleDecision(selectedBooking.id, "APPROVED")}
                      disabled={actingId === selectedBooking.id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-xs"
                    >
                      {actingId === selectedBooking.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <UserCheck size={13} />
                      )}
                      <span>Accept Booking</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedBooking(null);
                      onNavigate("messages");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition-all shadow-xs"
                  >
                    <MessageSquare size={13} />
                    <span>Send Message</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}