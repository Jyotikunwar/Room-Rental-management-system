import { Router } from "express";
import { createComplaint, getMyComplaints } from "../controllers/complaint.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authenticate, authorize("TENANT"), createComplaint);
router.get("/my", authenticate, getMyComplaints);

export default router;