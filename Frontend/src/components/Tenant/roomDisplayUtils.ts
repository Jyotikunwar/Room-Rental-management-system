// src/components/Tenant/roomDisplayUtils.ts
import type { Room } from "../../services/api";

// The backend (Express) serves uploaded room images from /uploads/... on its own
// origin. The Vite dev server runs on a different port, so relative image paths
// coming back from the API need the backend origin prefixed or the <img> will 404.
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:5000";

const FALLBACK_IMAGES: Record<string, string> = {
  SINGLE: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=600&q=80",
  DOUBLE: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80",
  FLAT: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80",
  APARTMENT: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80",
};

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

/** Pick the primary room image, or the first available, with a room-type fallback. */
export function getRoomPrimaryImageUrl(room?: Room | null): string {
  const images = room?.roomImages ?? [];
  if (images.length > 0) {
    const primary = images.find((img) => img.isPrimary) ?? images[0];
    const resolved = resolveImageUrl(primary?.imageUrl);
    if (resolved) return resolved;
  }
  return FALLBACK_IMAGES[room?.roomType || "SINGLE"] ?? FALLBACK_IMAGES.SINGLE;
}

/** Format a recommendation score (0–1) as a match percentage badge. */
export function formatMatchPercent(
  item: { similarityScore?: number; finalScore?: number; popularityScore?: number } | null | undefined,
  source?: "cosine" | "popular"
): { text: string; hasScore: boolean } {
  if (!item) return { text: "Popular", hasScore: false };

  const similarity = item.similarityScore ?? 0;
  const score = item.finalScore ?? item.similarityScore ?? item.popularityScore ?? 0;

  if (score > 0) {
    const pct = Math.min(99, Math.max(1, Math.round(score * 100)));
    if (similarity > 0 || source === "cosine") {
      return { text: `${pct}% Match`, hasScore: true };
    }
    return { text: `${pct}% Popular`, hasScore: true };
  }

  return { text: "Popular", hasScore: false };
}