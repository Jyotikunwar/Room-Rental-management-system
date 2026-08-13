import prisma from "../lib/prisma";
import { Role } from "@prisma/client";

/** Contacts the current user is allowed to start or continue a conversation with. */
export async function getAllowedContactIds(userId: number, userRole: Role): Promise<number[]> {
  if (userRole === "ADMIN") {
    const users = await prisma.user.findMany({
      where: { role: { in: ["TENANT", "LANDLORD"] } },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  if (userRole === "TENANT") {
    const ids = new Set<number>();

    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    admins.forEach((a) => ids.add(a.id));

    const bookings = await prisma.booking.findMany({
      where: {
        tenantId: userId,
        status: { in: ["APPROVED", "PENDING"] },
      },
      include: { room: { select: { landlordId: true } } },
    });
    bookings.forEach((b) => ids.add(b.room.landlordId));

    return Array.from(ids);
  }

  if (userRole === "LANDLORD") {
    const ids = new Set<number>();

    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    admins.forEach((a) => ids.add(a.id));

    const bookings = await prisma.booking.findMany({
      where: {
        room: { landlordId: userId },
        status: { in: ["APPROVED", "PENDING"] },
      },
      select: { tenantId: true },
    });
    bookings.forEach((b) => ids.add(b.tenantId));

    return Array.from(ids);
  }

  return [];
}

export async function canMessage(userId: number, userRole: Role, contactId: number): Promise<boolean> {
  const allowed = await getAllowedContactIds(userId, userRole);
  return allowed.includes(contactId);
}
