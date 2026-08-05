import { Router } from "express";
import { createReview, getRoomReviews } from "../controllers/review.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

// GET /api/reviews/:roomId -> Anyone can view reviews for a room
router.get("/:roomId", getRoomReviews);

// POST /api/reviews -> Tenant submits a review
router.post("/", authenticate, authorize("TENANT"), createReview);

export default router;
