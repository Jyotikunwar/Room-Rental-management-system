import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

// POST /api/complaints (protected - TENANT)
export const createComplaint = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, title, description } = req.body;

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
      data: { bookingId: Number(bookingId), userId: req.user!.id, title, description },
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