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
  deleteRoomImage,
} from "../controllers/room.controller";
import { authenticate, authorize, optionalAuthenticate } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

// Public routes
router.get("/", getRooms);

// Protected routes (must come before "/:id" so "my-rooms" isn't treated as an id)
router.get("/my-rooms", authenticate, authorize("LANDLORD"), getMyRooms);
router.post("/", authenticate, authorize("LANDLORD", "ADMIN"), createRoom);
// Was PUT — the frontend (api.ts) sends PATCH for updateRoom, which was
// silently 404ing because Express only matches the exact method registered.
router.patch("/:id", authenticate, authorize("LANDLORD", "ADMIN"), updateRoom);
router.delete("/:id", authenticate, authorize("LANDLORD", "ADMIN"), deleteRoom);
router.delete("/images/:imageId", authenticate, authorize("LANDLORD", "ADMIN"), deleteRoomImage);
router.post(
  "/:id/images",
  authenticate,
  authorize("LANDLORD", "ADMIN"),
  upload.array("images", 5),
  uploadRoomImages
);

// Public routes with params
router.get("/:id", getRoomById);
router.get("/:id/recommendations", getRoomRecommendations);

export default router;