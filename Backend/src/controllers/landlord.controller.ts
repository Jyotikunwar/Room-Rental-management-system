import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

// GET /api/landlord/activity
export const getLandlordActivity = async (req: AuthRequest, res: Response) => {
  try {
    const landlordId = req.user!.id;
    const { category, search } = req.query;

    const [payments, invoices, complaints, rooms, bookings, reviews, messages, notifications] = await Promise.all([
      // Payments for landlord's rooms
      prisma.payment.findMany({
        where: { booking: { room: { landlordId } } },
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          booking: {
            include: {
              tenant: { select: { id: true, fullName: true, email: true } },
              room: { select: { id: true, title: true } },
            },
          },
        },
      }),
      // Rent Invoices for landlord's rooms
      prisma.rentInvoice.findMany({
        where: { booking: { room: { landlordId } } },
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          booking: {
            include: {
              tenant: { select: { id: true, fullName: true, email: true } },
              room: { select: { id: true, title: true } },
            },
          },
        },
      }),
      // Maintenance complaints for landlord's rooms
      prisma.complaint.findMany({
        where: { booking: { room: { landlordId } } },
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          booking: { include: { room: { select: { id: true, title: true } } } },
        },
      }),
      // Properties owned by landlord
      prisma.room.findMany({
        where: { landlordId },
        take: 50,
        orderBy: { createdAt: "desc" },
      }),
      // Bookings for landlord's rooms
      prisma.booking.findMany({
        where: { room: { landlordId } },
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          tenant: { select: { id: true, fullName: true, email: true } },
          room: { select: { id: true, title: true } },
        },
      }),
      // Tenant reviews for landlord's rooms
      prisma.review.findMany({
        where: { room: { landlordId } },
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          room: { select: { id: true, title: true } },
        },
      }),
      // Messages to/from landlord
      prisma.message.findMany({
        where: {
          OR: [{ senderId: landlordId }, { receiverId: landlordId }],
        },
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          sender: { select: { id: true, fullName: true, email: true } },
          receiver: { select: { id: true, fullName: true, email: true } },
          room: { select: { id: true, title: true } },
        },
      }),
      // Notifications for landlord
      prisma.notification.findMany({
        where: { userId: landlordId },
        take: 50,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const entries: any[] = [];

    // Map payments
    payments.forEach((p) => {
      entries.push({
        id: `pay-${p.id}`,
        category: "PAYMENT",
        title: p.status === "PAID" ? "Payment Received" : "Payment Pending",
        description: `Rs. ${p.amount.toLocaleString()} payment for ${p.booking?.room?.title || "Property"} from ${p.booking?.tenant?.fullName || "Tenant"}`,
        createdAt: (p.paidAt || p.createdAt).toISOString(),
        status: p.status,
        metadata: {
          paymentId: p.id,
          bookingId: p.bookingId,
          amount: p.amount,
          tenantId: p.booking?.tenant?.id,
          tenantName: p.booking?.tenant?.fullName,
          roomTitle: p.booking?.room?.title,
          targetRoute: "payments",
          actionText: "View Payment",
        },
      });
    });

    // Map rent invoices
    invoices.forEach((inv) => {
      entries.push({
        id: `inv-${inv.id}`,
        category: "PAYMENT",
        title: inv.status === "PAID" ? "Rent Invoice Settled" : "Rent Invoice Due",
        description: `Rs. ${inv.amount.toLocaleString()} rent invoice for ${inv.booking?.room?.title || "Property"} (${inv.booking?.tenant?.fullName || "Tenant"})`,
        createdAt: (inv.paidAt || inv.createdAt).toISOString(),
        status: inv.status,
        metadata: {
          invoiceId: inv.id,
          bookingId: inv.bookingId,
          amount: inv.amount,
          dueDate: inv.dueDate.toISOString(),
          tenantName: inv.booking?.tenant?.fullName,
          roomTitle: inv.booking?.room?.title,
          targetRoute: "payments",
          actionText: "View Invoice",
        },
      });
    });

    // Map complaints/maintenance
    complaints.forEach((c) => {
      entries.push({
        id: `maint-${c.id}`,
        category: "MAINTENANCE",
        title: `Maintenance Ticket: ${c.title}`,
        description: `${c.description.slice(0, 100)} — ${c.booking?.room?.title || "Property"} (${c.user?.fullName || "Tenant"})`,
        createdAt: c.createdAt.toISOString(),
        status: c.status,
        metadata: {
          complaintId: c.id,
          bookingId: c.bookingId,
          tenantId: c.userId,
          tenantName: c.user?.fullName,
          roomTitle: c.booking?.room?.title,
          targetRoute: "maintenance",
          actionText: "Manage Request",
        },
      });
    });

    // Map properties/rooms
    rooms.forEach((r) => {
      entries.push({
        id: `room-${r.id}`,
        category: "PROPERTY",
        title: `Property Listed: ${r.title}`,
        description: `${r.roomType} in ${r.city}, ${r.location} — Rs. ${r.price.toLocaleString()}/month`,
        createdAt: r.createdAt.toISOString(),
        status: r.approvalStatus === "APPROVED" ? r.status : r.approvalStatus,
        metadata: {
          roomId: r.id,
          city: r.city,
          location: r.location,
          price: r.price,
          roomType: r.roomType,
          targetRoute: "properties",
          actionText: "View Property",
        },
      });
    });

    // Map bookings
    bookings.forEach((b) => {
      entries.push({
        id: `book-${b.id}`,
        category: "TENANT",
        title: `Lease Booking ${b.status}: ${b.room?.title || "Property"}`,
        description: `Tenant ${b.tenant?.fullName || "User"} requested move-in date: ${new Date(b.moveInDate).toLocaleDateString()}`,
        createdAt: b.createdAt.toISOString(),
        status: b.status,
        metadata: {
          bookingId: b.id,
          roomId: b.roomId,
          tenantId: b.tenantId,
          tenantName: b.tenant?.fullName,
          tenantEmail: b.tenant?.email,
          roomTitle: b.room?.title,
          moveInDate: new Date(b.moveInDate).toLocaleDateString(),
          targetRoute: "tenants",
          actionText: "View Tenant",
        },
      });
    });

    // Map reviews
    reviews.forEach((rev) => {
      entries.push({
        id: `rev-${rev.id}`,
        category: "TENANT",
        title: `New Rating & Review (${rev.rating}⭐)`,
        description: `"${rev.comment || "No comment"}" — on ${rev.room?.title || "Property"} by ${rev.user?.fullName || "Tenant"}`,
        createdAt: rev.createdAt.toISOString(),
        status: "REVIEWED",
        metadata: {
          reviewId: rev.id,
          roomId: rev.roomId,
          rating: rev.rating,
          tenantName: rev.user?.fullName,
          roomTitle: rev.room?.title,
          targetRoute: "reviews",
          actionText: "View Review",
        },
      });
    });

    // Map messages
    messages.forEach((msg) => {
      const isSender = msg.senderId === landlordId;
      const otherUser = isSender ? msg.receiver : msg.sender;
      entries.push({
        id: `msg-${msg.id}`,
        category: "MESSAGE",
        title: isSender ? `Message sent to ${otherUser?.fullName || "User"}` : `New message from ${otherUser?.fullName || "User"}`,
        description: `${msg.message.slice(0, 90)}${msg.room ? ` (re: ${msg.room.title})` : ""}`,
        createdAt: msg.createdAt.toISOString(),
        status: msg.isRead ? "READ" : "UNREAD",
        metadata: {
          messageId: msg.id,
          contactId: otherUser?.id,
          contactName: otherUser?.fullName,
          roomTitle: msg.room?.title,
          targetRoute: "messages",
          actionText: "Reply Message",
        },
      });
    });

    // Map notifications
    notifications.forEach((n) => {
      entries.push({
        id: `notif-${n.id}`,
        category: "SYSTEM",
        title: n.title,
        description: n.message,
        createdAt: n.createdAt.toISOString(),
        status: n.isRead ? "READ" : "UNREAD",
        metadata: {
          notificationId: n.id,
          type: n.type,
          targetRoute: "dashboard",
          actionText: "View Alert",
        },
      });
    });

    // Sort descending by date
    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Calculate total stats
    const stats = {
      total: entries.length,
      messages: entries.filter((e) => e.category === "MESSAGE" && e.status === "UNREAD").length || entries.filter((e) => e.category === "MESSAGE").length,
      payments: entries.filter((e) => e.category === "PAYMENT").length,
      maintenance: entries.filter((e) => e.category === "MAINTENANCE" && (e.status === "PENDING" || e.status === "IN_PROGRESS" || e.status === "OPEN")).length || entries.filter((e) => e.category === "MAINTENANCE").length,
    };

    // Calculate category counts
    const categoryCounts: Record<string, number> = {
      ALL: entries.length,
      PAYMENT: 0,
      MAINTENANCE: 0,
      PROPERTY: 0,
      TENANT: 0,
      MESSAGE: 0,
      SYSTEM: 0,
    };

    entries.forEach((e) => {
      if (categoryCounts[e.category] !== undefined) {
        categoryCounts[e.category]++;
      }
    });

    let filtered = entries;

    if (category && category !== "ALL") {
      filtered = filtered.filter((e) => e.category === String(category).toUpperCase());
    }

    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (e.metadata?.roomTitle && e.metadata.roomTitle.toLowerCase().includes(q)) ||
          (e.metadata?.tenantName && e.metadata.tenantName.toLowerCase().includes(q))
      );
    }

    return res.status(200).json({
      success: true,
      count: filtered.length,
      stats,
      categoryCounts,
      entries: filtered,
    });
  } catch (error: unknown) {
    console.error("Get landlord activity error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ success: false, message: "Failed to fetch activity log", error: message });
  }
};

// GET /api/landlord/reviews -> Fetch all reviews for rooms owned by the logged-in landlord
export const getLandlordReviews = async (req: AuthRequest, res: Response) => {
  try {
    const landlordId = req.user!.id;

    const [reviews, tenantBookings] = await Promise.all([
      prisma.review.findMany({
        where: { room: { landlordId } },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          room: { select: { id: true, title: true, city: true, location: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.booking.findMany({
        where: { room: { landlordId }, status: "APPROVED" },
        include: {
          tenant: { select: { id: true, fullName: true, email: true } },
          room: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
      tenantBookings,
    });
  } catch (error: unknown) {
    console.error("Get landlord reviews error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch property reviews" });
  }
};

// DELETE /api/landlord/reviews/:id -> Delete a review on landlord's property
export const deleteLandlordReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const landlordId = req.user!.id;

    const review = await prisma.review.findUnique({
      where: { id: Number(id) },
      include: { room: true },
    });

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    if (review.room.landlordId !== landlordId && req.user!.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You can only delete reviews for your own properties",
      });
    }

    await prisma.review.delete({
      where: { id: Number(id) },
    });

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Delete landlord review error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete review" });
  }
};
