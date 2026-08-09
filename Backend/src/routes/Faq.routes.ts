import { Router } from "express";
import { getFaqs, getAllFaqsAdmin, createFaq, updateFaq, deleteFaq } from "../controllers/faq.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

// Public — the landing page's FAQ section reads from here, no login required.
router.get("/", getFaqs);

// Admin-only management
router.get("/admin/all", authenticate, authorize("ADMIN"), getAllFaqsAdmin);
router.post("/", authenticate, authorize("ADMIN"), createFaq);
router.patch("/:id", authenticate, authorize("ADMIN"), updateFaq);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteFaq);

export default router;