import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

// POST /api/favorites/:roomId/toggle (protected - logged in user/tenant)
export const toggleFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;

    const room = await prisma.room.findUnique({ where: { id: Number(roomId) } });
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId: Number(roomId),
        },
      },
    });

    if (existingFavorite) {
      // Remove from favorites
      await prisma.favorite.delete({ where: { id: existingFavorite.id } });
      return res.status(200).json({
        success: true,
        message: "Room removed from favorites",
        isFavorite: false,
      });
    } else {
      // Add to favorites
      const newFavorite = await prisma.favorite.create({
        data: {
          userId,
          roomId: Number(roomId),
        },
      });
      return res.status(201).json({
        success: true,
        message: "Room added to favorites",
        isFavorite: true,
        favorite: newFavorite,
      });
    }
  } catch (error) {
    console.error("Toggle favorite error:", error);
    return res.status(500).json({ success: false, message: "Failed to toggle favorite" });
  }
};

// GET /api/favorites (protected - get logged in user's favorite rooms)
export const getMyFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            roomImages: true,
            roomAmenities: { include: { amenity: true } },
            landlord: { select: { id: true, fullName: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: favorites.length,
      favorites,
    });
  } catch (error) {
    console.error("Get my favorites error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch favorites" });
  }
};

// GET /api/favorites/check/:roomId (protected - check if room is favorited)
export const checkIsFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId: Number(roomId),
        },
      },
    });

    return res.status(200).json({
      success: true,
      isFavorite: !!favorite,
    });
  } catch (error) {
    console.error("Check is favorite error:", error);
    return res.status(500).json({ success: false, message: "Failed to check favorite status" });
  }
};
