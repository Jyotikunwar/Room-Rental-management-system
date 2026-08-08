import { Router } from "express";
import { getTenantDashboard, getCurrentRental } from "../controllers/dashboard.controller";
import { createComplaint } from "../controllers/complaint.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

router.get("/dashboard", authenticate, authorize("TENANT"), getTenantDashboard);
router.get("/rental", authenticate, authorize("TENANT"), getCurrentRental);
router.post("/rental/maintenance", authenticate, authorize("TENANT"), createComplaint);

export default router;
