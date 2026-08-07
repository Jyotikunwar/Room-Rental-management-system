import { useEffect, useState } from "react";
import { Heart, MapPin } from "lucide-react";
import { api, type Room } from "../../services/api";

interface FeaturedRoomsProps {
  onViewDetails: (roomId: number) => void;
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
      if (res.success) setRooms((res.rooms || []).slice(0, 4));
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
          <h2 className="text-2xl font-bold text-gray-900">Featured Rooms</h2>
          <p className="mt-1 text-sm text-gray-500">Explore the latest rooms available right now</p>
        </div>
        <a href="#featured-rooms" className="text-sm font-medium text-blue-600 hover:text-blue-700">
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
            <div key={room.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="relative h-40 bg-gray-100">
                {room.roomImages?.[0]?.imageUrl ? (
                  <img
                    src={room.roomImages[0].imageUrl}
                    alt={room.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-400">No photo</div>
                )}
                <button
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-500 hover:text-red-500"
                  aria-label="Save room"
                >
                  <Heart size={14} />
                </button>
                <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-gray-700">
                  Rs. {room.price.toLocaleString()}
                </span>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-gray-900">{room.title}</h3>
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                  <MapPin size={12} />
                  {room.location}, {room.city}
                </p>

                <button
                  onClick={() => onViewDetails(room.id)}
                  className="mt-3 w-full rounded-lg bg-gray-900 py-2 text-xs font-semibold text-white hover:bg-gray-800"
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
