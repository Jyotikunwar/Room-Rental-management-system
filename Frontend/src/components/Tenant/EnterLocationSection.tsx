import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapPin, Loader2, Navigation, Check, Search, X,
  Building2, GraduationCap, HeartPulse, UtensilsCrossed,
  Landmark, Store, MapPinned,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  getUserLocation,
  setUserLocation,
  PRESET_LOCATIONS,
  type UserCoordinates,
} from "../../utils/haversine";
import {
  searchPlaces,
  reverseGeocode,
  type PlaceSearchResult,
} from "../../utils/locationSearch";

const DEFAULT_CENTER: [number, number] = [27.6938, 85.3331];

const SEARCH_EXAMPLES = [
  "Grande International Hospital",
  "Kapurdhara Children's Park",
  "Bhatbhateni Supermarket",
  "Norvic Hospital",
  "St. Xavier's School",
];

const CATEGORY_ICON: Record<string, typeof Building2> = {
  Hospital: HeartPulse,
  Clinic: HeartPulse,
  Pharmacy: HeartPulse,
  School: GraduationCap,
  University: GraduationCap,
  College: GraduationCap,
  Library: GraduationCap,
  Restaurant: UtensilsCrossed,
  Cafe: UtensilsCrossed,
  Bank: Landmark,
  ATM: Landmark,
  Supermarket: Store,
  Mall: Store,
  Market: Store,
  Shop: Store,
  Business: Building2,
  Office: Building2,
  Place: MapPinned,
  Address: MapPinned,
  Area: MapPinned,
};

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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

function ResultIcon({ category }: { category: string }) {
  const Icon = CATEGORY_ICON[category] ?? MapPinned;
  return <Icon size={14} className="shrink-0 text-blue-600" />;
}

function SearchResultsList({
  results,
  selectedId,
  onSelect,
  title,
}: {
  results: PlaceSearchResult[];
  selectedId: string | null;
  onSelect: (r: PlaceSearchResult) => void;
  title?: string;
}) {
  if (results.length === 0) return null;

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
      {title && (
        <p className="border-b border-stone-200 px-3 py-2 text-[11px] font-medium text-stone-500">
          {title}
        </p>
      )}
      <ul className="max-h-48 overflow-y-auto">
        {results.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onSelect(r)}
              className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white ${
                selectedId === r.id ? "bg-blue-50" : ""
              }`}
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                <ResultIcon category={r.category} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-stone-800">{r.name}</span>
                  <span className="shrink-0 rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                    {r.category}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-stone-500">{r.subtitle}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function EnterLocationSection() {
  const stored = getUserLocation();
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(stored?.label ?? "");
  const [coords, setCoords] = useState<[number, number]>(() =>
    stored ? [stored.latitude, stored.longitude] : [...DEFAULT_CENTER]
  );
  const [mapZoom, setMapZoom] = useState(15);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(
    PRESET_LOCATIONS.find((p) => p.label === stored?.label)?.label ?? ""
  );
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<PlaceSearchResult[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const applyPlace = useCallback((place: PlaceSearchResult) => {
    setQuery(place.label);
    setCoords([place.lat, place.lng]);
    setMapZoom(place.category === "Address" || place.category === "Area" ? 15 : 17);
    setSelectedPreset("");
    setSelectedResultId(place.id);
    setSearchResults([]);
    setSuggestions([]);
    setShowSuggestions(false);
    setMapError(null);
  }, []);

  const updateCoords = useCallback(async (lat: number, lng: number, updateLabel = true) => {
    const roundedLat = Math.round(lat * 100000) / 100000;
    const roundedLng = Math.round(lng * 100000) / 100000;
    setCoords([roundedLat, roundedLng]);
    setSelectedPreset("");
    setSelectedResultId(null);
    setSearchResults([]);
    setShowSuggestions(false);

    if (!updateLabel) return;

    try {
      const label = await reverseGeocode(roundedLat, roundedLng);
      setQuery(label ?? `Custom (${roundedLat.toFixed(4)}, ${roundedLng.toFixed(4)})`);
    } catch {
      setQuery(`Custom (${roundedLat.toFixed(4)}, ${roundedLng.toFixed(4)})`);
    }
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
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
  }, [query, coords, showSuggestions]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setSearching(true);
    setMapError(null);
    setShowSuggestions(false);

    try {
      const results = await searchPlaces(trimmed, { near: coords, includeNominatim: true });
      if (results.length === 0) {
        setSearchResults([]);
        setMapError("No matches found. Try a hospital, school, shop name, or street address.");
        return;
      }

      setSearchResults(results);
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

    setQuery(found.label);
    setCoords([found.lat, found.lng]);
    setMapZoom(14);
    setMapError(null);
    setSearchResults([]);
    setSelectedResultId(null);
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
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lng = Math.round(pos.coords.longitude * 10000) / 10000;
        setCoords([lat, lng]);
        setMapZoom(16);
        setSelectedPreset("");
        setSelectedResultId(null);
        setSearchResults([]);
        try {
          const label = await reverseGeocode(lat, lng);
          setQuery(label ?? `My position (${lat}, ${lng})`);
        } catch {
          setQuery(`My position (${lat}, ${lng})`);
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

  const handleSave = () => {
    setSaving(true);
    const payload: UserCoordinates = {
      latitude: coords[0],
      longitude: coords[1],
      label: query.trim() || `Custom (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})`,
    };
    setUserLocation(payload);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tryExample = (example: string) => {
    setQuery(example);
    setShowSuggestions(true);
  };

  return (
    <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <MapPin size={16} className="text-blue-600" />
        <h3 className="text-sm font-semibold">Enter Location</h3>
      </div>

      <p className="mb-3 text-xs text-stone-500">
        Search by hospital, school, company, shop, or street name. Pick a result, then click or drag
        the pin on the map to fine-tune. Uses OpenStreetMap — no API key or setup required.
      </p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {SEARCH_EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => tryExample(ex)}
            className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] font-medium text-stone-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            {ex}
          </button>
        ))}
      </div>

      {mapError && (
        <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          {mapError}
        </div>
      )}

      <div className="mb-3">
        <label className="mb-1 block text-[11px] font-medium text-stone-500">Quick preset</label>
        <select
          value={selectedPreset}
          onChange={handlePresetChange}
          className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none focus:border-blue-500"
        >
          <option value="">— Choose a neighborhood —</option>
          {PRESET_LOCATIONS.map((p) => (
            <option key={p.label} value={p.label}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="relative z-[1000]">
        <form onSubmit={handleSearch} className="mb-1 flex flex-col gap-2 sm:flex-row">
          <div ref={searchWrapRef} className="relative z-[1001] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
                setSelectedResultId(null);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Hospital, school, business, shop, or address..."
              className="w-full rounded-lg border border-stone-200 py-2 pl-9 pr-9 text-sm text-stone-800 outline-none focus:border-blue-500"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSuggestions([]);
                  setSearchResults([]);
                  setSelectedResultId(null);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              >
                <X size={14} />
              </button>
            )}

            {showSuggestions && query.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full z-[1002] mt-1 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
                {suggesting ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-xs text-stone-500">
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
                          className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-stone-50"
                        >
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                            <ResultIcon category={r.category} />
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium text-stone-800">{r.name}</span>
                              <span className="shrink-0 text-[10px] text-stone-400">{r.category}</span>
                            </span>
                            <span className="block truncate text-[11px] text-stone-500">{r.subtitle}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-3 text-xs text-stone-400">No suggestions — press Search for a wider lookup.</p>
                )}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {searching ? <Loader2 size={12} className="animate-spin" /> : null}
            Search
          </button>
        </form>

        {searchResults.length > 1 && (
          <SearchResultsList
            results={searchResults}
            selectedId={selectedResultId}
            onSelect={applyPlace}
            title={`${searchResults.length} matches — tap to show on map`}
          />
        )}
      </div>

      <div className="relative z-0 mb-3 mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleUseGps}
          disabled={locating}
          className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
        >
          {locating ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
          Use my current location
        </button>
        <span className="text-[11px] text-stone-400">
          {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
        </span>
      </div>

      <div className="relative z-0 mb-3 overflow-hidden rounded-xl border border-stone-200">
        <div className="h-72 w-full sm:h-80">
          <MapContainer center={coords} zoom={mapZoom} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapViewSync center={coords} zoom={mapZoom} />
            <MapClickHandler onPick={(lat, lng) => updateCoords(lat, lng)} />
            <Marker
              position={coords}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const pos = e.target.getLatLng();
                  updateCoords(pos.lat, pos.lng);
                },
              }}
            />
          </MapContainer>
        </div>
      </div>

      <p className="mb-3 text-[11px] text-stone-400">
        Tip: search a place name, pick the correct result, then click or drag the pin to fine-tune.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-60"
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          Save Location
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
            <Check size={13} /> Location saved
          </span>
        )}
      </div>
    </section>
  );
}
