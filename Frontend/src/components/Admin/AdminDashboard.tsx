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
  Plus,
  ArrowRight,
  Eye,
  X,
} from "lucide-react";
import { api, type Room, type Booking, type User } from "../../services/api";
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
  onUserUpdate?: (user: User) => void;
}

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
  totalLandlords?: number;
  totalTenants?: number;
}

interface ActivityEntry {
  id: string;
  category: string;
  title: string;
  description: string;
  createdAt: string;
  status?: string;
  targetRoute?: AdminRoute;
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

export default function AdminDashboard({ user, onLogout, onUserUpdate }: AdminDashboardProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [stats, setStats] = useState<AdminDashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState<AdminRoute>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>("ALL");
  const [selectedPropertyModal, setSelectedPropertyModal] = useState<Room | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [statsRes, roomsRes, bookingsRes, activityRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminProperties(),
        api.getAdminBookings().catch(() => ({ success: false })),
        api.getAdminActivity().catch(() => ({ success: false })),
      ]);

      if (statsRes?.success && statsRes.stats) {
        setStats({ ...EMPTY_STATS, ...statsRes.stats });
      }
      if (roomsRes?.success) setRooms(roomsRes.rooms || []);
      if (bookingsRes?.success) setBookings(bookingsRes.bookings || []);
      if (activityRes?.success && activityRes.entries) {
        setActivities(
          activityRes.entries.map((e: any) => ({
            id: e.id,
            category: e.category,
            title: e.title,
            description: e.description,
            createdAt: e.createdAt,
            status: e.status,
            targetRoute: e.metadata?.targetRoute as AdminRoute,
          }))
        );
      }
    } catch (e) {
      console.error("Failed to load admin dashboard:", e);
    } finally {
      setLoading(false);
    }
  }

  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rooms.filter((r) => {
      const matchesQuery =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        (r.landlord?.fullName && r.landlord.fullName.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "VACANT" && r.status === "AVAILABLE") ||
        (statusFilter === "OCCUPIED" && r.status === "BOOKED") ||
        (statusFilter === "MAINTENANCE" && r.status === "UNDER_MAINTENANCE");

      const matchesType = roomTypeFilter === "ALL" || r.roomType === roomTypeFilter;

      return matchesQuery && matchesStatus && matchesType;
    });
  }, [rooms, searchQuery, statusFilter, roomTypeFilter]);

  const notificationCount = stats.pendingMaintenance + stats.leaseExpiring;

  const statCards: {
    label: string;
    value: string;
    icon: typeof Building2;
    valueColor: string;
    route: AdminRoute;
  }[] = [
    { label: "Total Properties", value: stats.totalProperties.toString(), icon: Building2, valueColor: "text-gray-900", route: "properties" },
    { label: "Active Tenants", value: stats.activeTenants.toString(), icon: Users, valueColor: "text-gray-900", route: "tenants" },
    { label: "Occupancy Rate", value: `${stats.occupancyRate}%`, icon: PieChart, valueColor: "text-gray-900", route: "properties" },
    { label: "Vacant Properties", value: stats.vacantProperties.toString(), icon: Ban, valueColor: "text-red-600", route: "properties" },
    { label: "Monthly Revenue", value: `Rs. ${stats.monthlyRevenue.toLocaleString()}`, icon: Banknote, valueColor: "text-green-600", route: "payments" },
    { label: "Pending Maint.", value: stats.pendingMaintenance.toString(), icon: Wrench, valueColor: "text-amber-600", route: "maintenance" },
    { label: "Rent Due", value: `Rs. ${stats.rentDue.toLocaleString()}`, icon: Clock, valueColor: "text-red-600", route: "payments" },
    { label: "Lease Expiry (30d)", value: stats.leaseExpiring.toString(), icon: CalendarClock, valueColor: "text-amber-600", route: "tenants" },
    { label: "Maintenance Requests", value: stats.maintenanceRequests.toString(), icon: Wrench, valueColor: "text-blue-600", route: "maintenance" },
    { label: "Recent Move-outs", value: stats.recentMoveOuts.toString(), icon: DoorOpen, valueColor: "text-gray-900", route: "tenants" },
  ];

  const statusStyle = (status: string) =>
    status === "AVAILABLE"
      ? "bg-red-50 text-red-600 border border-red-100"
      : status === "BOOKED"
      ? "bg-green-50 text-green-600 border border-green-100"
      : "bg-blue-50 text-blue-600 border border-blue-100";

  const statusLabel = (status: string) =>
    status === "AVAILABLE" ? "Vacant" : status === "BOOKED" ? "Occupied" : "Maintenance";

  const quickActions = [
    { label: "Add Property", icon: Plus, onClick: () => setActiveRoute("properties") },
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
    return <AdminSettings user={user} onLogout={onLogout} activeRoute={activeRoute} onNavigate={setActiveRoute} onUserUpdate={onUserUpdate} />;
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gray-50 font-sans">
      <AdminSidebar active={activeRoute} onNavigate={setActiveRoute} onLogout={onLogout} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Header */}
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search properties, landlords, city..."
                className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-gray-900 focus:bg-white transition-colors"
              />
            </div>
            <LocationSelector />
          </div>

          <div className="flex gap-3 items-center">
            <button
              onClick={() => setActiveRoute("activity")}
              className="relative rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50 transition-colors"
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

        {/* Main Content Area */}
        <main className="p-6 flex-1">
          {/* Welcome Banner */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.fullName?.split(" ")[0] || "Admin"}!</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                <span><strong className="text-gray-800">{stats.totalProperties}</strong> Total Properties</span>
                <span><strong className="text-gray-800">{stats.activeTenants}</strong> Active Tenants</span>
                <span className="text-red-600 font-medium"><strong>{stats.vacantProperties}</strong> Vacant Units</span>
                <span className="text-amber-600 font-medium"><strong>{stats.pendingMaintenance}</strong> Maintenance Tickets</span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="mb-6 flex flex-wrap gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-800 hover:bg-gray-900 hover:text-white shadow-sm transition-all"
                >
                  <Icon size={15} />
                  {action.label}
                </button>
              );
            })}
          </div>

          {/* Summary Stat Cards Grid */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  onClick={() => setActiveRoute(card.route)}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 group-hover:text-gray-600 transition-colors">{card.label}</p>
                    <Icon size={16} className="text-gray-300 group-hover:text-gray-700 transition-colors" />
                  </div>
                  <p className={`mt-2 text-xl font-bold ${card.valueColor}`}>{loading ? "—" : card.value}</p>
                </div>
              );
            })}
          </div>

          {/* Responsive Filters & Main Grid */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Left 2-Columns: Property Overview */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Property Overview</h2>
                  <p className="text-xs text-gray-400">Live properties status and tenant assignments</p>
                </div>

                {/* Property Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-gray-700 outline-none focus:border-gray-900"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="VACANT">Vacant</option>
                    <option value="OCCUPIED">Occupied</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>

                  <select
                    value={roomTypeFilter}
                    onChange={(e) => setRoomTypeFilter(e.target.value)}
                    className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-gray-700 outline-none focus:border-gray-900"
                  >
                    <option value="ALL">All Types</option>
                    <option value="SINGLE">Single</option>
                    <option value="DOUBLE">Double</option>
                    <option value="FLAT">Flat</option>
                    <option value="APARTMENT">Apartment</option>
                  </select>

                  <button
                    onClick={() => setActiveRoute("properties")}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors ml-1"
                  >
                    View All <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100">
                      <th className="pb-3 font-semibold">Property</th>
                      <th className="pb-3 font-semibold">Landlord / Owner</th>
                      <th className="pb-3 font-semibold">Active Tenant</th>
                      <th className="pb-3 font-semibold">Rent</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-400">
                          <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-gray-900 border-t-transparent mb-2" />
                          <p>Loading real property data...</p>
                        </td>
                      </tr>
                    ) : filteredRooms.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-400">
                          <Building2 className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                          <p className="text-sm font-medium text-gray-600">No properties match your filter criteria.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRooms.slice(0, 6).map((room) => {
                        const activeBooking = bookings.find((b) => b.roomId === room.id && b.status === "APPROVED");
                        return (
                          <tr key={room.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="py-3.5 pr-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white font-bold text-xs">
                                  {room.roomType.slice(0, 2)}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 text-xs sm:text-sm truncate max-w-[150px] sm:max-w-[200px]" title={room.title}>
                                    {room.title}
                                  </p>
                                  <p className="text-[11px] text-gray-400">{room.location}, {room.city}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 text-xs text-gray-700 font-medium whitespace-nowrap">
                              {room.landlord?.fullName || "Ram Owner"}
                            </td>
                            <td className="py-3.5 text-xs text-gray-700 whitespace-nowrap">
                              {activeBooking?.tenant?.fullName || <span className="text-gray-400 italic">Unassigned</span>}
                            </td>
                            <td className="py-3.5 text-xs font-semibold text-gray-900 whitespace-nowrap">
                              Rs. {room.price.toLocaleString()}/mo
                            </td>
                            <td className="py-3.5 whitespace-nowrap">
                              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusStyle(room.status)}`}>
                                • {statusLabel(room.status)}
                              </span>
                            </td>
                            <td className="py-3.5 text-right whitespace-nowrap">
                              <button
                                onClick={() => setSelectedPropertyModal(room)}
                                className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                                title="Quick View"
                              >
                                <Eye size={14} />
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

            {/* Right Column: Live Activity Feed */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-base font-bold text-gray-900">Recent Platform Activity</h2>
                <button
                  onClick={() => setActiveRoute("activity")}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  View Log →
                </button>
              </div>

              <div className="space-y-3.5">
                {loading ? (
                  <p className="text-xs text-gray-400 py-6 text-center">Loading activity log...</p>
                ) : activities.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">No recent activities logged.</p>
                ) : (
                  activities.slice(0, 6).map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => entry.targetRoute && setActiveRoute(entry.targetRoute)}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-100"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700 font-bold text-[10px]">
                        {entry.category.slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-900 truncate">{entry.title}</p>
                        <p className="text-[11px] text-gray-500 line-clamp-1">{entry.description}</p>
                        <p className="mt-0.5 text-[10px] text-gray-400">
                          {new Date(entry.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setActiveRoute("activity")}
                className="mt-5 w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-900 hover:text-white transition-colors"
              >
                View Full Audit Log
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* QUICK VIEW PROPERTY MODAL */}
      {selectedPropertyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Property Details</h3>
              <button
                onClick={() => setSelectedPropertyModal(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="font-bold text-gray-900 text-sm">{selectedPropertyModal.title}</p>
                <p className="text-gray-500 mt-0.5">{selectedPropertyModal.location}, {selectedPropertyModal.city}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="border border-gray-100 p-2.5 rounded-xl">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Room Type</p>
                  <p className="font-bold text-gray-800">{selectedPropertyModal.roomType}</p>
                </div>
                <div className="border border-gray-100 p-2.5 rounded-xl">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Monthly Price</p>
                  <p className="font-bold text-green-600">Rs. {selectedPropertyModal.price.toLocaleString()}</p>
                </div>
              </div>

              <div className="border border-gray-100 p-2.5 rounded-xl">
                <p className="text-[10px] text-gray-400 font-semibold uppercase">Landlord Owner</p>
                <p className="font-semibold text-gray-800">{selectedPropertyModal.landlord?.fullName || "Ram Owner"}</p>
                <p className="text-gray-500">{selectedPropertyModal.landlord?.email}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setSelectedPropertyModal(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedPropertyModal(null);
                  setActiveRoute("properties");
                }}
                className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800"
              >
                Manage in Properties →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}