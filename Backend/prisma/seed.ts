import { PrismaClient, Role, RoomType, RoomStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const STANDARD_AMENITY_NAMES = [
  "WiFi",
  "Parking",
  "Water",
  "Balcony",
  "Kitchen",
  "Attached Bathroom",
  "Air Conditioner",
  "Furnished",
];

const CITIES = ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara"];
const LOCATIONS: Record<string, string[]> = {
  Kathmandu: ["Baneshwor", "Kirtipur", "Thamel", "Chabahil", "Kalanki"],
  Lalitpur: ["Patan", "Jawalakhel", "Kupondole", "Satdobato"],
  Bhaktapur: ["Suryabinayak", "Thimi", "Durbar Square"],
  Pokhara: ["Lakeside", "Birauta", "Mahendrapool"],
};

const ROOM_TYPES: RoomType[] = ["SINGLE", "DOUBLE", "FLAT", "APARTMENT"];

async function main() {
  console.log("🌱 Starting Database Seeding Process...");

  // 1. Clear existing seedable records in correct dependency order
  console.log("🧹 Cleaning old data...");
  await prisma.recommendationLog.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.roomAmenity.deleteMany({});
  await prisma.roomImage.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.amenity.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Seed Standard Amenities
  console.log("✨ Seeding Amenities...");
  const createdAmenities = await Promise.all(
    STANDARD_AMENITY_NAMES.map((name) =>
      prisma.amenity.create({
        data: { name, icon: name.toLowerCase().replace(/\s+/g, "_") },
      })
    )
  );
  const amenityMap = new Map(createdAmenities.map((a) => [a.name, a.id]));

  // 3. Seed Password Hash & Users
  console.log("👤 Seeding Users (Admin, Landlords, Tenants)...");
  const defaultPassword = await bcrypt.hash("password123", 10);
  const adminPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.create({
    data: {
      fullName: "System Admin",
      email: "admin@rental.com",
      password: adminPassword,
      phone: "+977-9800000000",
      role: Role.ADMIN,
    },
  });

  const landlord1 = await prisma.user.create({
    data: {
      fullName: "Ram Owner",
      email: "ram.landlord@rental.com",
      password: defaultPassword,
      phone: "+977-9841111111",
      role: Role.LANDLORD,
    },
  });

  const landlord2 = await prisma.user.create({
    data: {
      fullName: "Sita Sharma",
      email: "sita.landlord@rental.com",
      password: defaultPassword,
      phone: "+977-9842222222",
      role: Role.LANDLORD,
    },
  });

  const tenant1 = await prisma.user.create({
    data: {
      fullName: "Test Tenant",
      email: "tenant@example.com",
      password: defaultPassword,
      phone: "+977-9813333333",
      role: Role.TENANT,
    },
  });

  const tenant2 = await prisma.user.create({
    data: {
      fullName: "Shyam Shrestha",
      email: "shyam.tenant@rental.com",
      password: defaultPassword,
      phone: "+977-9814444444",
      role: Role.TENANT,
    },
  });

  // 4. Seed Hand-crafted Controlled Rooms (for Viva Demo)
  console.log("🏠 Seeding Handcrafted Controlled Rooms for Viva Demonstration...");

  // Controlled Room A (Reference)
  const roomA = await prisma.room.create({
    data: {
      landlordId: landlord1.id,
      title: "Shanti Niwas, Baneshwor",
      description: "Bright single studio room with high-speed WiFi, parking, and full furniture.",
      city: "Kathmandu",
      location: "Baneshwor",
      roomType: RoomType.SINGLE,
      price: 8500,
      status: RoomStatus.AVAILABLE,
      roomAmenities: {
        create: [
          { amenityId: amenityMap.get("WiFi")! },
          { amenityId: amenityMap.get("Parking")! },
          { amenityId: amenityMap.get("Furnished")! },
          { amenityId: amenityMap.get("Water")! },
        ],
      },
    },
  });

  // Controlled Room B (Near-identical to Room A)
  const roomB = await prisma.room.create({
    data: {
      landlordId: landlord1.id,
      title: "Cozy Single Room in Baneshwor Center",
      description: "Comfortable single room near Baneshwor plaza. Includes WiFi, parking, and furnished setup.",
      city: "Kathmandu",
      location: "Baneshwor",
      roomType: RoomType.SINGLE,
      price: 12500,
      status: RoomStatus.AVAILABLE,
      roomAmenities: {
        create: [
          { amenityId: amenityMap.get("WiFi")! },
          { amenityId: amenityMap.get("Parking")! },
          { amenityId: amenityMap.get("Furnished")! },
          { amenityId: amenityMap.get("Water")! },
        ],
      },
    },
  });

  // Controlled Room C (Deliberately Opposite to Room A)
  const roomC = await prisma.room.create({
    data: {
      landlordId: landlord2.id,
      title: "Luxury 3BHK Penthouse Apartment",
      description: "Spacious penthouse luxury apartment with private balcony and air conditioning.",
      city: "Pokhara",
      location: "Lakeside",
      roomType: RoomType.APARTMENT,
      price: 45000,
      status: RoomStatus.AVAILABLE,
      roomAmenities: {
        create: [
          { amenityId: amenityMap.get("Air Conditioner")! },
          { amenityId: amenityMap.get("Balcony")! },
        ],
      },
    },
  });

  // 5. Seed 25 Randomized Realistic Rooms across Cities
  console.log("🏢 Seeding 25 Additional Realistic Rooms across Nepal Cities...");
  const landlords = [landlord1, landlord2];

  for (let i = 1; i <= 25; i++) {
    const city = CITIES[i % CITIES.length];
    const locList = LOCATIONS[city];
    const location = locList[i % locList.length];
    const roomType = ROOM_TYPES[i % ROOM_TYPES.length];
    const landlord = landlords[i % landlords.length];
    const price = Math.floor(Math.random() * 20000) + 6000;

    // Pick 3-5 random amenities
    const amenityIdsToInclude = createdAmenities
      .filter((_, idx) => (i + idx) % 2 === 0 || idx === i % 8)
      .map((a) => a.id);

    await prisma.room.create({
      data: {
        landlordId: landlord.id,
        title: `${roomType.charAt(0) + roomType.slice(1).toLowerCase()} Room #${i} in ${location}`,
        description: `Clean and well-maintained ${roomType.toLowerCase()} rental located in ${location}, ${city}.`,
        city,
        location,
        roomType,
        price,
        status: RoomStatus.AVAILABLE,
        roomAmenities: {
          create: amenityIdsToInclude.map((amenityId) => ({ amenityId })),
        },
      },
    });
  }

  // 6. Seed Reviews & Favorites (Popularity Score Signals)
  console.log("⭐ Seeding Ratings & Favorites for Popularity Score Signals...");
  await prisma.review.create({
    data: {
      userId: tenant1.id,
      roomId: roomA.id,
      rating: 5,
      comment: "Fantastic place! Fast internet and great location.",
    },
  });

  await prisma.review.create({
    data: {
      userId: tenant2.id,
      roomId: roomA.id,
      rating: 4,
      comment: "Very cozy single room, peaceful neighborhood.",
    },
  });

  await prisma.favorite.create({
    data: {
      userId: tenant1.id,
      roomId: roomA.id,
    },
  });

  await prisma.favorite.create({
    data: {
      userId: tenant2.id,
      roomId: roomB.id,
    },
  });

  // 7. Seed Demo Bookings, Payments & Notifications for Tenant Dashboard
  console.log("📋 Seeding Bookings, Payments & Notifications for Tenant Dashboard...");
  const approvedBooking = await prisma.booking.create({
    data: {
      roomId: roomA.id,
      tenantId: tenant1.id,
      moveInDate: new Date("2025-05-01"),
      endDate: new Date("2026-04-30"),
      totalAmount: roomA.price,
      status: "APPROVED",
      notes: "Demo active rental for tenant dashboard",
    },
  });

  await prisma.room.update({
    where: { id: roomA.id },
    data: { status: RoomStatus.BOOKED },
  });

  await prisma.payment.create({
    data: {
      bookingId: approvedBooking.id,
      amount: roomA.price,
      paymentMethod: "ESEWA",
      status: "PENDING",
    },
  });

  await prisma.booking.create({
    data: {
      roomId: roomB.id,
      tenantId: tenant1.id,
      moveInDate: new Date("2025-08-15"),
      totalAmount: roomB.price,
      status: "PENDING",
      notes: "Interested in moving in next month",
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: tenant1.id,
        title: "Rent Payment Due Soon",
        message: "Your rent of Rs. 8,500 for Shanti Niwas is due in 5 days.",
        type: "PAYMENT",
      },
      {
        userId: tenant1.id,
        title: "New Room Available",
        message: "3 new rooms matching your Baneshwor search are now available.",
        type: "SYSTEM",
      },
      {
        userId: tenant1.id,
        title: "Owner Replied",
        message: "Ram Owner replied to your inquiry about the Baneshwor studio.",
        type: "MESSAGE",
      },
    ],
  });

  await prisma.message.create({
    data: {
      senderId: tenant1.id,
      receiverId: landlord1.id,
      roomId: roomB.id,
      message: "Is this room still available for August move-in?",
    },
  });

  console.log("✅ SEEDING COMPLETE! Database ready with realistic dataset & viva demo rooms.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
