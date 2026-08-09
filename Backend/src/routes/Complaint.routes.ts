import { Router } from "express";
import {
  createComplaint,
  getMyComplaints,
  getLandlordComplaints,
  updateComplaintStatus,
} from "../controllers/complaint.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authenticate, authorize("TENANT"), createComplaint);
router.get("/my", authenticate, getMyComplaints);
router.get("/landlord", authenticate, authorize("LANDLORD"), getLandlordComplaints);
router.patch("/:id/status", authenticate, authorize("LANDLORD"), updateComplaintStatus);

export default router;