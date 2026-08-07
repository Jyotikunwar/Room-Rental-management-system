import { useEffect, useMemo, useState } from "react";
import { Search, Banknote, Building2 } from "lucide-react";
import { api, type Booking, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

interface LandlordPaymentsProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
}

const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-green-50 text-green-600",
  PENDING: "bg-amber-50 text-amber-600",
  FAILED: "bg-red-50 text-red-600",
  REFUNDED: "bg-gray-100 text-gray-600",
};

type StatusFilter = "ALL" | "PAID" | "PENDING" | "FAILED" | "REFUNDED";

export default function LandlordPayments({ user, onLogout, activeRoute, onNavigate }: LandlordPaymentsProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setLoading(true);
    try {
      const res = await api.getLandlordBookings();
      if (res.success) setBookings(res.bookings || []);
    } catch (e) {
      console.error("Failed to load bookings:", e);
    } finally {
      setLoading(false);
    }
  }

  // Only bookings that actually have a payment record are relevant here.
  const paymentRows = useMemo(() => bookings.filter((b) => b.payment), [bookings]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return paymentRows.filter((b) => {
      const matchesQuery = !q || b.room?.title?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "ALL" || b.payment?.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [paymentRows, searchQuery, statusFilter]);

  const totalReceived = useMemo(
    () => paymentRows.filter((b) => b.payment?.status === "PAID").reduce((sum, b) => sum + (b.payment?.amount || 0), 0),
    [paymentRows]
  );
  const totalPending = useMemo(
    () => paymentRows.filter((b) => b.payment?.status === "PENDING").reduce((sum, b) => sum + (b.payment?.amount || 0), 0),
    [paymentRows]
  );

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
              placeholder="Search by property..."
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
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="mt-1 text-sm text-gray-500">Rent payments across all your properties.</p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total Received</p>
                <Banknote size={18} className="text-gray-400" />
              </div>
              <p className="mt-3 text-3xl font-bold text-gray-900">
                {loading ? "—" : `Rs. ${totalReceived.toLocaleString()}`}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pending</p>
                <Banknote size={18} className="text-gray-400" />
              </div>
              <p className="mt-3 text-3xl font-bold text-gray-900">
                {loading ? "—" : `Rs. ${totalPending.toLocaleString()}`}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              {(["ALL", "PAID", "PENDING", "FAILED", "REFUNDED"] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    statusFilter === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3 font-medium">Property</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Method</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">Loading payments...</td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">No payments found.</td>
                    </tr>
                  ) : (
                    filteredRows.map((b) => (
                      <tr key={b.id} className="border-t border-gray-100">
                        <td className="py-3">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Building2 size={14} className="text-gray-400" />
                            {b.room?.title || "—"}
                          </div>
                        </td>
                        <td className="py-3 font-medium text-gray-900">
                          Rs. {(b.payment?.amount || 0).toLocaleString()}
                        </td>
                        <td className="py-3 text-gray-700">{b.payment?.paymentMethod || "—"}</td>
                        <td className="py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[b.payment?.status || "PENDING"]}`}>
                            {b.payment?.status}
                          </span>
                        </td>
                        <td className="py-3 text-gray-500">
                          {b.payment?.paidAt
                            ? new Date(b.payment.paidAt).toLocaleDateString()
                            : new Date(b.payment?.createdAt || b.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}