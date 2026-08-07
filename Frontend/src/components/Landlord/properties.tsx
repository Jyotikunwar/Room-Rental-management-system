import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Building2,
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { api, type Room, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

interface LandlordPropertiesProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
}

type RoomFormState = {
  title: string;
  description: string;
  location: string;
  city: string;
  price: string;
  roomType: Room["roomType"];
  amenities: string; // comma-separated amenity names in the form
  status: Room["status"];
};

const EMPTY_FORM: RoomFormState = {
  title: "",
  description: "",
  location: "",
  city: "",
  price: "",
  roomType: "SINGLE",
  amenities: "",
  status: "AVAILABLE",
};

const ROOM_TYPE_OPTIONS: { value: Room["roomType"]; label: string }[] = [
  { value: "SINGLE", label: "Single" },
  { value: "DOUBLE", label: "Double" },
  { value: "FLAT", label: "Flat" },
  { value: "APARTMENT", label: "Apartment" },
];

const STATUS_OPTIONS: { value: Room["status"]; label: string }[] = [
  { value: "AVAILABLE", label: "Vacant" },
  { value: "BOOKED", label: "Occupied" },
  { value: "UNDER_MAINTENANCE", label: "Maintenance" },
];

export default function LandlordProperties({ user, onLogout, activeRoute, onNavigate }: LandlordPropertiesProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    setLoading(true);
    try {
      const res = await api.getMyRooms();
      if (res.success) setRooms(res.rooms || []);
    } catch (e) {
      console.error("Failed to load rooms:", e);
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

  function openAddModal() {
    setEditingRoom(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(room: Room) {
    setEditingRoom(room);
    setForm({
      title: room.title,
      description: room.description || "",
      location: room.location,
      city: room.city,
      price: room.price.toString(),
      roomType: room.roomType,
      amenities: (room.roomAmenities || []).map((ra) => ra.amenity.name).join(", "),
      status: room.status,
    });
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim() || !form.location.trim() || !form.city.trim() || !form.price.trim()) {
      setError("Please fill in title, location, city, and price.");
      return;
    }
    const priceNum = Number(form.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError("Enter a valid price.");
      return;
    }

    // NOTE: sending amenity names as a plain array here. If your backend
    // expects amenityIds (numbers) instead, resolve names to ids before
    // this point, or change this field to a multi-select of existing Amenity records.
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      city: form.city.trim(),
      price: priceNum,
      roomType: form.roomType,
      amenities: form.amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      status: form.status,
    };

    setSaving(true);
    try {
      const res = editingRoom
        ? await api.updateRoom(editingRoom.id, payload)
        : await api.createRoom(payload);

      if (res.success) {
        setModalOpen(false);
        await loadRooms();
      } else {
        setError(res.message || "Something went wrong. Please try again.");
      }
    } catch (e) {
      console.error("Failed to save room:", e);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(room: Room) {
    if (!window.confirm(`Delete "${room.title}"? This can't be undone.`)) return;
    setDeletingId(room.id);
    try {
      const res = await api.deleteRoom(room.id);
      if (res.success) {
        setRooms((prev) => prev.filter((r) => r.id !== room.id));
      }
    } catch (e) {
      console.error("Failed to delete room:", e);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleStatusChange(room: Room, status: Room["status"]) {
    const prevRooms = rooms;
    setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, status } : r))); // optimistic
    try {
      const res = await api.updateRoom(room.id, { status });
      if (!res.success) setRooms(prevRooms);
    } catch (e) {
      console.error("Failed to update status:", e);
      setRooms(prevRooms);
    }
  }

  const statusStyle = (status: string) =>
    status === "AVAILABLE"
      ? "bg-red-50 text-red-600"
      : status === "BOOKED"
      ? "bg-green-50 text-green-600"
      : "bg-amber-50 text-amber-600";

  const statusLabel = (status: string) =>
    status === "AVAILABLE" ? "Vacant" : status === "BOOKED" ? "Occupied" : "Maintenance";

  const roomTypeLabel = (type: string) => type.charAt(0) + type.slice(1).toLowerCase();

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
              placeholder="Search properties..."
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
              onClick={openAddModal}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Plus size={16} />
              Add Property
            </button>
          </div>
        </header>

        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">My Properties</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your listings — add, edit, or update status.</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3 font-medium">Property</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Rent</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
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
                        {rooms.length === 0 ? "No properties listed yet." : "No properties match your search."}
                      </td>
                    </tr>
                  ) : (
                    filteredRooms.map((room) => (
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
                        <td className="py-3 text-gray-700">{roomTypeLabel(room.roomType)}</td>
                        <td className="py-3">
                          <select
                            value={room.status}
                            onChange={(e) => handleStatusChange(room, e.target.value as Room["status"])}
                            className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium outline-none ${statusStyle(room.status)}`}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 text-gray-700">Rs. {room.price.toLocaleString()}</td>
                        <td className="py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(room)}
                              className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
                              aria-label="Edit property"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(room)}
                              disabled={deletingId === room.id}
                              className="rounded-lg border border-gray-200 p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                              aria-label="Delete property"
                            >
                              {deletingId === room.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
        </main>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingRoom ? "Edit Property" : "Add Property"}
              </h2>
              <button onClick={closeModal} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                  placeholder="Cozy single room near campus"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
                  placeholder="Furnished, attached bathroom, wifi included..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                    placeholder="Baneshwor"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                    placeholder="Kathmandu"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Rent (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                    placeholder="8000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Room Type</label>
                  <select
                    value={form.roomType}
                    onChange={(e) => setForm((f) => ({ ...f, roomType: e.target.value as Room["roomType"] }))}
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                  >
                    {ROOM_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Amenities (comma-separated)</label>
                <input
                  type="text"
                  value={form.amenities}
                  onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                  placeholder="wifi, parking, furnished"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Room["status"] }))}
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editingRoom ? "Save Changes" : "Add Property"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}