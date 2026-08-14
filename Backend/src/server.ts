import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth.routes";
import roomRoutes from "./routes/room.routes";
import bookingRoutes from "./routes/booking.routes";
import paymentRoutes from "./routes/payment.routes";
import favoriteRoutes from "./routes/favorite.routes";
import reviewRoutes from "./routes/review.routes";
import inquiryRoutes from "./routes/inquiry.routes";
import notificationRoutes from "./routes/notification.routes";
import tenantRoutes from "./routes/tenant.routes";
import adminRoutes from "./routes/admin.routes";
import landlordRoutes from "./routes/landlord.routes";
import publicRoutes from "./routes/public.routes";
import complaintRoutes from "./routes/Complaint.routes";
import rentInvoiceRoutes from "./routes/rentInvoice.routes";
import paymentMethodRoutes from "./routes/paymentMethod.routes";
import messageRoutes from "./routes/Message.routes";
import FaqRoutes from "./routes/Faq.routes";



const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/messages", messageRoutes);
// Serve uploaded room images statically, e.g. http://localhost:5000/uploads/room-123.jpg
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/", (req, res) => {
  res.send("Room Rental Backend Running 🚀");
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/tenant", tenantRoutes);
app.use("/api/landlord", landlordRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/rent-invoices", rentInvoiceRoutes);

app.use("/api/payment-methods", paymentMethodRoutes);
app.use("/api/faqs", FaqRoutes);
// Error handler middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "An error occurred during file processing",
    });
  }
  next();
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});