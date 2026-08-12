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
 * 6. Content-Based Recommendations based on Saved/Favorite Rooms
 * Builds an aggregate feature vector from all rooms saved by the tenant,
 * then computes Cosine Similarity against candidate available rooms.
 */
export const getSavedRoomsContentBasedRecommendations = async (
  tenantId: number,
  limit: number = 6
) => {
  // 1. Fetch saved rooms for this tenant
  let userFavorites = await prisma.favorite.findMany({
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

  // 2. If this tenant has no saved rooms yet, fallback to saved rooms across all tenants in DB
  if (userFavorites.length === 0) {
    userFavorites = await prisma.favorite.findMany({
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
      take: 10,
    });
  }

  // 3. Fetch candidate available rooms excluding the ones already in favorites
  const validFavorites = userFavorites.filter((f) => f && f.room);
  const savedRoomIds = new Set(validFavorites.map((f) => f.roomId));
  let candidateRooms = await prisma.room.findMany({
    where: {
      id: { notIn: Array.from(savedRoomIds) },
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

  if (candidateRooms.length === 0) {
    candidateRooms = await prisma.room.findMany({
      where: { status: "AVAILABLE" },
      include: {
        roomImages: true,
        roomAmenities: { include: { amenity: true } },
        reviews: true,
        favorites: true,
        landlord: { select: { id: true, fullName: true, phone: true } },
      },
    });
  }

  if (candidateRooms.length === 0) return [];

  // Compute Content-Based Vector & Cosine Similarity
  if (validFavorites.length > 0) {
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
  }

  return candidateRooms.slice(0, limit).map((room) => ({
    room,
    similarityScore: 0.8,
    popularityScore: calculatePopularityScore(room),
    finalScore: 0.8,
  }));
};

