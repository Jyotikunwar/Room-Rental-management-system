import { useEffect, useMemo, useState } from "react";
import { Search, User as UserIcon, Building2, Phone, Mail } from "lucide-react";
import { api, type Booking, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

interface LandlordTenantsProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
}

// NOTE: Booking doesn't currently include tenant details (name/email/phone) in
// your api.ts types — only tenantId. If your backend's /bookings/landlord
// response includes a `tenant` relation, add `tenant?: User` to the Booking
// interface in api.ts and this page will pick it up automatically via
// booking.tenant below. Until then, it falls back to "Tenant #<id>".
type BookingWithTenant = Booking & { tenant?: User };

const PAYMENT_STYLE: Record<string, string> = {
  PAID: "bg-green-50 text-green-600",
  PENDING: "bg-amber-50 text-amber-600",
  FAILED: "bg-red-50 text-red-600",
  REFUNDED: "bg-gray-100 text-gray-600",
};

export default function LandlordTenants({ onLogout, activeRoute, onNavigate }: LandlordTenantsProps) {
  const [bookings, setBookings] = useState<BookingWithTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Current tenants = approved bookings, one row per tenant+room.
  const currentTenants = useMemo(() => {
    return bookings.filter((b) => b.status === "APPROVED");
  }, [bookings]);

  const filteredTenants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentTenants;
    return currentTenants.filter((b) => {
      const name = b.tenant?.fullName?.toLowerCase() || "";
      const room = b.room?.title?.toLowerCase() || "";
      return name.includes(q) || room.includes(q);
    });
  }, [currentTenants, searchQuery]);

  const tenantCount = new Set(currentTenants.map((b) => b.tenantId)).size;

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
              placeholder="Search tenants, properties..."
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
            <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
            <p className="mt-1 text-sm text-gray-500">
              {loading ? "Loading..." : `${tenantCount} active tenant${tenantCount === 1 ? "" : "s"} across your properties.`}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3 font-medium">Tenant</th>
                    <th className="pb-3 font-medium">Property</th>
                    <th className="pb-3 font-medium">Move-in Date</th>
                    <th className="pb-3 font-medium">Payment</th>
                    <th className="pb-3 font-medium text-right">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">Loading tenants...</td>
                    </tr>
                  ) : filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        {currentTenants.length === 0 ? "No active tenants yet." : "No tenants match your search."}
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((booking) => (
                      <tr key={booking.id} className="border-t border-gray-100">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                              <UserIcon size={16} className="text-gray-500" />
                            </div>
                            <p className="font-medium text-gray-900">
                              {booking.tenant?.fullName || `Tenant #${booking.tenantId}`}
                            </p>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Building2 size={14} className="text-gray-400" />
                            {booking.room?.title || "—"}
                          </div>
                        </td>
                        <td className="py-3 text-gray-700">
                          {new Date(booking.moveInDate).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              PAYMENT_STYLE[booking.payment?.status || "PENDING"]
                            }`}
                          >
                            {booking.payment?.status || "No payment yet"}
                          </span>
                        </td>
                        <td className="py-3">
  <div className="flex justify-end gap-2">
    {booking.tenant?.phone && (
      <a
        href={`tel:${booking.tenant.phone}`}
        className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
        aria-label="Call tenant"
      >
        <Phone size={14} />
      </a>
    )}

    {booking.tenant?.email && (
      <a
        href={`mailto:${booking.tenant.email}`}
        className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
        aria-label="Email tenant"
      >
        <Mail size={14} />
      </a>
    )}
  </div>
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