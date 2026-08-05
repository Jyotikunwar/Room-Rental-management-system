import React, { useState, useEffect } from "react";
import type { Room } from "../services/api";
import { api } from "../services/api";
import { RoomCard } from "./RoomCard";
import { Heart } from "lucide-react";

interface FavoritesViewProps {
  onSelectRoom: (room: Room) => void;
  onToggleFavorite: (roomId: number) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({ onSelectRoom, onToggleFavorite }) => {
  const [favoriteRooms, setFavoriteRooms] = useState<Room[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const data = await api.getFavorites();
      if (data.success) {
        const rooms = (data.favorites || []).map((f: any) => f.room);
        setFavoriteRooms(rooms);
        setFavoriteIds(rooms.map((r: Room) => r.id));
      }
    } catch (e) {
      console.error("Failed to fetch favorites:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (roomId: number) => {
    await onToggleFavorite(roomId);
    fetchFavorites();
  };

  return (
    <div className="favorites-container glass-panel">
      <div className="section-header">
        <div className="header-left">
          <div className="icon-badge">
            <Heart size={24} className="text-pink" />
          </div>
          <div>
            <h1 className="section-title">My Saved <span className="gradient-text">Favorites</span></h1>
            <p className="section-desc">
              Your favorited listings dynamically feed into your Phase 4 Hybrid Recommendation Vector.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading saved rooms...</div>
      ) : favoriteRooms.length === 0 ? (
        <div className="empty-state glass-card">
          <Heart size={48} className="text-muted" />
          <h3>No favorite rooms saved yet</h3>
          <p>Click the heart icon on any room listing to bookmark it here.</p>
        </div>
      ) : (
        <div className="rooms-grid">
          {favoriteRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onSelect={onSelectRoom}
              onToggleFavorite={handleToggle}
              isFavorite={favoriteIds.includes(room.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
