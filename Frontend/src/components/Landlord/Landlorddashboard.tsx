import { useEffect, useMemo, useState } from "react";
import {
  Search,

  Plus,
  Building2,
  Users,
  PieChart,
  Banknote,
  ArrowUpRight,
  Wrench,
  MessageSquare,
  CircleDollarSign,
} from "lucide-react";
import { api, type Room, type Booking, type Inquiry, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

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

  useEffect(() => {
    loadDashboard();
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

  // Derived stats — computed from rooms + bookings since there's no
  // dedicated /landlord/dashboard stats endpoint yet.
  const stats = useMemo(() => {
    const totalProperties = rooms.length;
    const occupiedRooms = rooms.filter((r) => r.status === "BOOKED").length;
    const occupancyRate = totalProperties > 0 ? Math.round((occupiedRooms / totalProperties) * 100) : 0;

    const uniqueTenantIds = new Set(
      bookings.filter((b) => b.status === "APPROVED").map((b) => b.tenantId)
    );

    const monthlyRevenue = bookings
      .filter((b) => b.payment?.status === "PAID")
      .reduce((sum, b) => sum + (b.payment?.amount || 0), 0);

    return {
      totalProperties,
      totalTenants: uniqueTenantIds.size,
      occupancyRate,
      monthlyRevenue,
    };
  }, [rooms, bookings]);

  const statCards = [
    { label: "Total Properties", value: stats.totalProperties.toString(), icon: Building2, hint: `${stats.totalProperties} listed` },
    { label: "Total Tenants", value: stats.totalTenants.toString(), icon: Users, hint: "Currently renting" },
    { label: "Occupancy Rate", value: `${stats.occupancyRate}%`, icon: PieChart, hint: `${stats.totalProperties - stats.totalProperties + rooms.filter(r=>r.status==="BOOKED").length} of ${stats.totalProperties} occupied` },
    { label: "Monthly Revenue", value: `Rs. ${stats.monthlyRevenue.toLocaleString()}`, icon: Banknote, hint: "From paid rents" },
  ];

  const statusStyle = (status: string) =>
    status === "AVAILABLE"
      ? "bg-red-50 text-red-600"
      : status === "BOOKED"
      ? "bg-green-50 text-green-600"
      : "bg-amber-50 text-amber-600";

  const statusLabel = (status: string) =>
    status === "AVAILABLE" ? "Vacant" : status === "BOOKED" ? "Occupied" : "Maintenance";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar active={activeRoute} onNavigate={setActiveRoute} />
      <div className="flex-1">
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search properties, tenants..."
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-gray-900"
            />
          </div>

          <div className="flex gap-3">
            <button
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={onLogout}
            >
              Logout
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
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.fullName?.split(" ")[0] || "Landlord"}!</h1>
              <p className="mt-1 text-sm text-gray-500">Here's what's happening with your properties today.</p>
            </div>
            <div className="flex gap-3">
              <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Generate Report
              </button>
              <button
                onClick={() => setActiveRoute("messages")}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Message Tenants
              </button>
            </div>
          </div>

          {/* Stat cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{card.label}</p>
                    <Icon size={18} className="text-gray-400" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-gray-900">{loading ? "—" : card.value}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                    <ArrowUpRight size={12} />
                    {card.hint}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Property overview + Recent activity */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Property Overview</h2>
                <button onClick={() => setActiveRoute("properties")} className="text-sm font-medium text-gray-500 hover:text-gray-900">
                  View All →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                      <th className="pb-3 font-medium">Property</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Current Rent</th>
                      <th className="pb-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">Loading properties...</td>
                      </tr>
                    ) : rooms.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">No properties listed yet.</td>
                      </tr>
                    ) : (
                      rooms.slice(0, 5).map((room) => (
                        <tr key={room.id} className="border-t border-gray-100">
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                                <Building2 size={16} className="text-gray-500" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{room.title}</p>
                                <p className="text-xs text-gray-400">{room.location}, {room.city}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(room.status)}`}>
                              • {statusLabel(room.status)}
                            </span>
                          </td>
                          <td className="py-3 text-gray-700">
                            {room.status === "BOOKED" ? `Rs. ${room.price.toLocaleString()}` : "—"}
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent activity — combines latest bookings and inquiries */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <p className="text-sm text-gray-400">Loading activity...</p>
                ) : bookings.length === 0 && inquiries.length === 0 ? (
                  <p className="text-sm text-gray-400">No recent activity yet.</p>
                ) : (
                  <>
                    {bookings.slice(0, 2).map((booking) => (
                      <ActivityItem
                        key={`booking-${booking.id}`}
                        icon={CircleDollarSign}
                        iconColor="text-green-600"
                        title={`Booking request for ${booking.room?.title || "a room"}`}
                        subtitle={`Status: ${booking.status}`}
                        time={new Date(booking.createdAt).toLocaleDateString()}
                      />
                    ))}
                    {inquiries.slice(0, 2).map((inquiry) => (
                      <ActivityItem
                        key={`inquiry-${inquiry.id}`}
                        icon={MessageSquare}
                        iconColor="text-blue-600"
                        title={`New message from ${inquiry.sender?.fullName || "a tenant"}`}
                        subtitle={inquiry.message}
                        time={new Date(inquiry.createdAt).toLocaleDateString()}
                      />
                    ))}
                  </>
                )}
              </div>

              <button
                onClick={() => setActiveRoute("messages")}
                className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                View All Notifications
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function ActivityItem({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  time,
}: {
  icon: typeof Wrench;
  iconColor: string;
  title: string;
  subtitle?: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 ${iconColor}`}>
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {subtitle && <p className="truncate text-xs text-gray-500">{subtitle}</p>}
        <p className="mt-0.5 text-xs text-gray-400">{time}</p>
      </div>
    </div>
  );
}
