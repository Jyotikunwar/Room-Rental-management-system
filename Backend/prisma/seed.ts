import { PrismaClient, Role, RoomType, RoomStatus, RoomApprovalStatus, BookingStatus, PaymentStatus, SavedPaymentMethodType, ComplaintStatus, NotificationType, IdentificationType } from "@prisma/client";
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
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=800&q=80",
];

const ROOM_TYPES: RoomType[] = ["SINGLE", "DOUBLE", "FLAT", "APARTMENT"];

async function main() {
  console.log("🌱 Starting Full Database Re-seeding Process...");

  // 1. Clear existing seedable records in correct dependency order
  console.log("🧹 Wiping old database data...");

  await prisma.recommendationLog.deleteMany({});
  await prisma.rentInvoice.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.paymentMethod.deleteMany({});
  await prisma.complaint.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.roomAmenity.deleteMany({});
  await prisma.roomImage.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.amenity.deleteMany({});
  await prisma.faq.deleteMany({});
  await prisma.passwordResetToken.deleteMany({});
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

  // 3. Seed Password Hash & Strictly Compliant New Users
  console.log("👤 Seeding New Auth-Compliant Admin, Landlords, and Tenants...");
  const tenantPassword = await bcrypt.hash("Tenant@1234", 10);
  const landlordPassword = await bcrypt.hash("Landlord@123", 10);
  const adminPassword = await bcrypt.hash("Admin@12345", 10);

  // Admin Account
  const admin = await prisma.user.create({
    data: {
      fullName: "Horizon System Administrator",
      email: "admin.horizon@gmail.com",
      password: adminPassword,
      phone: "9800000000",
      role: Role.ADMIN,
      idType: IdentificationType.NATIONAL_ID,
      idNumber: "ADM-990011",
      isIdVerified: true,
    },
  });

  // 5 Landlord Accounts
  const landlord1 = await prisma.user.create({
    data: {
      fullName: "Ram Bahadur Shrestha",
      email: "ram.shrestha.landlord@gmail.com",
      password: landlordPassword,
      phone: "9841112233",
      role: Role.LANDLORD,
      idType: IdentificationType.CITIZENSHIP,
      idNumber: "27-01-78-10001",
      isIdVerified: true,
    },
  });

  const landlord2 = await prisma.user.create({
    data: {
      fullName: "Sita Devi Pokharel",
      email: "sita.pokharel.landlord@gmail.com",
      password: landlordPassword,
      phone: "9842223344",
      role: Role.LANDLORD,
      idType: IdentificationType.PASSPORT,
      idNumber: "N98765432",
      isIdVerified: true,
    },
  });

  const landlord3 = await prisma.user.create({
    data: {
      fullName: "Hari Prasad Adhikari",
      email: "hari.adhikari.landlord@gmail.com",
      password: landlordPassword,
      phone: "9843334455",
      role: Role.LANDLORD,
      idType: IdentificationType.NATIONAL_ID,
      idNumber: "10987654321",
      isIdVerified: false,
    },
  });

  const landlord4 = await prisma.user.create({
    data: {
      fullName: "Gita Kumari Thapa",
      email: "gita.thapa.landlord@gmail.com",
      password: landlordPassword,
      phone: "9844445566",
      role: Role.LANDLORD,
      idType: IdentificationType.CITIZENSHIP,
      idNumber: "28-02-79-11223",
      isIdVerified: true,
    },
  });

  const landlord5 = await prisma.user.create({
    data: {
      fullName: "Bishnu Maya Karki",
      email: "bishnu.karki.landlord@gmail.com",
      password: landlordPassword,
      phone: "9845556677",
      role: Role.LANDLORD,
      idType: IdentificationType.DRIVING_LICENSE,
      idNumber: "DL-9988776",
      isIdVerified: true,
    },
  });

  // 6 Tenant Accounts
  const tenant1 = await prisma.user.create({
    data: {
      fullName: "Aarav Kumar Sharma",
      email: "aarav.sharma.tenant@gmail.com",
      password: tenantPassword,
      phone: "9811112233",
      role: Role.TENANT,
      idType: IdentificationType.CITIZENSHIP,
      idNumber: "27-02-80-11223",
      isIdVerified: true,
    },
  });

  const tenant2 = await prisma.user.create({
    data: {
      fullName: "Bhawana Raj Shrestha",
      email: "bhawana.shrestha.tenant@gmail.com",
      password: tenantPassword,
      phone: "9812223344",
      role: Role.TENANT,
      idType: IdentificationType.DRIVING_LICENSE,
      idNumber: "DL-1122334",
      isIdVerified: true,
    },
  });

  const tenant3 = await prisma.user.create({
    data: {
      fullName: "Chandan Bahadur Rai",
      email: "chandan.rai.tenant@gmail.com",
      password: tenantPassword,
      phone: "9813334455",
      role: Role.TENANT,
      idType: IdentificationType.CITIZENSHIP,
      idNumber: "29-01-81-55667",
      isIdVerified: false,
    },
  });

  const tenant4 = await prisma.user.create({
    data: {
      fullName: "Deepika Maya Gurung",
      email: "deepika.gurung.tenant@gmail.com",
      password: tenantPassword,
      phone: "9814445566",
      role: Role.TENANT,
      idType: IdentificationType.PASSPORT,
      idNumber: "P77665544",
      isIdVerified: true,
    },
  });

  const tenant5 = await prisma.user.create({
    data: {
      fullName: "Elina Devi Tamang",
      email: "elina.tamang.tenant@gmail.com",
      password: tenantPassword,
      phone: "9815556677",
      role: Role.TENANT,
      idType: IdentificationType.NATIONAL_ID,
      idNumber: "N8877665544",
      isIdVerified: true,
    },
  });

  const tenant6 = await prisma.user.create({
    data: {
      fullName: "Gaurav Bikram KC",
      email: "gaurav.kc.tenant@gmail.com",
      password: tenantPassword,
      phone: "9816667788",
      role: Role.TENANT,
      idType: IdentificationType.CITIZENSHIP,
      idNumber: "30-01-82-99001",
      isIdVerified: false,
    },
  });

  const landlords = [landlord1, landlord2, landlord3, landlord4, landlord5];

  // 4. Seed Saved Payment Methods for Tenants
  console.log("💳 Seeding Saved Payment Methods...");
  const tenant1Esewa = await prisma.paymentMethod.create({
    data: {
      userId: tenant1.id,
      type: SavedPaymentMethodType.ESEWA,
      label: "eSewa Primary Wallet",
      detail: "9811112233",
      isDefault: true,
    },
  });

  await prisma.paymentMethod.create({
    data: {
      userId: tenant1.id,
      type: SavedPaymentMethodType.BANK,
      label: "Nabil Bank Account",
      detail: "01000199887711",
      isDefault: false,
    },
  });

  const tenant2Khalti = await prisma.paymentMethod.create({
    data: {
      userId: tenant2.id,
      type: SavedPaymentMethodType.KHALTI,
      label: "Khalti Digital Wallet",
      detail: "9812223344",
      isDefault: true,
    },
  });

  // 5. Seed Plenty of Landlord Properties & Rooms (36 Total)
  console.log("🏠 Seeding Plenty of Landlord Properties & Rooms across Nepal Cities...");

  const roomA = await prisma.room.create({
    data: {
      landlordId: landlord1.id,
      title: "Shanti Niwas, Baneshwor (Near College & Main Road)",
      description: "Bright single studio room near Apex College and Main Road. High-speed WiFi, parking, water supply, and full furniture.",
      city: "Kathmandu",
      location: "Baneshwor",
      address: "Baneshwor Heights, Ward 10",
      latitude: LOCATION_COORDS["Baneshwor"].lat,
      longitude: LOCATION_COORDS["Baneshwor"].lng,
      roomType: RoomType.SINGLE,
      price: 8500,
      securityDeposit: 8500,
      status: RoomStatus.BOOKED,
      approvalStatus: RoomApprovalStatus.APPROVED,
      furnishedDetails: "Single Bed, Clothes Wardrobe, Study Table, Ergonomic Chair, Bookshelf",
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

  const roomB = await prisma.room.create({
    data: {
      landlordId: landlord1.id,
      title: "Cozy Single Room in Baneshwor Center (Near Hospital)",
      description: "Comfortable single room near Civil Hospital Baneshwor. Includes WiFi, parking, and furnished setup.",
      city: "Kathmandu",
      location: "Baneshwor",
      address: "New Baneshwor Chowk",
      latitude: LOCATION_COORDS["Baneshwor"].lat + 0.002,
      longitude: LOCATION_COORDS["Baneshwor"].lng + 0.001,
      roomType: RoomType.SINGLE,
      price: 12500,
      securityDeposit: 10000,
      status: RoomStatus.AVAILABLE,
      approvalStatus: RoomApprovalStatus.APPROVED,
      furnishedDetails: "Queen Bed, Wardrobe, Side Table, Study Desk, Mirror",
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

  const roomC = await prisma.room.create({
    data: {
      landlordId: landlord2.id,
      title: "Luxury 3BHK Penthouse Apartment (Near Supermarket & Park)",
      description: "Spacious penthouse luxury apartment with private balcony, air conditioning, near Saleways Supermarket and Lakeside Park.",
      city: "Pokhara",
      location: "Lakeside",
      address: "Lakeside Marg, Street No 6",
      latitude: LOCATION_COORDS["Lakeside"].lat,
      longitude: LOCATION_COORDS["Lakeside"].lng,
      roomType: RoomType.APARTMENT,
      price: 45000,
      securityDeposit: 45000,
      status: RoomStatus.AVAILABLE,
      approvalStatus: RoomApprovalStatus.APPROVED,
      furnishedDetails: "3-Piece Sofa Set, King Size Bed, 6-Seater Dining Table, Modern Kitchen Cabinet, AC Unit",
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

  const roomPendingAdmin = await prisma.room.create({
    data: {
      landlordId: landlord3.id,
      title: "Newly Built Studio Flat in Kupondole (Pending Approval)",
      description: "Modern studio room undergoing final admin verification before publishing.",
      city: "Lalitpur",
      location: "Kupondole",
      address: "Kupondole Height",
      latitude: LOCATION_COORDS["Kupondole"].lat,
      longitude: LOCATION_COORDS["Kupondole"].lng,
      roomType: RoomType.FLAT,
      price: 18000,
      securityDeposit: 18000,
      status: RoomStatus.AVAILABLE,
      approvalStatus: RoomApprovalStatus.PENDING,
      roomImages: {
        create: [{ imageUrl: ROOM_IMAGES[5], isPrimary: true }],
      },
      roomAmenities: {
        create: [
          { amenityId: amenityMap.get("WiFi")! },
          { amenityId: amenityMap.get("Kitchen")! },
        ],
      },
    },
  });

  const createdRooms = [roomA, roomB, roomC, roomPendingAdmin];

  for (let i = 1; i <= 32; i++) {
    const city = CITIES[i % CITIES.length];
    const locList = LOCATIONS[city];
    const location = locList[i % locList.length];
    const coords = LOCATION_COORDS[location] || { lat: 27.7172, lng: 85.3240 };
    const roomType = ROOM_TYPES[i % ROOM_TYPES.length];
    const landlord = landlords[i % landlords.length];
    const price = Math.floor(Math.random() * 22000) + 6000;
    const approval = i % 8 === 0 ? RoomApprovalStatus.PENDING : RoomApprovalStatus.APPROVED;

    const mainImg = ROOM_IMAGES[i % ROOM_IMAGES.length];
    const secImg = ROOM_IMAGES[(i + 1) % ROOM_IMAGES.length];

    const amenityIdsToInclude = createdAmenities
      .filter((_, idx) => (i + idx) % 2 === 0 || idx === i % 11)
      .map((a) => a.id);

    const r = await prisma.room.create({
      data: {
        landlordId: landlord.id,
        title: `${roomType.charAt(0) + roomType.slice(1).toLowerCase()} Property #${i} in ${location} (Near Main Road & College)`,
        description: `Clean and well-maintained ${roomType.toLowerCase()} rental located in ${location}, ${city}. Close to public transit, hospital, and markets.`,
        city,
        location,
        address: `${location} Block ${i}`,
        latitude: coords.lat + (i * 0.0012 - 0.015),
        longitude: coords.lng + (i * 0.0012 - 0.015),
        roomType,
        price,
        securityDeposit: price,
        status: RoomStatus.AVAILABLE,
        approvalStatus: approval,
        furnishedDetails: i % 2 === 0 ? "Double Bed, Wardrobe, Study Desk, Sofa Chair" : undefined,
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
    createdRooms.push(r);
  }

  // 6. Seed Ratings, Reviews & Favorites
  console.log("⭐ Seeding Ratings, Reviews & Favorites...");
  await prisma.review.create({
    data: {
      userId: tenant1.id,
      roomId: roomA.id,
      rating: 5,
      comment: "Fantastic place! Fast internet, peaceful surroundings, and responsive landlord.",
    },
  });

  await prisma.review.create({
    data: {
      userId: tenant2.id,
      roomId: roomA.id,
      rating: 5,
      comment: "Very cozy single room, close to Baneshwor main road.",
    },
  });

  await prisma.review.create({
    data: {
      userId: tenant3.id,
      roomId: roomB.id,
      rating: 4,
      comment: "Great room for students, near civil hospital.",
    },
  });

  await prisma.review.create({
    data: {
      userId: tenant4.id,
      roomId: roomC.id,
      rating: 5,
      comment: "Breathtaking Pokhara Lakeside view. Extremely luxurious!",
    },
  });

  await prisma.favorite.create({ data: { userId: tenant1.id, roomId: roomA.id } });
  await prisma.favorite.create({ data: { userId: tenant1.id, roomId: roomC.id } });
  await prisma.favorite.create({ data: { userId: tenant2.id, roomId: roomB.id } });
  await prisma.favorite.create({ data: { userId: tenant3.id, roomId: roomA.id } });
  await prisma.favorite.create({ data: { userId: tenant4.id, roomId: roomC.id } });
  await prisma.favorite.create({ data: { userId: tenant5.id, roomId: roomB.id } });

  // 7. Seed Bookings, Rent Invoices & Payments
  console.log("📋 Seeding Bookings, Rent Invoices & Payments...");
  
  // Approved Active Booking for Tenant 1 (Room A)
  const bookingActive1 = await prisma.booking.create({
    data: {
      roomId: roomA.id,
      tenantId: tenant1.id,
      moveInDate: new Date("2025-01-01"),
      endDate: new Date("2026-12-31"),
      totalAmount: roomA.price,
      status: BookingStatus.APPROVED,
      notes: "Active long-term tenancy agreement.",
    },
  });

  // Pending Booking Request for Tenant 1 (Room B)
  await prisma.booking.create({
    data: {
      roomId: roomB.id,
      tenantId: tenant1.id,
      moveInDate: new Date("2026-09-01"),
      totalAmount: roomB.price,
      status: BookingStatus.PENDING,
      notes: "Requesting move-in next month.",
    },
  });

  // Completed Past Booking for Tenant 2 (Room C)
  await prisma.booking.create({
    data: {
      roomId: roomC.id,
      tenantId: tenant2.id,
      moveInDate: new Date("2024-01-01"),
      endDate: new Date("2024-12-31"),
      totalAmount: roomC.price,
      status: BookingStatus.COMPLETED,
      notes: "Past tenancy successfully completed.",
    },
  });

  // Pending Booking Request for Tenant 3 (Room C)
  await prisma.booking.create({
    data: {
      roomId: roomC.id,
      tenantId: tenant3.id,
      moveInDate: new Date("2026-09-15"),
      totalAmount: roomC.price,
      status: BookingStatus.PENDING,
      notes: "Planning family relocation to Pokhara.",
    },
  });

  // Booking for Tenant 4 (Room 5)
  await prisma.booking.create({
    data: {
      roomId: createdRooms[4].id,
      tenantId: tenant4.id,
      moveInDate: new Date("2026-08-01"),
      totalAmount: createdRooms[4].price,
      status: BookingStatus.APPROVED,
      notes: "Student stay for upcoming semester.",
    },
  });

  // Payments
  await prisma.payment.create({
    data: {
      bookingId: bookingActive1.id,
      amount: roomA.price,
      paymentMethodId: tenant1Esewa.id,
      transactionId: "ESEWA-TXN-90901",
      status: PaymentStatus.PAID,
      paidAt: new Date("2025-01-02"),
    },
  });

  // Rent Invoices (Past Paid, Current Pending, Overdue)
  await prisma.rentInvoice.create({
    data: {
      bookingId: bookingActive1.id,
      periodStart: new Date("2026-07-01"),
      periodEnd: new Date("2026-07-31"),
      amount: roomA.price,
      dueDate: new Date("2026-07-05"),
      status: PaymentStatus.PAID,
      paymentMethodId: tenant1Esewa.id,
      transactionId: "RENT-INV-202607",
      paidAt: new Date("2026-07-04"),
    },
  });

  await prisma.rentInvoice.create({
    data: {
      bookingId: bookingActive1.id,
      periodStart: new Date("2026-08-01"),
      periodEnd: new Date("2026-08-31"),
      amount: roomA.price,
      dueDate: new Date("2026-08-15"),
      status: PaymentStatus.PENDING,
      paymentMethodId: tenant1Esewa.id,
    },
  });

  await prisma.rentInvoice.create({
    data: {
      bookingId: bookingActive1.id,
      periodStart: new Date("2026-06-01"),
      periodEnd: new Date("2026-06-30"),
      amount: roomA.price,
      dueDate: new Date("2026-06-05"),
      status: PaymentStatus.PENDING,
    },
  });

  // 8. Seed Maintenance Tickets & Complaints
  console.log("🛠️ Seeding Maintenance Tickets & Complaints...");
  await prisma.complaint.create({
    data: {
      bookingId: bookingActive1.id,
      userId: tenant1.id,
      title: "Tap Water Leakage in Bathroom",
      description: "Water tap in attached bathroom is leaking continuously.",
      status: ComplaintStatus.IN_PROGRESS,
    },
  });

  await prisma.complaint.create({
    data: {
      bookingId: bookingActive1.id,
      userId: tenant1.id,
      title: "WiFi Router Reset Request",
      description: "Internet speed dropped in secondary bedroom. Please restart router.",
      status: ComplaintStatus.RESOLVED,
    },
  });

  // 9. Seed Chat Messages
  console.log("💬 Seeding Messages & Conversations...");
  await prisma.message.createMany({
    data: [
      {
        senderId: tenant1.id,
        receiverId: landlord1.id,
        roomId: roomA.id,
        message: "Namaste Ram Sir, I have paid July rent via eSewa. Please check.",
        isRead: true,
        createdAt: new Date("2026-07-04T10:00:00Z"),
      },
      {
        senderId: landlord1.id,
        receiverId: tenant1.id,
        roomId: roomA.id,
        message: "Namaste Aarav! Received the payment. Thank you!",
        isRead: true,
        createdAt: new Date("2026-07-04T10:15:00Z"),
      },
      {
        senderId: tenant2.id,
        receiverId: landlord1.id,
        roomId: roomB.id,
        message: "Is the single room in Baneshwor Center available for a visit tomorrow?",
        isRead: false,
        createdAt: new Date("2026-08-11T14:30:00Z"),
      },
      {
        senderId: tenant3.id,
        receiverId: admin.id,
        message: "Hello Admin, my citizenship document is pending verification.",
        isRead: false,
        createdAt: new Date("2026-08-12T09:00:00Z"),
      },
    ],
  });

  // 10. Seed Notifications
  console.log("🔔 Seeding User Notifications...");
  await prisma.notification.createMany({
    data: [
      {
        userId: tenant1.id,
        title: "Rent Invoice Generated",
        message: "Your August rent invoice of Rs. 8,500 is due on August 15.",
        type: NotificationType.PAYMENT,
        isRead: false,
      },
      {
        userId: tenant1.id,
        title: "Maintenance Status Updated",
        message: "Your ticket 'Tap Water Leakage in Bathroom' is now In Progress.",
        type: NotificationType.SYSTEM,
        isRead: true,
      },
      {
        userId: landlord1.id,
        title: "New Booking Request",
        message: "Aarav Kumar Sharma sent a booking request for Baneshwor Single Room.",
        type: NotificationType.BOOKING,
        isRead: false,
      },
      {
        userId: admin.id,
        title: "New Landlord Registration",
        message: "Hari Prasad Adhikari registered as a Landlord and submitted ID documents.",
        type: NotificationType.SYSTEM,
        isRead: false,
      },
    ],
  });

  // 11. Seed FAQs
  console.log("❓ Seeding FAQs...");
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
        answer: "Simply create a Landlord account on RoomFinder, go to your dashboard, click 'List Property', and upload room photos, address, price, and amenities. Your listing will immediately go live after quick approval.",
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

  console.log("✅ FULL SEEDING COMPLETE! All new accounts follow strict auth & validation rules.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
