import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Bell,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  UploadCloud,
  Building2,
  Loader2,
  Navigation,
  X,
  MapPin,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { PRESET_LOCATIONS } from "../../utils/haversine";
import { searchPlaces, reverseGeocode, type PlaceSearchResult } from "../../utils/locationSearch";
import { api, getImageUrl, type Room, type User } from "../../services/api";
import LandlordSidebar, { type LandlordRoute } from "./sidebar";
import { filterRoomsMultiCriteria } from "../../utils/multiCriteriaFilter";

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER: [number, number] = [27.7172, 85.324];

function MapViewSync({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface PropertyLocationPickerProps {
  address: string;
  latitude: number | null;
  longitude: number | null;
  onChangeAddress: (address: string) => void;
  onChangeCoords: (lat: number | null, lng: number | null) => void;
}

function PropertyLocationPicker({
  address,
  latitude,
  longitude,
  onChangeAddress,
  onChangeCoords,
}: PropertyLocationPickerProps) {
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<[number, number]>(() =>
    latitude != null && longitude != null ? [latitude, longitude] : [...DEFAULT_CENTER]
  );
  const [mapZoom, setMapZoom] = useState(15);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (latitude != null && longitude != null) {
      setCoords([latitude, longitude]);
    }
  }, [latitude, longitude]);

  const updateLocation = useCallback(
    async (lat: number, lng: number, updateAddressText = true) => {
      const roundedLat = Math.round(lat * 100000) / 100000;
      const roundedLng = Math.round(lng * 100000) / 100000;
      setCoords([roundedLat, roundedLng]);
      onChangeCoords(roundedLat, roundedLng);
      setSelectedPreset("");
      setSuggestions([]);
      setShowSuggestions(false);

      if (!updateAddressText) return;

      try {
        const label = await reverseGeocode(roundedLat, roundedLng);
        if (label) {
          onChangeAddress(label);
        }
      } catch {
        // preserve address
      }
    },
    [onChangeAddress, onChangeCoords]
  );

  const applyPlace = useCallback(
    (place: PlaceSearchResult) => {
      onChangeAddress(place.label);
      const roundedLat = Math.round(place.lat * 100000) / 100000;
      const roundedLng = Math.round(place.lng * 100000) / 100000;
      setCoords([roundedLat, roundedLng]);
      onChangeCoords(roundedLat, roundedLng);
      setMapZoom(place.category === "Address" || place.category === "Area" ? 15 : 17);
      setSelectedPreset("");
      setSuggestions([]);
      setShowSuggestions(false);
      setMapError(null);
    },
    [onChangeAddress, onChangeCoords]
  );

  useEffect(() => {
    const trimmed = address.trim();
    if (trimmed.length < 2 || !showSuggestions) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSuggesting(true);
      try {
        const results = await searchPlaces(trimmed, {
          near: coords,
          includeNominatim: false,
        });
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSuggesting(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [address, coords, showSuggestions]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) return;

    setSearching(true);
    setMapError(null);
    setShowSuggestions(false);

    try {
      const results = await searchPlaces(trimmed, { near: coords, includeNominatim: true });
      if (results.length === 0) {
        setMapError("No matches found. Try a hospital, school, shop name, or street address.");
        return;
      }
      applyPlace(results[0]);
    } catch {
      setMapError("Search failed. Try again or pick a location on the map.");
    } finally {
      setSearching(false);
    }
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const label = e.target.value;
    setSelectedPreset(label);
    if (!label) return;

    const found = PRESET_LOCATIONS.find((p) => p.label === label);
    if (!found) return;

    onChangeAddress(found.label);
    setCoords([found.lat, found.lng]);
    onChangeCoords(found.lat, found.lng);
    setMapZoom(15);
    setMapError(null);
  };

  const handleUseGps = () => {
    if (!("geolocation" in navigator)) {
      setMapError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setMapError(null);
    setShowSuggestions(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 100000) / 100000;
        const lng = Math.round(pos.coords.longitude * 100000) / 100000;
        setCoords([lat, lng]);
        onChangeCoords(lat, lng);
        setMapZoom(16);
        setSelectedPreset("");
        try {
          const label = await reverseGeocode(lat, lng);
          if (label) onChangeAddress(label);
        } catch {
          // preserve address
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setMapError(`Could not detect GPS location: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      {/* Quick preset dropdown */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Quick preset</label>
        <select
          value={selectedPreset}
          onChange={handlePresetChange}
          className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 outline-none focus:border-gray-900"
        >
          <option value="">— Choose a neighborhood —</option>
          {PRESET_LOCATIONS.map((p) => (
            <option key={p.label} value={p.label}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Property Address input + Search button + Autocomplete */}
      <div className="relative z-[1000]">
        <label className="mb-1 block text-xs font-medium text-gray-600">Property Address</label>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div ref={searchWrapRef} className="relative z-[1001] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={address}
              onChange={(e) => {
                onChangeAddress(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Enter location, street address, hospital, school, landmark..."
              className="h-10 w-full rounded-lg border border-gray-200 pl-9 pr-8 text-sm text-gray-800 outline-none focus:border-gray-900"
              autoComplete="off"
            />
            {address && (
              <button
                type="button"
                onClick={() => {
                  onChangeAddress("");
                  setSuggestions([]);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}

            {showSuggestions && address.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full z-[1002] mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                {suggesting ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-xs text-gray-500">
                    <Loader2 size={12} className="animate-spin" /> Searching places...
                  </div>
                ) : suggestions.length > 0 ? (
                  <ul className="max-h-52 overflow-y-auto">
                    {suggestions.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyPlace(r)}
                          className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50"
                        >
                          <MapPin size={14} className="mt-0.5 shrink-0 text-blue-600" />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium text-gray-800">{r.name}</span>
                              <span className="shrink-0 text-[10px] text-gray-400">{r.category}</span>
                            </span>
                            <span className="block truncate text-[11px] text-gray-500">{r.subtitle}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-3 text-xs text-gray-400">No suggestions — press Search for wider lookup.</p>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={searching || !address.trim()}
            className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {searching ? <Loader2 size={13} className="animate-spin" /> : null}
            Search
          </button>
        </form>

        {mapError && <p className="mt-1 text-xs font-medium text-amber-700">{mapError}</p>}
      </div>

      {/* GPS Location button + coords */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleUseGps}
          disabled={locating}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {locating ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
          Use my current location
        </button>
        <span className="text-xs text-gray-500">
          {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
        </span>
      </div>

      {/* Leaflet Map display */}
      <div className="relative z-0 overflow-hidden rounded-xl border border-gray-200">
        <div className="h-64 w-full sm:h-72">
          <MapContainer center={coords} zoom={mapZoom} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapViewSync center={coords} zoom={mapZoom} />
            <MapClickHandler onPick={(lat, lng) => updateLocation(lat, lng)} />
            <Marker
              position={coords}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const pos = e.target.getLatLng();
                  updateLocation(pos.lat, pos.lng);
                },
              }}
            />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

interface LandlordPropertiesProps {
  user: User;
  onLogout?: () => void;
  activeRoute: LandlordRoute;
  onNavigate: (route: LandlordRoute) => void;
}

const PAGE_SIZE = 3;

// Vacant = blue, Occupied = green, Maintenance = red
const STATUS_STYLE: Record<string, string> = {
  AVAILABLE: "bg-blue-50 text-blue-600",
  BOOKED: "bg-green-50 text-green-600",
  UNDER_MAINTENANCE: "bg-red-50 text-red-600",
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
  address: string; // free-text "Property Address" — parsed into location/city on submit
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  furnishedDetails: string;
  status: Room["status"];
};

const EMPTY_FORM: PropertyForm = {
  title: "",
  roomType: "APARTMENT",
  price: "",
  address: "",
  latitude: null,
  longitude: null,
  amenities: [],
  furnishedDetails: "",
  status: "AVAILABLE",
};

// Splits a combined "123 Sunset Blvd, Riverside" address into the
// required location/city fields your Room schema expects. Not a real
// geocoding split — just a pragmatic default until/unless you add
// separate City/Location inputs.
function splitAddress(address: string): { location: string; city: string } {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { location: "", city: "" };
  if (parts.length === 1) return { location: parts[0], city: parts[0] };
  return { location: parts.slice(0, -1).join(", "), city: parts[parts.length - 1] };
}

function resolveImageUrl(url: string) {
  return getImageUrl(url) || "";
}



export default function LandlordProperties({ user, onLogout, activeRoute, onNavigate }: LandlordPropertiesProps) {
  const addSectionRef = useRef<HTMLDivElement>(null);
  const editSectionRef = useRef<HTMLDivElement>(null);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [headerSearch, setHeaderSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [addressFilter, setAddressFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

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
    let list = filterRoomsMultiCriteria(rooms, {
      query: headerSearch,
      roomType: typeFilter === "ALL" ? undefined : typeFilter,
    });
    if (addressFilter !== "ALL") {
      list = list.filter((r) => r.location === addressFilter);
    }
    if (statusFilter !== "ALL") {
      list = list.filter((r) => r.status === statusFilter);
    }
    return list;
  }, [rooms, headerSearch, typeFilter, addressFilter, statusFilter]);

  useEffect(() => setPage(1), [headerSearch, typeFilter, addressFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / PAGE_SIZE));
  const pagedRooms = filteredRooms.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ---------- Edit panel ----------
  function selectRoomToEdit(idStr: string, shouldScroll = true) {
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
      address: (room as any).address || `${room.location}, ${room.city}`,
      latitude: (room as any).latitude ?? null,
      longitude: (room as any).longitude ?? null,
      amenities: (room.roomAmenities || []).map((ra) => ra.amenity.name),
      furnishedDetails: room.furnishedDetails || "",
      status: room.status,
    });
    if (shouldScroll) {
      setTimeout(() => {
        editSectionRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
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

    if (!editForm.title.trim() || !editForm.price.trim() || !editForm.address.trim()) {
      setEditError("Property name, rent, and address are required.");
      return;
    }
    const priceNum = Number(editForm.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setEditError("Enter a valid rent amount.");
      return;
    }

    const { location, city } = splitAddress(editForm.address);

    setSavingEdit(true);
    try {
      const res = await api.updateRoom(editingRoomId, {
        title: editForm.title.trim(),
        roomType: editForm.roomType,
        price: priceNum,
        location,
        city,
        address: editForm.address.trim(),
        latitude: editForm.latitude ?? undefined,
        longitude: editForm.longitude ?? undefined,
        amenities: editForm.amenities,
        furnishedDetails: editForm.furnishedDetails || undefined,
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

  // ---------- Add panel ----------
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

    if (!form.title.trim() || !form.price.trim() || !form.address.trim()) {
      setFormError("Property name, rent, and address are required.");
      return;
    }
    const priceNum = Number(form.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setFormError("Enter a valid rent amount.");
      return;
    }

    const { location, city } = splitAddress(form.address);

    setSubmitting(true);
    try {
      const res = await api.createRoom({
        title: form.title.trim(),
        roomType: form.roomType,
        price: priceNum,
        location,
        city,
        address: form.address.trim(),
        latitude: form.latitude ?? undefined,
        longitude: form.longitude ?? undefined,
        amenities: form.amenities,
        furnishedDetails: form.furnishedDetails || undefined,
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
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar active={activeRoute} onNavigate={onNavigate} onLogout={onLogout} user={user} />
      <div className="min-w-0 flex-1">
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
            <button
              onClick={() => addSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 sm:flex-none"
            >
              <Plus size={16} />
              <span className="whitespace-nowrap">Add New Property</span>
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Properties</h1>
          <p className="mt-1 text-sm text-gray-500">Manage and monitor all your properties in one place.</p>

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

          <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
            {loading ? (
              <p className="py-8 text-center text-sm text-gray-400">Loading properties...</p>
            ) : pagedRooms.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                {rooms.length === 0 ? "No properties listed yet." : "No properties match your filters."}
              </p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                        <th className="pb-3 font-medium">Property Name</th>
                        <th className="pb-3 font-medium">Type</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Rent / Month</th>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRooms.map((room) => {
                        const appStatus = room.approvalStatus || "APPROVED";
                        return (
                          <tr key={room.id} className="border-t border-gray-100">
                            <td className="py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                                  {room.roomImages?.[0]?.imageUrl ? (
                                    <img src={resolveImageUrl(room.roomImages[0].imageUrl)} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <Building2 size={16} className="text-gray-400" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900">{room.title}</p>
                                    {appStatus !== "APPROVED" && (
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                        appStatus === "PENDING" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                                      }`}>
                                        {appStatus === "PENDING" ? "Pending Approval" : appStatus}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400">{room.location}, {room.city}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-gray-700">{room.roomType.charAt(0) + room.roomType.slice(1).toLowerCase()}</td>
                            <td className="py-3">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[room.status]}`}>
                                {STATUS_LABEL[room.status]}
                              </span>
                            </td>
                            <td className="py-3 text-gray-700">Rs. {room.price.toLocaleString()}</td>
                            <td className="py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => selectRoomToEdit(room.id.toString())}
                                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 hover:text-blue-600"
                                  aria-label="Edit property"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleDelete(room.id)}
                                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                                  aria-label="Delete property"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 md:hidden">
                  {pagedRooms.map((room) => {
                    const appStatus = room.approvalStatus || "APPROVED";
                    return (
                      <div key={room.id} className="rounded-xl border border-gray-100 p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                            {room.roomImages?.[0]?.imageUrl ? (
                              <img src={resolveImageUrl(room.roomImages[0].imageUrl)} alt="" className="h-full w-full object-cover" />
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
                              <div className="flex shrink-0 gap-2">
                                <button
                                  onClick={() => selectRoomToEdit(room.id.toString())}
                                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 hover:text-blue-600"
                                  aria-label="Edit property"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => handleDelete(room.id)}
                                  className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                                  aria-label="Delete property"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-gray-500">{room.roomType.charAt(0) + room.roomType.slice(1).toLowerCase()}</span>
                              <span className={`rounded-full px-2 py-0.5 font-semibold ${
                                appStatus === "PENDING"
                                  ? "bg-amber-100 text-amber-800"
                                  : appStatus === "APPROVED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}>
                                {appStatus === "PENDING" ? "Pending Approval" : appStatus}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[room.status]}`}>{STATUS_LABEL[room.status]}</span>
                              <span className="ml-auto font-medium text-gray-900">Rs. {room.price.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
          <div ref={editSectionRef} className="mb-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
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

                <div className="space-y-4">
                  <PropertyLocationPicker
                    address={editForm.address}
                    latitude={editForm.latitude}
                    longitude={editForm.longitude}
                    onChangeAddress={(addr) => setEditForm((f) => ({ ...f, address: addr }))}
                    onChangeCoords={(lat, lng) => setEditForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
                  />

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
                  <label className="mb-1 block text-xs font-medium text-gray-600">Included Furnitures &amp; Furnishings</label>
                  <input
                    type="text"
                    value={editForm.furnishedDetails}
                    onChange={(e) => setEditForm((f) => ({ ...f, furnishedDetails: e.target.value }))}
                    placeholder="e.g. Double Bed, Wardrobe, Study Table, Sofa, Dining Table"
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-600">Property Pictures</label>
                  <div className="flex flex-wrap gap-3">
                    {(rooms.find((r) => r.id === editingRoomId)?.roomImages || []).map((img) => (
                      <div key={img.id} className="h-16 w-16 overflow-hidden rounded-lg border border-gray-200">
                        <img src={resolveImageUrl(img.imageUrl)} alt="" className="h-full w-full object-cover" />
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
          <div ref={addSectionRef} className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
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

              <div>
                <PropertyLocationPicker
                  address={form.address}
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onChangeAddress={(addr) => setForm((f) => ({ ...f, address: addr }))}
                  onChangeCoords={(lat, lng) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
                />
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
                <label className="mb-1 block text-xs font-medium text-gray-600">Included Furnitures &amp; Furnishings</label>
                <input
                  type="text"
                  value={form.furnishedDetails}
                  onChange={(e) => setForm((f) => ({ ...f, furnishedDetails: e.target.value }))}
                  placeholder="e.g. Double Bed, Wardrobe, Study Table, Sofa, Dining Table"
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-900"
                />
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
