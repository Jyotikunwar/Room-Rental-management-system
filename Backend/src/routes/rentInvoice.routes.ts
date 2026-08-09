import { Router } from "express";
import {
  getTenantRentInvoices,
  getLandlordRentInvoices,
  getLandlordInvoiceStats,
  payRentInvoice,
  sendRentReminder,
} from "../controllers/rentInvoice.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/tenant", authorize("TENANT"), getTenantRentInvoices);
router.get("/landlord", authorize("LANDLORD"), getLandlordRentInvoices);
router.get("/landlord/stats", authorize("LANDLORD"), getLandlordInvoiceStats);
router.post("/:id/pay", authorize("TENANT"), payRentInvoice);
router.post("/:id/remind", authorize("LANDLORD"), sendRentReminder);

export default router;