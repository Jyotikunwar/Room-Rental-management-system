import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

// POST /api/complaints (protected - TENANT)
export const createComplaint = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, title, description, priority } = req.body;

    if (!bookingId || !title || !description) {
      return res.status(400).json({ success: false, message: "bookingId, title and description are required" });
    }

    const booking = await prisma.booking.findUnique({ where: { id: Number(bookingId) } });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    if (booking.tenantId !== req.user!.id) {
      return res.status(403).json({ success: false, message: "Not authorized for this booking" });
    }

    const complaint = await prisma.complaint.create({
      data: {
        bookingId: Number(bookingId),
        userId: req.user!.id,
        title,
        description,
        ...(priority && { priority }),
      },
    });

    return res.status(201).json({ success: true, message: "Request submitted", complaint });
  } catch (error) {
    console.error("Create complaint error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// GET /api/complaints/my?bookingId=123 (protected)
export const getMyComplaints = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId } = req.query;

    const complaints = await prisma.complaint.findMany({
      where: {
        userId: req.user!.id,
        ...(bookingId && { bookingId: Number(bookingId) }),
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ success: true, count: complaints.length, complaints });
  } catch (error) {
    console.error("Get my complaints error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// GET /api/complaints/landlord (protected - LANDLORD)
// Lists complaints filed against bookings on rooms this landlord owns.
export const getLandlordComplaints = async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority } = req.query;

    const complaints = await prisma.complaint.findMany({
      where: {
        booking: {
          room: { landlordId: req.user!.id },
        },
        ...(status && { status: status as any }),
        ...(priority && { priority: priority as any }),
      },
      include: {
        booking: {
          include: {
            room: { select: { id: true, title: true, city: true, location: true } },
          },
        },
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ success: true, count: complaints.length, complaints });
  } catch (error) {
    console.error("Get landlord complaints error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// PATCH /api/complaints/:id/status (protected - LANDLORD, owner only)
export const updateComplaintStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: Number(id) },
      include: { booking: { include: { room: true } } },
    });

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    if (complaint.booking.room.landlordId !== req.user!.id) {
      return res.status(403).json({ success: false, message: "Not authorized for this request" });
    }

    const updated = await prisma.complaint.update({
      where: { id: Number(id) },
      data: { status },
    });

    return res.status(200).json({ success: true, message: "Status updated", complaint: updated });
  } catch (error) {
    console.error("Update complaint status error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};