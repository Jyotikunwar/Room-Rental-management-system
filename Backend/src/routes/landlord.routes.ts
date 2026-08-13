import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { getLandlordActivity } from "../controllers/landlord.controller";

const router = Router();

router.get("/activity", authenticate, authorize("LANDLORD", "ADMIN"), getLandlordActivity);

export default router;
