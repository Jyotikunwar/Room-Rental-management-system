/**
 * Popularity & Rating Score Calculation Algorithm
 * Formula: Popularity Score = 0.7 * NormalizedRating + 0.3 * NormalizedFavorites
 * Output: Normalized score between 0.0 and 1.0
 */

export interface PopularityInputRoom {
  reviews?: { rating: number }[];
  favorites?: { id: number }[];
  [key: string]: any;
}

export function calculatePopularityScore(room: PopularityInputRoom): number {
  if (!room) return 0;

  const reviews = room.reviews || [];
  const favorites = room.favorites || [];

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length
      : 0;

  const normalizedRating = avgRating / 5.0; // 0.0 to 1.0
  const favoriteCount = favorites.length;
  const normalizedFavorites = Math.min(favoriteCount / 20.0, 1.0); // capped at 20 favorites

  return Math.round((0.7 * normalizedRating + 0.3 * normalizedFavorites) * 100) / 100;
}
