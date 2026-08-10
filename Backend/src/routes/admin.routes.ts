import { Router } from "express";
import { getAdminStats } from "../controllers/dashboard.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import {
  getAdminDashboardStats,

  getLandlords,
  getLandlordStats,
  toggleLandlordStatus,
  updateLandlordProfile,
} from "../controllers/admin.controller";
const router = Router();

router.get("/dashboard", authenticate, authorize("ADMIN"), getAdminStats);
router.get("/landlords", getLandlords);
router.get("/landlords/stats", getLandlordStats);
router.patch("/landlords/:id/status", toggleLandlordStatus);
router.patch("/landlords/:id", updateLandlordProfile);
 

export default router;