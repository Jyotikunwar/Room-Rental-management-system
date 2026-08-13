import type { Room } from "../../services/api";
import { getImageUrl } from "../../services/api";

const FALLBACK_IMAGES: Record<string, string> = {
  SINGLE: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=600&q=80",
  DOUBLE: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80",
  FLAT: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80",
  APARTMENT: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80",
};

export function getRoomImage(room?: Room | null): string {
  if (room?.roomImages?.length) {
    const primary = room.roomImages.find((img) => img.isPrimary) || room.roomImages[0];
    return getImageUrl(primary.imageUrl) || FALLBACK_IMAGES[room?.roomType || "SINGLE"];
  }
  return FALLBACK_IMAGES[room?.roomType || "SINGLE"] || FALLBACK_IMAGES.SINGLE;
}

export function formatRoomType(type?: string): string {
  if (!type) return "Room";
  return type.charAt(0) + type.slice(1).toLowerCase();
}

export function formatPrice(price?: number): string {
  return `Rs. ${(price || 0).toLocaleString()}`;
}

export function formatDate(date?: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-NP", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function timeAgo(date?: string): string {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

export const CITIES = ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara"];
export const ROOM_TYPES = [
  { label: "All Types", value: "" },
  { label: "Single", value: "SINGLE" },
  { label: "Double", value: "DOUBLE" },
  { label: "Flat", value: "FLAT" },
  { label: "Apartment", value: "APARTMENT" },
];
export const BUDGETS = [
  { label: "All Budgets", min: "", max: "" },
  { label: "Under Rs. 8,000", min: "0", max: "8000" },
  { label: "Rs. 8,000 - 15,000", min: "8000", max: "15000" },
  { label: "Above Rs. 15,000", min: "15000", max: "" },
];

export type NavKey =
  | "Dashboard"
  | "Find Rooms"
  | "Saved Rooms"
  | "My Requests"
  | "Current Rental"
  | "Payments"
  | "Messages"
  | "Notifications";

export function getMissingTenantProfileSections(user?: {
  fullName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  idDocumentUrl?: string | null;
} | null): string[] {
  const missing: string[] = [];

  if (!user) return ["Profile Information (Name, Phone & Profile Picture)", "Enter Location", "Identity Verification (Type, Number & Document Photo)"];

  // 1. Profile Information (Full Name, Phone & Profile Picture)
  const hasName = Boolean(user.fullName?.trim());
  const hasPhone = Boolean(user.phone?.trim());
  const hasAvatar = Boolean(user.avatarUrl?.trim());

  const profileItemsMissing: string[] = [];
  if (!hasName) profileItemsMissing.push("Full Name");
  if (!hasPhone) profileItemsMissing.push("Phone Number");
  if (!hasAvatar) profileItemsMissing.push("Profile Picture");

  if (profileItemsMissing.length > 0) {
    missing.push(`Profile Information (${profileItemsMissing.join(", ")})`);
  }

  // 2. Enter Location
  const locSaved = localStorage.getItem("userLocation");
  if (!locSaved) {
    missing.push("Enter Location");
  }

  // 3. Identity Verification (Document Type, Number & Document Photo)
  const hasIdType = Boolean(user.idType);
  const hasIdNum = Boolean(user.idNumber?.trim());
  const hasIdDoc = Boolean(user.idDocumentUrl?.trim());

  const idItemsMissing: string[] = [];
  if (!hasIdType) idItemsMissing.push("Document Type");
  if (!hasIdNum) idItemsMissing.push("Document Number");
  if (!hasIdDoc) idItemsMissing.push("Document Photo");

  if (idItemsMissing.length > 0) {
    missing.push(`Identity Verification (${idItemsMissing.join(", ")})`);
  }

  return missing;
}
