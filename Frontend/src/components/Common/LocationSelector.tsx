import React, { useState, useEffect } from "react";
import { MapPin, Navigation, Edit2, Check, X } from "lucide-react";
import {
  getUserLocation,
  setUserLocation,
  PRESET_LOCATIONS,
  type UserCoordinates,
} from "../../utils/haversine";

interface LocationSelectorProps {
  onLocationChange?: (loc: UserCoordinates) => void;
  className?: string;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  onLocationChange,
  className = "",
}) => {
  const [currentLoc, setCurrentLoc] = useState<UserCoordinates | null>(getUserLocation());
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>(
    currentLoc?.label || "Baneshwor, Kathmandu"
  );
  const [customLat, setCustomLat] = useState<string>(
    currentLoc?.latitude ? String(currentLoc.latitude) : "27.6938"
  );
  const [customLng, setCustomLng] = useState<string>(
    currentLoc?.longitude ? String(currentLoc.longitude) : "85.3331"
  );

  useEffect(() => {
    const handleLocChange = (e: Event) => {
      const customEvent = e as CustomEvent<UserCoordinates>;
      if (customEvent.detail) {
        setCurrentLoc(customEvent.detail);
        setSelectedPreset(customEvent.detail.label || "Custom Location");
      }
    };
    window.addEventListener("userLocationChanged", handleLocChange);
    return () => window.removeEventListener("userLocationChanged", handleLocChange);
  }, []);

  const handleSelectPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const label = e.target.value;
    setSelectedPreset(label);

    const found = PRESET_LOCATIONS.find((p) => p.label === label);
    if (found) {
      setCustomLat(String(found.lat));
      setCustomLng(String(found.lng));
      const updated: UserCoordinates = { latitude: found.lat, longitude: found.lng, label: found.label };
      setCurrentLoc(updated);
      setUserLocation(updated);
      if (onLocationChange) onLocationChange(updated);
      setIsEditing(false);
    }
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);

    if (isNaN(lat) || isNaN(lng)) return;

    const updated: UserCoordinates = {
      latitude: lat,
      longitude: lng,
      label: `Custom (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
    };
    setCurrentLoc(updated);
    setUserLocation(updated);
    if (onLocationChange) onLocationChange(updated);
    setIsEditing(false);
  };

  const handleDetectBrowserLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Math.round(pos.coords.latitude * 10000) / 10000;
          const lng = Math.round(pos.coords.longitude * 10000) / 10000;
          setCustomLat(String(lat));
          setCustomLng(String(lng));
          const updated: UserCoordinates = {
            latitude: lat,
            longitude: lng,
            label: `My Position (${lat}, ${lng})`,
          };
          setCurrentLoc(updated);
          setUserLocation(updated);
          if (onLocationChange) onLocationChange(updated);
          setIsEditing(false);
        },
        (err) => {
          alert("Could not retrieve GPS location: " + err.message);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {!isEditing ? (
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-1.5 text-xs text-blue-900 shadow-sm">
          <MapPin size={14} className="shrink-0 text-blue-600" />
          <span className="font-medium text-stone-700">Location:</span>
          <span className="font-semibold text-blue-700">
            {currentLoc?.label || "Baneshwor, Kathmandu"}
          </span>
          <button
            onClick={() => setIsEditing(true)}
            className="ml-1 rounded p-1 text-stone-400 hover:bg-blue-100 hover:text-blue-700"
            title="Change your position for Haversine distance calculations"
          >
            <Edit2 size={12} />
          </button>
        </div>
      ) : (
        <div className="absolute right-0 top-0 z-50 w-72 rounded-xl border border-stone-200 bg-white p-3.5 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-900">Set Your Location</span>
            <button
              onClick={() => setIsEditing(false)}
              className="text-stone-400 hover:text-stone-600"
            >
              <X size={14} />
            </button>
          </div>

          {/* Quick Preset Selector */}
          <div className="mb-3">
            <label className="mb-1 block text-[11px] font-medium text-stone-500">
              Quick Preset Neighborhood
            </label>
            <select
              value={selectedPreset}
              onChange={handleSelectPreset}
              className="w-full rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PRESET_LOCATIONS.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDetectBrowserLocation}
              className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
            >
              <Navigation size={12} />
              Detect via GPS
            </button>
          </div>

          {/* Manual Lat/Lng Form */}
          <form onSubmit={handleSaveCustom} className="space-y-2 border-t border-stone-100 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-stone-500">Latitude</label>
                <input
                  type="text"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  className="w-full rounded border border-stone-200 px-2 py-1 text-xs"
                  placeholder="27.6938"
                />
              </div>
              <div>
                <label className="block text-[10px] text-stone-500">Longitude</label>
                <input
                  type="text"
                  value={customLng}
                  onChange={(e) => setCustomLng(e.target.value)}
                  className="w-full rounded border border-stone-200 px-2 py-1 text-xs"
                  placeholder="85.3331"
                />
              </div>
            </div>
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded px-2.5 py-1 text-xs text-stone-500 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
              >
                <Check size={12} />
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
