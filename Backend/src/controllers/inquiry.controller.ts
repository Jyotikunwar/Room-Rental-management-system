import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

// POST /api/inquiries -> Tenant sends an inquiry/message about a room
export const sendInquiry = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId, message } = req.body;
    const senderId = req.user!.id;

    if (!roomId || !message || message.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "roomId and message content are required",
      });
    }

    // Server-side lookup of room to get authoritative landlordId
    const room = await prisma.room.findUnique({
      where: { id: Number(roomId) },
      select: { id: true, title: true, landlordId: true },
    });

    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    // Prevent tenant from messaging themselves if they own the room
    if (room.landlordId === senderId) {
      return res.status(400).json({
        success: false,
        message: "You cannot send an inquiry for your own room listing",
      });
    }

    const inquiry = await prisma.message.create({
      data: {
        senderId,
        receiverId: room.landlordId,
        roomId: room.id,
        message: message.trim(),
      },
      include: {
        room: { select: { id: true, title: true, city: true, location: true } },
        receiver: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Inquiry sent successfully to the landlord",
      inquiry,
    });
  } catch (error) {
    console.error("Send inquiry error:", error);
    return res.status(500).json({ success: false, message: "Failed to send inquiry" });
  }
};

// GET /api/inquiries/received -> Landlord views inquiries received about their rooms
export const getReceivedInquiries = async (req: AuthRequest, res: Response) => {
  try {
    const landlordId = req.user!.id;

    const inquiries = await prisma.message.findMany({
      where: { receiverId: landlordId },
      include: {
        sender: { select: { id: true, fullName: true, email: true, phone: true } },
        room: { select: { id: true, title: true, city: true, location: true, price: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: inquiries.length,
      inquiries,
    });
  } catch (error) {
    console.error("Get received inquiries error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch received inquiries" });
  }
};

// GET /api/inquiries/sent -> Tenant views their sent inquiries
export const getSentInquiries = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user!.id;

    const inquiries = await prisma.message.findMany({
      where: { senderId: tenantId },
      include: {
        receiver: { select: { id: true, fullName: true, email: true, phone: true } },
        room: { select: { id: true, title: true, city: true, location: true, price: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: inquiries.length,
      inquiries,
    });
  } catch (error) {
    console.error("Get sent inquiries error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch sent inquiries" });
  }
};
