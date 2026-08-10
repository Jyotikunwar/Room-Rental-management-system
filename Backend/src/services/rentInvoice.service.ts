import prisma from "../lib/prisma";

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

// Generates one RentInvoice per calendar month covering [moveInDate, endDate].
// If endDate is null (open-ended lease), generates 12 months ahead as a
// starting point — call this again periodically (e.g. via a monthly cron)
// to keep extending coverage for ongoing tenancies.
export async function generateInvoicesForBooking(bookingId: number) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: true, rentInvoices: true },
  });
  if (!booking) return;

  const amount = booking.totalAmount || booking.room.price;
  const moveIn = new Date(booking.moveInDate);
  const lastCoveredEnd = booking.endDate
    ? new Date(booking.endDate)
    : addMonths(moveIn, 11); // 12 months total if open-ended

  const existingPeriods = new Set(
    booking.rentInvoices.map((inv) => startOfMonth(inv.periodStart).toISOString())
  );

  const invoicesToCreate: {
    bookingId: number;
    periodStart: Date;
    periodEnd: Date;
    amount: number;
    dueDate: Date;
  }[] = [];

  let cursor = startOfMonth(moveIn);
  while (cursor <= lastCoveredEnd) {
    const key = cursor.toISOString();
    if (!existingPeriods.has(key)) {
      invoicesToCreate.push({
        bookingId: booking.id,
        periodStart: cursor,
        periodEnd: endOfMonth(cursor),
        amount,
        dueDate: cursor, // rent due at the start of its period — adjust if you want e.g. "5th of the month"
      });
    }
    cursor = addMonths(cursor, 1);
  }

  if (invoicesToCreate.length > 0) {
    await prisma.rentInvoice.createMany({ data: invoicesToCreate });
  }

  return invoicesToCreate.length;
}

// Call periodically (e.g. a monthly cron) to extend open-ended leases —
// generates the next month's invoice for any APPROVED booking with no
// endDate whose latest invoice period is within 30 days of running out.
export async function extendOpenEndedInvoices() {
  const soon = addMonths(new Date(), 1);

  const bookings = await prisma.booking.findMany({
    where: { status: "APPROVED", endDate: null },
    include: { rentInvoices: { orderBy: { periodEnd: "desc" }, take: 1 }, room: true },
  });

  for (const booking of bookings) {
    const latest = booking.rentInvoices[0];
    if (!latest || latest.periodEnd < soon) {
      const amount = booking.totalAmount || booking.room.price;
      const nextStart = latest ? addMonths(startOfMonth(latest.periodStart), 1) : startOfMonth(new Date(booking.moveInDate));
      await prisma.rentInvoice.create({
        data: {
          bookingId: booking.id,
          periodStart: nextStart,
          periodEnd: endOfMonth(nextStart),
          amount,
          dueDate: nextStart,
        },
      });
    }
  }
}