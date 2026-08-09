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

    const room = await prisma.room.findUnique({
      where: { id: Number(roomId) },
      select: { id: true, title: true, landlordId: true },
    });

    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

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

// POST /api/inquiries/reply -> Landlord (or tenant, in an existing thread)
// replies to a message thread about a specific room. Unlike sendInquiry,
// the receiver is passed explicitly rather than inferred, since a landlord
// replying isn't "inquiring" about their own room.
export const replyToInquiry = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId, receiverId, message } = req.body;
    const senderId = req.user!.id;

    if (!roomId || !receiverId || !message || message.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "roomId, receiverId, and message content are required",
      });
    }

    const room = await prisma.room.findUnique({ where: { id: Number(roomId) } });
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    // A landlord may only reply on threads about their own rooms.
    if (req.user!.role === "LANDLORD" && room.landlordId !== senderId) {
      return res.status(403).json({ success: false, message: "Not authorized to reply on this room's thread" });
    }

    const reply = await prisma.message.create({
      data: {
        senderId,
        receiverId: Number(receiverId),
        roomId: room.id,
        message: message.trim(),
      },
      include: {
        room: { select: { id: true, title: true, city: true, location: true } },
        receiver: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    });

    return res.status(201).json({ success: true, message: "Reply sent", inquiry: reply });
  } catch (error) {
    console.error("Reply to inquiry error:", error);
    return res.status(500).json({ success: false, message: "Failed to send reply" });
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