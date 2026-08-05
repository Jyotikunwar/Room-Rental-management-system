import React from "react";
import type { Room, RecommendationResult } from "../services/api";
import { MapPin, Heart, Sparkles, CheckCircle2 } from "lucide-react";

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
  const primaryImage = room.roomImages && room.roomImages.length > 0
    ? `http://localhost:5000${room.roomImages[0].imageUrl}`
    : "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="room-card glass-card">
      {/* Image Container */}
      <div className="card-image-container" onClick={() => onSelect(room)}>
        <img src={primaryImage} alt={room.title} className="card-image" />
        
        {/* Room Type Badge */}
        <span className="badge badge-purple room-type-badge">
          {room.roomType}
        </span>

        {/* Favorite Button */}
        {onToggleFavorite && (
          <button
            className={`fav-button ${isFavorite ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(room.id);
            }}
          >
            <Heart size={18} fill={isFavorite ? "#ec4899" : "none"} color={isFavorite ? "#ec4899" : "#fff"} />
          </button>
        )}

        {/* Recommendation Score Badge (Phase 4 AI Signal) */}
        {recommendationDetails && (
          <div className="rec-score-overlay">
            <div className="score-pill">
              <Sparkles size={14} className="text-amber" />
              <span>Score: {(recommendationDetails.finalScore * 100).toFixed(0)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="card-body" onClick={() => onSelect(room)}>
        <div className="card-location">
          <MapPin size={14} className="text-cyan" />
          <span>{room.location}, {room.city}</span>
        </div>

        <h3 className="card-title">{room.title}</h3>

        {/* Amenity Pills */}
        <div className="card-amenities">
          {room.roomAmenities && room.roomAmenities.slice(0, 4).map((ra, idx) => (
            <span key={idx} className="amenity-pill">
              <CheckCircle2 size={12} className="text-emerald" />
              {ra.amenity.name}
            </span>
          ))}
          {room.roomAmenities && room.roomAmenities.length > 4 && (
            <span className="amenity-pill more">+{room.roomAmenities.length - 4} more</span>
          )}
        </div>

        {/* Footer: Price & Landlord */}
        <div className="card-footer">
          <div className="price-container">
            <span className="price-val">NPR {room.price.toLocaleString()}</span>
            <span className="price-period">/ month</span>
          </div>

          <button className="btn btn-secondary btn-sm">
            View Details
          </button>
        </div>

        {/* Recommendation Vector Breakdown Details */}
        {recommendationDetails && (
          <div className="vector-breakdown">
            <span>Cosine Sim: <strong>{(recommendationDetails.similarityScore * 100).toFixed(1)}%</strong></span>
            <span>Popularity: <strong>{(recommendationDetails.popularityScore * 100).toFixed(1)}%</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};
