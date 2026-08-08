import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Bell,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  UploadCloud,
  Building2,
  MapPin,
  Loader2,
} from "lucide-react";
import { api, getImageUrl, type Room, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";

interface LandlordPropertiesProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
}

const PAGE_SIZE = 3;

const STATUS_STYLE: Record<string, string> = {
  AVAILABLE: "bg-red-50 text-red-600",
  BOOKED: "bg-green-50 text-green-600",
  UNDER_MAINTENANCE: "bg-blue-50 text-blue-600",
};
const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Vacant",
  BOOKED: "Occupied",
  UNDER_MAINTENANCE: "Maintenance",
};

const ROOM_TYPE_OPTIONS: { value: Room["roomType"]; label: string }[] = [
  { value: "SINGLE", label: "Single" },
  { value: "DOUBLE", label: "Double" },
  { value: "FLAT", label: "Flat" },
  { value: "APARTMENT", label: "Apartment" },
];

const AMENITY_OPTIONS = ["WiFi", "Water", "Parking", "Kitchen", "Electricity", "Fully Furnished", "Pet Friendly"];

type PropertyForm = {
  title: string;
  roomType: Room["roomType"];
  price: string;
  address: string;
  mapLocation: string;
  amenities: string[];
  status: Room["status"];
};

const EMPTY_FORM: PropertyForm = {
  title: "",
  roomType: "APARTMENT",
  price: "",
  address: "",
  mapLocation: "",
  amenities: [],
  status: "AVAILABLE",
};

export default function LandlordProperties({ user, onLogout, activeRoute, onNavigate }: LandlordPropertiesProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [headerSearch, setHeaderSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [addressFilter, setAddressFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const [editingRoomId, setEditingRoomId] = useState<number | "">("");
  const [editForm, setEditForm] = useState<PropertyForm>(EMPTY_FORM);
  const [editNewFiles, setEditNewFiles] = useState<File[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [form, setForm] = useState<PropertyForm>(EMPTY_FORM);
  const [dragActive, setDragActive] = useState(false);
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    setLoading(true);
    try {
      const res = await api.getMyRooms();
      if (res.success) setRooms(res.rooms || []);
    } catch (e) {
      console.error("Failed to load properties:", e);
    } finally {
      setLoading(false);
    }
  }

  const addresses = useMemo(() => Array.from(new Set(rooms.map((r) => r.location).filter(Boolean))), [rooms]);

  const filteredRooms = useMemo(() => {
    const q = headerSearch.trim().toLowerCase();
    return rooms.filter((r) => {
      const matchesQuery = !q || r.title.toLowerCase().includes(q);
      const matchesType = typeFilter === "ALL" || r.roomType === typeFilter;
      const matchesAddress = addressFilter === "ALL" || r.location === addressFilter;
      const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
      return matchesQuery && matchesType && matchesAddress && matchesStatus;
    });
  }, [rooms, headerSearch, typeFilter, addressFilter, statusFilter]);

  useEffect(() => setPage(1), [headerSearch, typeFilter, addressFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / PAGE_SIZE));
  const pagedRooms = filteredRooms.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function selectRoomToEdit(idStr: string) {
    if (!idStr) {
      setEditingRoomId("");
      setEditForm(EMPTY_FORM);
      return;
    }
    const id = Number(idStr);
    const room = rooms.find((r) => r.id === id);
    if (!room) return;
    setEditingRoomId(id);
    setEditNewFiles([]);
    setEditError(null);
    setEditForm({
      title: room.title,
      roomType: room.roomType,
      price: room.price.toString(),
      address: room.location,
      mapLocation: room.city,
      amenities: (room.roomAmenities || []).map((ra) => ra.amenity.name),
      status: room.status,
    });
  }

  function toggleEditAmenity(name: string) {
    setEditForm((f) => ({
      ...f,
      amenities: f.amenities.includes(name) ? f.amenities.filter((a) => a !== name) : [...f.amenities, name],
    }));
  }

  function handleCancelEdit() {
    setEditingRoomId("");
    setEditForm(EMPTY_FORM);
    setEditNewFiles([]);
    setEditError(null);
  }

  async function handleUpdateProperty(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRoomId) return;
    setEditError(null);

    if (!editForm.title.trim() || !editForm.price.trim()) {
      setEditError("Property name and rent are required.");
      return;
    }
    const priceNum = Number(editForm.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setEditError("Enter a valid rent amount.");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await api.updateRoom(editingRoomId, {
        title: editForm.title.trim(),
        roomType: editForm.roomType,
        price: priceNum,
        location: editForm.address.trim(),
        city: editForm.mapLocation.trim(),
        amenities: editForm.amenities,
        status: editForm.status,
      });
      if (res.success && editNewFiles.length > 0) {
        const fd = new FormData();
        editNewFiles.forEach((f) => fd.append("images", f));
        await api.uploadRoomImages(editingRoomId, fd);
      }
      if (res.success) {
        handleCancelEdit();
        await loadRooms();
      } else {
        setEditError(res.message || "Couldn't update the property.");
      }
    } catch (e) {
      console.error("Failed to update property:", e);
      setEditError("Couldn't update the property.");
    } finally {
      setSavingEdit(false);
    }
  }

  function toggleAmenity(name: string) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(name) ? f.amenities.filter((a) => a !== name) : [...f.amenities, name],
    }));
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    setPickedFiles((prev) => [...prev, ...Array.from(files)]);
  }

  function handleReset() {
    setForm(EMPTY_FORM);
    setPickedFiles([]);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.title.trim() || !form.price.trim()) {
      setFormError("Property name and rent are required.");
      return;
    }
    const priceNum = Number(form.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setFormError("Enter a valid rent amount.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createRoom({
        title: form.title.trim(),
        roomType: form.roomType,
        price: priceNum,
        location: form.address.trim(),
        city: form.mapLocation.trim(),
        amenities: form.amenities,
        status: form.status,
      });
      if (res.success && pickedFiles.length > 0 && res.room?.id) {
        const fd = new FormData();
        pickedFiles.forEach((f) => fd.append("images", f));
        await api.uploadRoomImages(res.room.id, fd);
      }
      if (res.success) {
        handleReset();
        await loadRooms();
      } else {
        setFormError(res.message || "Couldn't create the property.");
      }
    } catch (e) {
      console.error("Failed to create property:", e);
      setFormError("Couldn't create the property.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(roomId: number) {
    if (!window.confirm("Delete this property? This can't be undone.")) return;
    try {
      const res = await api.deleteRoom(roomId);
      if (res.success) setRooms((prev) => prev.filter((r) => r.id !== roomId));
      if (editingRoomId === roomId) handleCancelEdit();
    } catch (e) {
      console.error("Failed to delete property:", e);
    }
    setOpenMenuId(null);
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} user={user} />
      <div className="min-w-0 flex-1">
        {/* Header — stacks on mobile, row on sm+ */}
        <header className="flex flex-col gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
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
          <div className="flex justify-end gap-3">
            <button className="shrink-0 rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 sm:flex-none">
              <Plus size={16} />
              <span className="whitespace-nowrap">Add New Property</span>
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Properties</h1>
          <p className="mt-1 text-sm text-gray-500">Manage and monitor all your properties in one place.</p>

          {/* Filter bar — wraps and scrolls horizontally if tight */}
          <div className="my-6 flex flex-wrap items-center gap-3">
            <FilterSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={[{ value: "ALL", label: "Property Type: All Types" }, ...ROOM_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))]}
            />
            <FilterSelect
              value={addressFilter}
              onChange={setAddressFilter}
              options={[{ value: "ALL", label: "Address: Select Address" }, ...addresses.map((a) => ({ value: a, label: a }))]}
            />
            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "ALL", label: "Status: All Statuses" },
                { value: "AVAILABLE", label: "Vacant" },
                { value: "BOOKED", label: "Occupied" },
                { value: "UNDER_MAINTENANCE", label: "Maintenance" },
              ]}
            />
          </div>

          {/* Property list — table on md+, stacked cards on mobile */}
          <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
            {loading ? (
              <p className="py-8 text-center text-sm text-gray-400">Loading properties...</p>
            ) : pagedRooms.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                {rooms.length === 0 ? "No properties listed yet." : "No properties match your filters."}
              </p>
            ) : (
              <>
                {/* Desktop/tablet table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                        <th className="pb-3 font-medium">Property Name</th>
                        <th className="pb-3 font-medium">Type</th>
                        <th className="pb-3 font-medium">Images</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Rent / Month</th>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRooms.map((room) => (
                        <tr key={room.id} className="border-t border-gray-100">
                          <td className="py-3">
                            <p className="font-medium text-gray-900">{room.title}</p>
                            <p className="text-xs text-gray-400">{room.location}, {room.city}</p>
                          </td>
                          <td className="py-3 text-gray-700">{room.roomType.charAt(0) + room.roomType.slice(1).toLowerCase()}</td>
                          <td className="py-3">
                            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                              {room.roomImages?.[0]?.imageUrl ? (
                                <img
                                  src={getImageUrl(room.roomImages[0].imageUrl)}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Building2 size={16} className="text-gray-400" />
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[room.status]}`}>
                              {STATUS_LABEL[room.status]}
                            </span>
                          </td>
                          <td className="py-3 text-gray-700">Rs. {room.price.toLocaleString()}</td>
                          <td className="py-3 text-right">
                            <RowMenu
                              open={openMenuId === room.id}
                              onToggle={() => setOpenMenuId(openMenuId === room.id ? null : room.id)}
                              onEdit={() => { selectRoomToEdit(room.id.toString()); setOpenMenuId(null); }}
                              onDelete={() => handleDelete(room.id)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile stacked cards */}
                <div className="space-y-3 md:hidden">
                  {pagedRooms.map((room) => (
                    <div key={room.id} className="rounded-xl border border-gray-100 p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                          {room.roomImages?.[0]?.imageUrl ? (
                            <img
                              src={getImageUrl(room.roomImages[0].imageUrl)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Building2 size={18} className="text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-900">{room.title}</p>
                              <p className="truncate text-xs text-gray-400">{room.location}, {room.city}</p>
                            </div>
                            <RowMenu
                              open={openMenuId === room.id}
                              onToggle={() => setOpenMenuId(openMenuId === room.id ? null : room.id)}
                              onEdit={() => { selectRoomToEdit(room.id.toString()); setOpenMenuId(null); }}
                              onDelete={() => handleDelete(room.id)}
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-gray-500">{room.roomType.charAt(0) + room.roomType.slice(1).toLowerCase()}</span>
                            <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[room.status]}`}>{STATUS_LABEL[room.status]}</span>
                            <span className="ml-auto font-medium text-gray-900">Rs. {room.price.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row">
                  <p className="text-xs text-gray-500">Showing 1 to {pagedRooms.length} of {filteredRooms.length} results</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 4).map((p) => (
                      <button key={p} onClick={() => setPage(p)} className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium ${page === p ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                        {p}
                      </button>
                    ))}
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Edit Existing Property */}
          <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
            <h2 className="mb-5 text-base font-semibold text-gray-900">Edit Existing Property</h2>

            <div className="mb-5 w-full sm:max-w-sm">
              <label className="mb-1 block text-xs font-medium text-gray-600">Select Property to Edit</label>
              <select
                value={editingRoomId}
                onChange={(e) => selectRoomToEdit(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
              >
                <option value="">— Choose a property —</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>

            {editingRoomId === "" ? (
              <p className="text-sm text-gray-400">Select a property above to edit its details.</p>
            ) : (
              <form onSubmit={handleUpdateProperty} className="space-y-5">
                {editError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{editError}</p>}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Property Name</label>
                    <input
                      value={editForm.title}
                      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Property Type</label>
                    <select
                      value={editForm.roomType}
                      onChange={(e) => setEditForm((f) => ({ ...f, roomType: e.target.value as Room["roomType"] }))}
                      className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                    >
                      {ROOM_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Rent / Mo</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.price}
                      onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Property Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as Room["status"] }))}
                      className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                    >
                      <option value="AVAILABLE">Vacant</option>
                      <option value="BOOKED">Occupied</option>
                      <option value="UNDER_MAINTENANCE">Maintenance</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Property Address</label>
                    <input
                      value={editForm.address}
                      onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Map Location</label>
                    <div className="relative">
                      <MapPin size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={editForm.mapLocation}
                        onChange={(e) => setEditForm((f) => ({ ...f, mapLocation: e.target.value }))}
                        className="h-10 w-full rounded-lg border border-gray-200 pl-8 pr-3 text-sm outline-none focus:border-gray-900"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-600">Amenities</label>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:gap-x-6">
                    {AMENITY_OPTIONS.map((amenity) => (
                      <label key={amenity} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editForm.amenities.includes(amenity)}
                          onChange={() => toggleEditAmenity(amenity)}
                          className="h-4 w-4 shrink-0 accent-gray-900"
                        />
                        {amenity}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-600">Property Pictures</label>
                  <div className="flex flex-wrap gap-3">
                    {(rooms.find((r) => r.id === editingRoomId)?.roomImages || []).map((img) => (
                      <div key={img.id} className="h-16 w-16 overflow-hidden rounded-lg border border-gray-200">
                        <img src={getImageUrl(img.imageUrl)} alt="" className="h-full w-full object-cover" />
                      </div>
                    ))}
                    <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-gray-400">
                      <UploadCloud size={16} />
                      <span className="text-[9px]">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => setEditNewFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
                      />
                    </label>
                  </div>
                  {editNewFiles.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500">{editNewFiles.length} new image{editNewFiles.length === 1 ? "" : "s"} to upload</p>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                  <button type="button" onClick={handleCancelEdit} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingEdit} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                    {savingEdit && <Loader2 size={14} className="animate-spin" />}
                    Update Property
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Add New Property */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
            <h2 className="mb-5 text-base font-semibold text-gray-900">Add New Property</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Property Name</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Sunset View Apartments"
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Property Type</label>
                  <select
                    value={form.roomType}
                    onChange={(e) => setForm((f) => ({ ...f, roomType: e.target.value as Room["roomType"] }))}
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                  >
                    {ROOM_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Rent / Mo</label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Property Address</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="e.g. 123 Sunset Blvd, Riverside"
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Map Location</label>
                  <div className="relative">
                    <MapPin size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={form.mapLocation}
                      onChange={(e) => setForm((f) => ({ ...f, mapLocation: e.target.value }))}
                      placeholder="Search location on map..."
                      className="h-10 w-full rounded-lg border border-gray-200 pl-8 pr-3 text-sm outline-none focus:border-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-gray-600">Amenities</label>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:gap-x-6">
                  {AMENITY_OPTIONS.map((amenity) => (
                    <label key={amenity} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.amenities.includes(amenity)}
                        onChange={() => toggleAmenity(amenity)}
                        className="h-4 w-4 shrink-0 accent-gray-900"
                      />
                      {amenity}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-gray-600">Property Pictures</label>
                <label
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors sm:py-10 ${
                    dragActive ? "border-gray-900 bg-gray-50" : "border-gray-200"
                  }`}
                >
                  <UploadCloud size={22} className="text-gray-400" />
                  <p className="text-sm text-gray-500">
                    Drag and drop images here, or <span className="font-medium text-blue-600">browse</span>
                  </p>
                  <p className="text-xs text-gray-400">Supports JPG, PNG (Max 5MB each)</p>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                </label>
                {pickedFiles.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">{pickedFiles.length} image{pickedFiles.length === 1 ? "" : "s"} selected</p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={handleReset} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Reset
                </button>
                <button type="submit" disabled={submitting} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Submit Property
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 max-w-[200px] appearance-none truncate rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-xs font-medium text-gray-700 outline-none focus:border-gray-900"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

function RowMenu({ open, onToggle, onEdit, onDelete }: { open: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="relative inline-block">
      <button onClick={onToggle} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="More actions">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-10 w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <button onClick={onEdit} className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Edit</button>
          <button onClick={onDelete} className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Delete</button>
        </div>
      )}
    </div>
  );
}
