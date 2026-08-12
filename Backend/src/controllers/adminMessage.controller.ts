import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

function isOnline(lastActiveAt: Date | null): boolean {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < ONLINE_THRESHOLD_MS;
}

function isLandlordOrTenant(role: string) {
  return role === "LANDLORD" || role === "TENANT";
}

async function getContactOr404(contactId: number) {
  const contact = await prisma.user.findUnique({ where: { id: contactId } });
  if (!contact || !isLandlordOrTenant(contact.role)) return null;
  return contact;
}

// GET /api/admin/messages/contacts?search=&role=
export const getAdminMessageContacts = async (req: AuthRequest, res: Response) => {
  try {
    const search = String(req.query.search || "").trim();
    const roleFilter = String(req.query.role || "").toUpperCase();

    const roleClause =
      roleFilter === "LANDLORD" || roleFilter === "TENANT"
        ? { role: roleFilter as "LANDLORD" | "TENANT" }
        : { role: { in: ["LANDLORD", "TENANT"] as ("LANDLORD" | "TENANT")[] } };

    const contacts = await prisma.user.findMany({
      where: {
        ...roleClause,
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        email: true,
        phone: true,
        avatarUrl: true,
        lastActiveAt: true,
      },
      orderBy: { fullName: "asc" },
      take: 100,
    });

    return res.json({
      success: true,
      contacts: contacts.map((c) => ({
        id: c.id,
        fullName: c.fullName,
        role: c.role as "TENANT" | "LANDLORD",
        email: c.email,
        phone: c.phone ?? undefined,
        avatarUrl: c.avatarUrl ?? undefined,
        isOnline: isOnline(c.lastActiveAt),
      })),
    });
  } catch (error) {
    console.error("Get admin message contacts error:", error);
    return res.status(500).json({ success: false, message: "Failed to load contacts" });
  }
};

// GET /api/admin/messages/threads
export const getAdminMessageThreads = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.id;

    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: adminId }, { receiverId: adminId }] },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, fullName: true, role: true, phone: true, avatarUrl: true, lastActiveAt: true } },
        receiver: { select: { id: true, fullName: true, role: true, phone: true, avatarUrl: true, lastActiveAt: true } },
      },
    });

    const threads = new Map<
      number,
      {
        contact: (typeof messages)[0]["sender"];
        lastMessage: (typeof messages)[0];
        unreadCount: number;
      }
    >();

    for (const m of messages) {
      const contact = m.senderId === adminId ? m.receiver : m.sender;
      if (!isLandlordOrTenant(contact.role)) continue;

      if (!threads.has(contact.id)) {
        threads.set(contact.id, { contact, lastMessage: m, unreadCount: 0 });
      }
      if (m.receiverId === adminId && !m.isRead) {
        threads.get(contact.id)!.unreadCount += 1;
      }
    }

    const result = Array.from(threads.values()).map((t) => ({
      contactId: t.contact.id,
      contactName: t.contact.fullName,
      contactRole: t.contact.role as "TENANT" | "LANDLORD",
      isOnline: isOnline(t.contact.lastActiveAt),
      lastMessage: t.lastMessage.message,
      lastMessageAt: t.lastMessage.createdAt.toISOString(),
      unread: t.unreadCount > 0,
      avatarUrl: t.contact.avatarUrl ?? undefined,
      phone: t.contact.phone ?? undefined,
    }));

    return res.json({ success: true, threads: result });
  } catch (error) {
    console.error("Get admin message threads error:", error);
    return res.status(500).json({ success: false, message: "Failed to load message threads" });
  }
};

// GET /api/admin/messages/threads/:contactId
export const getAdminThreadMessages = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.id;
    const contactId = Number(req.params.contactId);

    const contact = await getContactOr404(contactId);
    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: adminId, receiverId: contactId },
          { senderId: contactId, receiverId: adminId },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    await prisma.message.updateMany({
      where: { senderId: contactId, receiverId: adminId, isRead: false },
      data: { isRead: true },
    });

    return res.json({
      success: true,
      contact: {
        id: contact.id,
        fullName: contact.fullName,
        role: contact.role,
        avatarUrl: contact.avatarUrl,
        isOnline: isOnline(contact.lastActiveAt),
      },
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        text: m.message,
        createdAt: m.createdAt.toISOString(),
        fromAdmin: m.senderId === adminId,
      })),
    });
  } catch (error) {
    console.error("Get admin thread messages error:", error);
    return res.status(500).json({ success: false, message: "Failed to load messages" });
  }
};

// POST /api/admin/messages/threads/:contactId
export const sendAdminMessage = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.id;
    const contactId = Number(req.params.contactId);
    const { text } = req.body as { text?: string };

    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: "Message text is required" });
    }

    const contact = await getContactOr404(contactId);
    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    const created = await prisma.message.create({
      data: {
        senderId: adminId,
        receiverId: contactId,
        message: text.trim(),
      },
    });

    prisma.notification
      .create({
        data: {
          userId: contactId,
          title: "New Message from Admin",
          message: text.trim().slice(0, 120),
          type: "MESSAGE",
        },
      })
      .catch(() => {});

    return res.status(201).json({
      success: true,
      message: {
        id: created.id,
        senderId: created.senderId,
        text: created.message,
        createdAt: created.createdAt.toISOString(),
        fromAdmin: true,
      },
    });
  } catch (error) {
    console.error("Send admin message error:", error);
    return res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

// GET /api/admin/contacts/:contactId
export const getAdminContactProfile = async (req: AuthRequest, res: Response) => {
  try {
    const contactId = Number(req.params.contactId);
    const contact = await getContactOr404(contactId);
    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    let property: { title: string; leaseEndDate?: string } | undefined;
    const recentActivity: { title: string; date: string }[] = [];

    if (contact.role === "TENANT") {
      const booking = await prisma.booking.findFirst({
        where: { tenantId: contactId, status: "APPROVED" },
        include: { room: true },
        orderBy: { createdAt: "desc" },
      });
      if (booking) {
        property = {
          title: booking.room.title,
          leaseEndDate: booking.endDate?.toISOString(),
        };
      }

      const [complaints, payments] = await Promise.all([
        prisma.complaint.findMany({
          where: { userId: contactId },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
        prisma.payment.findMany({
          where: { booking: { tenantId: contactId } },
          orderBy: { createdAt: "desc" },
          take: 3,
          include: { booking: { include: { room: true } } },
        }),
      ]);

      for (const c of complaints) {
        recentActivity.push({ title: c.title, date: c.createdAt.toISOString() });
      }
      for (const p of payments) {
        recentActivity.push({
          title: `Payment Rs. ${p.amount.toLocaleString()} — ${p.status}`,
          date: (p.paidAt ?? p.createdAt).toISOString(),
        });
      }
    } else {
      const room = await prisma.room.findFirst({
        where: { landlordId: contactId },
        orderBy: { createdAt: "desc" },
      });
      if (room) {
        property = { title: room.title };
      }

      const complaints = await prisma.complaint.findMany({
        where: { booking: { room: { landlordId: contactId } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      for (const c of complaints) {
        recentActivity.push({ title: c.title, date: c.createdAt.toISOString() });
      }
    }

    recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({
      success: true,
      profile: {
        id: contact.id,
        fullName: contact.fullName,
        role: contact.role as "TENANT" | "LANDLORD",
        phone: contact.phone ?? undefined,
        email: contact.email,
        avatarUrl: contact.avatarUrl ?? undefined,
        property,
        recentActivity: recentActivity.slice(0, 5),
      },
    });
  } catch (error) {
    console.error("Get admin contact profile error:", error);
    return res.status(500).json({ success: false, message: "Failed to load contact profile" });
  }
};
