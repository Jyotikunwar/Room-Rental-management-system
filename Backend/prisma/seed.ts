import { PrismaClient, Role, RoomType, RoomStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const STANDARD_AMENITY_NAMES = [
  "WiFi",
  "Kitchen",
  "Furnished",
  "Balcony",
  "Water",
  "Air Conditioner",
  "Parking",
  "Attached Bathroom",
  "Electricity",
  "Fully Furnished",
  "Pet Friendly",
];

const CITIES = ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara"];
const LOCATIONS: Record<string, string[]> = {
  Kathmandu: ["Baneshwor", "Kirtipur", "Thamel", "Chabahil", "Kalanki"],
  Lalitpur: ["Patan", "Jawalakhel", "Kupondole", "Satdobato"],
  Bhaktapur: ["Suryabinayak", "Thimi", "Durbar Square"],
  Pokhara: ["Lakeside", "Birauta", "Mahendrapool"],
};

const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  Baneshwor: { lat: 27.6938, lng: 85.3331 },
  Kirtipur: { lat: 27.6792, lng: 85.2754 },
  Thamel: { lat: 27.7154, lng: 85.3123 },
  Chabahil: { lat: 27.7167, lng: 85.3472 },
  Kalanki: { lat: 27.6936, lng: 85.2813 },
  Patan: { lat: 27.6738, lng: 85.3168 },
  Jawalakhel: { lat: 27.6728, lng: 85.3148 },
  Kupondole: { lat: 27.6861, lng: 85.3135 },
  Satdobato: { lat: 27.6548, lng: 85.3248 },
  Suryabinayak: { lat: 27.6631, lng: 85.4294 },
  Thimi: { lat: 27.6789, lng: 85.3789 },
  "Durbar Square": { lat: 27.6722, lng: 85.4284 },
  Lakeside: { lat: 28.2096, lng: 83.9575 },
  Birauta: { lat: 28.1882, lng: 83.9712 },
  Mahendrapool: { lat: 28.2215, lng: 83.9874 },
};

const ROOM_IMAGES = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
];

const ROOM_TYPES: RoomType[] = ["SINGLE", "DOUBLE", "FLAT", "APARTMENT"];

async function main() {
  console.log("🌱 Starting Database Seeding Process...");

  // 1. Clear existing seedable records in correct dependency order
  console.log("🧹 Cleaning old data...");

  await prisma.payment.deleteMany({});
  await prisma.paymentMethod.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.roomAmenity.deleteMany({});
  await prisma.roomImage.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.amenity.deleteMany({});
  await prisma.faq.deleteMany({});
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
  console.log("🏠 Seeding Handcrafted Controlled Rooms with Images & Coordinates...");

  // Controlled Room A (Reference)
  const roomA = await prisma.room.create({
    data: {
      landlordId: landlord1.id,
      title: "Shanti Niwas, Baneshwor",
      description: "Bright single studio room with high-speed WiFi, parking, water supply, and full furniture.",
      city: "Kathmandu",
      location: "Baneshwor",
      latitude: LOCATION_COORDS["Baneshwor"].lat,
      longitude: LOCATION_COORDS["Baneshwor"].lng,
      roomType: RoomType.SINGLE,
      price: 8500,
      status: RoomStatus.AVAILABLE,
      roomImages: {
        create: [
          { imageUrl: ROOM_IMAGES[0], isPrimary: true },
          { imageUrl: ROOM_IMAGES[1], isPrimary: false },
        ],
      },
      roomAmenities: {
        create: [
          { amenityId: amenityMap.get("WiFi")! },
          { amenityId: amenityMap.get("Parking")! },
          { amenityId: amenityMap.get("Furnished")! },
          { amenityId: amenityMap.get("Water")! },
          { amenityId: amenityMap.get("Attached Bathroom")! },
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
      latitude: LOCATION_COORDS["Baneshwor"].lat + 0.002,
      longitude: LOCATION_COORDS["Baneshwor"].lng + 0.001,
      roomType: RoomType.SINGLE,
      price: 12500,
      status: RoomStatus.AVAILABLE,
      roomImages: {
        create: [
          { imageUrl: ROOM_IMAGES[1], isPrimary: true },
          { imageUrl: ROOM_IMAGES[2], isPrimary: false },
        ],
      },
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

  // Controlled Room C (Penthouse Apartment)
  const roomC = await prisma.room.create({
    data: {
      landlordId: landlord2.id,
      title: "Luxury 3BHK Penthouse Apartment",
      description: "Spacious penthouse luxury apartment with private balcony and air conditioning.",
      city: "Pokhara",
      location: "Lakeside",
      latitude: LOCATION_COORDS["Lakeside"].lat,
      longitude: LOCATION_COORDS["Lakeside"].lng,
      roomType: RoomType.APARTMENT,
      price: 45000,
      status: RoomStatus.AVAILABLE,
      roomImages: {
        create: [
          { imageUrl: ROOM_IMAGES[3], isPrimary: true },
          { imageUrl: ROOM_IMAGES[4], isPrimary: false },
        ],
      },
      roomAmenities: {
        create: [
          { amenityId: amenityMap.get("Air Conditioner")! },
          { amenityId: amenityMap.get("Balcony")! },
          { amenityId: amenityMap.get("Fully Furnished")! },
          { amenityId: amenityMap.get("Pet Friendly")! },
        ],
      },
    },
  });

  // 5. Seed 25 Randomized Realistic Rooms across Nepal Cities
  console.log("🏢 Seeding 25 Additional Realistic Rooms with Images across Nepal Cities...");
  const landlords = [landlord1, landlord2];

  for (let i = 1; i <= 25; i++) {
    const city = CITIES[i % CITIES.length];
    const locList = LOCATIONS[city];
    const location = locList[i % locList.length];
    const coords = LOCATION_COORDS[location] || { lat: 27.7172, lng: 85.3240 };
    const roomType = ROOM_TYPES[i % ROOM_TYPES.length];
    const landlord = landlords[i % landlords.length];
    const price = Math.floor(Math.random() * 20000) + 6000;

    const mainImg = ROOM_IMAGES[i % ROOM_IMAGES.length];
    const secImg = ROOM_IMAGES[(i + 1) % ROOM_IMAGES.length];

    // Pick 3-6 random amenities
    const amenityIdsToInclude = createdAmenities
      .filter((_, idx) => (i + idx) % 2 === 0 || idx === i % 11)
      .map((a) => a.id);

    await prisma.room.create({
      data: {
        landlordId: landlord.id,
        title: `${roomType.charAt(0) + roomType.slice(1).toLowerCase()} Room #${i} in ${location}`,
        description: `Clean and well-maintained ${roomType.toLowerCase()} rental located in ${location}, ${city}. Features modern amenities and peaceful surrounding.`,
        city,
        location,
        latitude: coords.lat + (i * 0.001 - 0.01),
        longitude: coords.lng + (i * 0.001 - 0.01),
        roomType,
        price,
        status: RoomStatus.AVAILABLE,
        roomImages: {
          create: [
            { imageUrl: mainImg, isPrimary: true },
            { imageUrl: secImg, isPrimary: false },
          ],
        },
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

  const defaultPaymentMethod = await prisma.paymentMethod.create({
    data: {
      userId: tenant1.id,
      type: "ESEWA",
      label: "eSewa Wallet",
      detail: "9813333333",
      isDefault: true,
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: approvedBooking.id,
      amount: roomA.price,
      paymentMethodId: defaultPaymentMethod.id,
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

  console.log("❓ Seeding Frequently Asked Questions (FAQs)...");
  await prisma.faq.createMany({
    data: [
      {
        question: "How do I search and book a room on RoomFinder?",
        answer: "Browse available rooms on our landing page or search tab using filters like city, room type, budget, and amenities. Click 'View Details' or 'Book Now' to select your move-in date and send a request directly to the landlord.",
        order: 1,
        isActive: true,
      },
      {
        question: "Are there any hidden commission or agent fees?",
        answer: "No! RoomFinder is 100% free for renters. You pay zero platform fees or hidden commission. You only pay the rent and security deposit directly to the landlord.",
        order: 2,
        isActive: true,
      },
      {
        question: "How can landlords list their property for rent?",
        answer: "Simply create a Landlord account on RoomFinder, go to your dashboard, click 'List Property', and upload room photos, address, price, and amenities. Your listing will immediately go live.",
        order: 3,
        isActive: true,
      },
      {
        question: "Is the security deposit refundable?",
        answer: "Yes, security deposits are fully refundable at the end of your rental period, subject to room inspection and agreement terms between you and the landlord.",
        order: 4,
        isActive: true,
      },
      {
        question: "Can I inspect the room before finalizing the booking?",
        answer: "Absolutely! You can message or call the landlord directly through RoomFinder to schedule an in-person room visit before confirming your booking.",
        order: 5,
        isActive: true,
      },
      {
        question: "What digital payment methods are accepted?",
        answer: "RoomFinder supports digital payment tracking for eSewa, Khalti, direct bank transfer, and cash payments as agreed with your landlord.",
        order: 6,
        isActive: true,
      },
    ],
  });

  console.log("✅ SEEDING COMPLETE! Database ready with realistic images, coordinates & FAQs.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
