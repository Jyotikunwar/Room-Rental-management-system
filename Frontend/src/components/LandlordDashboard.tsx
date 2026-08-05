import React, { useState, useEffect } from "react";
import type { Room, Inquiry } from "../services/api";
import { api } from "../services/api";
import { PlusCircle, Building, MessageSquare, Image, User, MapPin } from "lucide-react";

interface LandlordDashboardProps {
  onOpenCreateRoom: () => void;
}

export const LandlordDashboard: React.FC<LandlordDashboardProps> = ({ onOpenCreateRoom }) => {
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"rooms" | "inquiries">("rooms");

  // Upload image modal state
  const [selectedRoomIdForUpload, setSelectedRoomIdForUpload] = useState<number | null>(null);
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    fetchMyRooms();
    fetchInquiries();
  }, []);

  const fetchMyRooms = async () => {
    try {
      const data = await api.getMyRooms();
      if (data.success) {
        setMyRooms(data.rooms || []);
      }
    } catch (e) {
      console.error("Failed to fetch landlord rooms:", e);
    }
  };

  const fetchInquiries = async () => {
    try {
      const data = await api.getReceivedInquiries();
      if (data.success) {
        setInquiries(data.inquiries || []);
      }
    } catch (e) {
      console.error("Failed to fetch received inquiries:", e);
    }
  };

  const handleImageUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomIdForUpload || !imageFiles || imageFiles.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < imageFiles.length; i++) {
      formData.append("images", imageFiles[i]);
    }

    try {
      const res = await api.uploadRoomImages(selectedRoomIdForUpload, formData);
      setUploadStatus({ success: res.success, message: res.message });
      if (res.success) {
        fetchMyRooms();
        setTimeout(() => setSelectedRoomIdForUpload(null), 1500);
      }
    } catch (e) {
      setUploadStatus({ success: false, message: "Upload failed" });
    }
  };

  return (
    <div className="dashboard-container glass-panel">
      <div className="dashboard-header">
        <div>
          <span className="badge badge-emerald">Landlord Workspace</span>
          <h1 className="dashboard-title">Listing & Inquiry Studio</h1>
        </div>

        <button className="btn btn-primary" onClick={onOpenCreateRoom}>
          <PlusCircle size={18} />
          <span>Add New Room Listing</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="sub-tabs">
        <button
          className={`sub-tab ${activeSubTab === "rooms" ? "active" : ""}`}
          onClick={() => setActiveSubTab("rooms")}
        >
          <Building size={16} />
          <span>My Room Listings ({myRooms.length})</span>
        </button>

        <button
          className={`sub-tab ${activeSubTab === "inquiries" ? "active" : ""}`}
          onClick={() => setActiveSubTab("inquiries")}
        >
          <MessageSquare size={16} />
          <span>Received Inquiries ({inquiries.length})</span>
        </button>
      </div>

      {/* Room Listings View */}
      {activeSubTab === "rooms" && (
        <div className="landlord-rooms-grid">
          {myRooms.length === 0 ? (
            <div className="empty-state glass-card">
              <Building size={48} className="text-muted" />
              <h3>No listings created yet</h3>
              <p>Click "Add New Room Listing" to create your first rental listing.</p>
            </div>
          ) : (
            myRooms.map((room) => (
              <div key={room.id} className="landlord-room-card glass-card">
                <div className="room-card-header">
                  <div>
                    <span className="badge badge-purple">{room.roomType}</span>
                    <h3>{room.title}</h3>
                    <p><MapPin size={14} /> {room.location}, {room.city}</p>
                  </div>
                  <span className="price-tag">NPR {room.price.toLocaleString()}</span>
                </div>

                <div className="room-card-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedRoomIdForUpload(room.id)}
                  >
                    <Image size={16} />
                    <span>Upload Images ({room.roomImages?.length || 0})</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Received Inquiries View */}
      {activeSubTab === "inquiries" && (
        <div className="inquiries-list">
          {inquiries.length === 0 ? (
            <div className="empty-state glass-card">
              <MessageSquare size={48} className="text-muted" />
              <h3>No inquiries received yet</h3>
              <p>Messages sent by interested tenants will appear here.</p>
            </div>
          ) : (
            inquiries.map((inquiry) => (
              <div key={inquiry.id} className="inquiry-item glass-card">
                <div className="inquiry-sender">
                  <User size={20} className="text-cyan" />
                  <div>
                    <h4>{inquiry.sender?.fullName}</h4>
                    <p>{inquiry.sender?.email} • {inquiry.sender?.phone || "No phone"}</p>
                  </div>
                </div>

                <div className="inquiry-content">
                  <span className="badge badge-indigo">Room: {inquiry.room?.title}</span>
                  <p className="message-text">"{inquiry.message}"</p>
                  <span className="date-text">{new Date(inquiry.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Upload Image Modal */}
      {selectedRoomIdForUpload && (
        <div className="modal-backdrop" onClick={() => setSelectedRoomIdForUpload(null)}>
          <div className="modal-content glass-panel upload-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Upload Room Images</h3>
            {uploadStatus && (
              <div className={`status-msg ${uploadStatus.success ? "success" : "error"}`}>
                {uploadStatus.message}
              </div>
            )}
            <form onSubmit={handleImageUpload}>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setImageFiles(e.target.files)}
                className="input-field"
                required
              />
              <div className="modal-form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedRoomIdForUpload(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Upload Images
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
