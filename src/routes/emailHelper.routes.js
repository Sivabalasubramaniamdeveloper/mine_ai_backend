import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  generateEmail,
  getSmtpStatus,
  getSmtpCredentials,
  saveSmtpConfig,
  deleteSmtpConfig,
  sendDirectEmail,
  getSavedEmails,
  saveEmailDraft,
  deleteSavedEmail,
} from "../controllers/emailHelper.controller.js";

const router = Router();

router.post("/generate", authenticate, generateEmail);
router.get("/smtp-status", authenticate, getSmtpStatus);
router.get("/smtp-credentials", authenticate, getSmtpCredentials);
router.post("/smtp-config", authenticate, saveSmtpConfig);
router.delete("/smtp-config", authenticate, deleteSmtpConfig);
router.get("/saved-emails", authenticate, getSavedEmails);
router.post("/saved-emails", authenticate, saveEmailDraft);
router.delete("/saved-emails/:id", authenticate, deleteSavedEmail);
router.post("/send", authenticate, sendDirectEmail);

export default router;
