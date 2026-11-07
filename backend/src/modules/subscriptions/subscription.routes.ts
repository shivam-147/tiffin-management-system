import { Router } from "express";
import subscriptionController from "./subscription.controller";
import {
  createSubscriptionSchema,
  pauseSubscriptionSchema,
  resumeSubscriptionSchema,
  subscriptionQuerySchema,
  subscriptionIdParamSchema,
  customerIdParamSchema,
} from "./subscription.validator";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../middlewares/validation.middleware";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// Protect all subscription routes with admin authentication
router.use(authenticate);

router.post(
  "/",
  validateBody(createSubscriptionSchema),
  subscriptionController.createSubscription
);

router.get(
  "/",
  validateQuery(subscriptionQuerySchema),
  subscriptionController.getSubscriptions
);

router.get(
  "/customer/:customerId/active",
  validateParams(customerIdParamSchema),
  subscriptionController.getCustomerActiveSubscription
);

router.get(
  "/customer/:customerId",
  validateParams(customerIdParamSchema),
  subscriptionController.getCustomerPackageHistory
);

router.get(
  "/:id",
  validateParams(subscriptionIdParamSchema),
  subscriptionController.getSubscriptionById
);

router.post(
  "/:id/pause",
  validateParams(subscriptionIdParamSchema),
  validateBody(pauseSubscriptionSchema),
  subscriptionController.pauseSubscription
);

router.post(
  "/:id/resume",
  validateParams(subscriptionIdParamSchema),
  validateBody(resumeSubscriptionSchema),
  subscriptionController.resumeSubscription
);

router.post(
  "/:id/cancel",
  validateParams(subscriptionIdParamSchema),
  subscriptionController.cancelSubscription
);

export default router;
