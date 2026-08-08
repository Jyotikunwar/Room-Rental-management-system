import { Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "./auth.middleware";

// Blocks the request unless the logged-in user has finished the basic profile +
// identification steps (phone number + ID type/number submitted). Use this on
// any route where the action shouldn't proceed with an incomplete profile —
// e.g. booking a room, making a payment, filing a complaint.
//
// NOTE: this checks that ID info was *submitted*, not that isIdVerified is
// true (there's no admin-approval flow wired up yet). If you want to require
// admin-approved verification instead, swap the condition below to check
// `user.isIdVerified` alone.
export const requireCompleteProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, idType: true, idNumber: true, idDocumentUrl: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const missing: string[] = [];
    if (!user.phone) missing.push("phone number");
    if (!user.idType || !user.idNumber) missing.push("ID verification (type & number)");
    if (!user.idDocumentUrl) missing.push("ID document upload");

    if (missing.length > 0) {
      return res.status(403).json({
        success: false,
        code: "PROFILE_INCOMPLETE",
        message: `Please complete your profile before continuing. Missing: ${missing.join(", ")}.`,
        missing,
      });
    }

    next();
  } catch (error) {
    console.error("requireCompleteProfile error:", error);
    return res.status(500).json({ success: false, message: "Failed to verify profile status" });
  }
};