import { Router } from "express";
import {
  createBooking,
  getTenantBookings,
  getLandlordBookings,
  updateBookingStatus,
  cancelBooking,
} from "../controllers/booking.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { requireCompleteProfile } from "../middleware/profile.middleware";


const router = Router();

// All booking routes require authentication
router.use(authenticate);

// POST /api/bookings -> Tenant submits booking request
router.post("/", authorize("TENANT"), createBooking);

// GET /api/bookings/my-bookings -> Tenant views their bookings
router.get("/my-bookings", authorize("TENANT"), getTenantBookings);

// GET /api/bookings/landlord -> Landlord views incoming booking requests
router.get("/landlord", authorize("LANDLORD"), getLandlordBookings);

// PATCH /api/bookings/:id/status -> Landlord updates booking status (APPROVED / REJECTED)
router.patch("/:id/status", authorize("LANDLORD", "ADMIN"), updateBookingStatus);

// PATCH /api/bookings/:id/cancel -> Tenant cancels pending booking
router.patch("/:id/cancel", authorize("TENANT"), cancelBooking);
router.post("/", authenticate, requireCompleteProfile, createBooking);
export default router;
