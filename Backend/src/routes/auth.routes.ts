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
  forgotPassword,
  verifyResetToken,
  resetPassword,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";
import { avatarUpload } from "../lib/avatar-upload";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.get("/verify-reset-token/:token", verifyResetToken);
router.post("/reset-password", resetPassword);


router.get("/me", authenticate, getCurrentUser);
router.patch("/me", authenticate, updateProfile);
router.delete("/me", authenticate, deleteAccount);

router.patch("/me/password", authenticate, changePassword);
router.post("/me/avatar", authenticate, avatarUpload.single("avatar"), uploadAvatar);

router.get("/me/notification-preferences", authenticate, getNotificationPreferences);
router.patch("/me/notification-preferences", authenticate, updateNotificationPreferences);

router.patch("/me/identification", authenticate, updateIdentification);

// Support both /me/identification/document and /me/id-document for frontend compatibility
const handleDocUpload = (req: any, res: any, next: any) => {
  upload.any()(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

router.post("/me/identification/document", authenticate, handleDocUpload, uploadIdDocument);
router.post("/me/id-document", authenticate, handleDocUpload, uploadIdDocument);

export default router;