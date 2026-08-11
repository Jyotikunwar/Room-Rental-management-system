import React from "react";
import { getImageUrl, type Room, type RecommendationResult } from "../services/api";
import { MapPin, Heart, Sparkles, CheckCircle2, Navigation } from "lucide-react";
import { formatDistance } from "../utils/haversine";

interface RoomCardProps {
  room: Room;
  recommendationDetails?: RecommendationResult;
  onSelect: (room: Room) => void;
  onToggleFavorite?: (roomId: number) => void;
  isFavorite?: boolean;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  recommendationDetails,
  onSelect,
  onToggleFavorite,
  isFavorite = false,
}) => {
  const primaryImage =
    room.roomImages && room.roomImages.length > 0
      ? getImageUrl(room.roomImages[0].imageUrl) ||
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
      : "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80";

  const simScore = recommendationDetails
    ? recommendationDetails.similarityScore
    : room.similarityScore;

  const popScore = recommendationDetails
    ? recommendationDetails.popularityScore
    : room.popularityScore;

  const finalScore = recommendationDetails
    ? recommendationDetails.finalScore
    : room.finalScore;

  return (
    <div className="room-card glass-card relative overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* Image Container */}
      <div className="card-image-container relative h-48 w-full cursor-pointer bg-stone-100" onClick={() => onSelect(room)}>
        <img src={primaryImage} alt={room.title} className="h-full w-full object-cover" />

        {/* Room Type Badge */}
        <span className="room-type-badge absolute left-3 top-3 rounded-md bg-stone-900/80 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white backdrop-blur-sm">
          {room.roomType}
        </span>

        {/* Haversine Distance Badge */}
        {room.distance !== undefined && room.distance !== null && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-md bg-blue-600/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm">
            <Navigation size={11} className="rotate-45" />
            {formatDistance(room.distance)} away
          </span>
        )}

        {/* Favorite Button */}
        {onToggleFavorite && (
          <button
            className={`fav-button absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-transform active:scale-95 ${
              isFavorite ? "text-pink-600" : "text-stone-500 hover:text-stone-800"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(room.id);
            }}
          >
            <Heart size={16} fill={isFavorite ? "#ec4899" : "none"} color={isFavorite ? "#ec4899" : "currentColor"} />
          </button>
        )}

        {/* Recommendation Score Overlay Badge */}
        {finalScore !== undefined && finalScore > 0 && (
          <div className="rec-score-overlay absolute right-3 bottom-3">
            <div className="flex items-center gap-1 rounded-md bg-amber-500/90 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm backdrop-blur-sm">
              <Sparkles size={12} />
              <span>{(finalScore * 100).toFixed(0)}% Match</span>
            </div>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="card-body cursor-pointer p-4" onClick={() => onSelect(room)}>
        <div className="card-location mb-1 flex items-center gap-1 text-xs text-stone-500">
          <MapPin size={13} className="text-blue-600" />
          <span>
            {room.location}, {room.city}
          </span>
        </div>

        <h3 className="card-title mb-2 text-base font-bold text-stone-900 line-clamp-1">{room.title}</h3>

        {/* Amenity Pills */}
        <div className="card-amenities mb-3 flex flex-wrap gap-1.5">
          {room.roomAmenities &&
            room.roomAmenities.slice(0, 4).map((ra, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                <CheckCircle2 size={11} className="text-emerald-600" />
                {ra.amenity.name}
              </span>
            ))}
          {room.roomAmenities && room.roomAmenities.length > 4 && (
            <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
              +{room.roomAmenities.length - 4} more
            </span>
          )}
        </div>

        {/* Vector breakdown (Cosine Sim & Popularity) */}
        {(simScore !== undefined || popScore !== undefined) && (
          <div className="mb-3 flex items-center justify-between border-t border-b border-stone-100 py-1.5 text-[11px] text-stone-500">
            {simScore !== undefined && simScore > 0 ? (
              <span>Cosine Match: <strong className="text-blue-600">{(simScore * 100).toFixed(0)}%</strong></span>
            ) : (
              <span className="text-stone-400">Popularity Ranked</span>
            )}
            {popScore !== undefined && (
              <span>Popularity: <strong className="text-amber-600">{(popScore * 100).toFixed(0)}%</strong></span>
            )}
          </div>
        )}

        {/* Footer: Price & View Details */}
        <div className="card-footer flex items-center justify-between">
          <div className="price-container">
            <span className="text-base font-bold text-stone-900">NPR {room.price.toLocaleString()}</span>
            <span className="text-xs text-stone-500"> / mo</span>
          </div>

          <button className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 transition-colors">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};
