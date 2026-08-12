// src/components/Tenant/roomDisplayUtils.ts
import type { Room } from "../../services/api";

// The backend (Express) serves uploaded room images from /uploads/... on its own
// origin. The Vite dev server runs on a different port, so relative image paths
// coming back from the API need the backend origin prefixed or the <img> will 404.
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:5000";

export function resolveImageUrl(url?: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Images uploaded through the app are served by the backend from /uploads/...
  // Anything else (e.g. /images/rooms/Room1.png) is a static asset sitting in
  // Frontend/public and is served by the frontend's own origin, so it must NOT
  // be prefixed with the backend URL.
  if (url.startsWith("/uploads/")) return `${API_BASE_URL}${url}`;
  return url;
}

export function avgRating(room: Room): number | null {
  if (!room.reviews || room.reviews.length === 0) return null;
  const sum = room.reviews.reduce((s, r) => s + r.rating, 0);
  return Math.round((sum / room.reviews.length) * 10) / 10;
}