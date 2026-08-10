import { Router } from "express";
import {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  getMyRooms,
  getRoomRecommendations,
  uploadRoomImages,
} from "../controllers/room.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

// Public routes
router.get("/", getRooms);

// Protected routes (must come before "/:id" so "my-rooms" isn't treated as an id)
router.get("/my-rooms", authenticate, authorize("LANDLORD"), getMyRooms);
router.post("/", authenticate, authorize("LANDLORD"), createRoom);
router.put("/:id", authenticate, authorize("LANDLORD"), updateRoom);
router.delete("/:id", authenticate, authorize("LANDLORD"), deleteRoom);
router.post(
  "/:id/images",
  authenticate,
  authorize("LANDLORD"),
  upload.array("images", 5),
  uploadRoomImages
);

// Public routes with params
router.get("/:id", getRoomById);
router.get("/:id/recommendations", getRoomRecommendations);

export default router;

