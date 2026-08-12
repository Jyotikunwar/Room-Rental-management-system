import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../src/lib/prisma";

// Creates (or updates) a single admin account.
// Run this once with: npx ts-node prisma/seed-admin.ts
// Change the email/password below before running, then rotate the
// password after first login for real deployments.

async function main() {
  console.log("Seed script started...");
  console.log("DATABASE_URL loaded:", process.env.DATABASE_URL ? "yes" : "NO - .env not found!");

  const adminEmail = "admin.horizon@gmail.com";
  const adminPassword = "Admin@12345";

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedPassword, role: "ADMIN", phone: "9800000000" },
    create: {
      fullName: "Horizon System Administrator",
      email: adminEmail,
      password: hashedPassword,
      phone: "9800000000",
      role: "ADMIN",
    },
  });

  console.log("Admin account ready:");
  console.log(`  email:    ${admin.email}`);
  console.log(`  password: ${adminPassword}  (change this after first login)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });