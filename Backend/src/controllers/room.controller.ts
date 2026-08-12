import { Response } from "express";
import prisma from "../lib/prisma";
import { createRoomSchema, updateRoomSchema } from "../validations/room.validation";
import { AuthRequest } from "../middleware/auth.middleware";
import { getSimilarRoomRecommendations } from "../services/recommendation.service";
import { calculateHaversineDistance } from "../utils/haversine";
import { calculateCosineSimilarity } from "../utils/cosineSimilarity";
import { calculatePopularityScore } from "../utils/popularityRanking";
import { roomToVector, preferencesToVector } from "../utils/vectorizer";

// Resolves a list of amenity NAMES (e.g. "WiFi", "Parking") to Amenity row
// ids, creating any that don't exist yet. Frontend sends names, not ids.
async function resolveAmenityIds(names?: string[]): Promise<number[]> {
  if (!names || names.length === 0) return [];
  const cleaned = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  const amenities = await Promise.all(
    cleaned.map((name) =>
      prisma.amenity.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );
  return amenities.map((a) => a.id);
}

// POST /rooms  (protected - LANDLORD or ADMIN)
export const createRoom = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createRoomSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { amenities, availableFrom, ...roomData } = parsed.data;
    const amenityIds = await resolveAmenityIds(amenities);

    const room = await prisma.room.create({
      data: {
        ...roomData,
        landlordId: req.user!.id,
        approvalStatus: req.user!.role === "ADMIN" ? "APPROVED" : "PENDING",
        availableFrom: availableFrom ? new Date(availableFrom) : undefined,
        roomAmenities: amenityIds.length
          ? { create: amenityIds.map((id) => ({ amenityId: id })) }
          : undefined,
      },
      include: {
        roomImages: true,
        roomAmenities: { include: { amenity: true } },
      },
    });

    return res.status(201).json({ success: true, message: "Room listed successfully", room });
  } catch (error) {
    console.error("Create room error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// GET /rooms  (public - Multi-Criteria Search, Haversine Distance & Vector Cosine Match)
export const getRooms = async (req: AuthRequest, res: Response) => {
  try {
    const {
      city,
      location,
      roomType,
      minPrice,
      maxPrice,
      status,
      approvalStatus,
      search,
      amenities,
      wifi,
      kitchen,
      furnished,
      balcony,
      water,
      airConditioner,
      parking,
      attachedBathroom,
      electricity,
      fullyFurnished,
      petFriendly,
      userLat,
      userLng,
      maxDistance,
      sortBy,
    } = req.query;

    const requestedAmenities: string[] = [];
    if (amenities) {
      const list = String(amenities).split(",").map((a) => a.trim().toLowerCase());
      requestedAmenities.push(...list);
    }
    if (wifi === "true") requestedAmenities.push("wifi");
    if (kitchen === "true") requestedAmenities.push("kitchen");
    if (furnished === "true") requestedAmenities.push("furnished");
    if (balcony === "true") requestedAmenities.push("balcony");
    if (water === "true") requestedAmenities.push("water");
    if (airConditioner === "true") requestedAmenities.push("air conditioner");
    if (parking === "true") requestedAmenities.push("parking");
    if (attachedBathroom === "true") requestedAmenities.push("attached bathroom");
    if (electricity === "true") requestedAmenities.push("electricity");
    if (fullyFurnished === "true") requestedAmenities.push("fully furnished");
    if (petFriendly === "true") requestedAmenities.push("pet friendly");

    const amenityFilters = requestedAmenities.map((amenityName) => ({
      roomAmenities: {
        some: {
          amenity: {
            name: { contains: amenityName, mode: "insensitive" as const },
          },
        },
      },
    }));

    let orderBy: any = { createdAt: "desc" };
    if (sortBy === "price_asc") orderBy = { price: "asc" };
    if (sortBy === "price_desc") orderBy = { price: "desc" };
    if (sortBy === "oldest") orderBy = { createdAt: "asc" };

    const statusCondition =
      status === "ALL"
        ? []
        : status
        ? [{ status: status as any }]
        : [{ status: "AVAILABLE" as const }];

    const approvalCondition =
      approvalStatus === "ALL"
        ? []
        : approvalStatus
        ? [{ approvalStatus: String(approvalStatus).toUpperCase() as any }]
        : [{ approvalStatus: "APPROVED" as const }];

    let rawRooms = await prisma.room.findMany({
      where: {
        AND: [
          ...(city ? [{ city: { equals: String(city), mode: "insensitive" as const } }] : []),
          ...(location ? [{ location: { contains: String(location), mode: "insensitive" as const } }] : []),
          ...(roomType ? [{ roomType: roomType as any }] : []),
          ...statusCondition,
          ...approvalCondition,
          ...(minPrice || maxPrice
            ? [
                {
                  price: {
                    ...(minPrice ? { gte: Number(minPrice) } : {}),
                    ...(maxPrice ? { lte: Number(maxPrice) } : {}),
                  },
                },
              ]
            : []),
          ...(search
            ? [
                {
                  OR: [
                    { title: { contains: String(search), mode: "insensitive" as const } },
                    { location: { contains: String(search), mode: "insensitive" as const } },
                    { city: { contains: String(search), mode: "insensitive" as const } },
                    { description: { contains: String(search), mode: "insensitive" as const } },
                  ],
                },
              ]
            : []),
          ...amenityFilters,
        ],
      },
      include: {
        roomImages: true,
        roomAmenities: { include: { amenity: true } },
        reviews: true,
        favorites: true,
        landlord: { select: { id: true, fullName: true, phone: true, email: true } },
      },
      orderBy,
    });

    const uLat = userLat ? Number(userLat) : undefined;
    const uLng = userLng ? Number(userLng) : undefined;
    const maxDist = maxDistance ? Number(maxDistance) : undefined;

    // Vector for preference calculation
    const maxRoomPrice = Math.max(...rawRooms.map((r) => r.price), 50000);
    const prefVector = preferencesToVector(
      {
        preferredPrice: maxPrice ? Number(maxPrice) : minPrice ? Number(minPrice) : undefined,
        preferredRoomType: roomType ? String(roomType) : undefined,
        preferredAmenities: requestedAmenities,
        city: city ? String(city) : undefined,
      },
      maxRoomPrice
    );

    const hasExplicitPrefs =
      minPrice !== undefined ||
      maxPrice !== undefined ||
      roomType !== undefined ||
      requestedAmenities.length > 0;

    let processedRooms = rawRooms.map((room) => {
      // 1. Haversine distance calculation
      const distance = calculateHaversineDistance(uLat, uLng, room.latitude, room.longitude);

      // 2. Cosine Similarity & Popularity Score
      const rVector = roomToVector(room as any, maxRoomPrice);
      const cosineSimilarity = hasExplicitPrefs
        ? calculateCosineSimilarity(prefVector, rVector)
        : 0;
      const popularityScore = calculatePopularityScore(room as any);

      const finalScore = hasExplicitPrefs
        ? 0.7 * cosineSimilarity + 0.3 * popularityScore
        : popularityScore;

      return {
        ...room,
        distance,
        similarityScore: Math.round(cosineSimilarity * 100) / 100,
        popularityScore: Math.round(popularityScore * 100) / 100,
        finalScore: Math.round(finalScore * 100) / 100,
      };
    });

    // Distance Radius Filter
    if (maxDist !== undefined && !isNaN(maxDist) && uLat !== undefined && uLng !== undefined) {
      processedRooms = processedRooms.filter(
        (r) => r.distance === null || r.distance <= maxDist
      );
    }

    // Dynamic sorting overrides
    if (sortBy === "distance" && uLat !== undefined && uLng !== undefined) {
      processedRooms.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    } else if (sortBy === "match" || sortBy === "cosine") {
      processedRooms.sort((a, b) => b.similarityScore - a.similarityScore);
    } else if (sortBy === "popularity") {
      processedRooms.sort((a, b) => b.popularityScore - a.popularityScore);
    } else if (sortBy === "recommended") {
      processedRooms.sort((a, b) => b.finalScore - a.finalScore);
    }

    return res.status(200).json({ success: true, count: processedRooms.length, rooms: processedRooms });
  } catch (error) {
    console.error("Get rooms error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// GET /rooms/:id  (public)
export const getRoomById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const room = await prisma.room.findUnique({
      where: { id: Number(id) },
      include: {
        roomImages: true,
        roomAmenities: { include: { amenity: true } },
        landlord: { select: { id: true, fullName: true, phone: true, email: true } },
        reviews: { include: { user: { select: { fullName: true } } } },
      },
    });

    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    return res.status(200).json({ success: true, room });
  } catch (error) {
    console.error("Get room by id error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// PATCH /rooms/:id  (protected - owner, or ADMIN for any room)
export const updateRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const roomId = Number(id);

    const existingRoom = await prisma.room.findUnique({ where: { id: roomId } });
    if (!existingRoom) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }
    const isOwner = existingRoom.landlordId === req.user!.id;
    const isAdmin = req.user!.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this room" });
    }

    const parsed = updateRoomSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { amenities, availableFrom, ...roomData } = parsed.data;

    // Only touch amenities if the request actually included that field.
    if (amenities !== undefined) {
      const amenityIds = await resolveAmenityIds(amenities);
      await prisma.roomAmenity.deleteMany({ where: { roomId } });
      if (amenityIds.length > 0) {
        await prisma.roomAmenity.createMany({
          data: amenityIds.map((amenityId) => ({ roomId, amenityId })),
        });
      }
    }

    const room = await prisma.room.update({
      where: { id: roomId },
      data: {
        ...roomData,
        ...(availableFrom && { availableFrom: new Date(availableFrom) }),
      },
      include: { roomImages: true, roomAmenities: { include: { amenity: true } } },
    });

    return res.status(200).json({ success: true, message: "Room updated", room });
  } catch (error) {
    console.error("Update room error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// DELETE /rooms/:id  (protected - owner, or ADMIN for any room)
export const deleteRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingRoom = await prisma.room.findUnique({ where: { id: Number(id) } });
    if (!existingRoom) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }
    const isOwner = existingRoom.landlordId === req.user!.id;
    const isAdmin = req.user!.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this room" });
    }

    await prisma.room.delete({ where: { id: Number(id) } });

    return res.status(200).json({ success: true, message: "Room deleted" });
  } catch (error) {
    console.error("Delete room error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// GET /rooms/my-rooms  (protected - landlord's own listings)
export const getMyRooms = async (req: AuthRequest, res: Response) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { landlordId: req.user!.id },
      include: {
        roomImages: true,
        roomAmenities: { include: { amenity: true } },
        bookings: true,
        // ← added: reviews.tsx reads room.reviews from this exact response
        reviews: { include: { user: { select: { fullName: true } } }, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ success: true, count: rooms.length, rooms });
  } catch (error) {
    console.error("Get my rooms error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// GET /rooms/:id/recommendations (public - Smart Cosine Similarity + Popularity Recommendation)
export const getRoomRecommendations = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : 5;

    const recommendations = await getSimilarRoomRecommendations(Number(id), limit);

    return res.status(200).json({
      success: true,
      count: recommendations.length,
      recommendations,
    });
  } catch (error: any) {
    console.error("Get recommendations error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate room recommendations",
    });
  }
};

// POST /rooms/:id/images (protected - owner or ADMIN, upload multiple images)
export const uploadRoomImages = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: "No image files uploaded" });
    }

    const room = await prisma.room.findUnique({ where: { id: Number(id) } });
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    const isOwner = room.landlordId === req.user!.id;
    const isAdmin = req.user!.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized to upload images for this room" });
    }

    const existingCount = await prisma.roomImage.count({ where: { roomId: Number(id) } });

    const imageRecords = files.map((file, index) => ({
      roomId: Number(id),
      imageUrl: `/uploads/${file.filename}`,
      isPrimary: existingCount === 0 && index === 0,
    }));

    await prisma.roomImage.createMany({
      data: imageRecords,
    });

    const updatedImages = await prisma.roomImage.findMany({
      where: { roomId: Number(id) },
    });

    return res.status(201).json({
      success: true,
      message: `${files.length} images uploaded successfully`,
      images: updatedImages,
    });
  } catch (error) {
    console.error("Upload room images error:", error);
    return res.status(500).json({ success: false, message: "Failed to upload images" });
  }
};