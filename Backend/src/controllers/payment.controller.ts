import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

export const getMyPayments = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.id;

    const payments = await prisma.payment.findMany({
      where: {
        booking: { tenantId },
      },
      include: {
        booking: {
          include: {
            room: {
              include: { roomImages: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error("Get payments error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch payments" });
  }
};

export const createPayment = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.id;
    const { bookingId, paymentMethod } = req.body;

    if (!bookingId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "bookingId and paymentMethod are required",
      });
    }

    if (!["ESEWA", "KHALTI", "CASH", "BANK"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: Number(bookingId) },
      include: { payment: true, room: true },
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.tenantId !== tenantId) {
      return res.status(403).json({ success: false, message: "Not authorized to pay for this booking" });
    }

    if (booking.status !== "APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Payment can only be made for approved bookings",
      });
    }

    if (booking.payment?.status === "PAID") {
      return res.status(400).json({ success: false, message: "This booking is already paid" });
    }

    const amount = booking.totalAmount || booking.room.price;
    const transactionId = `TXN-${Date.now()}-${booking.id}`;

    const payment = booking.payment
      ? await prisma.payment.update({
          where: { id: booking.payment.id },
          data: {
            amount,
            paymentMethod: paymentMethod as any,
            transactionId,
            status: "PAID",
            paidAt: new Date(),
          },
          include: {
            booking: {
              include: {
                room: { include: { roomImages: true } },
              },
            },
          },
        })
      : await prisma.payment.create({
          data: {
            bookingId: booking.id,
            amount,
            paymentMethod: paymentMethod as any,
            transactionId,
            status: "PAID",
            paidAt: new Date(),
          },
          include: {
            booking: {
              include: {
                room: { include: { roomImages: true } },
              },
            },
          },
        });

    await prisma.notification.create({
      data: {
        userId: tenantId,
        title: "Rent Payment Successful",
        message: `Your payment of Rs. ${amount.toLocaleString()} for ${booking.room.title} was successful.`,
        type: "PAYMENT",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Payment completed successfully",
      payment,
    });
  } catch (error) {
    console.error("Create payment error:", error);
    return res.status(500).json({ success: false, message: "Failed to process payment" });
  }
};
