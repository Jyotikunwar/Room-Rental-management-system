import { useEffect, useMemo, useState } from "react";
import {
  Search, Bell, LayoutGrid, List, MapPin, Pencil, Eye, Trash2,
  Loader2, X, Building2,
} from "lucide-react";
import { api, getImageUrl, type User, type Room } from "../../services/api";
import AdminSidebar, { type AdminRoute } from "./adminSidebar";
import { filterRoomsMultiCriteria } from "../../utils/multiCriteriaFilter";


interface AdminPropertiesProps {
  user: User;
  onLogout?: () => void;
  activeRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
}

const STATUS_STYLE: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  BOOKED: "bg-blue-100 text-blue-700",
  UNDER_MAINTENANCE: "bg-amber-100 text-amber-700",
};

function roomThumb(room: Room) {
  const url = room.roomImages?.[0]?.imageUrl;
  return url ? getImageUrl(url) : null;
}

export default function AdminProperties({ onLogout, activeRoute, onNavigate }: AdminPropertiesProps) {
  const [rooms, setRooms] = useState<Room[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("list");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [roomType, setRoomType] = useState("");
  const [status, setStatus] = useState("");

  const [viewItem, setViewItem] = useState<Room | null>(null);
  const [editItem, setEditItem] = useState<Room | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadRooms = () => {
    setError(null);
    api
      .getRooms({ status: "ALL" })
      .then((res) => {
        if (res.success === false) throw new Error(res.message || "Couldn't load properties.");
        setRooms(res.rooms || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load properties."));
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const cities = useMemo(() => Array.from(new Set((rooms ?? []).map((r) => r.city))).sort(), [rooms]);

  const filtered = useMemo(() => {
    if (!rooms) return [];
    let list = filterRoomsMultiCriteria(rooms, {
      query: search,
      city: city || undefined,
      roomType: roomType || undefined,
    });
    if (status) {
      list = list.filter((r) => r.status === status);
    }
    return list;
  }, [rooms, search, city, roomType, status]);

  async function handleDelete(id: number) {
    if (!confirm("Delete this property? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await api.deleteRoom(id);
      if (res.success === false) throw new Error(res.message || "Couldn't delete this property.");
      setRooms((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Couldn't delete this property.");
    } finally {
      setDeletingId(null);
    }
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
              placeholder="Search properties, tenants..."
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-gray-900"
            />
          </div>
          <button className="relative self-end rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50 sm:self-auto" aria-label="Notifications">
            <Bell size={18} />
          </button>
        </header>

        <main className="p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
              <p className="mt-1 text-sm text-gray-500">{filtered.length} of {rooms?.length ?? 0} listings</p>
            </div>
            <button
              onClick={() => onNavigate("add-property" as AdminRoute)}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Add Property
            </button>
          </div>

          {/* Search + Filters */}
          <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title or location..."
                  className="h-10 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-gray-900"
                />
              </div>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 outline-none">
                <option value="">All Cities</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 outline-none">
                <option value="">All Types</option>
                <option value="SINGLE">Single Room</option>
                <option value="DOUBLE">Double Room</option>
                <option value="FLAT">Flat</option>
                <option value="APARTMENT">Apartment</option>
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 outline-none">
                <option value="">All Status</option>
                <option value="AVAILABLE">Available</option>
                <option value="BOOKED">Booked</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
              </select>

              <div className="flex overflow-hidden rounded-lg border border-gray-200">
                <button onClick={() => setView("list")} className={`flex items-center gap-1.5 px-3 py-2 text-sm ${view === "list" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  <List size={16} />
                </button>
                <button onClick={() => setView("grid")} className={`flex items-center gap-1.5 px-3 py-2 text-sm ${view === "grid" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          {rooms === undefined ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
          ) : error ? (
            <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 p-8 text-center text-sm text-red-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-400">No properties match these filters.</div>
          ) : view === "list" ? (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Property</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Rent</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((room) => (
                    <tr key={room.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <RoomAvatar room={room} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">{room.title}</p>
                            <p className="flex items-center gap-1 truncate text-xs text-gray-400"><MapPin size={11} />{room.location}, {room.city}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{room.roomType}</td>
                      <td className="px-5 py-3 text-gray-600">Rs. {room.price.toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[room.status]}`}>{room.status.replace("_", " ")}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setViewItem(room)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><Eye size={16} /></button>
                          <button onClick={() => setEditItem(room)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><Pencil size={16} /></button>
                          <button onClick={() => handleDelete(room.id)} disabled={deletingId === room.id} className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((room) => (
                <div key={room.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                  <div className="h-36 bg-gray-100">
                    {roomThumb(room) ? (
                      <img src={roomThumb(room)!} alt={room.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300"><Building2 size={28} /></div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-gray-900">{room.title}</h3>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[room.status]}`}>{room.status.replace("_", " ")}</span>
                    </div>
                    <p className="flex items-center gap-1 text-xs text-gray-400"><MapPin size={11} />{room.location}, {room.city}</p>
                    <p className="mt-2 text-sm font-semibold text-gray-800">Rs. {room.price.toLocaleString()}/mo</p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => setViewItem(room)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"><Eye size={13} /> View</button>
                      <button onClick={() => setEditItem(room)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"><Pencil size={13} /> Edit</button>
                      <button onClick={() => handleDelete(room.id)} disabled={deletingId === room.id} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {viewItem && <ViewPropertyModal room={viewItem} onClose={() => setViewItem(null)} />}
      {editItem && (
        <EditPropertyModal
          room={editItem}
          onClose={() => setEditItem(null)}
          onSaved={(updated) => {
            setRooms((prev) => prev?.map((r) => (r.id === updated.id ? updated : r)));
            setEditItem(null);
          }}
        />
      )}
    </div>
  );
}

function RoomAvatar({ room }: { room: Room }) {
  const thumb = roomThumb(room);
  if (thumb) return <img src={thumb} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />;
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
      <Building2 size={18} />
    </div>
  );
}

function ViewPropertyModal({ room, onClose }: { room: Room; onClose: () => void }) {
  const thumb = roomThumb(room);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h2 className="text-lg font-bold text-gray-900">Property Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">
          <div className="mb-4 h-40 overflow-hidden rounded-xl bg-gray-100">
            {thumb ? <img src={thumb} alt={room.title} className="h-full w-full object-cover" /> : (
              <div className="flex h-full items-center justify-center text-gray-300"><Building2 size={32} /></div>
            )}
          </div>
          <h3 className="text-base font-semibold text-gray-900">{room.title}</h3>
          <p className="flex items-center gap-1 text-sm text-gray-500"><MapPin size={13} />{room.location}, {room.city}</p>
          {room.description && <p className="mt-3 text-sm text-gray-600">{room.description}</p>}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-400">Type</p><p className="font-medium text-gray-800">{room.roomType}</p></div>
            <div><p className="text-xs text-gray-400">Status</p><p className="font-medium text-gray-800">{room.status.replace("_", " ")}</p></div>
            <div><p className="text-xs text-gray-400">Rent</p><p className="font-medium text-gray-800">Rs. {room.price.toLocaleString()}/mo</p></div>
            <div>
              <p className="text-xs text-gray-400">Deposit</p>
              <p className="font-medium text-gray-800">
                {(() => {
                  const dep = (room as any).securityDeposit;
                  return dep ? `Rs. ${Number(dep).toLocaleString()}` : "—";
                })()}
              </p>
            </div>
          </div>
          {room.landlord && (
            <div className="mt-4 border-t border-gray-100 pt-4 text-sm">
              <p className="text-xs text-gray-400">Landlord</p>
              <p className="font-medium text-gray-800">{room.landlord.fullName}</p>
              {room.landlord.phone && <p className="text-gray-500">{room.landlord.phone}</p>}
            </div>
          )}
        </div>
        <div className="flex justify-end border-t border-gray-100 p-5">
          <button onClick={onClose} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">Close</button>
        </div>
      </div>
    </div>
  );
}

function EditPropertyModal({ room, onClose, onSaved }: { room: Room; onClose: () => void; onSaved: (room: Room) => void }) {
  const [title, setTitle] = useState(room.title);
  const [price, setPrice] = useState(String(room.price));
  const [status, setStatus] = useState(room.status);
  const [description, setDescription] = useState(room.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.updateRoom(room.id, {
        title: title.trim(),
        price: Number(price) || room.price,
        status,
        description: description.trim(),
      });
      if (res.success === false) throw new Error(res.message || "Couldn't save changes.");
      onSaved(res.room);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Edit Property</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</div>}

        <label className="mb-3 block text-xs font-medium text-gray-600">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900" />
        </label>
        <label className="mb-3 block text-xs font-medium text-gray-600">
          Monthly Rent (Rs.)
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900" />
        </label>
        <label className="mb-3 block text-xs font-medium text-gray-600">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as Room["status"])} className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-gray-900">
            <option value="AVAILABLE">Available</option>
            <option value="BOOKED">Booked</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
          </select>
        </label>
        <label className="mb-4 block text-xs font-medium text-gray-600">
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900" />
        </label>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
