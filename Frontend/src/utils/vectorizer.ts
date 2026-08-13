/**
 * Content-Based Vectorization Algorithm (Frontend)
 * Converts Room objects into normalized feature vectors:
 * [ NormalizedPrice, IsSingle, IsDouble, IsFlat, IsApartment, ...AmenitiesBinaryVector ]
 */

export const STANDARD_AMENITIES = [
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

export interface VectorizableRoom {
  price?: number;
  roomType?: string;
  roomAmenities?: { amenity?: { name?: string } }[];
  [key: string]: any;
}

export function roomToVector(room: VectorizableRoom, maxPrice: number = 50000): number[] {
  if (!room) return new Array(5 + STANDARD_AMENITIES.length).fill(0);

  const price = room.price || 0;
  const normalizedPrice = Math.min(price / (maxPrice || 50000), 1.0);

  const roomType = room.roomType || "";
  const isSingle = roomType === "SINGLE" ? 1 : 0;
  const isDouble = roomType === "DOUBLE" ? 1 : 0;
  const isFlat = roomType === "FLAT" ? 1 : 0;
  const isApartment = roomType === "APARTMENT" ? 1 : 0;

  const roomAmenities = room.roomAmenities || [];
  const roomAmenityNames = roomAmenities.map((ra) => ra?.amenity?.name?.toLowerCase() || "");
  const amenityVector = STANDARD_AMENITIES.map((amenity) =>
    roomAmenityNames.some((name) => name.includes(amenity)) ? 1 : 0
  );

  return [normalizedPrice, isSingle, isDouble, isFlat, isApartment, ...amenityVector];
}
