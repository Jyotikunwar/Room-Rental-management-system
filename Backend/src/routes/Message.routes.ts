import { Router } from "express";
import {
  getConversations,
  getMessagesWithContact,
  sendMessage,
  markConversationRead,
} from "../controllers/Message.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/conversations", getConversations);
router.get("/:contactId", getMessagesWithContact);
router.post("/", sendMessage);
router.patch("/:contactId/read", markConversationRead);

export default router;

// ---- Mount this in server.ts, alongside your other route mounts: ----
// import messageRoutes from "./routes/message.routes";
// app.use("/api/messages", messageRoutes);