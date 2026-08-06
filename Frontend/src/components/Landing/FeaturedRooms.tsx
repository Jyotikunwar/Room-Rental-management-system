import { MapPin, Star, BedDouble, Bath } from "lucide-react";

interface FeaturedRoom {
  id: number;
  title: string;
  area: string;
  price: number;
  rating: number;
  beds: number;
  baths: number;
  badge?: string;
  img: string;
}

const FEATURED_ROOMS: FeaturedRoom[] = [
  {
    id: 1, title: "Cozy Single Room", area: "Thamel, Kathmandu", price: 8500,
    rating: 4.8, beds: 1, baths: 1, badge: "New", img: "/images/rooms/room6.png",
  },
  {
    id: 2, title: "Modern 1BHK Flat", area: "Lazimpat, Kathmandu", price: 15000,
    rating: 4.6, beds: 1, baths: 1, img: "/images/rooms/room4.png",
  },
  {
    id: 3, title: "Shared Apartment", area: "Baneshwor, Kathmandu", price: 6000,
    rating: 4.5, beds: 2, baths: 1, badge: "Popular", img: "/images/rooms/room5.png",
  },
  {
    id: 4, title: "Budget Room", area: "Kalanki, Kathmandu", price: 5000,
    rating: 4.3, beds: 1, baths: 1, img: "/images/rooms/Room1.png",
  },
];

interface FeaturedRoomsProps {
  onViewDetails?: (roomId: number) => void;
  onSeeAll?: () => void;
}

export default function FeaturedRooms({ onViewDetails, onSeeAll }: FeaturedRoomsProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">Featured Rooms</h2>
          <p className="mt-1 text-sm text-stone-500">Explore the latest rooms and apartments available right now.</p>
        </div>
        <button onClick={onSeeAll} className="text-sm font-medium text-blue-600 hover:underline">
          View all rooms
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURED_ROOMS.map((room) => (
          <div key={room.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <div className="relative h-40 w-full">
              <img src={room.img} alt={room.title} className="h-full w-full object-cover" />
              {room.badge && (
                <span className="absolute left-2 top-2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {room.badge}
                </span>
              )}
              <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-stone-700">
                <Star size={10} className="fill-amber-400 text-amber-400" /> {room.rating}
              </span>
            </div>

            <div className="p-3.5">
              <p className="text-sm font-semibold text-blue-700">Rs. {room.price.toLocaleString()}<span className="text-xs font-normal text-stone-400">/mo</span></p>
              <h3 className="mt-1 text-sm font-semibold text-stone-900">{room.title}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
                <MapPin size={11} /> {room.area}
              </p>

              <div className="mt-2 flex items-center gap-3 text-xs text-stone-400">
                <span className="flex items-center gap-1">
                  <BedDouble size={12} /> {room.beds}
                </span>
                <span className="flex items-center gap-1">
                  <Bath size={12} /> {room.baths}
                </span>
              </div>

              <button
                onClick={() => onViewDetails?.(room.id)}
                className="mt-3 w-full rounded-lg bg-stone-900 py-2 text-xs font-medium text-white hover:bg-stone-800"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
