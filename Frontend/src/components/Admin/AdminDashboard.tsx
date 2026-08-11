import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Bell,
  UserPlus,
  Receipt,
  Send,
  Building2,
  Users,
  PieChart,
  Ban,
  Banknote,
  Wrench,
  Clock,
  CalendarClock,
  DoorOpen,
  MessageSquare,
} from "lucide-react";
import { api, type Room, type Booking, type Inquiry, type User } from "../../services/api";
import { LocationSelector } from "../Common/LocationSelector";

import AdminSidebar, { type AdminRoute } from "./adminSidebar";
import AdminProperties from "./adminProperties";
import AdminLandlords from "./adminLandlords";
import AdminTenants from "./adminTenants";
import AdminPayments from "./adminPayments";
import AdminMaintenance from "./adminMaintenance";
import AdminMessages from "./adminMessages";
import AdminActivity from "./adminActivity";
import AdminReviews from "./adminReviews";
import AdminSettings from "./adminSettings";

interface AdminDashboardProps {
  user: User;
  onLogout?: () => void;
}

// NOTE: shape assumed from the mockup — your real getAdminStats() response
// may use different field names. Adjust to match, or compute these
// client-side from rooms/bookings the way LandlordDashboard does, if no
// single stats endpoint exists yet.
interface AdminDashboardStats {
  totalProperties: number;
  activeTenants: number;
  vacantProperties: number;
  pendingMaintenance: number;
  occupancyRate: number;
  monthlyRevenue: number;
  rentDue: number;
  leaseExpiring: number;
  maintenanceRequests: number;
  recentMoveOuts: number;
}

interface ActivityEntry {
  id: string;
  icon: typeof MessageSquare;
  iconColor: string;
  bgColor: string;
  title: string;
  subtitle?: string;
  time: string;
}

const EMPTY_STATS: AdminDashboardStats = {
  totalProperties: 0,
  activeTenants: 0,
  vacantProperties: 0,
  pendingMaintenance: 0,
  occupancyRate: 0,
  monthlyRevenue: 0,
  rentDue: 0,
  leaseExpiring: 0,
  maintenanceRequests: 0,
  recentMoveOuts: 0,
};

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [stats, setStats] = useState<AdminDashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState<AdminRoute>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [statsRes, roomsRes, bookingsRes, inquiriesRes] = await Promise.all([
        api.getAdminStats(),
        api.getRooms(),
        api.getLandlordBookings().catch(() => ({ success: false })),
        api.getReceivedInquiries().catch(() => ({ success: false })),
      ]);

      if (statsRes?.success && statsRes.stats) {
        setStats({ ...EMPTY_STATS, ...statsRes.stats });
      }
      if (roomsRes?.success) setRooms(roomsRes.rooms || []);
      if (bookingsRes?.success) setBookings(bookingsRes.bookings || []);
      if (inquiriesRes?.success) setInquiries(inquiriesRes.inquiries || []);
    } catch (e) {
      console.error("Failed to load admin dashboard:", e);
    } finally {
      setLoading(false);
    }
  }

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

  const notificationCount = stats.pendingMaintenance + stats.rentDue > 0
    ? stats.pendingMaintenance + (bookings.filter((b) => b.status === "PENDING").length)
    : 0;

  const statCards: {
    label: string;
    value: string;
    icon: typeof Building2;
    valueColor: string;
  }[] = [
    { label: "Total Properties", value: stats.totalProperties.toString(), icon: Building2, valueColor: "text-gray-900" },
    { label: "Active Tenants", value: stats.activeTenants.toString(), icon: Users, valueColor: "text-gray-900" },
    { label: "Occupancy Rate", value: `${stats.occupancyRate}%`, icon: PieChart, valueColor: "text-gray-900" },
    { label: "Vacant Properties", value: stats.vacantProperties.toString(), icon: Ban, valueColor: "text-red-600" },
    { label: "Monthly Revenue", value: `Rs. ${stats.monthlyRevenue.toLocaleString()}`, icon: Banknote, valueColor: "text-green-600" },
    { label: "Pending Maint.", value: stats.pendingMaintenance.toString(), icon: Wrench, valueColor: "text-amber-600" },
    { label: "Rent Due", value: `Rs. ${stats.rentDue.toLocaleString()}`, icon: Clock, valueColor: "text-red-600" },
    { label: "Lease Expiry (30d)", value: stats.leaseExpiring.toString(), icon: CalendarClock, valueColor: "text-amber-600" },
    { label: "Maintenance Requests", value: stats.maintenanceRequests.toString(), icon: Wrench, valueColor: "text-blue-600" },
    { label: "Recent Move-outs", value: stats.recentMoveOuts.toString(), icon: DoorOpen, valueColor: "text-gray-900" },
  ];

  const statusStyle = (status: string) =>
    status === "AVAILABLE"
      ? "bg-red-50 text-red-600"
      : status === "BOOKED"
      ? "bg-green-50 text-green-600"
      : "bg-blue-50 text-blue-600";

  const statusLabel = (status: string) =>
    status === "AVAILABLE" ? "Vacant" : status === "BOOKED" ? "Occupied" : "Maintenance";

  const activityFeed = useMemo<ActivityEntry[]>(() => {
    const entries: ActivityEntry[] = [];
    bookings.slice(0, 3).forEach((b) => {
      entries.push({
        id: `booking-${b.id}`,
        icon: Receipt,
        iconColor: "text-green-600",
        bgColor: "bg-green-50",
        title: b.payment?.status === "PAID" ? "Payment Received" : "Booking Update",
        subtitle: `${b.room?.title || "A room"} — ${b.status}`,
        time: new Date(b.createdAt).toLocaleDateString(),
      });
    });
    inquiries.slice(0, 3).forEach((i) => {
      entries.push({
        id: `inquiry-${i.id}`,
        icon: MessageSquare,
        iconColor: "text-blue-600",
        bgColor: "bg-blue-50",
        title: `New message from ${i.sender?.fullName || "a tenant"}`,
        subtitle: i.message,
        time: new Date(i.createdAt).toLocaleDateString(),
      });
    });
    return entries
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5);
  }, [bookings, inquiries]);

  const quickActions = [
    { label: "Add Tenant", icon: UserPlus, onClick: () => setActiveRoute("tenants") },
    { label: "Record Payment", icon: Receipt, onClick: () => setActiveRoute("payments") },
    { label: "Send Notice", icon: Send, onClick: () => setActiveRoute("messages") },
  ];

  // Route to sub-pages.
  if (activeRoute === "properties") {
    return <AdminProperties user={user} onLogout={onLogout} activeRoute={activeRoute} onNavigate={setActiveRoute} />;
  }
  if (activeRoute === "landlords") {
    return <AdminLandlords user={user} onLogout={onLogout} activeRoute={activeRoute} onNavigate={setActiveRoute} />;
  }
  if (activeRoute === "tenants") {
    return <AdminTenants user={user} onLogout={onLogout} activeRoute={activeRoute} onNavigate={setActiveRoute} />;
  }
  if (activeRoute === "payments") {
    return <AdminPayments user={user} onLogout={onLogout} activeRoute={activeRoute} onNavigate={setActiveRoute} />;
  }
  if (activeRoute === "maintenance") {
    return <AdminMaintenance user={user} onLogout={onLogout} activeRoute={activeRoute} onNavigate={setActiveRoute} />;
  }
  if (activeRoute === "messages") {
    return <AdminMessages user={user} onLogout={onLogout} activeRoute={activeRoute} onNavigate={setActiveRoute} />;
  }
  if (activeRoute === "activity") {
    return <AdminActivity user={user} onLogout={onLogout} activeRoute={activeRoute} onNavigate={setActiveRoute} />;
  }
  if (activeRoute === "reviews") {
    return <AdminReviews user={user} onLogout={onLogout} activeRoute={activeRoute} onNavigate={setActiveRoute} />;
  }
  if (activeRoute === "settings") {
    return <AdminSettings user={user} onLogout={onLogout} activeRoute={activeRoute} onNavigate={setActiveRoute} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar active={activeRoute} onNavigate={setActiveRoute} onLogout={onLogout} />
      <div className="flex-1">
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
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
            <LocationSelector />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setActiveRoute("activity")}
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
          </div>
        </header>

        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.fullName?.split(" ")[0] || "Admin"}!</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
              <span>{stats.totalProperties} Properties</span>
              <span>{stats.activeTenants} Active Tenants</span>
              <span className="text-red-600">{stats.vacantProperties} Vacant Properties</span>
              <span className="text-blue-600">{stats.pendingMaintenance} Pending Maintenance Requests</span>
            </p>
          </div>

          <div className="mb-6 flex flex-wrap gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Icon size={15} />
                  {action.label}
                </button>
              );
            })}
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{card.label}</p>
                    <Icon size={16} className="text-gray-300" />
                  </div>
                  <p className={`mt-2 text-xl font-bold ${card.valueColor}`}>{loading ? "—" : card.value}</p>
                </div>
              );
            })}
          </div>

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
                      <th className="pb-3 font-medium">Tenant</th>
                      <th className="pb-3 font-medium">Monthly Rent</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Last Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">Loading properties...</td>
                      </tr>
                    ) : filteredRooms.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          {rooms.length === 0 ? "No properties yet." : "No properties match your search."}
                        </td>
                      </tr>
                    ) : (
                      filteredRooms.slice(0, 6).map((room) => {
                        const roomBooking = bookings.find((b) => b.roomId === room.id && b.status === "APPROVED");
                        return (
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
                            <td className="py-3 text-gray-700">{roomBooking?.tenant?.fullName || "No Tenant"}</td>
                            <td className="py-3 text-gray-700">
                              {room.status === "BOOKED" ? `Rs. ${room.price.toLocaleString()}` : "Not Applicable"}
                            </td>
                            <td className="py-3">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle(room.status)}`}>
                                • {statusLabel(room.status)}
                              </span>
                            </td>
                            <td className="py-3 text-gray-500">
                              {roomBooking?.payment?.paidAt
                                ? new Date(roomBooking.payment.paidAt).toLocaleDateString()
                                : "Not Applicable"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <p className="text-sm text-gray-400">Loading activity...</p>
                ) : activityFeed.length === 0 ? (
                  <p className="text-sm text-gray-400">No recent activity yet.</p>
                ) : (
                  activityFeed.map((entry) => {
                    const Icon = entry.icon;
                    return (
                      <div key={entry.id} className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${entry.bgColor} ${entry.iconColor}`}>
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{entry.title}</p>
                          {entry.subtitle && <p className="truncate text-xs text-gray-500">{entry.subtitle}</p>}
                          <p className="mt-0.5 text-xs text-gray-400">{entry.time}</p>
                        </div>
                      </div>
                    );
                  })
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