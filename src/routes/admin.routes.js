import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import * as adminController from "../controllers/admin.controller.js";

const router = Router();

// Public Admin Auth Entrypoint
router.post("/auth/login", adminController.login);

// Dashboard Overview
router.get("/dashboard", authenticate, adminController.getDashboard);

// Users Management
router.get("/users", authenticate, adminController.listUsers);
router.patch("/users/:userId/plan", authenticate, adminController.changeUserPlan);
router.patch("/users/:userId/credits", authenticate, adminController.adjustUserCredits);
router.delete("/users/:userId", authenticate, adminController.deleteUser);

// Support Ticket Desk
router.get("/tickets", authenticate, adminController.listTickets);
router.patch("/tickets/:ticketId", authenticate, adminController.updateTicket);
router.post("/tickets", authenticate, adminController.createTicket);

// Plans & Quotas Catalog
router.get("/plans", authenticate, adminController.listPlans);
router.put("/plans/:planId", authenticate, adminController.updatePlan);

// AI Providers & API Keys
router.get("/api-keys", authenticate, adminController.listApiKeys);
router.patch("/api-keys/:keyId/status", authenticate, adminController.toggleApiKey);

// System Health & Server Metrics
router.get("/health", authenticate, adminController.getHealth);

export default router;
