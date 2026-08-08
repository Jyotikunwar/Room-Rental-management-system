import { Router } from "express";
import {
  getPaymentMethods,
  addPaymentMethod,
  updatePaymentMethod,
  setDefaultPaymentMethod,
  deletePaymentMethod,
} from "../controllers/paymentMethod.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Payment methods belong to the logged-in user regardless of role
// (tenants pay rent, landlords could get payouts) — authenticate only.
router.use(authenticate);

router.get("/", getPaymentMethods);
router.post("/", addPaymentMethod);
router.patch("/:id", updatePaymentMethod);
router.patch("/:id/default", setDefaultPaymentMethod);
router.delete("/:id", deletePaymentMethod);

export default router;