import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
  getMyProfile,
  updateMyProfile,
  getAvailablePlans,
  updateMyPlan,
  sendMonthlyExpenseReport,
} from "../controllers/user.controller.js";
import {
  registerDevice,
  listDevices,
  removeDevice,
} from "../controllers/device.controller.js";
import {
  updateUserSchema,
  updateUserPlanSchema,
} from "../validators/user.validator.js";
import { registerDeviceSchema } from "../validators/device.validator.js";

const router = Router();

//user routes
router.get("/me", authenticate, getMyProfile);
router.patch("/me", authenticate, validate(updateUserSchema), updateMyProfile);
// Plan data is served by the trusted API so client-side table policies do not hide the catalog.
router.get("/plans", authenticate, getAvailablePlans);
router.patch("/me/plan", authenticate, validate(updateUserPlanSchema), updateMyPlan);
router.post("/me/expense-report-email", authenticate, sendMonthlyExpenseReport);

//device routes
router.post(
  "/devices",
  authenticate,
  validate(registerDeviceSchema),
  registerDevice,
);
router.get("/devices", authenticate, listDevices);  
router.delete("/devices/:deviceId", authenticate, removeDevice);

export default router;
