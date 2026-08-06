import { Router } from "express";
import { getMyPayments, createPayment } from "../controllers/payment.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/my-payments", authorize("TENANT"), getMyPayments);
router.post("/", authorize("TENANT"), createPayment);

export default router;
