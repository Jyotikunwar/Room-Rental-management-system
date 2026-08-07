import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Bell,
  Plus,
  Building2,
  PieChart,
  Banknote,
  Wrench,
  MoreVertical,
  MessageSquare,
  CircleDollarSign,
} from "lucide-react";
import { api, type Room, type Booking, type Inquiry, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";
import LandlordProperties from "./properties";
import LandlordTenants from "./tenants";
import LandlordMessages from "./messages";
import LandlordPayments from "./payments";
import LandlordMaintenance from "./maintenance";
import LandlordActivity from "./activity";
import LandlordReviews from "./reviews";
import LandlordSettings from "./settings";

interface LandlordDashboardProps {
  user: User;
  onLogout?: () => void;
  onAddProperty?: () => void;
}

export default function LandlordDashboard({ user, onLogout, onAddProperty }: LandlordDashboardProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState<LandlordRoute>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingMaintenanceCount, setPendingMaintenanceCount] = useState(0);

  useEffect(() => {
    loadDashboard();
    loadMaintenanceCount();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [roomsRes, bookingsRes, inquiriesRes] = await Promise.all([
        api.getMyRooms(),
        api.getLandlordBookings(),
        api.getReceivedInquiries(),
      ]);
      if (roomsRes.success) setRooms(roomsRes.rooms || []);
      if (bookingsRes.success) setBookings(bookingsRes.bookings || []);
      if (inquiriesRes.success) setInquiries(inquiriesRes.inquiries || []);
    } catch (e) {
      console.error("Failed to load landlord dashboard:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadMaintenanceCount() {
    try {
      const res = await api.getMaintenanceRequests();
      if (res?.success) {
        const open = (res.requests || []).filter((r: any) => r.status === "OPEN").length;
        setPendingMaintenanceCount(open);
      }
    } catch (e) {
      console.error("Failed to load maintenance count:", e);
    }
  }

  const stats = useMemo(() => {
    const totalProperties = rooms.length;
    const occupiedRooms = rooms.filter((r) => r.status === "BOOKED").length;
    const occupancyRate = totalProperties > 0 ? Math.round((occupiedRooms / totalProperties) * 100) : 0;

    // NOTE: sums ALL paid payments — filter by payment.paidAt against the
    // current month if you want this scoped strictly to "this month".
    const monthlyEarnings = bookings
      .filter((b) => b.payment?.status === "PAID")
      .reduce((sum, b) => sum + (b.payment?.amount || 0), 0);

    return { totalProperties, occupancyRate, monthlyEarnings };
  }, [rooms, bookings]);

  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q)
    );
  }, [rooms, searchQuery]);

  const notificationCount = bookings.filter((b) => b.status === "PENDING").length + inquiries.length;

  const statCards = [
    { label: "Total Properties", value: stats.totalProperties.toString(), icon: Building2, iconBg: "bg-blue-50 text-blue-600" },
    { label: "Occupancy Rate", value: `${stats.occupancyRate}%`, icon: PieChart, iconBg: "bg-purple-50 text-purple-600" },
    { label: "Monthly Earnings", value: `Rs. ${stats.monthlyEarnings.toLocaleString()}`, icon: Banknote, iconBg: "bg-green-50 text-green-600" },
    { label: "Pending Maintenance", value: pendingMaintenanceCount.toString(), icon: Wrench, iconBg: "bg-red-50 text-red-600" },
  ];

  const statusStyle = (status: string) =>
    status === "AVAILABLE"
      ? "bg-blue-50 text-blue-600"
      : status === "BOOKED"
      ? "bg-green-50 text-green-600"
      : "bg-red-50 text-red-600"; // UNDER_MAINTENANCE

  const statusLabel = (status: string) =>
    status === "AVAILABLE" ? "Vacant" : status === "BOOKED" ? "Occupied" : "Maintenance";

  // Route to sub-pages.
  if (activeRoute === "properties") {
    return <LandlordProperties user={user} onLogout={onLogout} activeRoute={activeRoute} onNavigate={setActiveRoute} />;
  }
  if (activeRoute === "tenants") {
    return <LandlordTenants user={user} onLogout={onLogout} activeRoute={activeRoute} onNavigate={setActiveRoute} />;
  }
  if (activeRoute === "messages") {
    return <LandlordMessages user={user} onLogout={onLogout} activeRoute={activeRoute} onNavigate={setActiveRoute} />;
  }
  if (activeRoute === "payments") {
    return <LandlordPayments user={user} onLogout={onLogout} activeRoute={activeRoute} onNavigate={setActiveRoute} />;
  }
  if (activeRoute === "maintenance") {
    return <LandlordMaintenance user={user} onLogout={onLogout} activeRoute={activeRoute} onNavigate={setActiveRoute} />;
  }
  if (activeRoute === "activity") {
    return (
      <LandlordActivity
        user={user}
        onLogout={onLogout}
        activeRoute={activeRoute}
        onNavigate={setActiveRoute}
        onAddProperty={onAddProperty}
      />
    );
  }
  if (activeRoute === "reviews") {
    return <LandlordReviews user={user} onLogout={onLogout} activeRoute={activeRoute} onNavigate={setActiveRoute} />;
  }
  if (activeRoute === "settings") {
    return <LandlordSettings user={user} onLogout={onLogout} activeRoute={activeRoute} onNavigate={setActiveRoute} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar active={activeRoute} onNavigate={setActiveRoute} onLogout={onLogout} user={user} />
      <div className="flex-1">
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search properties, tenants..."
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-gray-900"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setActiveRoute("messages")}
              className="relative rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {notificationCount}
                </span>
              )}
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
          {/* Welcome */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.fullName?.split(" ")[0] || "Landlord"}!</h1>
            <p className="mt-1 text-sm text-gray-500">Here's an overview of your portfolio today.</p>
          </div>

          {/* Stat cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{card.label}</p>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.iconBg}`}>
                      <Icon size={14} />
                    </div>
                  </div>
                  <p className="mt-3 text-3xl font-bold text-gray-900">{loading ? "—" : card.value}</p>
                </div>
              );
            })}
          </div>

          {/* Property overview + Recent activity */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Property Overview</h2>
                <button onClick={() => setActiveRoute("properties")} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  View All
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                      <th className="pb-3 font-medium">Property</th>
                      <th className="pb-3 font-medium">Tenant</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Last Payment</th>
                      <th className="pb-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">Loading properties...</td>
                      </tr>
                    ) : rooms.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">No properties listed yet.</td>
                      </tr>
                    ) : filteredRooms.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">No properties match your search.</td>
                      </tr>
                    ) : (
                      filteredRooms.slice(0, 5).map((room) => {
                        const roomBooking = bookings.find((b) => b.roomId === room.id && b.status === "APPROVED");
                        return (
                          <tr key={room.id} className="border-t border-gray-100">
                            <td className="py-3 font-medium text-gray-900">{room.title}</td>
                            <td className="py-3 text-gray-700">{roomBooking?.tenant?.fullName || "—"}</td>
                            <td className="py-3">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(room.status)}`}>
                                {statusLabel(room.status)}
                              </span>
                            </td>
                            <td className="py-3 text-gray-500">
                              {roomBooking?.payment?.paidAt
                                ? new Date(roomBooking.payment.paidAt).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => setActiveRoute("properties")}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent activity */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
                <MoreVertical size={16} className="text-gray-400" />
              </div>

              <div className="space-y-4">
                {loading ? (
                  <p className="text-sm text-gray-400">Loading activity...</p>
                ) : bookings.length === 0 && inquiries.length === 0 ? (
                  <p className="text-sm text-gray-400">No recent activity yet.</p>
                ) : (
                  <>
                    {inquiries.slice(0, 2).map((inquiry) => (
                      <div key={`inquiry-${inquiry.id}`} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                          <MessageSquare size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">New message from {inquiry.sender?.fullName || "a tenant"}</p>
                          <p className="truncate text-xs text-gray-500">{inquiry.message}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{new Date(inquiry.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                    {bookings.slice(0, 2).map((booking) => (
                      <div key={`booking-${booking.id}`} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
                          <CircleDollarSign size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {booking.payment?.status === "PAID" ? "Payment Received" : "Booking Update"}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {booking.room?.title || "A room"} — {booking.status}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">{new Date(booking.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <button
                onClick={() => setActiveRoute("activity")}
                className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                View All Activity
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}