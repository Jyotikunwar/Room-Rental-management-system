import { Router } from "express";
import {
  getAllowedContacts,
  getConversations,
  getMessagesWithContact,
  sendMessage,
  markConversationRead,
} from "../controllers/Message.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/contacts", getAllowedContacts);
router.get("/conversations", getConversations);
router.get("/:contactId", getMessagesWithContact);
router.post("/", sendMessage);
router.patch("/:contactId/read", markConversationRead);

export default router;