import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

// POST /api/reviews -> Tenant submits a review for a room
export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId, rating, comment } = req.body;
    const userId = req.user!.id;

    if (!roomId || isNaN(Number(roomId))) {
      return res.status(400).json({ success: false, message: "Valid roomId is required" });
    }

    const numericRating = Number(rating);
    if (!numericRating || isNaN(numericRating) || numericRating < 1 || numericRating > 5 || !Number.isInteger(numericRating)) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5",
      });
    }

    const room = await prisma.room.findUnique({ where: { id: Number(roomId) } });
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    // Check if tenant has already submitted a review for this room
    const existingReview = await prisma.review.findFirst({
      where: {
        userId,
        roomId: Number(roomId),
      },
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a review for this room",
      });
    }

    const review = await prisma.review.create({
      data: {
        userId,
        roomId: Number(roomId),
        rating: numericRating,
        comment: comment ? String(comment).trim() : null,
      },
      include: {
        user: { select: { id: true, fullName: true } },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review,
    });
  } catch (error) {
    console.error("Create review error:", error);
    return res.status(500).json({ success: false, message: "Failed to submit review" });
  }
};

// GET /api/reviews/:roomId -> View reviews for a specific room (includes calculated average rating)
export const getRoomReviews = async (req: Request, res: Response) => {
  try {
    const roomId = Number(req.params.roomId);

    if (!roomId || isNaN(roomId)) {
      return res.status(400).json({ success: false, message: "Valid roomId is required" });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    const reviews = await prisma.review.findMany({
      where: { roomId },
      include: {
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const averageRating =
      reviews.length > 0
        ? Math.round((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) * 10) / 10
        : 0;

    return res.status(200).json({
      success: true,
      count: reviews.length,
      averageRating,
      reviews,
    });
  } catch (error) {
    console.error("Get room reviews error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch room reviews" });
  }
};
