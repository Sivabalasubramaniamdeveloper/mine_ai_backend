import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { createApiKeySchema } from "../validators/apiKey.validator.js";
import { updateApiKeySchema } from "../validators/apiKey.validator.js";
import {
  addApiKey,
  listApiKeys,
  listProviders,
  removeApiKey,
  updateApiKey,
} from "../controllers/apiKey.controller.js";

const router = Router();

router.get("/providers", authenticate, listProviders);

router.post("/", authenticate, validate(createApiKeySchema), addApiKey);

router.get("/", authenticate, listApiKeys);

router.delete("/:keyId", authenticate, removeApiKey);
router.patch(
  "/:keyId",
  authenticate,
  validate(updateApiKeySchema),
  updateApiKey,
);

export default router;
