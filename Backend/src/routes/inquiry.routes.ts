import { Router } from "express";
import {
  sendInquiry,
  getReceivedInquiries,
  getSentInquiries,
} from "../controllers/inquiry.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

// All inquiry routes require authentication
router.use(authenticate);

// POST /api/inquiries -> Tenant sends an inquiry
router.post("/", authorize("TENANT"), sendInquiry);

// GET /api/inquiries/received -> Landlord views inquiries for their rooms
router.get("/received", authorize("LANDLORD"), getReceivedInquiries);

// GET /api/inquiries/sent -> Tenant views sent inquiries
router.get("/sent", authorize("TENANT"), getSentInquiries);

export default router;
