import { Request, Response } from "express";
import prisma from "../lib/prisma";

// GET /api/public/stats (public - no auth, used on the landing page)
export const getPublicStats = async (req: Request, res: Response) => {
  try {
    const [totalRooms, totalLandlords, totalTenants, ratingAgg] = await Promise.all([
      prisma.room.count(),
      prisma.user.count({ where: { role: "LANDLORD" } }),
      prisma.user.count({ where: { role: "TENANT" } }),
      prisma.review.aggregate({ _avg: { rating: true }, _count: { rating: true } }),
    ]);

    // Convert average rating (out of 5) into a satisfaction percentage.
    // Falls back to null if there are no reviews yet, so the frontend can
    // decide how to display "no data yet" instead of a misleading number.
    const satisfactionPercent =
      ratingAgg._count.rating > 0 ? Math.round(((ratingAgg._avg.rating || 0) / 5) * 100) : null;

    return res.status(200).json({
      success: true,
      stats: {
        totalRooms,
        totalLandlords,
        totalTenants,
        satisfactionPercent,
      },
    });
  } catch (error) {
    console.error("Get public stats error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// GET /api/public/testimonials (public - no auth)
// Returns the most recent highly-rated reviews across all rooms, for the
// landing page "What Our Users Say" section.
export const getPublicTestimonials = async (req: Request, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { rating: { gte: 4 }, comment: { not: null } },
      include: {
        user: { select: { fullName: true } },
        room: { select: { city: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    return res.status(200).json({ success: true, testimonials: reviews });
  } catch (error) {
    console.error("Get public testimonials error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};