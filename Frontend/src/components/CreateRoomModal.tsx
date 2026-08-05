import React, { useState } from "react";
import { api } from "../services/api";
import { X, PlusCircle } from "lucide-react";

interface CreateRoomModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AMENITY_OPTIONS = [
  { id: 1, name: "WiFi" },
  { id: 2, name: "Kitchen" },
  { id: 3, name: "Furnished" },
  { id: 4, name: "Balcony" },
  { id: 5, name: "Water" },
  { id: 6, name: "Air Conditioner" },
  { id: 7, name: "Parking" },
  { id: 8, name: "Attached Bathroom" },
];

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ onClose, onSuccess }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("Kathmandu");
  const [location, setLocation] = useState("");
  const [roomType, setRoomType] = useState<"SINGLE" | "DOUBLE" | "FLAT" | "APARTMENT">("SINGLE");
  const [price, setPrice] = useState("");
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<number[]>([]);
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const toggleAmenity = (id: number) => {
    setSelectedAmenityIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    try {
      const res = await api.createRoom({
        title,
        description,
        city,
        location,
        roomType,
        price: Number(price),
        amenityIds: selectedAmenityIds,
      });

      setStatus({ success: res.success, message: res.message });
      if (res.success) {
        onSuccess();
        setTimeout(onClose, 1000);
      }
    } catch (e) {
      setStatus({ success: false, message: "Failed to create room listing" });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel create-room-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="auth-header">
          <span className="badge badge-emerald">Landlord Action</span>
          <h2>List a New Room Rental</h2>
          <p>Provide room details and amenity feature flags for recommendation vectorization.</p>
        </div>

        {status && (
          <div className={`status-msg ${status.success ? "success" : "error"}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="create-room-form">
          <input
            type="text"
            placeholder="Listing Title (e.g. Modern Studio in Baneshwor)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            required
          />

          <div className="form-row">
            <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field select-field">
              <option value="Kathmandu">Kathmandu</option>
              <option value="Lalitpur">Lalitpur</option>
              <option value="Bhaktapur">Bhaktapur</option>
              <option value="Pokhara">Pokhara</option>
            </select>

            <input
              type="text"
              placeholder="Location Area (e.g. Baneshwor)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div className="form-row">
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value as any)}
              className="input-field select-field"
            >
              <option value="SINGLE">Single Room</option>
              <option value="DOUBLE">Double Room</option>
              <option value="FLAT">Flat</option>
              <option value="APARTMENT">Apartment</option>
            </select>

            <input
              type="number"
              placeholder="Monthly Rent (NPR)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <textarea
            placeholder="Room Description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field textarea-field"
            rows={3}
          />

          <div className="amenity-selection">
            <label className="section-label">Included Amenities (Vector Features):</label>
            <div className="amenity-checkbox-grid">
              {AMENITY_OPTIONS.map((a) => (
                <label
                  key={a.id}
                  className={`amenity-chip ${selectedAmenityIds.includes(a.id) ? "active" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAmenityIds.includes(a.id)}
                    onChange={() => toggleAmenity(a.id)}
                    hidden
                  />
                  <span>{a.name}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full">
            <PlusCircle size={18} />
            <span>Create Room Listing</span>
          </button>
        </form>
      </div>
    </div>
  );
};
