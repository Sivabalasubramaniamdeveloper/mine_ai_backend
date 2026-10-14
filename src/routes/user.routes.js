import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
  getMyProfile,
  updateMyProfile,
} from "../controllers/user.controller.js";
import {
  registerDevice,
  listDevices,
  removeDevice,
} from "../controllers/device.controller.js";
import { updateUserSchema } from "../validators/user.validator.js";
import { registerDeviceSchema } from "../validators/device.validator.js";

const router = Router();

//user routes
router.get("/me", authenticate, getMyProfile);
router.patch("/me", authenticate, validate(updateUserSchema), updateMyProfile);

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
