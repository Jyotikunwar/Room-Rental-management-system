import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { hashPassword, comparePassword } from "../lib/bcrypt";
import { generateToken } from "../lib/jwt";
import { signupSchema, loginSchema } from "../validations/auth.validations";
import { AuthRequest } from "../middleware/auth.middleware";

// POST /api/auth/signup
export const signup = async (req: Request, res: Response) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { fullName, email, password, phone, role } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        phone,
        role: role || "TENANT",
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    const token = generateToken({ id: user.id, role: user.role });

    return res.status(201).json({ success: true, message: "Account created", user, token });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = generateToken({ id: user.id, role: user.role });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

// GET /api/auth/me  (protected)
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong" });
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
    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
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

    const avatarUrl = `/uploads/${file.filename}`;

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