import { Router } from "express";
import {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  getMyRooms,
} from "../controllers/room.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

// Public routes
router.get("/", getRooms);

// Protected routes (must come before "/:id" so "my-rooms" isn't treated as an id)
router.get("/my-rooms", authenticate, authorize("LANDLORD"), getMyRooms);
router.post("/", authenticate, authorize("LANDLORD"), createRoom);
router.put("/:id", authenticate, authorize("LANDLORD"), updateRoom);
router.delete("/:id", authenticate, authorize("LANDLORD"), deleteRoom);

// Public route with param (kept below /my-rooms)
router.get("/:id", getRoomById);

export default router;