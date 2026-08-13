import React, { useState, useEffect } from "react";
import type { Room, RecommendationResult, User } from "../services/api";
import { api, getImageUrl } from "../services/api";
import { X, MapPin, User as UserIcon, Phone, Star, Send, MessageSquare, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";

interface RoomDetailModalProps {
  room: Room;
  onClose: () => void;
  currentUser: User | null;
  onSelectSimilarRoom: (room: Room) => void;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
  room,
  onClose,
  currentUser,
  onSelectSimilarRoom,
}) => {
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquiryStatus, setInquiryStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [commentInput, setCommentInput] = useState<string>("");
  const [reviewStatus, setReviewStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Similar rooms recommendation state
  const [similarRooms, setSimilarRooms] = useState<RecommendationResult[]>([]);

  useEffect(() => {
    fetchReviews();
    fetchSimilarRooms();
  }, [room.id]);

  const fetchReviews = async () => {
    try {
      const data = await api.getRoomReviews(room.id);
      if (data.success) {
        setReviews(data.reviews || []);
        setAvgRating(data.averageRating || 0);
      }
    } catch (e) {
      console.error("Failed to fetch room reviews:", e);
    }
  };

  const fetchSimilarRooms = async () => {
    try {
      const data = await api.getSimilarRecommendations(room.id);
      if (data.success) {
        setSimilarRooms(data.recommendations || []);
      }
    } catch (e) {
      console.error("Failed to fetch similar recommendations:", e);
    }
  };

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryMessage.trim()) return;

    try {
      const res = await api.sendInquiry(room.id, inquiryMessage);
      setInquiryStatus({ success: res.success, message: res.message });
      if (res.success) {
        setInquiryMessage("");
      }
    } catch (e) {
      setInquiryStatus({ success: false, message: "Failed to send inquiry" });
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createReview(room.id, ratingInput, commentInput);
      setReviewStatus({ success: res.success, message: res.message });
      if (res.success) {
        setCommentInput("");
        fetchReviews(); // Refresh review list
      }
    } catch (e) {
      setReviewStatus({ success: false, message: "Failed to submit review" });
    }
  };

  const primaryImage =
    room.roomImages && room.roomImages.length > 0
      ? getImageUrl(room.roomImages[0].imageUrl) ||
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"
      : "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-body-grid">
          {/* Left Column: Room Details & Images */}
          <div className="modal-main">
            <div className="modal-image-wrapper">
              <img src={primaryImage} alt={room.title} className="modal-hero-image" />
              <span className="badge badge-purple modal-type-badge">{room.roomType}</span>
            </div>

            <div className="modal-header-section">
              <div>
                <div className="modal-location">
                  <MapPin size={16} className="text-cyan" />
                  <span>{room.location}, {room.city}</span>
                </div>
                <h1 className="modal-title">{room.title}</h1>
              </div>

              <div className="modal-price-tag">
                <span className="price-num">NPR {room.price.toLocaleString()}</span>
                <span className="price-sub">/ month</span>
              </div>
            </div>

            {/* Description */}
            {room.description && (
              <div className="modal-description">
                <h3>About This Room</h3>
                <p>{room.description}</p>
              </div>
            )}

            {/* Amenities Grid */}
            <div className="modal-amenities-section">
              <h3>Included Amenities</h3>
              <div className="modal-amenities-grid">
                {room.roomAmenities && room.roomAmenities.map((ra, idx) => (
                  <div key={idx} className="modal-amenity-card glass-card">
                    <CheckCircle2 size={16} className="text-emerald" />
                    <span>{ra.amenity.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Landlord Contact Info */}
            {room.landlord && (
              <div className="landlord-card glass-card">
                <div className="landlord-avatar">
                  <UserIcon size={24} />
                </div>
                <div>
                  <h4 className="landlord-name">{room.landlord.fullName}</h4>
                  <span className="badge badge-emerald">Verified Landlord</span>
                  {room.landlord.phone && (
                    <p className="landlord-phone">
                      <Phone size={14} />
                      <span>{room.landlord.phone}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="reviews-section">
              <div className="reviews-header">
                <h3>Ratings & Reviews ({reviews.length})</h3>
                {reviews.length > 0 && (
                  <div className="avg-rating-badge">
                    <Star size={16} className="text-amber" fill="#f59e0b" />
                    <span>{avgRating.toFixed(1)} / 5.0</span>
                  </div>
                )}
              </div>

              {/* Submit Review Form (if Tenant logged in) */}
              {currentUser?.role === "TENANT" && (
                <form onSubmit={handleSubmitReview} className="review-form glass-card">
                  <h4>Leave a Review</h4>
                  {reviewStatus && (
                    <div className={`status-msg ${reviewStatus.success ? "success" : "error"}`}>
                      {reviewStatus.message}
                    </div>
                  )}

                  <div className="rating-picker">
                    <span>Rating: </span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        className={`star-btn ${star <= ratingInput ? "active" : ""}`}
                        onClick={() => setRatingInput(star)}
                      >
                        <Star size={20} fill={star <= ratingInput ? "#f59e0b" : "none"} color="#f59e0b" />
                      </button>
                    ))}
                  </div>

                  <textarea
                    placeholder="Share your experience staying in this room..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    className="input-field textarea-field"
                    rows={3}
                  />

                  <button type="submit" className="btn btn-secondary btn-sm">
                    Submit Review
                  </button>
                </form>
              )}

              {/* Review List */}
              <div className="reviews-list">
                {reviews.map((rev) => (
                  <div key={rev.id} className="review-card glass-card">
                    <div className="review-meta">
                      <span className="reviewer-name">{rev.user?.fullName || "Tenant"}</span>
                      <div className="stars">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />
                        ))}
                      </div>
                    </div>
                    {rev.comment && <p className="review-comment">{rev.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Send Inquiry & Similar Recommendations */}
          <div className="modal-sidebar">
            {/* Direct Inquiry Form */}
            <div className="inquiry-box glass-panel">
              <h3>
                <MessageSquare className="icon text-cyan" />
                Contact Landlord
              </h3>
              <p className="inquiry-subtitle">Send a direct message inquiry about availability and move-in terms.</p>

              {currentUser ? (
                currentUser.role === "TENANT" ? (
                  <form onSubmit={handleSendInquiry} className="inquiry-form">
                    {inquiryStatus && (
                      <div className={`status-msg ${inquiryStatus.success ? "success" : "error"}`}>
                        {inquiryStatus.message}
                      </div>
                    )}
                    <textarea
                      placeholder="Hi, is this room available for move-in next week?"
                      value={inquiryMessage}
                      onChange={(e) => setInquiryMessage(e.target.value)}
                      className="input-field textarea-field"
                      rows={4}
                      required
                    />
                    <button type="submit" className="btn btn-cyan w-full">
                      <Send size={16} />
                      <span>Send Inquiry</span>
                    </button>
                  </form>
                ) : (
                  <div className="info-box">
                    <AlertCircle size={16} />
                    <span>Inquiries can only be sent by logged-in Tenants.</span>
                  </div>
                )
              ) : (
                <div className="info-box">
                  <span>Sign in as a Tenant to contact this landlord.</span>
                </div>
              )}
            </div>

            {/* Similar Rooms Widget (AI Recommendation) */}
            {similarRooms.length > 0 && (
              <div className="similar-rooms-box">
                <div className="box-title">
                  <Sparkles size={16} className="text-amber" />
                  <h4>Similar Rooms (Cosine Sim)</h4>
                </div>

                <div className="similar-cards-list">
                  {similarRooms.slice(0, 3).map((rec) => (
                    <div
                      key={rec.room.id}
                      className="similar-card glass-card"
                      onClick={() => onSelectSimilarRoom(rec.room)}
                    >
                      <div className="similar-info">
                        <h5>{rec.room.title}</h5>
                        <p>{rec.room.city} • NPR {rec.room.price.toLocaleString()}</p>
                      </div>
                      <span className="badge badge-purple">{(rec.finalScore * 100).toFixed(0)}% Match</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
