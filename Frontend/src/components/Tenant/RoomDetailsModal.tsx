// src/components/Tenant/RoomDetailsModal.tsx
import { useState } from "react";
import { Heart, MapPin, Star, X, Phone, Mail } from "lucide-react";
import type { Room } from "../../services/api";
import { resolveImageUrl, avgRating } from "./roomDisplayUtils";

interface RoomDetailsModalProps {
  room: Room;
  isSaved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
  onBookNow: () => void;
}

export default function RoomDetailsModal({
  room,
  isSaved,
  onToggleSave,
  onClose,
  onBookNow,
}: RoomDetailsModalProps) {
  const rating = avgRating(room);
  const images = room.roomImages && room.roomImages.length > 0 ? room.roomImages : [];
  const amenityNames = (room.roomAmenities || []).map((ra) => ra.amenity.name);
  const [activeImage, setActiveImage] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white sm:max-w-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <span className="text-sm font-semibold">Room Details</span>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-700">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto">
          <div className="relative h-56 w-full bg-stone-100 sm:h-72">
            {images.length > 0 ? (
              <img
                src={resolveImageUrl(images[activeImage]?.imageUrl)}
                alt={room.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-stone-400">No images</div>
            )}
            {room.status === "AVAILABLE" && (
              <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                Available Now
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {images.map((img, i) => (
                <button
                  key={img.id ?? i}
                  onClick={() => setActiveImage(i)}
                  className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                    activeImage === i ? "border-blue-600" : "border-transparent"
                  }`}
                >
                  <img src={resolveImageUrl(img.imageUrl)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="p-4">
            <div className="mb-1 flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold">{room.title}</h2>
              {rating !== null && (
                <span className="flex shrink-0 items-center gap-0.5 text-sm text-amber-500">
                  <Star size={14} fill="currentColor" /> {rating}{" "}
                  <span className="text-stone-400">({room.reviews?.length})</span>
                </span>
              )}
            </div>
            <p className="mb-3 flex items-center gap-1 text-sm text-stone-500">
              <MapPin size={13} /> {room.location}, {room.city}
              {(room as any).address ? ` — ${(room as any).address}` : ""}
            </p>
            <p className="mb-4 text-xl font-bold text-blue-700">
              Rs. {room.price.toLocaleString()}/month
              {(room as any).securityDeposit ? (
                <span className="ml-2 text-sm font-normal text-stone-500">
                  + Rs. {(room as any).securityDeposit.toLocaleString()} deposit
                </span>
              ) : null}
            </p>

            {room.description && <p className="mb-4 text-sm text-stone-600">{room.description}</p>}

            {amenityNames.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-stone-500">Amenities</p>
                <div className="flex flex-wrap gap-1.5">
                  {amenityNames.map((a) => (
                    <span key={a} className="rounded-md bg-stone-100 px-2.5 py-1 text-xs text-stone-600">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {room.furnishedDetails && (
              <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50/70 p-3">
                <p className="mb-1 text-xs font-semibold text-stone-700">🛋️ Included Furnishings &amp; Furniture</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {room.furnishedDetails.split(",").map((item, idx) => (
                    <span key={idx} className="rounded-md border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 shadow-2xs">
                      {item.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-stone-500">Nearby Landmarks</p>
              <div className="flex flex-wrap gap-1.5">
                {["College / University", "Hospital / Clinic", "Main Road", "Bus Stop", "Market / Supermarket", "Park / Garden", "Bank / ATM"].map((l) => (
                  <span key={l} className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-100">
                    📍 {l}
                  </span>
                ))}
              </div>
            </div>

            {room.landlord && (
              <div className="mb-4 rounded-xl border border-stone-200 p-3">
                <p className="mb-1 text-xs font-medium text-stone-500">Landlord</p>
                <p className="text-sm font-semibold">{room.landlord.fullName}</p>
                <div className="mt-1 flex flex-col gap-1 text-xs text-stone-500">
                  {room.landlord.phone && (
                    <span className="flex items-center gap-1">
                      <Phone size={11} /> {room.landlord.phone}
                    </span>
                  )}
                  {room.landlord.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={11} /> {room.landlord.email}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-t border-stone-200 p-3">
          <button
            onClick={onToggleSave}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-medium ${
              isSaved ? "border-rose-200 bg-rose-50 text-rose-500" : "border-stone-200 text-stone-600"
            }`}
          >
            <Heart size={15} fill={isSaved ? "currentColor" : "none"} />
          </button>
          <button
            onClick={onBookNow}
            disabled={room.status !== "AVAILABLE"}
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {room.status === "AVAILABLE" ? "Book Now" : "Not Available"}
          </button>
        </div>
      </div>
    </div>
  );
}