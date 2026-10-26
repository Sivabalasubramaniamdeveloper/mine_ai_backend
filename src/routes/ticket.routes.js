import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  createTicket,
  getUserTickets,
  getTicketById,
} from "../controllers/ticket.controller.js";

const router = Router();

router.post("/", authenticate, createTicket);
router.get("/", authenticate, getUserTickets);
router.get("/:id", authenticate, getTicketById);

export default router;
