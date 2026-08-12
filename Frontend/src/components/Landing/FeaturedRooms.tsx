import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { api, getImageUrl, type Room } from "../../services/api";

interface FeaturedRoomsProps {
  onViewDetails: (room: Room) => void;
}

export default function FeaturedRooms({ onViewDetails }: FeaturedRoomsProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    setLoading(true);
    try {
      const res = await api.getRooms({ status: "AVAILABLE" });
      if (res && (res.success || Array.isArray(res))) {
        const list = Array.isArray(res) ? res : res.rooms || res.data || [];
        setRooms(list.slice(0, 8));
      }
    } catch (e) {
      console.error("Failed to load featured rooms:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="featured-rooms" className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Featured Rooms & Apartments</h2>
          <p className="mt-1 text-sm text-gray-500">Explore top available rooms across Kathmandu, Lalitpur, and Pokhara</p>
        </div>
        <a href="#home" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
          View all rooms →
        </a>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-gray-100" />
          ))
        ) : rooms.length === 0 ? (
          <p className="col-span-full py-10 text-center text-gray-400">No rooms listed yet.</p>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => onViewDetails(room)}
              className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-200/80 bg-white transition hover:shadow-xl hover:border-blue-300"
            >
              <div className="relative h-44 bg-gray-100 overflow-hidden">
                {room.roomImages?.[0]?.imageUrl ? (
                  <img
                    src={getImageUrl(room.roomImages[0].imageUrl)}
                    alt={room.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-400">No photo</div>
                )}
                <span className="absolute left-2.5 top-2.5 rounded-full bg-slate-900/85 backdrop-blur-xs px-2.5 py-0.5 text-xs font-semibold text-white">
                  Rs. {room.price.toLocaleString()}/mo
                </span>
                <span className="absolute right-2.5 top-2.5 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  {room.roomType}
                </span>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{room.title}</h3>
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  <MapPin size={12} className="text-gray-400" />
                  {room.location}, {room.city}
                </p>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(room);
                  }}
                  className="mt-3.5 w-full rounded-xl bg-gray-900 py-2 text-xs font-semibold text-white transition hover:bg-gray-800"
                >
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
