import { useEffect, useMemo, useState } from "react";
import { Users, CheckCircle2, AlertTriangle, CalendarClock, FileText, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { api, type Booking, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

interface LandlordTenantsProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
}

const PAYMENT_STYLE: Record<string, string> = {
  PAID: "bg-green-50 text-green-600",
  PENDING: "bg-amber-50 text-amber-600",
  FAILED: "bg-red-50 text-red-600",
  OVERDUE: "bg-red-50 text-red-600",
  REFUNDED: "bg-gray-100 text-gray-600",
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("");
}

export default function LandlordTenants({ user, onLogout, activeRoute, onNavigate }: LandlordTenantsProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setLoading(true);
    try {
      const res = await api.getLandlordBookings();
      if (res.success) setBookings(res.bookings || []);
    } catch (e) {
      console.error("Failed to load tenants:", e);
    } finally {
      setLoading(false);
    }
  }

  const activeTenants = useMemo(() => bookings.filter((b) => b.status === "APPROVED"), [bookings]);
  const pendingRequests = useMemo(() => bookings.filter((b) => b.status === "PENDING"), [bookings]);

  const stats = useMemo(() => {
    const total = new Set(activeTenants.map((b) => b.tenantId)).size;
    const rentDue = activeTenants.filter((b) => b.payment?.status === "PENDING").length;
    const thirtyDays = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const expiringSoon = activeTenants.filter((b) => b.endDate && new Date(b.endDate).getTime() <= thirtyDays).length;
    return { total, activeLeases: activeTenants.length, rentDue, expiringSoon };
  }, [activeTenants]);

  async function handleDecision(bookingId: number, status: "APPROVED" | "REJECTED") {
    setActingId(bookingId);
    try {
      const res = await api.updateBookingStatus(bookingId, status);
      if (res.success) await loadBookings();
    } catch (e) {
      console.error("Failed to update booking:", e);
    } finally {
      setActingId(null);
    }
  }

  const statCards = [
    { label: "Total Tenants", value: stats.total, icon: Users, color: "text-gray-900" },
    { label: "Active Leases", value: stats.activeLeases, icon: CheckCircle2, color: "text-green-600" },
    { label: "Rent Due", value: stats.rentDue, icon: AlertTriangle, color: "text-red-600" },
    { label: "Expiring Soon", value: stats.expiringSoon, icon: CalendarClock, color: "text-amber-600" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} user={user} />
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tenants Management</h1>
          <p className="mt-1 text-sm text-gray-500">Overview and management of all active tenants.</p>
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
              </div>
            );
          })}
        </div>

        {/* Tenant roster */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Tenant Roster</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="pb-3 font-medium">Tenant Name</th>
                  <th className="pb-3 font-medium">Property</th>
                  <th className="pb-3 font-medium">Monthly Rent</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Lease Period</th>
                  <th className="pb-3 font-medium">Documents</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading tenants...</td></tr>
                ) : activeTenants.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">No active tenants yet.</td></tr>
                ) : (
                  activeTenants.map((b) => (
                    <tr key={b.id} className="border-t border-gray-100">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-[10px] font-semibold text-white">
                            {initials(b.tenant?.fullName || `T${b.tenantId}`)}
                          </div>
                          <span className="font-medium text-gray-900">{b.tenant?.fullName || `Tenant #${b.tenantId}`}</span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-700">{b.room?.title || "—"}</td>
                      <td className="py-3 text-gray-700">Rs. {(b.room?.price || 0).toLocaleString()}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${PAYMENT_STYLE[b.payment?.status || "PENDING"]}`}>
                          {b.payment?.status || "Pending"}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500">
                        {new Date(b.moveInDate).toLocaleDateString()} - {b.endDate ? new Date(b.endDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3">
                        {b.documentUrl ? (
                          <a href={b.documentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                            <FileText size={13} /> View Docs
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <button className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50" aria-label="Edit"><Pencil size={13} /></button>
                          <button className="rounded-lg border border-gray-200 p-1.5 text-red-600 hover:bg-red-50" aria-label="Remove"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* New tenant requests */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">New Tenant Requests</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="pb-3 font-medium">Request ID</th>
                  <th className="pb-3 font-medium">Applicant Name</th>
                  <th className="pb-3 font-medium">Interested Property</th>
                  <th className="pb-3 font-medium">Application Date</th>
                  <th className="pb-3 font-medium">Credit Score</th>
                  <th className="pb-3 font-medium">Documents</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading requests...</td></tr>
                ) : pendingRequests.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">No pending requests.</td></tr>
                ) : (
                  pendingRequests.map((b) => (
                    <tr key={b.id} className="border-t border-gray-100">
                      <td className="py-3 font-medium text-gray-900">#TR-{1000 + b.id}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-[10px] font-semibold text-white">
                            {initials(b.tenant?.fullName || `T${b.tenantId}`)}
                          </div>
                          {b.tenant?.fullName || `Tenant #${b.tenantId}`}
                        </div>
                      </td>
                      <td className="py-3 text-gray-700">{b.room?.title || "—"}</td>
                      <td className="py-3 text-gray-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 text-gray-700">{b.creditScore ?? "—"}</td>
                      <td className="py-3">
                        {b.documentUrl ? (
                          <a href={b.documentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                            <FileText size={13} /> View Docs
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleDecision(b.id, "APPROVED")}
                            disabled={actingId === b.id}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-green-200 text-green-600 hover:bg-green-50 disabled:opacity-50"
                            aria-label="Approve"
                          >
                            {actingId === b.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          </button>
                          <button
                            onClick={() => handleDecision(b.id, "REJECTED")}
                            disabled={actingId === b.id}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                            aria-label="Reject"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}