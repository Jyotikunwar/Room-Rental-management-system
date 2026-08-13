import { Request, Response } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma";
import { hashPassword, comparePassword } from "../lib/bcrypt";
import { signToken } from "../lib/jwt";
import { AuthRequest } from "../middleware/auth.middleware";
import { sendPasswordResetEmail } from "../services/email.service";



const DEFAULT_NOTIFICATION_PREFS = {
  payments: true,
  maintenance: true,
  messages: true,
  promotions: false,
  email: true,
  sms: false,
  push: true,
};

const safeUser = (user: any) => {
  const { password: _pw, notificationPrefs: _np, ...rest } = user;
  return rest;
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "This account has been suspended. Contact support." });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const token = signToken({ id: user.id, role: user.role });
    return res.json({ success: true, message: "Login successful", user: safeUser(user), token });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Login failed", error: err.message });
  }
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, phone, role } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "fullName, email and password are required" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ success: false, message: "Email already registered" });

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashed,
        phone,
        role: role === "LANDLORD" || role === "ADMIN" ? role : "TENANT",
        notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
      },
    });

    const token = signToken({ id: user.id, role: user.role });
    return res.status(201).json({ success: true, message: "Registered successfully", user: safeUser(user), token });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Registration failed", error: err.message });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, user: safeUser(user) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Failed to fetch profile", error: err.message });
  }
};

// PATCH /api/auth/me  (protected)
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, phone } = req.body;

    if (fullName !== undefined && (typeof fullName !== "string" || fullName.trim().length < 2)) {
      return res.status(400).json({ success: false, message: "Full name must be at least 2 characters" });
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(fullName !== undefined && { fullName: fullName.trim() }),
        ...(phone !== undefined && { phone: phone.trim() || null }),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
      },
    });

    return res.status(200).json({ success: true, message: "Profile updated", user });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

// PATCH /api/auth/me/password  (protected)
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "currentPassword and newPassword are required" });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashed },
    });

    return res.status(200).json({ success: true, message: "Password updated" });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ success: false, message: "Failed to update password" });
  }
};

// POST /api/auth/me/avatar  (protected, multipart/form-data, field name "avatar")
export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ success: false, message: "No avatar file uploaded" });
    }

    const avatarUrl = `/uploads/avatars/${file.filename}`;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatarUrl },
      select: { id: true, fullName: true, email: true, phone: true, role: true, avatarUrl: true },
    });

    return res.status(200).json({ success: true, message: "Avatar updated", user });
  } catch (error) {
    console.error("Upload avatar error:", error);
    return res.status(500).json({ success: false, message: "Failed to upload avatar" });
  }
};

// DELETE /api/auth/me
// Cascade deletes (if configured in schema.prisma) clean up this user's
// bookings, favorites, messages, notifications, etc. automatically.
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.user!.id } });
    return res.json({ success: true, message: "Account deleted" });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete account. Make sure there are no active bookings/rooms tied to this account.",
      error: err.message,
    });
  }
};

export const getNotificationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { notificationPrefs: true },
    });
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...((user?.notificationPrefs as object) || {}) };
    return res.json({ success: true, preferences: prefs });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Failed to fetch preferences", error: err.message });
  }
};

export const updateNotificationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const current = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { notificationPrefs: true },
    });
    const merged = {
      ...DEFAULT_NOTIFICATION_PREFS,
      ...((current?.notificationPrefs as object) || {}),
      ...req.body,
    };

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { notificationPrefs: merged },
    });

    return res.json({ success: true, preferences: merged });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Failed to update preferences", error: err.message });
  }
};

export const updateIdentification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { idType, idNumber } = req.body;

    if (!idType || !idNumber) {
      return res.status(400).json({ success: false, message: "idType and idNumber are required" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        idType,
        idNumber,
        isIdVerified: false, // any change to ID info resets verification — an admin re-checks it
      },
      select: { id: true, fullName: true, email: true, phone: true, role: true, avatarUrl: true, idType: true, idNumber: true, idDocumentUrl: true, isIdVerified: true },
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error("Update identification error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// POST /api/auth/me/identification/document or /api/auth/me/id-document
export const uploadIdDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({ success: false, message: "No document uploaded" });
    }

    const documentUrl = `/uploads/${file.filename}`;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { idDocumentUrl: documentUrl, isIdVerified: false },
      select: { id: true, fullName: true, email: true, phone: true, role: true, avatarUrl: true, idType: true, idNumber: true, idDocumentUrl: true, isIdVerified: true },
    });

    res.json({ success: true, user, idDocumentUrl: documentUrl });
  } catch (error) {
    console.error("Upload ID document error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// POST /api/auth/forgot-password
// Generates a password reset token expiring strictly in 2 MINUTES (120 seconds)
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const formattedEmail = String(email).trim().toLowerCase();
    if (!formattedEmail.endsWith("@gmail.com")) {
      return res.status(400).json({ success: false, message: "Email must end with @gmail.com" });
    }

    const user = await prisma.user.findUnique({ where: { email: formattedEmail } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address.",
      });
    }

    // Generate a secure 32-character hexadecimal reset token
    const rawToken = crypto.randomBytes(20).toString("hex");
    
    // Set expiration strictly to 2 MINUTES (120 seconds) from now
    const EXPIRATION_MINUTES = 2;
    const expiresAt = new Date(Date.now() + EXPIRATION_MINUTES * 60 * 1000);

    // Save token in DB
    await (prisma as any).passwordResetToken.create({
      data: {
        email: formattedEmail,
        token: rawToken,
        expiresAt,
        used: false,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Account verified! Set your new password within ${EXPIRATION_MINUTES} minutes.`,
      token: rawToken,
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: EXPIRATION_MINUTES * 60,
    });


  } catch (error: any) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ success: false, message: "Failed to process forgot password request", error: error.message });
  }
};

// GET /api/auth/verify-reset-token/:token
export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    const record = await (prisma as any).passwordResetToken.findUnique({
      where: { token: String(token) },
    });

    if (!record || record.used) {
      return res.status(400).json({ success: false, message: "Invalid or already used password reset token" });
    }

    if (new Date() > new Date(record.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: "Password reset link has expired (link is valid for 2 minutes only). Please request a new link.",
        isExpired: true,
      });
    }

    const remainingMs = new Date(record.expiresAt).getTime() - Date.now();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    return res.status(200).json({
      success: true,
      email: record.email,
      remainingSeconds,
    });
  } catch (error: any) {
    console.error("Verify reset token error:", error);
    return res.status(500).json({ success: false, message: "Failed to verify token", error: error.message });
  }
};

// POST /api/auth/reset-password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: "Token and newPassword are required" });
    }

    // Password validations
    const passStr = String(newPassword);
    if (passStr.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
    }
    if (!/[A-Z]/.test(passStr)) {
      return res.status(400).json({ success: false, message: "Password must contain at least one uppercase letter" });
    }
    if (!/[0-9]/.test(passStr)) {
      return res.status(400).json({ success: false, message: "Password must contain at least one digit" });
    }
    if (!/[^A-Za-z0-9]/.test(passStr)) {
      return res.status(400).json({ success: false, message: "Password must contain at least one special character" });
    }

    const record = await (prisma as any).passwordResetToken.findUnique({
      where: { token: String(token) },
    });

    if (!record || record.used) {
      return res.status(400).json({ success: false, message: "Invalid or already used password reset token" });
    }

    // STRICT 2-MINUTE EXPIRATION CHECK
    if (new Date() > new Date(record.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: "Password reset link has expired (strictly 2 minutes time limit). Please request a new link.",
        isExpired: true,
      });
    }

    const user = await prisma.user.findUnique({ where: { email: record.email } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Hash new password and update user
    const hashed = await hashPassword(passStr);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    // Mark token as used
    await (prisma as any).passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    });

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully! You can now log in with your new password.",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return res.status(500).json({ success: false, message: "Failed to reset password", error: error.message });
  }
};