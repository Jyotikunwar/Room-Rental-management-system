import { useEffect, useMemo, useState } from "react";
import {
  Search, Bell, LayoutGrid, List, MapPin, Trash2,
  Loader2, X, Building2, CheckCircle, XCircle, Clock, Check, RefreshCw, Pencil, MessageSquare
} from "lucide-react";
import { api, getImageUrl, type User, type Room } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";
import { filterRoomsMultiCriteria } from "../../utils/multiCriteriaFilter";
import { openAdminMessage } from "./adminMessages";

interface AdminPropertiesProps {
  user: User;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
}

interface PropertyStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

const APPROVAL_BADGE: Record<string, { label: string; style: string; icon: typeof Clock }> = {
  PENDING: { label: "Pending", style: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  APPROVED: { label: "Approved", style: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle },
  REJECTED: { label: "Rejected", style: "bg-rose-100 text-rose-800 border-rose-200", icon: XCircle },
};

const OCCUPANCY_STYLE: Record<string, string> = {
  AVAILABLE: "bg-blue-50 text-blue-700 border-blue-100",
  BOOKED: "bg-purple-50 text-purple-700 border-purple-100",
  UNDER_MAINTENANCE: "bg-amber-50 text-amber-700 border-amber-100",
};

function roomThumb(room: Room) {
  const url = room.roomImages?.[0]?.imageUrl;
  return url ? getImageUrl(url) : null;
}

export default function AdminProperties({ onLogout, activeRoute, onNavigate }: AdminPropertiesProps) {
  const [rooms, setRooms] = useState<Room[] | undefined>(undefined);
  const [stats, setStats] = useState<PropertyStats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [view, setView] = useState<"grid" | "list">("list");
  const [approvalTab, setApprovalTab] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [roomType, setRoomType] = useState("");
  const [occupancyStatus, setOccupancyStatus] = useState("");

  const [editingItem, setEditingItem] = useState<Room | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roomsRes, statsRes] = await Promise.all([
        api.getAdminProperties({ approvalStatus: approvalTab }),
        api.getAdminPropertyStats(),
      ]);

      if (roomsRes?.success) {
        setRooms(roomsRes.rooms || []);
      } else {
        const fallbackRes = await api.getRooms({ status: "ALL" });
        setRooms(Array.isArray(fallbackRes) ? fallbackRes : fallbackRes.rooms || []);
      }

      if (statsRes?.success && statsRes.stats) {
        setStats(statsRes.stats);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load properties.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [approvalTab]);

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const cities = useMemo(() => Array.from(new Set((rooms ?? []).map((r) => r.city))).sort(), [rooms]);

  const filtered = useMemo(() => {
    if (!rooms) return [];
    let list = filterRoomsMultiCriteria(rooms, {
      query: search,
      city: city || undefined,
      roomType: roomType || undefined,
    });

    if (occupancyStatus) {
      list = list.filter((r) => r.status === occupancyStatus);
    }

    return list;
  }, [rooms, search, city, roomType, occupancyStatus]);

  async function handleApproval(id: number, approvalStatus: "APPROVED" | "REJECTED") {
    try {
      const res = await api.updatePropertyApproval(id, approvalStatus);
      if (!res.success) throw new Error(res.message || "Failed to update property status.");
      
      showFeedback(`Property marked as ${approvalStatus.toLowerCase()} successfully!`);

      setRooms((prev) =>
        prev
          ? prev.map((r) => (r.id === id ? { ...r, approvalStatus } : r))
          : prev
      );

      const statsRes = await api.getAdminPropertyStats();
      if (statsRes?.success && statsRes.stats) {
        setStats(statsRes.stats);
      }
    } catch (e: any) {
      showFeedback(e.message || "Failed to update status", "error");
    }
  }

  async function handleSavePropertyDetails(id: number, updatedFields: any) {
    try {
      const res = await api.updateRoom(id, updatedFields);
      if (!res.success) throw new Error(res.message || "Failed to update property details.");

      showFeedback("Property updated successfully!");
      setRooms((prev) =>
        prev ? prev.map((r) => (r.id === id ? { ...r, ...res.room } : r)) : prev
      );
    } catch (e: any) {
      showFeedback(e.message || "Failed to update property details", "error");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this property? This action cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await api.deleteRoom(id);
      if (res.success === false) throw new Error(res.message || "Couldn't delete this property.");
      
      showFeedback("Property deleted successfully.");
      setRooms((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
      
      const statsRes = await api.getAdminPropertyStats();
      if (statsRes?.success && statsRes.stats) {
        setStats(statsRes.stats);
      }
    } catch (e: any) {
      showFeedback(e.message || "Couldn't delete this property.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-slate-50 font-sans">
      <AdminSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} />

      <div className="flex-1">
        <header className="flex flex-col gap-3 border-b border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search properties or landlords..."
              className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-slate-900 focus:bg-white transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              title="Refresh properties"
              className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={16} className={loading ? "animate-spin text-slate-400" : ""} />
            </button>
            <button className="relative rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Notifications">
              <Bell size={18} />
            </button>
          </div>
        </header>

        <main className="p-6 max-w-7xl mx-auto">
          {/* Header & Title */}
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manage Properties</h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage, edit, accept, or reject property listings across the platform.
              </p>
            </div>
          </div>

          {/* Feedback Toast */}
          {feedbackMsg && (
            <div className={`mb-6 flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium shadow-sm transition-all ${
              feedbackMsg.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}>
              <div className="flex items-center gap-2">
                {feedbackMsg.type === "success" ? <CheckCircle size={18} /> : <XCircle size={18} />}
                <span>{feedbackMsg.text}</span>
              </div>
              <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Summary Stat Cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <button
              onClick={() => setApprovalTab("ALL")}
              className={`rounded-2xl border p-4 text-left transition-all ${
                approvalTab === "ALL" 
                  ? "border-slate-900 bg-slate-900 text-white shadow-md" 
                  : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wider ${approvalTab === "ALL" ? "text-slate-300" : "text-slate-400"}`}>
                Total Listed
              </p>
              <p className="mt-2 text-2xl font-bold">{stats.total}</p>
            </button>

            <button
              onClick={() => setApprovalTab("PENDING")}
              className={`rounded-2xl border p-4 text-left transition-all ${
                approvalTab === "PENDING"
                  ? "border-amber-500 bg-amber-500 text-white shadow-md"
                  : "border-amber-200 bg-amber-50/50 text-amber-900 hover:bg-amber-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-xs font-semibold uppercase tracking-wider ${approvalTab === "PENDING" ? "text-amber-100" : "text-amber-700"}`}>
                  Pending
                </p>
                <Clock size={16} className={approvalTab === "PENDING" ? "text-amber-100" : "text-amber-500"} />
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.pending}</p>
            </button>

            <button
              onClick={() => setApprovalTab("APPROVED")}
              className={`rounded-2xl border p-4 text-left transition-all ${
                approvalTab === "APPROVED"
                  ? "border-emerald-600 bg-emerald-600 text-white shadow-md"
                  : "border-emerald-200 bg-emerald-50/50 text-emerald-900 hover:bg-emerald-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-xs font-semibold uppercase tracking-wider ${approvalTab === "APPROVED" ? "text-emerald-100" : "text-emerald-700"}`}>
                  Approved
                </p>
                <CheckCircle size={16} className={approvalTab === "APPROVED" ? "text-emerald-100" : "text-emerald-500"} />
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.approved}</p>
            </button>

            <button
              onClick={() => setApprovalTab("REJECTED")}
              className={`rounded-2xl border p-4 text-left transition-all ${
                approvalTab === "REJECTED"
                  ? "border-rose-600 bg-rose-600 text-white shadow-md"
                  : "border-rose-200 bg-rose-50/50 text-rose-900 hover:bg-rose-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-xs font-semibold uppercase tracking-wider ${approvalTab === "REJECTED" ? "text-rose-100" : "text-rose-700"}`}>
                  Rejected
                </p>
                <XCircle size={16} className={approvalTab === "REJECTED" ? "text-rose-100" : "text-rose-500"} />
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.rejected}</p>
            </button>
          </div>

          {/* Status Tabs Bar */}
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1">
              {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((tab) => {
                const isActive = approvalTab === tab;
                let count = stats.total;
                if (tab === "PENDING") count = stats.pending;
                if (tab === "APPROVED") count = stats.approved;
                if (tab === "REJECTED") count = stats.rejected;

                return (
                  <button
                    key={tab}
                    onClick={() => setApprovalTab(tab)}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <span>{tab === "ALL" ? "All Properties" : tab}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                      isActive ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filter Inputs & View Switcher */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-slate-900"
              >
                <option value="">All Cities</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-slate-900"
              >
                <option value="">All Types</option>
                <option value="SINGLE">Single Room</option>
                <option value="DOUBLE">Double Room</option>
                <option value="FLAT">Flat</option>
                <option value="APARTMENT">Apartment</option>
              </select>

              <select
                value={occupancyStatus}
                onChange={(e) => setOccupancyStatus(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-slate-900"
              >
                <option value="">Status</option>
                <option value="AVAILABLE">Available</option>
                <option value="BOOKED">Booked</option>
                <option value="UNDER_MAINTENANCE">Maintenance</option>
              </select>

              <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button
                  onClick={() => setView("list")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    view === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <List size={14} />
                  <span>List</span>
                </button>
                <button
                  onClick={() => setView("grid")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    view === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <LayoutGrid size={14} />
                  <span>Grid</span>
                </button>
              </div>
            </div>
          </div>

          {/* Properties Table / Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
              <Loader2 size={24} className="animate-spin text-slate-400" />
              <p className="mt-3 text-sm text-slate-500">Loading properties...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/50 p-10 text-center text-sm text-rose-600">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
              <Building2 size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-800">No properties found</p>
              <p className="mt-1 text-slate-400">
                {approvalTab !== "ALL"
                  ? `There are currently no ${approvalTab.toLowerCase()} properties matching your criteria.`
                  : "No properties match your active filters."}
              </p>
            </div>
          ) : view === "list" ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Property</th>
                    <th className="px-5 py-3.5 font-semibold">Landlord</th>
                    <th className="px-5 py-3.5 font-semibold">Type &amp; Rent</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((room) => {
                    return (
                      <tr key={room.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Title & Location */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <RoomAvatar room={room} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{room.title}</p>
                              <p className="flex items-center gap-1 truncate text-xs text-slate-400 mt-0.5">
                                <MapPin size={12} />
                                {room.location}, {room.city}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Landlord */}
                        <td className="px-5 py-4 text-slate-700">
                          <button
                            onClick={() => {
                              openAdminMessage(room.landlordId);
                              onNavigate("messages");
                            }}
                            className="text-left group"
                            title="Chat with Landlord"
                          >
                            <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                              <span>{room.landlord?.fullName || `Landlord #${room.landlordId}`}</span>
                              <MessageSquare size={12} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </p>
                            <p className="text-xs text-slate-400">{room.landlord?.phone || room.landlord?.email || "Click to message"}</p>
                          </button>
                        </td>

                        {/* Type & Rent */}
                        <td className="px-5 py-4 text-slate-700">
                          <p className="font-medium text-slate-900">Rs. {room.price.toLocaleString()}/mo</p>
                          <p className="text-xs text-slate-400">{room.roomType}</p>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-md border px-2.5 py-0.5 text-xs font-medium ${OCCUPANCY_STYLE[room.status]}`}>
                            {room.status.replace("_", " ")}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Message Landlord Button */}
                            <button
                              onClick={() => {
                                openAdminMessage(room.landlordId);
                                onNavigate("messages");
                              }}
                              className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors"
                              title="Chat with Landlord"
                            >
                              <MessageSquare size={13} />
                              <span>Message</span>
                            </button>

                            {/* Edit / Review Button */}
                            <button
                              onClick={() => setEditingItem(room)}
                              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors"
                            >
                              <Pencil size={13} className="text-slate-500" />
                              <span>Edit</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDelete(room.id)}
                              disabled={deletingId === room.id}
                              title="Delete Property"
                              className="rounded-lg border border-rose-100 p-1.5 text-rose-500 hover:bg-rose-50 disabled:opacity-50 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((room) => {
                return (
                  <div key={room.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    <div className="relative h-44 bg-slate-100">
                      {roomThumb(room) ? (
                        <img src={roomThumb(room)!} alt={room.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-300">
                          <Building2 size={36} />
                        </div>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="truncate text-base font-bold text-slate-900">{room.title}</h3>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                          <MapPin size={12} />
                          {room.location}, {room.city}
                        </p>
                        
                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                          <div>
                            <p className="text-xs text-slate-400">Monthly Rent</p>
                            <p className="text-base font-bold text-slate-900">Rs. {room.price.toLocaleString()}</p>
                          </div>
                          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${OCCUPANCY_STYLE[room.status]}`}>
                            {room.status.replace("_", " ")}
                          </span>
                        </div>

                        {room.landlord && (
                          <div className="mt-2 text-xs text-slate-500">
                            Landlord: <span className="font-semibold text-slate-700">{room.landlord.fullName}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => setEditingItem(room)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                        >
                          <Pencil size={13} className="text-slate-500" />
                          <span>Edit &amp; Review</span>
                        </button>

                        <button
                          onClick={() => handleDelete(room.id)}
                          disabled={deletingId === room.id}
                          className="rounded-lg border border-rose-100 p-1.5 text-rose-500 hover:bg-rose-50 disabled:opacity-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {editingItem && (
        <EditPropertyModal
          room={editingItem}
          onClose={() => setEditingItem(null)}
          onApprove={() => {
            handleApproval(editingItem.id, "APPROVED");
            setEditingItem(null);
          }}
          onReject={() => {
            handleApproval(editingItem.id, "REJECTED");
            setEditingItem(null);
          }}
          onSave={async (updatedFields) => {
            await handleSavePropertyDetails(editingItem.id, updatedFields);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

function RoomAvatar({ room }: { room: Room }) {
  const thumb = roomThumb(room);
  if (thumb) return <img src={thumb} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover shadow-sm" />;
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
      <Building2 size={20} />
    </div>
  );
}

function EditPropertyModal({
  room,
  onClose,
  onApprove,
  onReject,
  onSave,
}: {
  room: Room;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSave: (updatedFields: any) => Promise<void>;
}) {
  const thumb = roomThumb(room);
  const approval = APPROVAL_BADGE[room.approvalStatus || "APPROVED"] || APPROVAL_BADGE.APPROVED;
  const BadgeIcon = approval.icon;

  const [title, setTitle] = useState(room.title || "");
  const [roomType, setRoomType] = useState<Room["roomType"]>(room.roomType || "SINGLE");
  const [price, setPrice] = useState(room.price ? room.price.toString() : "");
  const [city, setCity] = useState(room.city || "");
  const [location, setLocation] = useState(room.location || "");
  const [description, setDescription] = useState(room.description || "");
  const [status, setStatus] = useState<Room["status"]>(room.status || "AVAILABLE");
  
  const [saving, setSaving] = useState(false);

  async function handleFormSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        roomType,
        price: Number(price) || 0,
        city: city.trim(),
        location: location.trim(),
        description: description.trim() || undefined,
        status,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Edit Property Details</h2>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${approval.style}`}>
              <BadgeIcon size={12} />
              {approval.label}
            </span>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content & Form */}
        <form id="edit-property-form" onSubmit={handleFormSave} className="overflow-y-auto p-6 space-y-5 flex-1">
          <div className="h-44 overflow-hidden rounded-xl bg-slate-100 relative shrink-0">
            {thumb ? (
              <img src={thumb} alt={room.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-300">
                <Building2 size={40} />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Property Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Room Type
                </label>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value as Room["roomType"])}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-900"
                >
                  <option value="SINGLE">Single Room</option>
                  <option value="DOUBLE">Double Room</option>
                  <option value="FLAT">Flat</option>
                  <option value="APARTMENT">Apartment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Monthly Rent (Rs.)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Location / Area
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Room["status"])}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-900"
              >
                <option value="AVAILABLE">Available</option>
                <option value="BOOKED">Booked</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-slate-900"
              />
            </div>

            {room.landlord && (
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Landlord Details</p>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{room.landlord.fullName}</p>
                    <p className="text-xs text-slate-500">{room.landlord.email}</p>
                  </div>
                  {room.landlord.phone && (
                    <p className="font-semibold text-slate-800 bg-white px-3 py-1 rounded-lg border border-slate-200">
                      {room.landlord.phone}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions: Accept, Reject, Save */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            {/* Accept (Approve) Button */}
            {room.approvalStatus !== "APPROVED" && (
              <button
                type="button"
                onClick={onApprove}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Check size={16} />
                Accept Property
              </button>
            )}

            {/* Reject Button */}
            {room.approvalStatus !== "REJECTED" && (
              <button
                type="button"
                onClick={onReject}
                className="flex items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
              >
                <X size={16} />
                Reject Property
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              form="edit-property-form"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
