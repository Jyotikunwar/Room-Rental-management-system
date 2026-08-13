import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.user.findMany({
    where: { role: "TENANT" },
    select: { id: true, fullName: true, email: true, phone: true },
  });
  const bookings = await prisma.booking.findMany({
    select: { id: true, tenantId: true, status: true, roomId: true },
  });
  console.log("TENANT_COUNT:", tenants.length);
  console.log("TENANTS:", JSON.stringify(tenants, null, 2));
  console.log("BOOKINGS:", JSON.stringify(bookings, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
