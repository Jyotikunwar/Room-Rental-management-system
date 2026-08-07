import { CheckCircle2 } from "lucide-react";
import LandingSearchBar from "./LandingSearchBar";

interface HeroProps {
  onSearch: () => void;
  onFindRoomClick: () => void;
  onListPropertyClick: () => void;
}

const CHECKLIST = ["Verified Landlords", "No Hidden Charges", "Instant Booking Support"];

export default function Hero({ onSearch, onFindRoomClick, onListPropertyClick }: HeroProps) {
  return (
    <section id="home" className="bg-gradient-to-b from-blue-50/60 to-white py-14">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          {/* Left: copy */}
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
              ★★★★★ Trusted by 1000+ renters
            </span>

            <h1 className="mt-4 text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
              Find Your Perfect Room <span className="text-blue-600">with Ease</span>
            </h1>

            <p className="mt-4 max-w-md text-gray-500">
              Search, compare, and rent rooms or flats from trusted landlords — all in one
              place.
            </p>

            <ul className="mt-5 space-y-2">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 size={16} className="text-blue-600" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={onFindRoomClick}
                className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Find Room
              </button>
              <button
                onClick={onListPropertyClick}
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                List my Property
              </button>
            </div>
          </div>

          {/* Right: image collage */}
          <div className="grid grid-cols-3 grid-rows-2 gap-3">
            <div className="col-span-2 row-span-2 overflow-hidden rounded-2xl bg-gray-100">
              <img
                src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
                alt="Bright modern room"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-2xl bg-gray-100">
              <img
                src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80"
                alt="Cozy interior"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-2xl bg-gray-100">
              <img
                src="https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=400&q=80"
                alt="Living room"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="mt-10">
          <LandingSearchBar onSearch={onSearch} />
        </div>
      </div>
    </section>
  );
}
