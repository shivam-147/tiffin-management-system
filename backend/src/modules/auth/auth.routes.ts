import { Router } from "express";

import authController from "./auth.controller";
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "./auth.validator";

import { validateBody } from "../../middlewares/validation.middleware";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

router.post(
  "/login",
  validateBody(loginSchema),
  authController.login
);

router.post(
  "/refresh",
  validateBody(refreshTokenSchema),
  authController.refreshToken
);

router.post(
  "/logout",
  validateBody(refreshTokenSchema),
  authController.logout
);

router.post(
  "/logout-all",
  authenticate,
  authController.logoutAll
);

router.get(
  "/profile",
  authenticate,
  authController.getProfile
);

router.put(
  "/profile",
  authenticate,
  validateBody(updateProfileSchema),
  authController.updateProfile
);

router.put(
  "/change-password",
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword
);

export default router;
