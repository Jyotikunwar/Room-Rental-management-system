import { useEffect, useMemo, useState } from "react";
import { Search, Building2, ChevronDown, ChevronLeft, ChevronRight, Pencil, Plus, Bell } from "lucide-react";
import { api, type Room, type User } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";

interface AdminPropertiesProps {
  user: User;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onAddProperty?: () => void;
}

const PAGE_SIZE = 4;

// NOTE: "RESERVED" appears in the design but isn't part of Room["status"]
// in api.ts (only AVAILABLE | BOOKED | UNDER_MAINTENANCE). Add it to the
// backend enum if you want a real reserved state — for now this page
// treats any unrecognized status string as a neutral gray badge so it
// won't crash, but it won't actually appear unless your API returns it.
const STATUS_STYLE: Record<string, string> = {
  AVAILABLE: "bg-red-50 text-red-600",
  BOOKED: "bg-green-50 text-green-600",
  UNDER_MAINTENANCE: "bg-blue-50 text-blue-600",
  RESERVED: "bg-amber-50 text-amber-600",
};

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Vacant",
  BOOKED: "Occupied",
  UNDER_MAINTENANCE: "Maintenance",
  RESERVED: "Reserved",
};

export default function AdminProperties({ onLogout, activeRoute, onNavigate, onAddProperty }: AdminPropertiesProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [headerSearch, setHeaderSearch] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    setLoading(true);
    try {
      // NOTE: getRooms() is the public/all-properties endpoint — appropriate
      // for an admin view (unlike getMyRooms, which is landlord-scoped).
      const res = await api.getRooms();
      if (res.success) setRooms(res.rooms || []);
    } catch (e) {
      console.error("Failed to load properties:", e);
    } finally {
      setLoading(false);
    }
  }

  const locations = useMemo(() => {
    const unique = new Set(rooms.map((r) => r.city).filter(Boolean));
    return Array.from(unique).sort();
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const q = propertySearch.trim().toLowerCase();
    return rooms.filter((r) => {
      const matchesQuery = !q || r.title.toLowerCase().includes(q);
      const matchesLocation = locationFilter === "ALL" || r.city === locationFilter;
      const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
      return matchesQuery && matchesLocation && matchesStatus;
    });
  }, [rooms, propertySearch, locationFilter, statusFilter]);

  // Reset to page 1 whenever filters change so pagination doesn't strand the user.
  useEffect(() => {
    setPage(1);
  }, [propertySearch, locationFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / PAGE_SIZE));
  const pagedRooms = filteredRooms.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filteredRooms.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredRooms.length);

  function pageNumbers(): (number | "ellipsis")[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, "ellipsis", totalPages];
    if (page >= totalPages - 2) return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
    return [1, "ellipsis", page, "ellipsis", totalPages];
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} />
      <div className="flex-1">
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              placeholder="Search properties, tenants..."
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-gray-900"
            />
          </div>
          <div className="flex gap-3">
            <button className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50" aria-label="Notifications">
              <Bell size={18} />
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
          <h1 className="mb-6 text-2xl font-bold text-gray-900">Properties</h1>

          {/* Filter bar */}
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_200px_200px]">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Search Properties</label>
                <div className="relative">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={propertySearch}
                    onChange={(e) => setPropertySearch(e.target.value)}
                    placeholder="Property name..."
                    className="h-10 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Location</label>
                <div className="relative">
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="h-10 w-full appearance-none rounded-lg border border-gray-200 px-3 pr-8 text-sm outline-none focus:border-gray-900"
                  >
                    <option value="ALL">All Locations</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 w-full appearance-none rounded-lg border border-gray-200 px-3 pr-8 text-sm outline-none focus:border-gray-900"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="AVAILABLE">Vacant</option>
                    <option value="BOOKED">Occupied</option>
                    <option value="UNDER_MAINTENANCE">Maintenance</option>
                    <option value="RESERVED">Reserved</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3 font-medium">Property</th>
                    <th className="pb-3 font-medium">Location</th>
                    <th className="pb-3 font-medium">Landlord</th>
                    <th className="pb-3 font-medium">Rent</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">Loading properties...</td>
                    </tr>
                  ) : pagedRooms.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">No properties match your filters.</td>
                    </tr>
                  ) : (
                    pagedRooms.map((room) => (
                      <tr key={room.id} className="border-t border-gray-100">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                              <Building2 size={16} className="text-gray-500" />
                            </div>
                            <p className="font-medium text-gray-900">{room.title}</p>
                          </div>
                        </td>
                        <td className="py-3 text-gray-700">{room.city}{room.location ? `, ${room.location}` : ""}</td>
                        <td className="py-3 text-gray-700">{room.landlord?.fullName || "—"}</td>
                        <td className="py-3 text-gray-700">Rs. {room.price.toLocaleString()}</td>
                        <td className="py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[room.status] || "bg-gray-100 text-gray-600"}`}>
                            {STATUS_LABEL[room.status] || room.status}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex justify-end gap-2">
                            <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                              Details
                            </button>
                            <button className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50" aria-label="Edit property">
                              <Pencil size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && filteredRooms.length > 0 && (
              <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row">
                <p className="text-xs text-gray-500">
                  Showing {rangeStart} to {rangeEnd} of {filteredRooms.length} properties
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
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
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium ${
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
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
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
    </div>
  );
}