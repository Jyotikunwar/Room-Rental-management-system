import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { hashPassword, comparePassword } from "../lib/bcrypt";
import { signToken } from "../lib/jwt";
import { AuthRequest } from "../middleware/auth.middleware";

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

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, phone } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { fullName, phone },
    });
    return res.json({ success: true, message: "Profile updated", user: safeUser(user) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Failed to update profile", error: err.message });
  }
};

export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const avatarUrl = `/uploads/avatars/${file.filename}`;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatarUrl },
    });

    return res.json({ success: true, message: "Avatar updated", user: safeUser(user) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Failed to upload avatar", error: err.message });
  }
};

// PATCH /api/auth/me/password
// Body: { currentPassword, newPassword }
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "currentPassword and newPassword are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) return res.status(401).json({ success: false, message: "Current password is incorrect" });

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    return res.json({ success: true, message: "Password changed successfully" });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Failed to change password", error: err.message });
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
      select: { id: true, idType: true, idNumber: true, idDocumentUrl: true, isIdVerified: true },
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error("Update identification error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// POST /api/auth/me/identification/document (multipart/form-data, field name: "document")
// Reuses the same multer setup as uploadRoomImages — adjust the field/path
// to match however your upload.middleware.ts is configured.
export const uploadIdDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({ success: false, message: "No document uploaded" });
    }

    const documentUrl = `/uploads/identification/${file.filename}`;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { idDocumentUrl: documentUrl, isIdVerified: false },
      select: { id: true, idType: true, idNumber: true, idDocumentUrl: true, isIdVerified: true },
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error("Upload ID document error:", error);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};