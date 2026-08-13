import prisma from "../lib/prisma";
import { calculateCosineSimilarity } from "../utils/cosineSimilarity";
import { calculatePopularityScore } from "../utils/popularityRanking";
import { roomToVector, preferencesToVector, STANDARD_AMENITIES } from "../utils/vectorizer";

export {
  calculateCosineSimilarity,
  calculatePopularityScore,
  roomToVector,
  preferencesToVector,
  STANDARD_AMENITIES,
};

export interface RoomWithRelations {
  id: number;
  title: string;
  price: number;
  roomType: string;
  city: string;
  status: string;
  roomAmenities: { amenity: { name: string } }[];
  reviews: { rating: number }[];
  favorites: { id: number }[];
  [key: string]: any;
}

/**
 * 4. End-to-End Recommendation Engine
 * (Filter -> Vectorize -> Cosine Similarity -> Popularity Blend -> Ranked Output)
 */
export const getSimilarRoomRecommendations = async (targetRoomId: number, limit: number = 5) => {
  // Step 1: Fetch target room
  const targetRoom = await prisma.room.findUnique({
    where: { id: targetRoomId },
    include: {
      roomAmenities: { include: { amenity: true } },
      reviews: true,
      favorites: true,
    },
  });

  if (!targetRoom) {
    throw new Error("Target room not found");
  }

  // Step 2: Fetch candidate rooms (Filter: AVAILABLE & exclude target room)
  const candidateRooms = await prisma.room.findMany({
    where: {
      id: { not: targetRoomId },
      status: "AVAILABLE",
      city: { equals: targetRoom.city, mode: "insensitive" }, // Hard constraint: Same City
    },
    include: {
      roomImages: true,
      roomAmenities: { include: { amenity: true } },
      reviews: true,
      favorites: true,
      landlord: { select: { id: true, fullName: true, phone: true } },
    },
  });

  if (candidateRooms.length === 0) {
    return [];
  }

  // Find highest price for scaling
  const maxPrice = Math.max(targetRoom.price, ...candidateRooms.map((r) => r.price), 50000);

  // Vectorize target room
  const targetVector = roomToVector(targetRoom, maxPrice);

  // Step 3 & 4: Compute Cosine Similarity + Popularity Blend for each candidate
  const scoredRooms = candidateRooms.map((candidate) => {
    const candidateVector = roomToVector(candidate, maxPrice);
    const cosineSimilarity = calculateCosineSimilarity(targetVector, candidateVector);
    const popularityScore = calculatePopularityScore(candidate);

    // Final blended score: 70% Content Similarity + 30% Popularity
    const finalScore = 0.7 * cosineSimilarity + 0.3 * popularityScore;

    return {
      room: candidate,
      similarityScore: Math.round(cosineSimilarity * 100) / 100,
      popularityScore: Math.round(popularityScore * 100) / 100,
      finalScore: Math.round(finalScore * 100) / 100,
    };
  });

  // Step 5: Rank & Return Top N Output
  scoredRooms.sort((a, b) => b.finalScore - a.finalScore);

  return scoredRooms.slice(0, limit);
};

/**
 * 5. Personalized Recommendation Engine based on explicit Tenant Preferences
 * Compares tenant preference vector (price, room type, requested amenities) against available rooms.
 */
export interface TenantPreferences {
  preferredPrice?: number;
  preferredRoomType?: string;
  preferredAmenities?: string[];
  city?: string;
}



export const getPersonalizedRecommendations = async (
  prefs: TenantPreferences,
  limit: number = 10
) => {
  const rooms = await prisma.room.findMany({
    where: {
      status: "AVAILABLE",
      ...(prefs.city ? { city: { equals: prefs.city, mode: "insensitive" } } : {}),
    },
    include: {
      roomImages: true,
      roomAmenities: { include: { amenity: true } },
      reviews: true,
      favorites: true,
      landlord: { select: { id: true, fullName: true, phone: true } },
    },
  });

  if (rooms.length === 0) return [];

  const maxPrice = Math.max(...rooms.map((r) => r.price), 50000);
  const prefVector = preferencesToVector(prefs, maxPrice);

  const hasExplicitPrefs =
    prefs.preferredPrice !== undefined ||
    prefs.preferredRoomType !== undefined ||
    (prefs.preferredAmenities && prefs.preferredAmenities.length > 0);

  const scoredRooms = rooms.map((room) => {
    const rVector = roomToVector(room, maxPrice);
    const cosineSimilarity = hasExplicitPrefs
      ? calculateCosineSimilarity(prefVector, rVector)
      : 0;
    const popularityScore = calculatePopularityScore(room);

    // If tenant provided preferences, weight Cosine Similarity higher (70% Cosine, 30% Popularity).
    // If new user / no preferences, weight Popularity 100%.
    const finalScore = hasExplicitPrefs
      ? 0.7 * cosineSimilarity + 0.3 * popularityScore
      : popularityScore;

    return {
      room,
      similarityScore: Math.round(cosineSimilarity * 100) / 100,
      popularityScore: Math.round(popularityScore * 100) / 100,
      finalScore: Math.round(finalScore * 100) / 100,
    };
  });

  scoredRooms.sort((a, b) => b.finalScore - a.finalScore);

  return scoredRooms.slice(0, limit);
};

/**
 * Popular room recommendations — ranked by rating + favorite count.
 * Tries unsaved available rooms first, then all available, then any room in the DB.
 */
export const getPopularRoomRecommendations = async (
  limit: number = 6,
  excludeRoomIds: number[] = []
) => {
  const include = {
    roomImages: true,
    roomAmenities: { include: { amenity: true } },
    reviews: true,
    favorites: true,
    landlord: { select: { id: true, fullName: true, phone: true } },
  };

  const scoreRooms = (rooms: Parameters<typeof calculatePopularityScore>[0][]) =>
    rooms
      .map((room) => {
        const popularityScore = calculatePopularityScore(room);
        return {
          room,
          similarityScore: 0,
          popularityScore,
          finalScore: popularityScore,
        };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit);

  const excluded = [...new Set(excludeRoomIds.filter((id) => id > 0))];

  if (excluded.length > 0) {
    const unsavedAvailable = await prisma.room.findMany({
      where: { status: "AVAILABLE", id: { notIn: excluded } },
      include,
    });
    if (unsavedAvailable.length > 0) return scoreRooms(unsavedAvailable);
  }

  const available = await prisma.room.findMany({
    where: { status: "AVAILABLE" },
    include,
  });
  if (available.length > 0) return scoreRooms(available);

  const anyRooms = await prisma.room.findMany({ include, take: Math.max(limit * 2, 12) });
  return scoreRooms(anyRooms);
};

/**
 * Content-Based Recommendations based on Saved/Favorite Rooms.
 * Builds an aggregate feature vector from the tenant's saved rooms,
 * then ranks available rooms by cosine similarity (70%) + popularity (30%).
 * Returns an empty array when the tenant has no saved rooms.
 */
export const getSavedRoomsContentBasedRecommendations = async (
  tenantId: number,
  limit: number = 6
) => {
  const userFavorites = await prisma.favorite.findMany({
    where: { userId: tenantId },
    include: {
      room: {
        include: {
          roomAmenities: { include: { amenity: true } },
          reviews: true,
          favorites: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const validFavorites = userFavorites.filter((f) => f?.room);
  if (validFavorites.length === 0) {
    return [];
  }

  const savedRoomIds = validFavorites.map((f) => f.roomId);
  const candidateRooms = await prisma.room.findMany({
    where: {
      id: { notIn: savedRoomIds },
      status: "AVAILABLE",
    },
    include: {
      roomImages: true,
      roomAmenities: { include: { amenity: true } },
      reviews: true,
      favorites: true,
      landlord: { select: { id: true, fullName: true, phone: true } },
    },
  });

  if (candidateRooms.length === 0) return [];

  const maxPrice = Math.max(
    ...validFavorites.map((f) => f.room.price || 0),
    ...candidateRooms.map((r) => r.price || 0),
    50000
  );

  const vectors = validFavorites.map((f) => roomToVector(f.room, maxPrice));
  const vectorDim = vectors[0].length;
  const userProfileVector: number[] = new Array(vectorDim).fill(0);

  for (let i = 0; i < vectorDim; i++) {
    let sum = 0;
    for (let j = 0; j < vectors.length; j++) {
      sum += vectors[j][i];
    }
    userProfileVector[i] = sum / vectors.length;
  }

  const scoredRooms = candidateRooms.map((candidate) => {
    const candidateVector = roomToVector(candidate, maxPrice);
    const cosineSimilarity = calculateCosineSimilarity(userProfileVector, candidateVector);
    const popularityScore = calculatePopularityScore(candidate);
    const finalScore = 0.7 * cosineSimilarity + 0.3 * popularityScore;

    return {
      room: candidate,
      similarityScore: Math.round(cosineSimilarity * 100) / 100,
      popularityScore: Math.round(popularityScore * 100) / 100,
      finalScore: Math.round(finalScore * 100) / 100,
    };
  });

  scoredRooms.sort((a, b) => b.finalScore - a.finalScore);
  return scoredRooms.slice(0, limit);
};

/**
 * Dashboard recommendation resolver:
 * 1. Cosine similarity from saved rooms (if any saves exist)
 * 2. Similar rooms to most recently saved (if cosine has no candidates)
 * 3. Popular rooms (unsaved first, then broader fallbacks)
 */
export const resolveDashboardRecommendations = async (
  tenantId: number,
  limit: number = 6
): Promise<{ recommendations: Awaited<ReturnType<typeof getPopularRoomRecommendations>>; source: "cosine" | "popular" }> => {
  const favorites = await prisma.favorite.findMany({
    where: { userId: tenantId },
    include: {
      room: {
        include: {
          roomAmenities: { include: { amenity: true } },
          reviews: true,
          favorites: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const savedRoomIds = favorites.map((f) => f.roomId);
  const validFavorites = favorites.filter((f) => f?.room);

  if (validFavorites.length > 0) {
    const contentBased = await getSavedRoomsContentBasedRecommendations(tenantId, limit);
    if (contentBased.length > 0) {
      return { recommendations: contentBased, source: "cosine" };
    }

    for (const fav of validFavorites) {
      try {
        const similar = await getSimilarRoomRecommendations(fav.roomId, limit + savedRoomIds.length);
        const filtered = similar
          .filter((r) => r.room?.id && !savedRoomIds.includes(r.room.id))
          .slice(0, limit);
        if (filtered.length > 0) {
          return { recommendations: filtered, source: "cosine" };
        }
      } catch {
        // try next saved room
      }
    }
  }

  const popular = await getPopularRoomRecommendations(limit, savedRoomIds);
  return { recommendations: popular, source: "popular" };
};

