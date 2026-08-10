import { Router } from "express";
import {
  signup,
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  uploadAvatar,
  getNotificationPreferences,
  updateNotificationPreferences,
  updateIdentification,
  uploadIdDocument,
  deleteAccount,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";
import { avatarUpload } from "../lib/avatar-upload";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);

router.get("/me", authenticate, getCurrentUser);
router.patch("/me", authenticate, updateProfile);
router.delete("/me", authenticate, deleteAccount);

router.patch("/me/password", authenticate, changePassword);
router.post("/me/avatar", authenticate, avatarUpload.single("avatar"), uploadAvatar);

router.get("/me/notification-preferences", authenticate, getNotificationPreferences);
router.patch("/me/notification-preferences", authenticate, updateNotificationPreferences);

router.patch("/me/identification", authenticate, updateIdentification);
router.post("/me/identification/document", authenticate, upload.single("document"), uploadIdDocument);

export default router;