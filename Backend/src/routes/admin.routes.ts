import { Router } from "express";
import { getAdminStats } from "../controllers/dashboard.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

router.get("/dashboard", authenticate, authorize("ADMIN"), getAdminStats);

export default router;