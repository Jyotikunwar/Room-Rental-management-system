import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

function isOnline(lastActiveAt: Date | null): boolean {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < ONLINE_THRESHOLD_MS;
}

const safeContact = (user: any) => ({
  id: user.id,
  fullName: user.fullName,
  role: user.role,
  phone: user.phone,
  email: user.email,
  avatarUrl: user.avatarUrl,
  isOnline: isOnline(user.lastActiveAt),
});

// GET /api/messages/conversations
// One row per contact you've exchanged messages with, newest first.
export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { createdAt: "desc" },
      include: { sender: true, receiver: true },
    });

    const conversations = new Map<
      number,
      { contact: any; lastMessage: any; unreadCount: number }
    >();

    for (const m of messages) {
      const contact = m.senderId === userId ? m.receiver : m.sender;
      if (!conversations.has(contact.id)) {
        conversations.set(contact.id, { contact, lastMessage: m, unreadCount: 0 });
      }
      if (m.receiverId === userId && !m.isRead) {
        conversations.get(contact.id)!.unreadCount += 1;
      }
    }

    const result = Array.from(conversations.values()).map((c) => ({
      contact: safeContact(c.contact),
      lastMessage: {
        text: c.lastMessage.message,
        createdAt: c.lastMessage.createdAt,
        fromMe: c.lastMessage.senderId === userId,
      },
      unreadCount: c.unreadCount,
    }));

    return res.json({ success: true, conversations: result });
  } catch (error) {
    console.error("Get conversations error:", error);
    return res.status(500).json({ success: false, message: "Failed to load conversations" });
  }
};

// GET /api/messages/:contactId
// Full thread with one contact, oldest first. Marks their messages as read.
export const getMessagesWithContact = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const contactId = Number(req.params.contactId);

    const contact = await prisma.user.findUnique({ where: { id: contactId } });
    if (!contact) return res.status(404).json({ success: false, message: "Contact not found" });

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: contactId },
          { senderId: contactId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    await prisma.message.updateMany({
      where: { senderId: contactId, receiverId: userId, isRead: false },
      data: { isRead: true },
    });

    // Property context for the right-hand panel: the tenant's booking
    // (any status) tied to a room owned by this contact.
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          { tenantId: userId, room: { landlordId: contactId } },
          { tenantId: contactId, room: { landlordId: userId } },
        ],
      },
      include: { room: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      contact: safeContact(contact),
      messages: messages.map((m) => ({
        id: m.id,
        text: m.message,
        senderId: m.senderId,
        fromMe: m.senderId === userId,
        isRead: m.isRead,
        createdAt: m.createdAt,
      })),
      property: booking
        ? { title: booking.room.title, leaseEndDate: booking.endDate, roomId: booking.room.id }
        : null,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return res.status(500).json({ success: false, message: "Failed to load messages" });
  }
};

// POST /api/messages
// Body: { receiverId, message, roomId? }
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const { receiverId, message, roomId } = req.body;

    if (!receiverId || !message?.trim()) {
      return res.status(400).json({ success: false, message: "receiverId and message are required" });
    }

    const created = await prisma.message.create({
      data: {
        senderId,
        receiverId: Number(receiverId),
        message: message.trim(),
        roomId: roomId ? Number(roomId) : undefined,
      },
    });

    // Best-effort notification for the recipient — skip silently if their
    // Notification model/fields differ.
    prisma.notification
      .create({
        data: {
          userId: Number(receiverId),
          title: "New Message",
          message: message.trim().slice(0, 120),
          type: "MESSAGE",
        },
      })
      .catch(() => {});

    return res.status(201).json({
      success: true,
      data: {
        id: created.id,
        text: created.message,
        senderId: created.senderId,
        fromMe: true,
        isRead: created.isRead,
        createdAt: created.createdAt,
      },
    });
  } catch (error) {
    console.error("Send message error:", error);
    return res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

// PATCH /api/messages/:contactId/read
export const markConversationRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const contactId = Number(req.params.contactId);

    await prisma.message.updateMany({
      where: { senderId: contactId, receiverId: userId, isRead: false },
      data: { isRead: true },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Mark conversation read error:", error);
    return res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
};