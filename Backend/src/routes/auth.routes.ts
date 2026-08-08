import { Router } from "express";
import {
  login,
  signup,
  getCurrentUser,
  updateProfile,
  uploadAvatar,
  getNotificationPreferences,
  updateNotificationPreferences,
  updateIdentification,uploadIdDocument,
   changePassword,
  deleteAccount,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { avatarUpload } from "../lib/avatar-upload";
 import { upload } from "../middleware/upload.middleware";
 
const router = Router();

router.post("/login", login);
router.post("/signup", signup);

router.get("/me", authenticate, getCurrentUser);
router.patch("/me", authenticate, updateProfile);
router.delete("/me", authenticate, deleteAccount);
router.post("/me/avatar", authenticate, avatarUpload.single("avatar"), uploadAvatar);
router.patch("/me/password", authenticate, changePassword);

router.get("/me/notification-preferences", authenticate, getNotificationPreferences);
router.patch("/me/notification-preferences", authenticate, updateNotificationPreferences);

router.patch("/me/identification", authenticate, updateIdentification);
router.post("/me/identification/document", authenticate, upload.single("document"), uploadIdDocument);
router.patch("/me/password", authenticate, changePassword);
router.delete("/me", authenticate, deleteAccount);
export default router;