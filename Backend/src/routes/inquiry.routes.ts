import { Router } from "express";
import {
  sendInquiry,
  replyToInquiry,
  getReceivedInquiries,
  getSentInquiries,
} from "../controllers/inquiry.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.post("/", authorize("TENANT"), sendInquiry);
router.post("/reply", authorize("LANDLORD", "TENANT"), replyToInquiry);
router.get("/received", authorize("LANDLORD"), getReceivedInquiries);
router.get("/sent", authorize("TENANT"), getSentInquiries);

export default router;