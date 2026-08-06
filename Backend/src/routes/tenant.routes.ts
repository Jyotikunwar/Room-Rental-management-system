import { Router } from "express";
import { getTenantDashboard, getPersonalizedRecommendations } from "../controllers/tenant.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate, authorize("TENANT"));

router.get("/dashboard", getTenantDashboard);
router.get("/recommendations", getPersonalizedRecommendations);

export default router;
