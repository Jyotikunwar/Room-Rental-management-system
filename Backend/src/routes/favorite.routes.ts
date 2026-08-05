import { Router } from "express";
import {
  toggleFavorite,
  getMyFavorites,
  checkIsFavorite,
} from "../controllers/favorite.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// All favorite routes require logged in user
router.use(authenticate);

// GET /api/favorites (Get my favorite rooms)
router.get("/", getMyFavorites);

// POST /api/favorites/:roomId/toggle (Toggle add/remove favorite)
router.post("/:roomId/toggle", toggleFavorite);

// GET /api/favorites/check/:roomId (Check if room is favorited)
router.get("/check/:roomId", checkIsFavorite);

export default router;
