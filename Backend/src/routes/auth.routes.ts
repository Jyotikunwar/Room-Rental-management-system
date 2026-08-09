import { Router } from "express";
import {
  signup,
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  uploadAvatar,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authenticate, getCurrentUser);
router.patch("/me", authenticate, updateProfile);
router.patch("/me/password", authenticate, changePassword);
router.post("/me/avatar", authenticate, upload.single("avatar"), uploadAvatar);

export default router;