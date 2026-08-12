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

// GET /api/admin/bookings
// Powers AdminTenants.tsx — approved leases with tenant, room, and payment data.
// GET /api/admin/bookings
// Powers AdminTenants.tsx — lists ALL users with role = TENANT, along with their latest lease & payment data.
export const getAdminBookings = async (req: AuthRequest, res: Response) => {
  try {
    const { search, paymentStatus, sortBy } = req.query;

    const searchClause = search
      ? {
          OR: [
            { fullName: { contains: String(search), mode: "insensitive" as const } },
            { email: { contains: String(search), mode: "insensitive" as const } },
            { phone: { contains: String(search), mode: "insensitive" as const } },
          ],
        }
      : {};

    let orderBy: Record<string, unknown> = { createdAt: "desc" };
    if (sortBy === "OLDEST") orderBy = { createdAt: "asc" };
    if (sortBy === "NAME") orderBy = { fullName: "asc" };

    const tenants = await prisma.user.findMany({
      where: {
        role: "TENANT",
        ...searchClause,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        bookings: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            room: {
              include: {
                roomImages: true,
                landlord: { select: { id: true, fullName: true, email: true, phone: true } },
              },
            },
            payment: true,
          },
        },
      },
      orderBy,
    });

    let result = tenants.map((t) => {
      const latestBooking = t.bookings[0] || null;
      return {
        id: latestBooking?.id || t.id,
        tenantId: t.id,
        tenant: {
          id: t.id,
          fullName: t.fullName,
          email: t.email,
          phone: t.phone,
          avatarUrl: t.avatarUrl,
          isActive: t.isActive,
          createdAt: t.createdAt.toISOString(),
        },
        moveInDate: latestBooking?.moveInDate?.toISOString() || t.createdAt.toISOString(),
        endDate: latestBooking?.endDate?.toISOString(),
        status: latestBooking?.status || "APPROVED",
        room: latestBooking?.room,
        payment: latestBooking?.payment || { status: "PENDING" },
      };
    });

    if (paymentStatus && paymentStatus !== "ALL") {
      const targetStatus = String(paymentStatus).toUpperCase();
      result = result.filter((item) => item.payment?.status === targetStatus);
    }

    return res.status(200).json({ success: true, count: result.length, bookings: result, tenants: result });
  } catch (error: unknown) {
    console.error("Get admin bookings error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ success: false, message: "Failed to fetch bookings", error: message });
  }
};

// GET /api/admin/tenants/stats
export const getAdminTenantStats = async (req: AuthRequest, res: Response) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalTenants, activeLeases, pendingPayments, newTenants] = await Promise.all([
      prisma.user.count({ where: { role: "TENANT" } }),
      prisma.booking.count({ where: { status: "APPROVED" } }),
      prisma.booking.count({
        where: { status: "APPROVED", payment: { status: "PENDING" } },
      }),
      prisma.user.count({
        where: { role: "TENANT", createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        total: totalTenants,
        activeLeases,
        pendingPayments,
        newTenants,
      },
    });
  } catch (error: unknown) {
    console.error("Get admin tenant stats error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ success: false, message: "Failed to fetch tenant stats", error: message });
  }
};

// PATCH /api/admin/tenants/:id/status
export const toggleTenantStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ success: false, message: "isActive (boolean) is required" });
    }

    const tenant = await prisma.user.findUnique({ where: { id } });
    if (!tenant || tenant.role !== "TENANT") {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }

    const updated = await prisma.user.update({ where: { id }, data: { isActive } });

    return res.json({
      success: true,
      message: isActive ? "Tenant account reactivated" : "Tenant account suspended",
      isActive: updated.isActive,
    });
  } catch (err: any) {
    console.error("Toggle tenant status error:", err);
    return res.status(500).json({ success: false, message: "Failed to update tenant status", error: err.message });
  }
};

// PATCH /api/admin/tenants/:id
export const updateTenantProfile = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { fullName, phone, email } = req.body;

    const tenant = await prisma.user.findUnique({ where: { id } });
    if (!tenant || tenant.role !== "TENANT") {
      return res.status(404).json({ success: false, message: "Tenant not found" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(fullName !== undefined ? { fullName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
      },
    });

    return res.json({
      success: true,
      message: "Tenant updated successfully",
      tenant: { id: updated.id, fullName: updated.fullName, email: updated.email, phone: updated.phone },
    });
  } catch (err: any) {
    console.error("Update tenant error:", err);
    return res.status(500).json({ success: false, message: "Failed to update tenant", error: err.message });
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

// GET /api/admin/payments
// Powers AdminPayments.tsx
export const getAdminPayments = async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, propertyType, payerType, dateRange } = req.query;

    const payments = await prisma.payment.findMany({
      include: {
        booking: {
          include: {
            tenant: { select: { id: true, fullName: true, email: true, phone: true } },
            room: {
              select: {
                id: true,
                title: true,
                roomType: true,
                price: true,
                landlord: { select: { id: true, fullName: true, email: true, phone: true } },
              },
            },
          },
        },
        paymentMethod: { select: { id: true, type: true, label: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const rentInvoices = await prisma.rentInvoice.findMany({
      include: {
        booking: {
          include: {
            tenant: { select: { id: true, fullName: true, email: true, phone: true } },
            room: {
              select: {
                id: true,
                title: true,
                roomType: true,
                price: true,
                landlord: { select: { id: true, fullName: true, email: true, phone: true } },
              },
            },
          },
        },
        paymentMethod: { select: { id: true, type: true, label: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let result: any[] = [];

    payments.forEach((p) => {
      let displayStatus: "PAID" | "PENDING" | "OVERDUE" | "FAILED" | "REFUNDED" = p.status as any;

      if (p.status === "PENDING" && p.createdAt < new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)) {
        displayStatus = "OVERDUE";
      }

      result.push({
        id: p.id,
        bookingId: p.bookingId,
        transactionRef: p.transactionId || `TXN-${(10000 + p.id).toString()}`,
        customerName: p.booking?.tenant?.fullName || "Guest Tenant",
        tenantEmail: p.booking?.tenant?.email || "",
        tenantPhone: p.booking?.tenant?.phone || "",
        tenantId: p.booking?.tenant?.id || 0,
        payerType: "TENANT" as const,
        propertyTitle: p.booking?.room?.title || "Rental Unit",
        roomType: p.booking?.room?.roomType || "SINGLE",
        amount: p.amount,
        date: (p.paidAt || p.createdAt).toISOString(),
        status: displayStatus,
        paymentMethodLabel: p.paymentMethod?.label || p.paymentMethod?.type || "Standard Payment",
      });
    });

    rentInvoices.forEach((inv) => {
      let displayStatus: "PAID" | "PENDING" | "OVERDUE" | "FAILED" | "REFUNDED" = inv.status as any;
      if (inv.status === "PENDING" && new Date(inv.dueDate) < now) {
        displayStatus = "OVERDUE";
      }

      result.push({
        id: 500000 + inv.id,
        bookingId: inv.bookingId,
        transactionRef: inv.transactionId || `INV-${(30000 + inv.id).toString()}`,
        customerName: inv.booking?.tenant?.fullName || "Guest Tenant",
        tenantEmail: inv.booking?.tenant?.email || "",
        tenantPhone: inv.booking?.tenant?.phone || "",
        tenantId: inv.booking?.tenant?.id || 0,
        payerType: "TENANT" as const,
        propertyTitle: inv.booking?.room?.title || "Rental Unit",
        roomType: inv.booking?.room?.roomType || "SINGLE",
        amount: inv.amount,
        date: (inv.paidAt || inv.createdAt).toISOString(),
        status: displayStatus,
        paymentMethodLabel: inv.paymentMethod?.label || inv.paymentMethod?.type || "Monthly Rent Invoice",
      });
    });

    // Synthesize invoices for approved bookings without payment records yet
    const approvedBookingsWithoutPayment = await prisma.booking.findMany({
      where: {
        status: "APPROVED",
        payment: null,
        rentInvoices: { none: {} },
      },
      include: {
        tenant: { select: { id: true, fullName: true, email: true, phone: true } },
        room: { select: { id: true, title: true, roomType: true, price: true } },
      },
    });

    const pendingBookingTx = approvedBookingsWithoutPayment.map((b) => ({
      id: 900000 + b.id,
      bookingId: b.id,
      transactionRef: `INV-${(20000 + b.id).toString()}`,
      customerName: b.tenant?.fullName || `Tenant #${b.tenantId}`,
      tenantEmail: b.tenant?.email || "",
      tenantPhone: b.tenant?.phone || "",
      tenantId: b.tenantId,
      payerType: "TENANT" as const,
      propertyTitle: b.room?.title || "Rental Unit",
      roomType: b.room?.roomType || "SINGLE",
      amount: b.totalAmount || b.room?.price || 15000,
      date: b.createdAt.toISOString(),
      status: "PENDING" as const,
      paymentMethodLabel: "Pending Invoice",
    }));

    result = [...result, ...pendingBookingTx];

    // Apply Filters
    if (search) {
      const q = String(search).toLowerCase();
      result = result.filter(
        (t) =>
          t.customerName.toLowerCase().includes(q) ||
          t.transactionRef.toLowerCase().includes(q) ||
          t.propertyTitle.toLowerCase().includes(q) ||
          t.tenantEmail.toLowerCase().includes(q) ||
          t.tenantPhone.toLowerCase().includes(q)
      );
    }

    if (status && status !== "ALL") {
      result = result.filter((t) => t.status === String(status).toUpperCase());
    }

    if (propertyType && propertyType !== "ALL") {
      result = result.filter((t) => t.roomType === String(propertyType).toUpperCase());
    }

    if (payerType && payerType !== "ALL") {
      result = result.filter((t) => t.payerType === String(payerType).toUpperCase());
    }

    if (dateRange && dateRange !== "ALL_TIME") {
      result = result.filter((t) => {
        const d = new Date(t.date);
        if (dateRange === "THIS_MONTH") return d >= startOfMonth;
        if (dateRange === "LAST_MONTH") return d >= startOfLastMonth && d < startOfMonth;
        if (dateRange === "THIS_YEAR") return d >= startOfYear;
        return true;
      });
    }

    // Sort by date descending
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.status(200).json({ success: true, count: result.length, transactions: result });
  } catch (error: unknown) {
    console.error("Get admin payments error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ success: false, message: "Failed to fetch payments", error: message });
  }
};

// GET /api/admin/payments/stats
export const getAdminPaymentStats = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

    const [
      totalPaidAgg,
      totalPaidInvoiceAgg,
      thisMonthPaidAgg,
      thisMonthInvoicePaidAgg,
      lastMonthPaidAgg,
      lastMonthInvoicePaidAgg,
      pendingAgg,
      pendingInvoiceAgg,
      pendingTenantIds,
      overdueCount,
      overdueInvoiceCount,
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.rentInvoice.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: "PAID", paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.rentInvoice.aggregate({
        where: { status: "PAID", paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: "PAID", paidAt: { gte: startOfLastMonth, lt: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.rentInvoice.aggregate({
        where: { status: "PAID", paidAt: { gte: startOfLastMonth, lt: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: "PENDING" },
        _sum: { amount: true },
      }),
      prisma.rentInvoice.aggregate({
        where: { status: "PENDING" },
        _sum: { amount: true },
      }),
      prisma.booking.findMany({
        where: { status: "APPROVED", OR: [{ payment: null }, { payment: { status: "PENDING" } }] },
        select: { tenantId: true },
        distinct: ["tenantId"],
      }),
      prisma.payment.count({
        where: { status: "PENDING", createdAt: { lte: fifteenDaysAgo } },
      }),
      prisma.rentInvoice.count({
        where: { status: "PENDING", dueDate: { lte: now } },
      }),
    ]);

    const totalRevenue = (totalPaidAgg._sum.amount ?? 0) + (totalPaidInvoiceAgg._sum.amount ?? 0);
    const thisMonthCollections = (thisMonthPaidAgg._sum.amount ?? 0) + (thisMonthInvoicePaidAgg._sum.amount ?? 0);
    const lastMonthCollections = (lastMonthPaidAgg._sum.amount ?? 0) + (lastMonthInvoicePaidAgg._sum.amount ?? 0);

    let revenueGrowthPct = 0;
    if (lastMonthCollections > 0) {
      revenueGrowthPct = Math.round(((thisMonthCollections - lastMonthCollections) / lastMonthCollections) * 100);
    } else if (thisMonthCollections > 0) {
      revenueGrowthPct = 100;
    }

    const monthName = now.toLocaleString("default", { month: "long", year: "numeric" });

    return res.status(200).json({
      success: true,
      stats: {
        totalRevenue,
        revenueGrowthPct,
        pendingPayments: (pendingAgg._sum.amount ?? 0) + (pendingInvoiceAgg._sum.amount ?? 0),
        pendingTenantCount: pendingTenantIds.length,
        monthlyCollections: thisMonthCollections,
        monthlyCollectionsLabel: `Collection for ${monthName}`,
        overdueInvoices: overdueCount + overdueInvoiceCount,
      },
    });
  } catch (error: unknown) {
    console.error("Get admin payment stats error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ success: false, message: "Failed to fetch payment stats", error: message });
  }
};

// POST /api/admin/payments
export const createAdminPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, amount, paymentMethod, status, transactionId } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({ success: false, message: "Booking ID and Amount are required" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: Number(bookingId) },
      include: { tenant: true, room: true },
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking record not found" });
    }

    const methodType = (paymentMethod || "CASH").toUpperCase() as any;
    let pm = await prisma.paymentMethod.findFirst({
      where: { userId: booking.tenantId, type: methodType },
    });

    if (!pm) {
      pm = await prisma.paymentMethod.create({
        data: {
          userId: booking.tenantId,
          type: methodType === "ESEWA" || methodType === "KHALTI" || methodType === "BANK" ? methodType : "CASH",
          label: `${methodType} Payment`,
        },
      });
    }

    const finalStatus = (status || "PAID").toUpperCase() as any;
    const refId = transactionId || `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

    const newPayment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: Number(amount),
        paymentMethodId: pm.id,
        transactionId: refId,
        status: finalStatus,
        paidAt: finalStatus === "PAID" ? new Date() : null,
      },
      include: {
        booking: {
          include: {
            tenant: { select: { id: true, fullName: true, email: true, phone: true } },
            room: { select: { id: true, title: true, roomType: true, price: true } },
          },
        },
        paymentMethod: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Payment of Rs. ${amount} successfully recorded`,
      payment: newPayment,
    });
  } catch (error: any) {
    console.error("Create admin payment error:", error);
    return res.status(500).json({ success: false, message: "Failed to record payment", error: error.message });
  }
};

// PATCH /api/admin/payments/:id/status
export const updateAdminPaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!status || !["PAID", "PENDING", "FAILED", "REFUNDED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid payment status" });
    }

    if (id >= 500000 && id < 900000) {
      const invoiceId = id - 500000;
      const updatedInvoice = await prisma.rentInvoice.update({
        where: { id: invoiceId },
        data: {
          status: status as any,
          ...(status === "PAID" ? { paidAt: new Date() } : {}),
        },
      });
      return res.json({ success: true, message: `Rent invoice status updated to ${status}`, payment: updatedInvoice });
    } else if (id < 500000) {
      const updated = await prisma.payment.update({
        where: { id },
        data: {
          status: status as any,
          ...(status === "PAID" ? { paidAt: new Date() } : {}),
        },
      });
      return res.json({ success: true, message: `Payment updated to ${status}`, payment: updated });
    } else {
      const bookingId = id - 900000;
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

      let defaultPm = await prisma.paymentMethod.findFirst({ where: { userId: booking.tenantId } });
      if (!defaultPm) {
        defaultPm = await prisma.paymentMethod.create({
          data: {
            userId: booking.tenantId,
            type: "CASH",
            label: "Manual Admin Payment",
          },
        });
      }

      const newPayment = await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: booking.totalAmount || 15000,
          paymentMethodId: defaultPm.id,
          status: status as any,
          paidAt: status === "PAID" ? new Date() : null,
          transactionId: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        },
      });

      return res.json({ success: true, message: `Payment recorded as ${status}`, payment: newPayment });
    }
  } catch (error: any) {
    console.error("Update admin payment status error:", error);
    return res.status(500).json({ success: false, message: "Failed to update payment", error: error.message });
  }
};

// GET /api/admin/complaints
// Powers AdminMaintenance.tsx
export const getAdminMaintenanceRequests = async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, priority, dateRange } = req.query;

    const complaints = await prisma.complaint.findMany({
      include: {
        booking: {
          include: {
            room: {
              select: {
                id: true,
                title: true,
                city: true,
                location: true,
                landlord: { select: { id: true, fullName: true, email: true, phone: true } },
              },
            },
            tenant: { select: { id: true, fullName: true, email: true, phone: true } },
          },
        },
        user: { select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const startOf7DaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOf30DaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let requests = complaints.map((c) => {
      // Priority estimation based on keywords in title/description
      let computedPriority: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
      const combinedText = `${c.title} ${c.description}`.toLowerCase();
      if (combinedText.includes("urgent") || combinedText.includes("leak") || combinedText.includes("emergency") || combinedText.includes("broken") || combinedText.includes("water") || combinedText.includes("electric")) {
        computedPriority = "HIGH";
      } else if (combinedText.includes("clean") || combinedText.includes("paint") || combinedText.includes("bulb") || combinedText.includes("key")) {
        computedPriority = "LOW";
      }

      return {
        id: c.id,
        bookingId: c.bookingId,
        title: c.title,
        description: c.description,
        priority: computedPriority,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt?.toISOString(),
        room: c.booking?.room || { id: 0, title: "General Facility", city: "Kathmandu", location: "Main Property" },
        user: c.user || c.booking?.tenant || { id: 0, fullName: "Tenant User", email: "", phone: "" },
        assignedTo: c.booking?.room?.landlord || null,
      };
    });

    // Apply Filtering
    if (search) {
      const q = String(search).toLowerCase();
      requests = requests.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.room?.title?.toLowerCase().includes(q) ||
          r.user?.fullName?.toLowerCase().includes(q) ||
          r.user?.email?.toLowerCase().includes(q) ||
          `tkt-${1000 + r.id}`.includes(q)
      );
    }

    if (status && status !== "ALL") {
      requests = requests.filter((r) => r.status === String(status).toUpperCase());
    }

    if (priority && priority !== "ALL") {
      requests = requests.filter((r) => r.priority === String(priority).toUpperCase());
    }

    if (dateRange && dateRange !== "ALL_TIME") {
      requests = requests.filter((r) => {
        const d = new Date(r.createdAt);
        if (dateRange === "LAST_7_DAYS") return d >= startOf7DaysAgo;
        if (dateRange === "LAST_30_DAYS") return d >= startOf30DaysAgo;
        if (dateRange === "THIS_YEAR") return d >= startOfYear;
        return true;
      });
    }

    return res.status(200).json({ success: true, count: requests.length, requests });
  } catch (error: unknown) {
    console.error("Get admin maintenance error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ success: false, message: "Failed to fetch maintenance requests", error: message });
  }
};

// POST /api/admin/complaints
export const createAdminMaintenanceTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, title, description, status } = req.body;

    if (!bookingId || !title || !description) {
      return res.status(400).json({ success: false, message: "Booking, Title, and Description are required" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: Number(bookingId) },
      include: { tenant: true },
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking record not found" });
    }

    const newTicket = await prisma.complaint.create({
      data: {
        bookingId: booking.id,
        userId: booking.tenantId,
        title,
        description,
        status: (status || "PENDING").toUpperCase() as any,
      },
      include: {
        booking: {
          include: {
            room: { select: { id: true, title: true, city: true, location: true, landlord: true } },
            tenant: { select: { id: true, fullName: true, email: true, phone: true } },
          },
        },
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Maintenance ticket created successfully",
      ticket: newTicket,
    });
  } catch (error: any) {
    console.error("Create maintenance ticket error:", error);
    return res.status(500).json({ success: false, message: "Failed to create ticket", error: error.message });
  }
};

// PATCH /api/admin/complaints/:id/status
export const updateAdminMaintenanceStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const validStatuses = ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"];
    if (!status || !validStatuses.includes(String(status).toUpperCase())) {
      return res.status(400).json({ success: false, message: "Invalid status provided" });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Maintenance ticket not found" });
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: { status: String(status).toUpperCase() as any },
    });

    return res.status(200).json({
      success: true,
      message: `Ticket status updated to ${status}`,
      ticket: updated,
    });
  } catch (error: any) {
    console.error("Update maintenance status error:", error);
    return res.status(500).json({ success: false, message: "Failed to update status", error: error.message });
  }
};

// DELETE /api/admin/complaints/:id
export const deleteAdminMaintenanceTicket = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Maintenance ticket not found" });
    }

    await prisma.complaint.delete({ where: { id } });

    return res.status(200).json({ success: true, message: "Maintenance ticket deleted" });
  } catch (error: any) {
    console.error("Delete maintenance ticket error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete ticket", error: error.message });
  }
};

// GET /api/admin/activity
export const getAdminActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { category, search } = req.query;

    const [payments, invoices, complaints, rooms, bookings, tenants, landlords] = await Promise.all([
      prisma.payment.findMany({
        take: 35,
        orderBy: { createdAt: "desc" },
        include: {
          booking: {
            include: {
              tenant: { select: { id: true, fullName: true, email: true } },
              room: { select: { id: true, title: true } },
            },
          },
        },
      }),
      prisma.rentInvoice.findMany({
        take: 35,
        orderBy: { createdAt: "desc" },
        include: {
          booking: {
            include: {
              tenant: { select: { id: true, fullName: true, email: true } },
              room: { select: { id: true, title: true } },
            },
          },
        },
      }),
      prisma.complaint.findMany({
        take: 35,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          booking: { include: { room: { select: { id: true, title: true } } } },
        },
      }),
      prisma.room.findMany({
        take: 35,
        orderBy: { createdAt: "desc" },
        include: { landlord: { select: { id: true, fullName: true, email: true } } },
      }),
      prisma.booking.findMany({
        take: 35,
        orderBy: { createdAt: "desc" },
        include: {
          tenant: { select: { id: true, fullName: true, email: true } },
          room: { select: { id: true, title: true } },
        },
      }),
      prisma.user.findMany({
        where: { role: "TENANT" },
        take: 35,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { role: "LANDLORD" },
        take: 35,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const entries: any[] = [];

    // Map payments
    payments.forEach((p) => {
      entries.push({
        id: `pay-${p.id}`,
        category: "PAYMENT",
        title: p.status === "PAID" ? "Payment Received" : "Payment Settlement Pending",
        description: `Rs. ${p.amount.toLocaleString()} payment for ${p.booking?.room?.title || "Property"} by ${p.booking?.tenant?.fullName || "Tenant"}`,
        createdAt: (p.paidAt || p.createdAt).toISOString(),
        status: p.status,
        metadata: { paymentId: p.id, tenantId: p.booking?.tenant?.id, targetRoute: "payments" },
      });
    });

    // Map rent invoices
    invoices.forEach((inv) => {
      entries.push({
        id: `inv-${inv.id}`,
        category: "PAYMENT",
        title: inv.status === "PAID" ? "Rent Invoice Paid" : "Monthly Rent Invoice Due",
        description: `Rs. ${inv.amount.toLocaleString()} rent invoice for ${inv.booking?.room?.title || "Property"} (${inv.booking?.tenant?.fullName || "Tenant"})`,
        createdAt: (inv.paidAt || inv.createdAt).toISOString(),
        status: inv.status,
        metadata: { invoiceId: inv.id, tenantId: inv.booking?.tenant?.id, targetRoute: "payments" },
      });
    });

    // Map maintenance complaints
    complaints.forEach((c) => {
      entries.push({
        id: `maint-${c.id}`,
        category: "MAINTENANCE",
        title: `Maintenance Request: ${c.title}`,
        description: `${c.description.slice(0, 90)} — ${c.booking?.room?.title || "Unit"} (${c.user?.fullName || "Tenant"})`,
        createdAt: c.createdAt.toISOString(),
        status: c.status,
        metadata: { complaintId: c.id, tenantId: c.userId, targetRoute: "maintenance" },
      });
    });

    // Map properties
    rooms.forEach((r) => {
      entries.push({
        id: `room-${r.id}`,
        category: "PROPERTY",
        title: `New Property Listed: ${r.title}`,
        description: `${r.roomType} in ${r.city}, ${r.location} — Rs. ${r.price.toLocaleString()}/mo (Owner: ${r.landlord?.fullName || "Landlord"})`,
        createdAt: r.createdAt.toISOString(),
        status: r.approvalStatus || r.status,
        metadata: { roomId: r.id, landlordId: r.landlordId, targetRoute: "properties" },
      });
    });

    // Map bookings
    bookings.forEach((b) => {
      entries.push({
        id: `book-${b.id}`,
        category: "TENANT",
        title: `Lease Booking ${b.status}: ${b.room?.title || "Property"}`,
        description: `Tenant ${b.tenant?.fullName || "User"} requested move-in for ${new Date(b.moveInDate).toLocaleDateString()}`,
        createdAt: b.createdAt.toISOString(),
        status: b.status,
        metadata: { bookingId: b.id, tenantId: b.tenantId, targetRoute: "tenants" },
      });
    });

    // Map new tenant signups
    tenants.forEach((t) => {
      entries.push({
        id: `user-tenant-${t.id}`,
        category: "TENANT",
        title: `New Tenant Account Registered`,
        description: `${t.fullName} (${t.email}) joined Room Finder platform`,
        createdAt: t.createdAt.toISOString(),
        status: t.isActive ? "ACTIVE" : "SUSPENDED",
        metadata: { tenantId: t.id, role: "TENANT", targetRoute: "tenants" },
      });
    });

    // Map new landlord signups
    landlords.forEach((l) => {
      entries.push({
        id: `user-landlord-${l.id}`,
        category: "LANDLORD",
        title: `New Landlord Registered`,
        description: `${l.fullName} (${l.email}) registered as Property Owner`,
        createdAt: l.createdAt.toISOString(),
        status: l.isActive ? "ACTIVE" : "SUSPENDED",
        metadata: { landlordId: l.id, role: "LANDLORD", targetRoute: "landlords" },
      });
    });

    // Sort by date descending
    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let filtered = entries;

    if (category && category !== "ALL") {
      filtered = filtered.filter((e) => e.category === String(category).toUpperCase());
    }

    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        (e) => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)
      );
    }

    return res.status(200).json({ success: true, count: filtered.length, entries: filtered });
  } catch (error: unknown) {
    console.error("Get admin activity error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ success: false, message: "Failed to fetch activity log", error: message });
  }
};