import { Response } from "express";
import { Request } from "express";
import prisma from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

// Public — no auth required, used by the landing page.
export const getFaqs = async (req: Request, res: Response) => {
  try {
    const faqs = await prisma.faq.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    return res.status(200).json({ success: true, faqs });
  } catch (error) {
    console.error("Get FAQs error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch FAQs" });
  }
};

// Admin — includes inactive FAQs so they can be re-enabled.
export const getAllFaqsAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const faqs = await prisma.faq.findMany({ orderBy: { order: "asc" } });
    return res.status(200).json({ success: true, faqs });
  } catch (error) {
    console.error("Get admin FAQs error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch FAQs" });
  }
};

export const createFaq = async (req: AuthRequest, res: Response) => {
  try {
    const { question, answer, order } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ success: false, message: "question and answer are required" });
    }

    const faq = await prisma.faq.create({
      data: {
        question,
        answer,
        order: order ?? 0,
      },
    });

    return res.status(201).json({ success: true, message: "FAQ created", faq });
  } catch (error) {
    console.error("Create FAQ error:", error);
    return res.status(500).json({ success: false, message: "Failed to create FAQ" });
  }
};

export const updateFaq = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { question, answer, order, isActive } = req.body;

    const existing = await prisma.faq.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "FAQ not found" });
    }

    const faq = await prisma.faq.update({
      where: { id },
      data: {
        ...(question !== undefined ? { question } : {}),
        ...(answer !== undefined ? { answer } : {}),
        ...(order !== undefined ? { order } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return res.status(200).json({ success: true, message: "FAQ updated", faq });
  } catch (error) {
    console.error("Update FAQ error:", error);
    return res.status(500).json({ success: false, message: "Failed to update FAQ" });
  }
};

export const deleteFaq = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);

    const existing = await prisma.faq.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "FAQ not found" });
    }

    await prisma.faq.delete({ where: { id } });

    return res.status(200).json({ success: true, message: "FAQ deleted" });
  } catch (error) {
    console.error("Delete FAQ error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete FAQ" });
  }
};