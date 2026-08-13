import { Router } from "express";
import {
  getTenantRentInvoices,
  getLandlordRentInvoices,
  getLandlordInvoiceStats,
  payRentInvoice,
  sendRentReminder,
  confirmLandlordCashReceived,
  createRentInvoice,
} from "../controllers/rentInvoice.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/tenant", authorize("TENANT"), getTenantRentInvoices);
router.get("/landlord", authorize("LANDLORD"), getLandlordRentInvoices);
router.get("/landlord/stats", authorize("LANDLORD"), getLandlordInvoiceStats);
router.post("/create", authorize("LANDLORD"), createRentInvoice);
router.post("/:id/pay", authorize("TENANT"), payRentInvoice);
router.post("/:id/remind", authorize("LANDLORD"), sendRentReminder);
router.post("/:id/confirm-cash", authorize("LANDLORD"), confirmLandlordCashReceived);

export default router;