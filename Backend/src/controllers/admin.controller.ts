import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";
import { calculatePopularityScore } from "../utils/popularityRanking";
import { calculateHaversineDistance } from "../utils/haversine";
import { filterRoomsMultiCriteria } from "../utils/multiCriteriaFilter";

// GET /api/admin/dashboard
// Powers AdminDashboard.tsx's 10 stat cards — computed straight from
// Room / Booking / Payment / Complaint, no new models needed.
export const getAdminDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const past30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalProperties,
      vacantProperties,
      bookedProperties,
      activeTenantIds,
      pendingMaintenance,
      maintenanceRequests,
      monthlyRevenueAgg,
      rentDueAgg,
      leaseExpiring,
      recentMoveOuts,
    ] = await Promise.all([
      prisma.room.count(),
      prisma.room.count({ where: { status: "AVAILABLE" } }),
      prisma.room.count({ where: { status: "BOOKED" } }),
      prisma.booking.findMany({
        where: { status: "APPROVED" },
        select: { tenantId: true },
        distinct: ["tenantId"],
      }),
      prisma.complaint.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] } } }),
      prisma.complaint.count(),
      prisma.payment.aggregate({
        where: { status: "PAID", paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: { in: ["PENDING", "FAILED"] } },
        _sum: { amount: true },
      }),
      prisma.booking.count({
        where: { status: "APPROVED", endDate: { gte: now, lte: in30Days } },
      }),
      prisma.booking.count({
        where: { status: "COMPLETED", endDate: { gte: past30Days, lte: now } },
      }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalProperties,
        activeTenants: activeTenantIds.length,
        vacantProperties,
        pendingMaintenance,
        occupancyRate: totalProperties > 0 ? Math.round((bookedProperties / totalProperties) * 100) : 0,
        monthlyRevenue: monthlyRevenueAgg._sum.amount ?? 0,
        rentDue: rentDueAgg._sum.amount ?? 0,
        leaseExpiring,
        maintenanceRequests,
        recentMoveOuts,
      },
    });
  } catch (error) {
    console.error("Admin dashboard stats error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch admin stats" });
  }
};
// ADD these to Backend/src/controllers/admin.controller.ts
// (uses the same prisma/AuthRequest imports already at the top of that file)

// GET /api/admin/landlords
export const getLandlords = async (req: AuthRequest, res: Response) => {
  try {
    const landlords = await prisma.user.findMany({
      where: { role: "LANDLORD" },
      include: {
        rooms: {
          select: {
            id: true,
            title: true,
            status: true,
            price: true,
            bookings: { where: { status: "APPROVED" }, select: { tenantId: true } },
          },
        },
      },
      orderBy: { fullName: "asc" },
    });

    const result = landlords.map((l) => {
      const propertyCount = l.rooms.length;
      const tenantIds = new Set(l.rooms.flatMap((r) => r.bookings.map((b) => b.tenantId)));

      let status: "ACTIVE" | "INACTIVE" | "PENDING";
      if (!l.isActive) status = "INACTIVE"; // suspended by an admin
      else if (propertyCount === 0) status = "PENDING"; // signed up, no listings yet
      else status = "ACTIVE";

      return {
        id: l.id,
        fullName: l.fullName,
        email: l.email,
        phone: l.phone,
        status,
        propertyCount,
        tenantCount: tenantIds.size,
        lastActiveAt: l.lastActiveAt,
        rooms: l.rooms.map((r) => ({ id: r.id, title: r.title, status: r.status, price: r.price })),
      };
    });

    return res.json({ success: true, landlords: result });
  } catch (err: any) {
    console.error("Get landlords error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch landlords", error: err.message });
  }
};

// GET /api/admin/landlords/stats
export const getLandlordStats = async (req: AuthRequest, res: Response) => {
  try {
    const landlords = await prisma.user.findMany({
      where: { role: "LANDLORD" },
      include: { rooms: { select: { id: true } } },
    });

    const totalLandlords = landlords.length;
    const activePortfolios = landlords.filter((l) => l.isActive && l.rooms.length > 0).length;
    const pendingApprovals = landlords.filter((l) => l.isActive && l.rooms.length === 0).length;

    const revenueAgg = await prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
    });

    return res.json({
      success: true,
      stats: {
        totalLandlords,
        activePortfolios,
        pendingApprovals,
        totalRevenue: revenueAgg._sum.amount ?? 0,
      },
    });
  } catch (err: any) {
    console.error("Get landlord stats error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch landlord stats", error: err.message });
  }
};

// PATCH /api/admin/landlords/:id/status
// Body: { isActive: boolean } — suspend (false) or reactivate (true)
export const toggleLandlordStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ success: false, message: "isActive (boolean) is required" });
    }

    const landlord = await prisma.user.findUnique({ where: { id } });
    if (!landlord || landlord.role !== "LANDLORD") {
      return res.status(404).json({ success: false, message: "Landlord not found" });
    }

    const updated = await prisma.user.update({ where: { id }, data: { isActive } });

    return res.json({
      success: true,
      message: isActive ? "Landlord reactivated" : "Landlord suspended",
      isActive: updated.isActive,
    });
  } catch (err: any) {
    console.error("Toggle landlord status error:", err);
    return res.status(500).json({ success: false, message: "Failed to update landlord status", error: err.message });
  }
};

// PATCH /api/admin/landlords/:id
// Body: { fullName?, phone? }
export const updateLandlordProfile = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { fullName, phone } = req.body;

    const landlord = await prisma.user.findUnique({ where: { id } });
    if (!landlord || landlord.role !== "LANDLORD") {
      return res.status(404).json({ success: false, message: "Landlord not found" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(fullName !== undefined ? { fullName } : {}),
        ...(phone !== undefined ? { phone } : {}),
      },
    });

    return res.json({
      success: true,
      message: "Landlord updated",
      landlord: { id: updated.id, fullName: updated.fullName, phone: updated.phone },
    });
  } catch (err: any) {
    console.error("Update landlord error:", err);
    return res.status(500).json({ success: false, message: "Failed to update landlord", error: err.message });
  }
};

// GET /api/admin/properties
export const getAdminProperties = async (req: AuthRequest, res: Response) => {
  try {
    const { approvalStatus, status, search, city, roomType } = req.query;

    const whereClause: any = {};

    if (approvalStatus && approvalStatus !== "ALL") {
      whereClause.approvalStatus = String(approvalStatus).toUpperCase();
    }
    if (status && status !== "ALL") {
      whereClause.status = String(status).toUpperCase();
    }
    if (city) {
      whereClause.city = { equals: String(city), mode: "insensitive" };
    }
    if (roomType) {
      whereClause.roomType = String(roomType).toUpperCase();
    }
    if (search) {
      whereClause.OR = [
        { title: { contains: String(search), mode: "insensitive" } },
        { location: { contains: String(search), mode: "insensitive" } },
        { city: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const rooms = await prisma.room.findMany({
      where: whereClause,
      include: {
        roomImages: true,
        roomAmenities: { include: { amenity: true } },
        landlord: { select: { id: true, fullName: true, phone: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ success: true, count: rooms.length, rooms });
  } catch (error: any) {
    console.error("Get admin properties error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch properties", error: error.message });
  }
};

// GET /api/admin/properties/stats
export const getAdminPropertyStats = async (req: AuthRequest, res: Response) => {
  try {
    const [total, pending, approved, rejected] = await Promise.all([
      prisma.room.count(),
      prisma.room.count({ where: { approvalStatus: "PENDING" } }),
      prisma.room.count({ where: { approvalStatus: "APPROVED" } }),
      prisma.room.count({ where: { approvalStatus: "REJECTED" } }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        total,
        pending,
        approved,
        rejected,
      },
    });
  } catch (error: any) {
    console.error("Get admin property stats error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch property stats", error: error.message });
  }
};

// PATCH /api/admin/properties/:id/approval
export const updatePropertyApprovalStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { approvalStatus } = req.body;

    if (!approvalStatus || !["APPROVED", "REJECTED", "PENDING"].includes(approvalStatus)) {
      return res.status(400).json({ success: false, message: "Invalid approval status provided" });
    }

    const existingRoom = await prisma.room.findUnique({ where: { id } });
    if (!existingRoom) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: { approvalStatus },
      include: {
        roomImages: true,
        roomAmenities: { include: { amenity: true } },
        landlord: { select: { id: true, fullName: true, phone: true, email: true } },
      },
    });

    return res.status(200).json({
      success: true,
      message: `Property approval status updated to ${approvalStatus}`,
      room: updatedRoom,
    });
  } catch (error: any) {
    console.error("Update property approval status error:", error);
    return res.status(500).json({ success: false, message: "Failed to update property approval status", error: error.message });
  }
};