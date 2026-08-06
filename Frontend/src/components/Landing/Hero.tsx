import { useState } from "react";
import { Search, MapPin, Wallet, Home, Calendar, ShieldCheck, BadgeCheck, Zap } from "lucide-react";

interface HeroProps {
  onSearch?: (filters: { location: string; priceRange: string; roomType: string; moveInDate: string }) => void;
  onPostRoom?: () => void;
  onListProperty?: () => void;
}

export default function Hero({ onSearch, onPostRoom, onListProperty }: HeroProps) {
  const [location, setLocation] = useState("");
  const [priceRange, setPriceRange] = useState("Any Price");
  const [roomType, setRoomType] = useState("Any Type");
  const [moveInDate, setMoveInDate] = useState("");

  const handleSearch = () => onSearch?.({ location, priceRange, roomType, moveInDate });

  return (
    <section className="bg-gradient-to-b from-blue-50/60 to-white">
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8 lg:pt-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
          {/* Left: copy */}
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600">
              ★★★★★ Trusted by 1200+ tenants
            </span>

            <h1 className="mt-4 text-3xl font-bold leading-tight text-stone-900 sm:text-4xl lg:text-5xl">
              Find Your Perfect Room <span className="text-blue-600">with Ease</span>
            </h1>

            <p className="mt-4 max-w-md text-sm text-stone-500 sm:text-base">
              Search, compare, and rent verified rooms and flats in Kathmandu Valley — no
              agents, no hassle.
            </p>

            <ul className="mt-5 flex flex-col gap-2 text-sm text-stone-600">
              <li className="flex items-center gap-2">
                <BadgeCheck size={16} className="text-blue-600" /> Verified Landlords
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-600" /> No Hidden Charges
              </li>
              <li className="flex items-center gap-2">
                <Zap size={16} className="text-blue-600" /> Instant Booking Confirmed
              </li>
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={onPostRoom}
                className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
              >
                Find a Room
              </button>
              <button
                onClick={onListProperty}
                className="rounded-lg border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                List My Property
              </button>
            </div>
          </div>

          {/* Right: image collage */}
          <div className="grid grid-cols-3 grid-rows-2 gap-3">
            <img
              src="/images/rooms/Room1.png"
              alt="Modern living room"
              className="col-span-2 row-span-2 h-64 w-full rounded-2xl object-cover sm:h-80"
            />
            <img
              src="/images/rooms/Room2.png"
              alt="Bright bedroom"
              className="h-full w-full rounded-2xl object-cover"
            />
            <img
              src="/images/rooms/Room3.png"
              alt="Cozy kitchen"
              className="h-full w-full rounded-2xl object-cover"
            />
          </div>
        </div>

        {/* Search bar */}
        <div className="relative z-10 mt-8 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:mt-10">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto]">
            <SearchField icon={<MapPin size={15} />} label="Location">
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City or neighborhood"
                className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
            </SearchField>

            <SearchField icon={<Wallet size={15} />} label="Price Range">
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full bg-transparent text-sm text-stone-700 outline-none"
              >
                <option>Any Price</option>
                <option>Under Rs. 10,000</option>
                <option>Rs. 10,000 – 20,000</option>
                <option>Rs. 20,000+</option>
              </select>
            </SearchField>

            <SearchField icon={<Home size={15} />} label="Room Type">
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full bg-transparent text-sm text-stone-700 outline-none"
              >
                <option>Any Type</option>
                <option>Single Room</option>
                <option>Flat</option>
                <option>1 BHK</option>
                <option>Shared</option>
              </select>
            </SearchField>

            <SearchField icon={<Calendar size={15} />} label="Move-in Date">
              <input
                type="date"
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                className="w-full bg-transparent text-sm text-stone-700 outline-none"
              />
            </SearchField>

            <button
              onClick={handleSearch}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-500"
            >
              <Search size={15} />
              Search
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SearchField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-stone-100 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-stone-400">
        {icon}
        {label}
      </p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
