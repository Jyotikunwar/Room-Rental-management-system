import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../lib/jwt";
import prisma from "../lib/prisma";

// Extend Express Request to carry the logged-in user
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// Checks the Authorization header, verifies the token, attaches user to req
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;

    // Best-effort "last active" heartbeat, powers online/offline status in
    // Messages. Fire-and-forget — never await or let this block/fail the request.
    prisma.user
      .update({ where: { id: decoded.id }, data: { lastActiveAt: new Date() } })
      .catch(() => {});

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// Restricts a route to specific roles, e.g. authorize("ADMIN", "LANDLORD")
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied for this role" });
    }

    next();
  };
};

/** Attaches user when a valid Bearer token is present; otherwise continues anonymously. */
export const optionalAuthenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;

    prisma.user
      .update({ where: { id: decoded.id }, data: { lastActiveAt: new Date() } })
      .catch(() => {});

    next();
  } catch {
    next();
  }
};