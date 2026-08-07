import { Router } from "express";
import { getPublicStats, getPublicTestimonials } from "../controllers/public.controller";

const router = Router();

router.get("/stats", getPublicStats);
router.get("/testimonials", getPublicTestimonials);

export default router;