import prisma from "../lib/prisma";

// Standard set of amenities to track for vectorization according to database
const STANDARD_AMENITIES = [
  "wifi",
  "kitchen",
  "furnished",
  "balcony",
  "water",
  "air conditioner",
  "parking",
  "attached bathroom",
  "electricity",
  "fully furnished",
  "pet friendly",
];

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
 * 1. Hardcoded Cosine Similarity Math Algorithm
 * Formula: Cosine Similarity(A, B) = (A . B) / (||A|| * ||B||)
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * 2. Vectorization Function
 * Converts a Room object into a normalized numerical feature vector:
 * [ NormalizedPrice, IsSingle, IsDouble, IsFlat, IsApartment, ...AmenitiesBinary ]
 */
export function roomToVector(room: RoomWithRelations, maxPrice: number = 50000): number[] {
  // A. Price Normalization (0.0 to 1.0)
  const normalizedPrice = Math.min(room.price / maxPrice, 1.0);

  // B. Room Type One-Hot Encoding
  const isSingle = room.roomType === "SINGLE" ? 1 : 0;
  const isDouble = room.roomType === "DOUBLE" ? 1 : 0;
  const isFlat = room.roomType === "FLAT" ? 1 : 0;
  const isApartment = room.roomType === "APARTMENT" ? 1 : 0;

  // C. Amenities Binary Vector
  const roomAmenityNames = room.roomAmenities.map((ra) => ra.amenity.name.toLowerCase());
  const amenityVector = STANDARD_AMENITIES.map((amenity) =>
    roomAmenityNames.some((name) => name.includes(amenity)) ? 1 : 0
  );

  return [normalizedPrice, isSingle, isDouble, isFlat, isApartment, ...amenityVector];
}

/**
 * 3. Popularity & Rating Score Calculation (0.0 to 1.0)
 */
export function calculatePopularityScore(room: RoomWithRelations): number {
  const avgRating =
    room.reviews && room.reviews.length > 0
      ? room.reviews.reduce((acc, r) => acc + r.rating, 0) / room.reviews.length
      : 0;

  const normalizedRating = avgRating / 5.0; // 0.0 to 1.0
  const favoriteCount = room.favorites ? room.favorites.length : 0;
  const normalizedFavorites = Math.min(favoriteCount / 20.0, 1.0); // capped at 20 favorites

  return 0.7 * normalizedRating + 0.3 * normalizedFavorites;
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

export function preferencesToVector(
  prefs: TenantPreferences,
  maxPrice: number = 50000
): number[] {
  const price = prefs.preferredPrice ? Math.min(prefs.preferredPrice / maxPrice, 1.0) : 0.5;
  const isSingle = prefs.preferredRoomType === "SINGLE" ? 1 : 0;
  const isDouble = prefs.preferredRoomType === "DOUBLE" ? 1 : 0;
  const isFlat = prefs.preferredRoomType === "FLAT" ? 1 : 0;
  const isApartment = prefs.preferredRoomType === "APARTMENT" ? 1 : 0;

  const prefAmenities = (prefs.preferredAmenities || []).map((a) => a.toLowerCase());
  const amenityVector = STANDARD_AMENITIES.map((amenity) =>
    prefAmenities.some((name) => name.includes(amenity)) ? 1 : 0
  );

  return [price, isSingle, isDouble, isFlat, isApartment, ...amenityVector];
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

