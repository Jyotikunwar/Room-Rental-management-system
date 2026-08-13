import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";
import { canMessage, getAllowedContactIds } from "../utils/messagingPermissions";

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

function isOnline(lastActiveAt: Date | null): boolean {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < ONLINE_THRESHOLD_MS;
}

const safeContact = (user: {
  id: number;
  fullName: string;
  role: string;
  phone: string | null;
  email: string;
  avatarUrl: string | null;
  lastActiveAt: Date | null;
}) => ({
  id: user.id,
  fullName: user.fullName,
  role: user.role,
  phone: user.phone ?? undefined,
  email: user.email,
  avatarUrl: user.avatarUrl ?? undefined,
  isOnline: isOnline(user.lastActiveAt),
});

async function buildPropertyContext(userId: number, contactId: number, userRole: string) {
  const booking = await prisma.booking.findFirst({
    where: {
      OR: [
        { tenantId: userId, room: { landlordId: contactId } },
        { tenantId: contactId, room: { landlordId: userId } },
      ],
      status: { in: ["APPROVED", "PENDING"] },
    },
    include: { room: true },
    orderBy: { createdAt: "desc" },
  });

  if (!booking) return null;

  return {
    title: booking.room.title,
    address: booking.room.address,
    leaseEndDate: booking.endDate?.toISOString() ?? null,
    roomId: booking.room.id,
  };
}

async function buildRecentActivity(userId: number, contactId: number, userRole: string) {
  const activity: { title: string; date: string }[] = [];

  if (userRole === "LANDLORD") {
    const complaints = await prisma.complaint.findMany({
      where: {
        booking: { tenantId: contactId, room: { landlordId: userId } },
        status: "RESOLVED",
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
    });
    for (const c of complaints) {
      activity.push({ title: "Maintenance Request Closed", date: c.updatedAt.toISOString() });
    }

    const payments = await prisma.payment.findMany({
      where: { booking: { tenantId: contactId, room: { landlordId: userId } }, status: "PAID" },
      orderBy: { paidAt: "desc" },
      take: 3,
    });
    for (const p of payments) {
      activity.push({
        title: "Rent Payment Received",
        date: (p.paidAt ?? p.createdAt).toISOString(),
      });
    }
  } else if (userRole === "TENANT") {
    const complaints = await prisma.complaint.findMany({
      where: { userId, booking: { room: { landlordId: contactId } } },
      orderBy: { updatedAt: "desc" },
      take: 3,
    });
    for (const c of complaints) {
      activity.push({ title: c.title, date: c.updatedAt.toISOString() });
    }

    const payments = await prisma.payment.findMany({
      where: { booking: { tenantId: userId, room: { landlordId: contactId } }, status: "PAID" },
      orderBy: { paidAt: "desc" },
      take: 3,
    });
    for (const p of payments) {
      activity.push({
        title: "Rent Payment Received",
        date: (p.paidAt ?? p.createdAt).toISOString(),
      });
    }
  }

  activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return activity.slice(0, 5);
}

// GET /api/messages/contacts
export const getAllowedContacts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const search = String(req.query.search || "").trim();
    const roleFilter = String(req.query.role || "").toUpperCase();

    const allowedIds = await getAllowedContactIds(userId, userRole);
    if (allowedIds.length === 0) {
      return res.json({ success: true, contacts: [] });
    }

    const contacts = await prisma.user.findMany({
      where: {
        id: { in: allowedIds },
        ...(roleFilter === "LANDLORD" || roleFilter === "TENANT" || roleFilter === "ADMIN"
          ? { role: roleFilter as "LANDLORD" | "TENANT" | "ADMIN" }
          : {}),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { fullName: "asc" },
      take: 100,
    });

    return res.json({
      success: true,
      contacts: contacts.map((c) => safeContact(c)),
    });
  } catch (error) {
    console.error("Get allowed contacts error:", error);
    return res.status(500).json({ success: false, message: "Failed to load contacts" });
  }
};

// GET /api/messages/conversations
export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const allowedIds = await getAllowedContactIds(userId, userRole);

    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: "desc" },
      include: { sender: true, receiver: true },
    });

    const conversations = new Map<
      number,
      { contact: (typeof messages)[0]["sender"]; lastMessage: (typeof messages)[0]; unreadCount: number }
    >();

    for (const m of messages) {
      const contact = m.senderId === userId ? m.receiver : m.sender;
      if (!allowedIds.includes(contact.id)) continue;

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
export const getMessagesWithContact = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const contactId = Number(req.params.contactId);

    const allowed = await canMessage(userId, userRole, contactId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "You are not allowed to message this contact" });
    }

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

    const [property, recentActivity] = await Promise.all([
      buildPropertyContext(userId, contactId, userRole),
      buildRecentActivity(userId, contactId, userRole),
    ]);

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
      property,
      recentActivity,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return res.status(500).json({ success: false, message: "Failed to load messages" });
  }
};

// POST /api/messages
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user!.id;
    const userRole = req.user!.role;
    const { receiverId, message, roomId } = req.body;

    if (!receiverId || !message?.trim()) {
      return res.status(400).json({ success: false, message: "receiverId and message are required" });
    }

    const allowed = await canMessage(senderId, userRole, Number(receiverId));
    if (!allowed) {
      return res.status(403).json({ success: false, message: "You are not allowed to message this contact" });
    }

    const created = await prisma.message.create({
      data: {
        senderId,
        receiverId: Number(receiverId),
        message: message.trim(),
        roomId: roomId ? Number(roomId) : undefined,
      },
    });

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
