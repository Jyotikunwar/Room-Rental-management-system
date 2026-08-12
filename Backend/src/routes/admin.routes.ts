import { Router } from "express";
import { getAdminStats } from "../controllers/dashboard.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import {
  getAdminDashboardStats,
  getLandlords,
  getLandlordStats,
  toggleLandlordStatus,
  updateLandlordProfile,
  getAdminProperties,
  getAdminPropertyStats,
  updatePropertyApprovalStatus,
  getAdminBookings,
  getAdminTenantStats,
  toggleTenantStatus,
  updateTenantProfile,
  getAdminPayments,
  getAdminPaymentStats,
  createAdminPayment,
  updateAdminPaymentStatus,
  getAdminMaintenanceRequests,
  createAdminMaintenanceTicket,
  updateAdminMaintenanceStatus,
  deleteAdminMaintenanceTicket,
  getAdminActivity,
} from "../controllers/admin.controller";
import { deleteRoom } from "../controllers/room.controller";
import {
  getAdminMessageThreads,
  getAdminThreadMessages,
  sendAdminMessage,
  getAdminContactProfile,
  getAdminMessageContacts,
} from "../controllers/adminMessage.controller";

const router = Router();

router.get("/dashboard", authenticate, authorize("ADMIN"), getAdminStats);
router.get("/activity", authenticate, authorize("ADMIN"), getAdminActivity);
router.get("/landlords", authenticate, authorize("ADMIN"), getLandlords);
router.get("/landlords/stats", authenticate, authorize("ADMIN"), getLandlordStats);
router.patch("/landlords/:id/status", authenticate, authorize("ADMIN"), toggleLandlordStatus);
router.patch("/landlords/:id", authenticate, authorize("ADMIN"), updateLandlordProfile);

// Admin Tenant Management
router.get("/bookings", authenticate, authorize("ADMIN"), getAdminBookings);
router.get("/tenants/stats", authenticate, authorize("ADMIN"), getAdminTenantStats);
router.patch("/tenants/:id/status", authenticate, authorize("ADMIN"), toggleTenantStatus);
router.patch("/tenants/:id", authenticate, authorize("ADMIN"), updateTenantProfile);

// Admin Payment Management
router.get("/payments", authenticate, authorize("ADMIN"), getAdminPayments);
router.get("/payments/stats", authenticate, authorize("ADMIN"), getAdminPaymentStats);
router.post("/payments", authenticate, authorize("ADMIN"), createAdminPayment);
router.patch("/payments/:id/status", authenticate, authorize("ADMIN"), updateAdminPaymentStatus);

// Admin Maintenance Management
router.get("/complaints", authenticate, authorize("ADMIN"), getAdminMaintenanceRequests);
router.post("/complaints", authenticate, authorize("ADMIN"), createAdminMaintenanceTicket);
router.patch("/complaints/:id/status", authenticate, authorize("ADMIN"), updateAdminMaintenanceStatus);
router.delete("/complaints/:id", authenticate, authorize("ADMIN"), deleteAdminMaintenanceTicket);

// Admin Property Management
router.get("/properties", authenticate, authorize("ADMIN"), getAdminProperties);
router.get("/properties/stats", authenticate, authorize("ADMIN"), getAdminPropertyStats);
router.patch("/properties/:id/approval", authenticate, authorize("ADMIN"), updatePropertyApprovalStatus);
router.delete("/properties/:id", authenticate, authorize("ADMIN"), deleteRoom);

// Admin messaging
router.get("/messages/contacts", authenticate, authorize("ADMIN"), getAdminMessageContacts);
router.get("/messages/threads", authenticate, authorize("ADMIN"), getAdminMessageThreads);
router.get("/messages/threads/:contactId", authenticate, authorize("ADMIN"), getAdminThreadMessages);
router.post("/messages/threads/:contactId", authenticate, authorize("ADMIN"), sendAdminMessage);
router.get("/contacts/:contactId", authenticate, authorize("ADMIN"), getAdminContactProfile);

export default router;