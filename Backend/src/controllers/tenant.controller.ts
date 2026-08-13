import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";
import { getSimilarRoomRecommendations, getSavedRoomsContentBasedRecommendations, getPopularRoomRecommendations, resolveDashboardRecommendations } from "../services/recommendation.service";
import { calculateHaversineDistance } from "../utils/haversine";

export const getTenantDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.id;

    const [
      availableRoomsCount,
      savedCount,
      pendingRequests,
      activeBooking,
      recentFavorites,
      recentNotifications,
      sentMessages,
    ] = await Promise.all([
      prisma.room.count({ where: { status: "AVAILABLE" } }),
      prisma.favorite.count({ where: { userId: tenantId } }),
      prisma.booking.count({ where: { tenantId, status: "PENDING" } }),
      prisma.booking.findFirst({
        where: { tenantId, status: "APPROVED" },
        include: {
          room: {
            include: {
              roomImages: true,
              landlord: { select: { id: true, fullName: true, phone: true, email: true } },
            },
          },
          payment: true,
        },
        orderBy: { moveInDate: "desc" },
      }),
      prisma.favorite.findMany({
        where: { userId: tenantId },
        include: {
          room: {
            include: {
              roomImages: true,
              roomAmenities: { include: { amenity: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      prisma.notification.findMany({
        where: { userId: tenantId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.message.findMany({
        where: { senderId: tenantId },
        include: {
          receiver: { select: { id: true, fullName: true } },
          room: { select: { id: true, title: true, city: true, location: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    let rentDueInDays: number | null = null;
    let nextPaymentDate: Date | null = null;
    let leaseProgress = 0;

    if (activeBooking) {
      const moveIn = new Date(activeBooking.moveInDate);
      const end = activeBooking.endDate ? new Date(activeBooking.endDate) : null;
      const now = new Date();

      nextPaymentDate = new Date(now.getFullYear(), now.getMonth() + 1, moveIn.getDate());
      if (nextPaymentDate < now) {
        nextPaymentDate = new Date(now.getFullYear(), now.getMonth() + 2, moveIn.getDate());
      }
      rentDueInDays = Math.max(
        0,
        Math.ceil((nextPaymentDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );

      if (end) {
        const total = end.getTime() - moveIn.getTime();
        const elapsed = now.getTime() - moveIn.getTime();
        leaseProgress = total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : 0;
      } else {
        leaseProgress = 75;
      }
    }

    const { recommendations, source: recommendationSource } =
      await resolveDashboardRecommendations(tenantId, 6);

    const preferredLocation = recentFavorites[0]?.room?.location || "Baneshwor";
    const locationMatches = await prisma.room.count({
      where: {
        status: "AVAILABLE",
        location: { contains: preferredLocation, mode: "insensitive" },
      },
    });

    return res.status(200).json({
      success: true,
      stats: {
        availableRooms: availableRoomsCount,
        savedRooms: savedCount,
        rentDueInDays,
        pendingRequests,
        nextPaymentDate,
        leaseProgress,
        preferredLocation,
        locationMatches,
      },
      activeRental: activeBooking,
      recentSaved: recentFavorites,
      notifications: recentNotifications,
      messages: sentMessages,
      recommendations,
      recommendationSource,
    });
  } catch (error) {
    console.error("Get tenant dashboard error:", error);
    return res.status(500).json({ success: false, message: "Failed to load tenant dashboard" });
  }
};

export const getPersonalizedRecommendations = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.id;
    const limit = req.query.limit ? Number(req.query.limit) : 6;
    const city = req.query.city ? String(req.query.city) : undefined;

    const favorite = await prisma.favorite.findFirst({
      where: { userId: tenantId },
      orderBy: { createdAt: "desc" },
    });

    if (favorite) {
      const recommendations = await getSimilarRoomRecommendations(favorite.roomId, limit);
      return res.status(200).json({
        success: true,
        count: recommendations.length,
        recommendations,
        basedOn: "favorites",
      });
    }

    const rooms = await prisma.room.findMany({
      where: {
        status: "AVAILABLE",
        ...(city ? { city: { equals: city, mode: "insensitive" as const } } : {}),
      },
      include: {
        roomImages: true,
        roomAmenities: { include: { amenity: true } },
        reviews: true,
        favorites: true,
        landlord: { select: { id: true, fullName: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return res.status(200).json({
      success: true,
      count: rooms.length,
      recommendations: rooms.map((room) => ({
        room,
        similarityScore: 0,
        popularityScore: 0,
        finalScore: 0,
      })),
      basedOn: "popular",
    });
  } catch (error) {
    console.error("Get personalized recommendations error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch recommendations" });
  }
};
