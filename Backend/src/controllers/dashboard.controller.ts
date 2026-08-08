import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

// GET /api/tenant/dashboard (protected - TENANT)
// Combines several small queries into one response for the dashboard page.
export const getTenantDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.id;

    const [availableRoomsCount, savedRooms, activeBooking, notifications, messages, favoritesCount] =
      await Promise.all([
        prisma.room.count({ where: { status: "AVAILABLE" } }),
        prisma.favorite.findMany({
          where: { userId: tenantId },
          include: { room: { include: { roomImages: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.booking.findFirst({
          where: { tenantId, status: "APPROVED" },
          include: { room: true, payment: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.notification.findMany({
          where: { userId: tenantId },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.message.findMany({
          where: { senderId: tenantId },
          include: { receiver: { select: { fullName: true } }, room: { select: { title: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.favorite.count({ where: { userId: tenantId } }),
      ]);

    const pendingRequestsCount = await prisma.booking.count({
      where: { tenantId, status: "PENDING" },
    });

    let rentDueInDays: number | null = null;
    if (activeBooking) {
      // Simple placeholder: assume rent is due monthly from moveInDate.
      // Replace with real due-date logic once a recurring billing model exists.
      const today = new Date();
      const nextDue = new Date(activeBooking.moveInDate);
      while (nextDue < today) {
        nextDue.setMonth(nextDue.getMonth() + 1);
      }
      rentDueInDays = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    const leaseProgress = activeBooking?.endDate
      ? Math.min(
          100,
          Math.round(
            ((Date.now() - new Date(activeBooking.moveInDate).getTime()) /
              (new Date(activeBooking.endDate).getTime() - new Date(activeBooking.moveInDate).getTime())) *
              100
          )
        )
      : 0;

    return res.status(200).json({
      success: true,
      stats: {
        availableRooms: availableRoomsCount,
        savedRooms: favoritesCount,
        rentDueInDays,
        pendingRequests: pendingRequestsCount,
        nextPaymentDate: null,
        leaseProgress,
        preferredLocation: "",
        locationMatches: 0,
      },
      activeRental: activeBooking,
      recentSaved: savedRooms,
      notifications,
      messages,
      recommendations: [], // Recommendation engine not implemented yet
    });
  } catch (error) {
    console.error("Get tenant dashboard error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// GET /api/tenant/rental (protected - TENANT)
// Returns the tenant's current active rental as a raw Booking object
// (with room, landlord, roomImages, payment, and complaints included) —
// matching the frontend's `Booking` type directly, no flattening.
export const getCurrentRental = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.id;

    const activeBooking = await prisma.booking.findFirst({
      where: { tenantId, status: "APPROVED" },
      include: {
        room: {
          include: {
            roomImages: true,
            landlord: { select: { fullName: true, phone: true, email: true } },
          },
        },
        payment: true,
        complaints: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ success: true, rental: activeBooking });
  } catch (error) {
    console.error("Get current rental error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// GET /api/admin/dashboard (protected - ADMIN)
export const getAdminStats = async (req: AuthRequest, res: Response) => {
  try {
    const [totalUsers, totalRooms, totalLandlords, totalTenants, totalBookings, totalRevenue] = await Promise.all([
      prisma.user.count(),
      prisma.room.count(),
      prisma.user.count({ where: { role: "LANDLORD" } }),
      prisma.user.count({ where: { role: "TENANT" } }),
      prisma.booking.count(),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalRooms,
        totalLandlords,
        totalTenants,
        totalBookings,
        totalRevenue: totalRevenue._sum.amount || 0,
      },
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};