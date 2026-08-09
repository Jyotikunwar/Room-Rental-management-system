import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";
import { generateInvoicesForBooking } from "../services/rentInvoice.service";

// POST /api/bookings -> Tenant submits a booking request
export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId, moveInDate, endDate, notes } = req.body;
    const tenantId = req.user!.id;

    if (!roomId || !moveInDate) {
      return res.status(400).json({
        success: false,
        message: "roomId and moveInDate are required",
      });
    }

    const room = await prisma.room.findUnique({
      where: { id: Number(roomId) },
    });

    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    if (room.status !== "AVAILABLE") {
      return res.status(400).json({
        success: false,
        message: "Room is currently not available for booking",
      });
    }

    if (room.landlordId === tenantId) {
      return res.status(400).json({
        success: false,
        message: "You cannot book your own room listing",
      });
    }

    const existingBooking = await prisma.booking.findFirst({
      where: {
        tenantId,
        roomId: Number(roomId),
        status: { in: ["PENDING", "APPROVED"] },
      },
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: "You already have an active booking request for this room",
      });
    }

    const booking = await prisma.booking.create({
      data: {
        roomId: Number(roomId),
        tenantId,
        moveInDate: new Date(moveInDate),
        endDate: endDate ? new Date(endDate) : null,
        totalAmount: room.price,
        notes: notes ? String(notes).trim() : null,
        status: "PENDING",
      },
      include: {
        room: {
          include: {
            roomImages: true,
            landlord: { select: { id: true, fullName: true, phone: true, email: true } },
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Booking request submitted successfully",
      booking,
    });
  } catch (error) {
    console.error("Create booking error:", error);
    return res.status(500).json({ success: false, message: "Failed to submit booking request" });
  }
};

// GET /api/bookings/my-bookings -> Tenant views their bookings
export const getTenantBookings = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.id;

    const bookings = await prisma.booking.findMany({
      where: { tenantId },
      include: {
        room: {
          include: {
            roomImages: true,
            landlord: { select: { id: true, fullName: true, phone: true, email: true } },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Get tenant bookings error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch tenant bookings" });
  }
};

// GET /api/bookings/landlord -> Landlord views incoming booking requests for their properties
export const getLandlordBookings = async (req: AuthRequest, res: Response) => {
  try {
    const landlordId = req.user!.id;

    const bookings = await prisma.booking.findMany({
      where: {
        room: {
          landlordId,
        },
      },
      include: {
        tenant: { select: { id: true, fullName: true, email: true, phone: true } },
        room: {
          include: {
            roomImages: true,
          },
        },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Get landlord bookings error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch landlord bookings" });
  }
};

// PATCH /api/bookings/:id/status -> Landlord approves or rejects booking request
export const updateBookingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const landlordId = req.user!.id;

    if (!["APPROVED", "REJECTED", "COMPLETED", "CANCELLED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Must be APPROVED, REJECTED, COMPLETED, or CANCELLED",
      });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: Number(id) },
      include: { room: true },
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.room.landlordId !== landlordId && req.user!.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update status for this booking",
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: Number(id) },
      data: { status: status as any },
      include: {
        tenant: { select: { id: true, fullName: true, email: true, phone: true } },
        room: true,
      },
    });

    if (status === "APPROVED") {
      await prisma.room.update({
        where: { id: booking.roomId },
        data: { status: "BOOKED" },
      });
      // Generate the recurring rent schedule now that the lease is confirmed.
      await generateInvoicesForBooking(booking.id);
    } else if (status === "CANCELLED" || status === "REJECTED") {
      if (booking.room.status === "BOOKED" && booking.status === "APPROVED") {
        await prisma.room.update({
          where: { id: booking.roomId },
          data: { status: "AVAILABLE" },
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Update booking status error:", error);
    return res.status(500).json({ success: false, message: "Failed to update booking status" });
  }
};

// PATCH /api/bookings/:id/cancel -> Tenant cancels their pending booking
export const cancelBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.id;

    const booking = await prisma.booking.findUnique({
      where: { id: Number(id) },
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this booking",
      });
    }

    if (booking.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only PENDING bookings can be cancelled",
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: Number(id) },
      data: { status: "CANCELLED" },
    });

    return res.status(200).json({
      success: true,
      message: "Booking request cancelled",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return res.status(500).json({ success: false, message: "Failed to cancel booking" });
  }
};