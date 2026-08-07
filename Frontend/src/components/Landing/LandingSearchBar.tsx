import { useState } from "react";
import { MapPin, Search } from "lucide-react";

export interface LandingSearchValues {
  location: string;
  budget: string;
  roomType: string;
  timeframe: string;
}

interface LandingSearchBarProps {
  onSearch: (values: LandingSearchValues) => void;
}

export default function LandingSearchBar({ onSearch }: LandingSearchBarProps) {
  const [values, setValues] = useState<LandingSearchValues>({
    location: "",
    budget: "",
    roomType: "",
    timeframe: "",
  });

  function update<K extends keyof LandingSearchValues>(key: K, value: LandingSearchValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={values.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="City or neighborhood"
            className="h-11 w-full rounded-xl border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-gray-900"
          />
        </div>

        <select
          value={values.budget}
          onChange={(e) => update("budget", e.target.value)}
          className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-600 outline-none focus:border-gray-900"
        >
          <option value="">Any Budget</option>
          <option value="0-5000">Under Rs. 5,000</option>
          <option value="5000-10000">Rs. 5,000 – 10,000</option>
          <option value="10000-20000">Rs. 10,000 – 20,000</option>
          <option value="20000+">Rs. 20,000+</option>
        </select>

        <select
          value={values.roomType}
          onChange={(e) => update("roomType", e.target.value)}
          className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-600 outline-none focus:border-gray-900"
        >
          <option value="">Any Type</option>
          <option value="SINGLE">Single Room</option>
          <option value="DOUBLE">Double Room</option>
          <option value="FLAT">Flat</option>
          <option value="APARTMENT">Apartment</option>
        </select>

        <button
          onClick={() => onSearch(values)}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Search size={16} />
          Search
        </button>
      </div>
    </div>
  );
}
