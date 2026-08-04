import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

// GET /api/admin/dashboard (or /api/admin/stats)
export const getAdminDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const [totalUsers, totalLandlords, totalTenants, totalRooms, availableRooms, totalBookings] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: "LANDLORD" } }),
        prisma.user.count({ where: { role: "TENANT" } }),
        prisma.room.count(),
        prisma.room.count({ where: { status: "AVAILABLE" } }),
        prisma.booking.count(),
      ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalLandlords,
        totalTenants,
        totalRooms,
        availableRooms,
        totalBookings,
      },
    });
  } catch (error) {
    console.error("Admin dashboard stats error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch admin stats" });
  }
};
