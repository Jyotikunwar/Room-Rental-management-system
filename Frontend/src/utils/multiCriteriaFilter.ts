/**
 * Multi-Criteria Search & Filtering Algorithm (Frontend)
 * Performs client-side multi-criteria filtering & sorting across properties.
 */

import { calculateHaversineDistance } from "./haversine";

export interface FilterCriteria {
  city?: string;
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  roomType?: string;
  amenities?: string[];
  userLat?: number;
  userLng?: number;
  maxDistance?: number;
}

export function filterRoomsMultiCriteria<T extends Record<string, any>>(rooms: T[], criteria: FilterCriteria): T[] {
  if (!rooms || rooms.length === 0) return [];

  return rooms.filter((room) => {
    // 1. City Filter
    if (criteria.city && criteria.city.trim() !== "") {
      const targetCity = criteria.city.toLowerCase().trim();
      const roomCity = (room.city || "").toLowerCase();
      if (!roomCity.includes(targetCity)) return false;
    }

    // 2. Text Query Search (Location / Title)
    if (criteria.query && criteria.query.trim() !== "") {
      const q = criteria.query.toLowerCase().trim();
      const title = (room.title || "").toLowerCase();
      const loc = (room.location || "").toLowerCase();
      if (!title.includes(q) && !loc.includes(q)) return false;
    }

    // 3. Price Boundaries
    if (criteria.minPrice !== undefined && room.price < criteria.minPrice) return false;
    if (criteria.maxPrice !== undefined && room.price > criteria.maxPrice) return false;

    // 4. Room Type Matching
    if (criteria.roomType && criteria.roomType.trim() !== "") {
      if ((room.roomType || "").toUpperCase() !== criteria.roomType.toUpperCase()) return false;
    }

    // 5. Amenities Requirement Filter
    if (criteria.amenities && criteria.amenities.length > 0) {
      const roomAmenityNames = (room.roomAmenities || []).map((ra: any) =>
        (ra.amenity?.name || ra.name || "").toLowerCase()
      );
      for (const requiredAmenity of criteria.amenities) {
        const reqLower = requiredAmenity.toLowerCase();
        if (!roomAmenityNames.some((name: string) => name.includes(reqLower))) {
          return false;
        }
      }
    }

    // 6. Haversine Distance Radius Limit
    if (
      criteria.userLat !== undefined &&
      criteria.userLng !== undefined &&
      criteria.maxDistance !== undefined &&
      criteria.maxDistance > 0
    ) {
      const dist = calculateHaversineDistance(
        criteria.userLat,
        criteria.userLng,
        room.latitude,
        room.longitude
      );
      if (dist !== null && dist > criteria.maxDistance) return false;
    }

    return true;
  });
}
