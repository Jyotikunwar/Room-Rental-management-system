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

  const adminEmail = "admin@roomrental.com";
  const adminPassword = "Admin@12345"; // change this before running in production

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedPassword, role: "ADMIN" },
    create: {
      fullName: "System Admin",
      email: adminEmail,
      password: hashedPassword,
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