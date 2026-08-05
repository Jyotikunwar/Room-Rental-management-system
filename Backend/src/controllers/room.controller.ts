import { Response } from "express";
import prisma from "../lib/prisma";
import { createRoomSchema, updateRoomSchema } from "../validations/room.validation";
import { AuthRequest } from "../middleware/auth.middleware";
import { getSimilarRoomRecommendations } from "../services/recommendation.service";


// POST /rooms  (protected - LANDLORD only)
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

    const { amenityIds, availableFrom, ...roomData } = parsed.data;

    const room = await prisma.room.create({
      data: {
        ...roomData,
        landlordId: req.user!.id,
        availableFrom: availableFrom ? new Date(availableFrom) : undefined,
        roomAmenities: amenityIds
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

// GET /rooms  (public - Multi-Criteria Search & Filtering)
export const getRooms = async (req: AuthRequest, res: Response) => {
  try {
    const {
      city,
      location,
      roomType,
      minPrice,
      maxPrice,
      status,
      search,
      amenities,
      wifi,
      parking,
      water,
      balcony,
      kitchen,
      sortBy,
    } = req.query;

    // Collect requested amenity names
    const requestedAmenities: string[] = [];
    if (amenities) {
      const list = String(amenities).split(",").map((a) => a.trim().toLowerCase());
      requestedAmenities.push(...list);
    }
    if (wifi === "true") requestedAmenities.push("wifi");
    if (parking === "true") requestedAmenities.push("parking");
    if (water === "true") requestedAmenities.push("water");
    if (balcony === "true") requestedAmenities.push("balcony");
    if (kitchen === "true") requestedAmenities.push("kitchen");

    // Build Prisma AND conditions for Amenities filtering
    const amenityFilters = requestedAmenities.map((amenityName) => ({
      roomAmenities: {
        some: {
          amenity: {
            name: { contains: amenityName, mode: "insensitive" as const },
          },
        },
      },
    }));

    // Sorting logic
    let orderBy: any = { createdAt: "desc" };
    if (sortBy === "price_asc") orderBy = { price: "asc" };
    if (sortBy === "price_desc") orderBy = { price: "desc" };
    if (sortBy === "oldest") orderBy = { createdAt: "asc" };

    const rooms = await prisma.room.findMany({
      where: {
        AND: [
          ...(city ? [{ city: { equals: String(city), mode: "insensitive" as const } }] : []),
          ...(location ? [{ location: { contains: String(location), mode: "insensitive" as const } }] : []),
          ...(roomType ? [{ roomType: roomType as any }] : []),
          ...(status ? [{ status: status as any }] : [{ status: "AVAILABLE" as const }]),
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
        landlord: { select: { id: true, fullName: true, phone: true } },
      },
      orderBy,
    });

    return res.status(200).json({ success: true, count: rooms.length, rooms });
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

// PUT /rooms/:id  (protected - owner only)
export const updateRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingRoom = await prisma.room.findUnique({ where: { id: Number(id) } });
    if (!existingRoom) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }
    if (existingRoom.landlordId !== req.user!.id) {
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

    const { amenityIds, availableFrom, ...roomData } = parsed.data;

    const room = await prisma.room.update({
      where: { id: Number(id) },
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

// DELETE /rooms/:id  (protected - owner only)
export const deleteRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingRoom = await prisma.room.findUnique({ where: { id: Number(id) } });
    if (!existingRoom) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }
    if (existingRoom.landlordId !== req.user!.id) {
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
      include: { roomImages: true, bookings: true },
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

// POST /rooms/:id/images (protected - LANDLORD only, upload multiple images)
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

    if (room.landlordId !== req.user!.id) {
      return res.status(403).json({ success: false, message: "Not authorized to upload images for this room" });
    }

    const imageRecords = files.map((file, index) => ({
      roomId: Number(id),
      imageUrl: `/uploads/${file.filename}`,
      isPrimary: index === 0,
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
