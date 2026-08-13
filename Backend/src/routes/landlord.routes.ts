import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import {
  getLandlordActivity,
  getLandlordReviews,
  deleteLandlordReview,
} from "../controllers/landlord.controller";

const router = Router();

router.get("/activity", authenticate, authorize("LANDLORD", "ADMIN"), getLandlordActivity);
router.get("/reviews", authenticate, authorize("LANDLORD", "ADMIN"), getLandlordReviews);
router.delete("/reviews/:id", authenticate, authorize("LANDLORD", "ADMIN"), deleteLandlordReview);

export default router;
