import React from "react";
import type { RecommendationResult, Room } from "../services/api";
import { RoomCard } from "./RoomCard";
import { Brain, Cpu } from "lucide-react";

interface RecommendationSectionProps {
  recommendations: RecommendationResult[];
  onSelectRoom: (room: Room) => void;
  onToggleFavorite?: (roomId: number) => void;
  favoriteIds?: number[];
}

export const RecommendationSection: React.FC<RecommendationSectionProps> = ({
  recommendations,
  onSelectRoom,
  onToggleFavorite,
  favoriteIds = [],
}) => {
  if (recommendations.length === 0) return null;

  return (
    <section className="recommendation-section glass-panel">
      <div className="section-header">
        <div className="header-left">
          <div className="icon-badge">
            <Brain size={24} className="text-amber" />
          </div>
          <div>
            <h2 className="section-title">
              AI Hybrid <span className="gradient-text">Recommendations</span>
            </h2>
            <p className="section-desc">
              Scored using 70% Cosine Similarity feature vectorization + 30% tenant engagement signals.
            </p>
          </div>
        </div>

        <div className="formula-badge">
          <Cpu size={16} />
          <span>FinalScore = (0.7 × CosineSim) + (0.3 × Popularity)</span>
        </div>
      </div>

      {/* Grid of AI Recommended Rooms */}
      <div className="recommendations-grid">
        {recommendations.map((rec) => (
          <RoomCard
            key={rec.room.id}
            room={rec.room}
            recommendationDetails={rec}
            onSelect={onSelectRoom}
            onToggleFavorite={onToggleFavorite}
            isFavorite={favoriteIds.includes(rec.room.id)}
          />
        ))}
      </div>
    </section>
  );
};
