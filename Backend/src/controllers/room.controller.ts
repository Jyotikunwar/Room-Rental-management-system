import { Response } from "express";
import prisma from "../lib/prisma";
import { createRoomSchema, updateRoomSchema } from "../validations/room.validation";
import { AuthRequest } from "../middleware/auth.middleware";

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

// GET /rooms  (public - search + filter)
export const getRooms = async (req: AuthRequest, res: Response) => {
  try {
    const { city, roomType, minPrice, maxPrice, status, search } = req.query;

    const rooms = await prisma.room.findMany({
      where: {
        ...(city && { city: { equals: String(city), mode: "insensitive" } }),
        ...(roomType && { roomType: roomType as any }),
        ...(status ? { status: status as any } : { status: "AVAILABLE" }),
        ...(minPrice || maxPrice
          ? {
              price: {
                ...(minPrice && { gte: Number(minPrice) }),
                ...(maxPrice && { lte: Number(maxPrice) }),
              },
            }
          : {}),
        ...(search && {
          OR: [
            { title: { contains: String(search), mode: "insensitive" } },
            { location: { contains: String(search), mode: "insensitive" } },
          ],
        }),
      },
      include: {
        roomImages: true,
        roomAmenities: { include: { amenity: true } },
        landlord: { select: { id: true, fullName: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
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