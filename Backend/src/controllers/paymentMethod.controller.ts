import { Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

export const getPaymentMethods = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const methods = await prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return res.status(200).json({ success: true, methods });
  } catch (error) {
    console.error("Get payment methods error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch payment methods" });
  }
};

export const addPaymentMethod = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type, label, detail, isDefault } = req.body;

    if (!type || !label) {
      return res.status(400).json({ success: false, message: "type and label are required" });
    }
    if (!["CASH"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid payment method type. Only CASH is accepted." });
    }

    const method = await prisma.$transaction(async (tx) => {
      // Only one default method per user — unset the others first if this one
      // is being marked default (or if it's the user's very first method).
      const existingCount = await tx.paymentMethod.count({ where: { userId } });
      const shouldBeDefault = Boolean(isDefault) || existingCount === 0;

      if (shouldBeDefault) {
        await tx.paymentMethod.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.paymentMethod.create({
        data: {
          userId,
          type,
          label,
          detail: detail ?? null,
          isDefault: shouldBeDefault,
        },
      });
    });

    return res.status(201).json({ success: true, message: "Payment method added", method });
  } catch (error) {
    console.error("Add payment method error:", error);
    return res.status(500).json({ success: false, message: "Failed to add payment method" });
  }
};

export const updatePaymentMethod = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const { label, detail } = req.body;

    const existing = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ success: false, message: "Payment method not found" });
    }

    const method = await prisma.paymentMethod.update({
      where: { id },
      data: {
        ...(label !== undefined ? { label } : {}),
        ...(detail !== undefined ? { detail } : {}),
      },
    });

    return res.status(200).json({ success: true, message: "Payment method updated", method });
  } catch (error) {
    console.error("Update payment method error:", error);
    return res.status(500).json({ success: false, message: "Failed to update payment method" });
  }
};

export const setDefaultPaymentMethod = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);

    const existing = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ success: false, message: "Payment method not found" });
    }

    await prisma.$transaction([
      prisma.paymentMethod.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.paymentMethod.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    const method = await prisma.paymentMethod.findUnique({ where: { id } });

    return res.status(200).json({ success: true, message: "Default payment method updated", method });
  } catch (error) {
    console.error("Set default payment method error:", error);
    return res.status(500).json({ success: false, message: "Failed to set default payment method" });
  }
};

export const deletePaymentMethod = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);

    const existing = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ success: false, message: "Payment method not found" });
    }

    await prisma.paymentMethod.delete({ where: { id } });

    // If the deleted method was the default, promote the most recently added
    // remaining method (if any) so the user still has a default.
    if (existing.isDefault) {
      const next = await prisma.paymentMethod.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      if (next) {
        await prisma.paymentMethod.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }

    return res.status(200).json({ success: true, message: "Payment method removed" });
  } catch (error) {
    console.error("Delete payment method error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete payment method" });
  }
};