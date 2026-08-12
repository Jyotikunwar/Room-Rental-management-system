import { Router } from "express";
import { getAdminStats } from "../controllers/dashboard.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import {
  getAdminDashboardStats,
  getLandlords,
  getLandlordStats,
  toggleLandlordStatus,
  updateLandlordProfile,
  getAdminProperties,
  getAdminPropertyStats,
  updatePropertyApprovalStatus,
} from "../controllers/admin.controller";
import { deleteRoom } from "../controllers/room.controller";

const router = Router();

router.get("/dashboard", authenticate, authorize("ADMIN"), getAdminStats);
router.get("/landlords", authenticate, authorize("ADMIN"), getLandlords);
router.get("/landlords/stats", authenticate, authorize("ADMIN"), getLandlordStats);
router.patch("/landlords/:id/status", authenticate, authorize("ADMIN"), toggleLandlordStatus);
router.patch("/landlords/:id", authenticate, authorize("ADMIN"), updateLandlordProfile);

// Admin Property Management
router.get("/properties", authenticate, authorize("ADMIN"), getAdminProperties);
router.get("/properties/stats", authenticate, authorize("ADMIN"), getAdminPropertyStats);
router.patch("/properties/:id/approval", authenticate, authorize("ADMIN"), updatePropertyApprovalStatus);
router.delete("/properties/:id", authenticate, authorize("ADMIN"), deleteRoom);

export default router;