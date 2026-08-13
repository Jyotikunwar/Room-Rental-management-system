import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

// Adds a computed "isOverdue"/effective status without ever storing
// "OVERDUE" in the database — a PENDING invoice past its dueDate reads as
// overdue in the API response only.
function withComputedStatus<T extends { status: string; dueDate: Date }>(invoice: T) {
  const isOverdue = invoice.status === "PENDING" && new Date(invoice.dueDate) < new Date();
  return { ...invoice, effectiveStatus: isOverdue ? "OVERDUE" : invoice.status };
}

// GET /api/rent-invoices/tenant (protected - TENANT)
export const getTenantRentInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.id;

    const invoices = await prisma.rentInvoice.findMany({
      where: { booking: { tenantId } },
      include: {
        booking: {
          include: { room: { select: { id: true, title: true, city: true, location: true } } },
        },
      },
      orderBy: { dueDate: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: invoices.length,
      invoices: invoices.map(withComputedStatus),
    });
  } catch (error) {
    console.error("Get tenant rent invoices error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch invoices" });
  }
};

// GET /api/rent-invoices/landlord?status=&propertyId= (protected - LANDLORD)
export const getLandlordRentInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const landlordId = req.user!.id;
    const { status, propertyId } = req.query;

    const invoices = await prisma.rentInvoice.findMany({
      where: {
        booking: {
          room: {
            landlordId,
            ...(propertyId && { id: Number(propertyId) }),
          },
        },
        ...(status && status !== "OVERDUE" && { status: status as any }),
      },
      include: {
        booking: {
          include: {
            room: { select: { id: true, title: true, city: true, location: true } },
            tenant: { select: { id: true, fullName: true, email: true, phone: true } },
          },
        },
      },
      orderBy: { dueDate: "desc" },
    });

    let mapped = invoices.map(withComputedStatus);
    // "OVERDUE" isn't a stored status, so filter for it after computing.
    if (status === "OVERDUE") {
      mapped = mapped.filter((inv) => inv.effectiveStatus === "OVERDUE");
    }

    return res.status(200).json({
      success: true,
      count: mapped.length,
      invoices: mapped,
    });
  } catch (error) {
    console.error("Get landlord rent invoices error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch invoices" });
  }
};

// GET /api/rent-invoices/landlord/stats (protected - LANDLORD)
export const getLandlordInvoiceStats = async (req: AuthRequest, res: Response) => {
  try {
    const landlordId = req.user!.id;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const scopeWhere = { booking: { room: { landlordId } } };

    const [totalRevenueAgg, thisMonthAgg, pendingAgg, allPending] = await Promise.all([
      prisma.rentInvoice.aggregate({ _sum: { amount: true }, where: { ...scopeWhere, status: "PAID" } }),
      prisma.rentInvoice.aggregate({
        _sum: { amount: true },
        where: { ...scopeWhere, status: "PAID", paidAt: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.rentInvoice.aggregate({ _sum: { amount: true }, _count: true, where: { ...scopeWhere, status: "PENDING" } }),
      prisma.rentInvoice.findMany({ where: { ...scopeWhere, status: "PENDING" }, select: { amount: true, dueDate: true } }),
    ]);

    const overdue = allPending.filter((inv) => new Date(inv.dueDate) < now);
    const overdueAmount = overdue.reduce((sum, inv) => sum + inv.amount, 0);

    return res.status(200).json({
      success: true,
      stats: {
        totalRevenue: totalRevenueAgg._sum.amount || 0,
        monthlyCollections: thisMonthAgg._sum.amount || 0,
        pendingAmount: pendingAgg._sum.amount || 0,
        pendingCount: pendingAgg._count,
        overdueAmount,
        overdueCount: overdue.length,
      },
    });
  } catch (error) {
    console.error("Get landlord invoice stats error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch payment stats" });
  }
};

// POST /api/rent-invoices/:id/pay (protected - TENANT)
export const payRentInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;
    const tenantId = req.user!.id;

    if (!paymentMethod || !["CASH"].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: "Valid paymentMethod (CASH) is required" });
    }

    const invoice = await prisma.rentInvoice.findUnique({
      where: { id: Number(id) },
      include: { booking: { include: { room: true } } },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    if (invoice.booking.tenantId !== tenantId) {
      return res.status(403).json({ success: false, message: "Not authorized for this invoice" });
    }
    if (invoice.status === "PAID") {
      return res.status(400).json({ success: false, message: "This invoice is already paid" });
    }

    const updated = await prisma.rentInvoice.update({
      where: { id: Number(id) },
      data: {
        status: "PAID",
        paymentMethod: paymentMethod as any,
        transactionId: `RENT-${Date.now()}-${invoice.id}`,
        paidAt: new Date(),
      },
    });

    await prisma.notification.create({
      data: {
        userId: invoice.booking.room.landlordId,
        title: "Rent Received",
        message: `Rent of Rs. ${invoice.amount.toLocaleString()} received for ${invoice.booking.room.title}.`,
        type: "PAYMENT",
      },
    });

    return res.status(200).json({ success: true, message: "Payment successful", invoice: updated });
  } catch (error) {
    console.error("Pay rent invoice error:", error);
    return res.status(500).json({ success: false, message: "Failed to process payment" });
  }
};

// POST /api/rent-invoices/:id/remind (protected - LANDLORD)
export const sendRentReminder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const landlordId = req.user!.id;

    const invoice = await prisma.rentInvoice.findUnique({
      where: { id: Number(id) },
      include: { booking: { include: { room: true, tenant: true } } },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    if (invoice.booking.room.landlordId !== landlordId) {
      return res.status(403).json({ success: false, message: "Not authorized for this invoice" });
    }

    await prisma.notification.create({
      data: {
        userId: invoice.booking.tenantId,
        title: "Rent Payment Reminder",
        message: `A payment of Rs. ${invoice.amount.toLocaleString()} for ${invoice.booking.room.title} is due.`,
        type: "PAYMENT",
      },
    });

    return res.status(200).json({ success: true, message: "Reminder sent" });
  } catch (error) {
    console.error("Send rent reminder error:", error);
    return res.status(500).json({ success: false, message: "Failed to send reminder" });
  }
};

// POST /api/rent-invoices/:id/confirm-cash (protected - LANDLORD)
export const confirmLandlordCashReceived = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const landlordId = req.user!.id;

    const invoice = await prisma.rentInvoice.findUnique({
      where: { id: Number(id) },
      include: { booking: { include: { room: true, tenant: true } } },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    if (invoice.booking.room.landlordId !== landlordId) {
      return res.status(403).json({ success: false, message: "Not authorized for this invoice" });
    }
    if (invoice.status === "PAID") {
      return res.status(400).json({ success: false, message: "This invoice is already marked as paid" });
    }

    const updated = await prisma.rentInvoice.update({
      where: { id: Number(id) },
      data: {
        status: "PAID",
        paymentMethod: "CASH" as any,
        transactionId: `CASH-REC-${Date.now()}-${invoice.id}`,
        paidAt: new Date(),
      },
    });

    await prisma.notification.create({
      data: {
        userId: invoice.booking.tenantId,
        title: "Cash Payment Confirmed",
        message: `Your cash payment of Rs. ${invoice.amount.toLocaleString()} for ${invoice.booking.room.title} has been confirmed by your landlord.`,
        type: "PAYMENT",
      },
    });

    return res.status(200).json({ success: true, message: "Cash payment confirmed successfully", invoice: updated });
  } catch (error) {
    console.error("Confirm landlord cash received error:", error);
    return res.status(500).json({ success: false, message: "Failed to confirm cash payment" });
  }
};