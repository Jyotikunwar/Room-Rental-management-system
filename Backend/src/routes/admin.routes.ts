import { Router } from "express";
import { getAdminDashboardStats } from "../controllers/admin.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

// GET /api/admin/dashboard (protected - ADMIN role)
router.get("/dashboard", authenticate, authorize("ADMIN"), getAdminDashboardStats);

// Also allow public/general stats endpoint if needed for quick preview
router.get("/stats", getAdminDashboardStats);

export default router;
