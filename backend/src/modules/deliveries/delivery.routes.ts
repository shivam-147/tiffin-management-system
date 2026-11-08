import { Router } from "express";
import deliveryController from "./delivery.controller";
import {
  generateDeliveriesSchema,
  addExtraDeliverySchema,
  updateDeliveryStatusSchema,
  deliveryQuerySchema,
  deliveryIdParamSchema,
} from "./delivery.validator";
import { customerIdParamSchema } from "../customers/customer.validator";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../middlewares/validation.middleware";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// Protect all delivery routes with admin authentication
router.use(authenticate);

router.post(
  "/generate",
  validateBody(generateDeliveriesSchema),
  deliveryController.generateDailyDeliveries
);

router.post(
  "/extra",
  validateBody(addExtraDeliverySchema),
  deliveryController.addExtraDelivery
);

router.get(
  "/",
  validateQuery(deliveryQuerySchema),
  deliveryController.getDailyDeliveries
);

router.get(
  "/customer/:customerId",
  validateParams(customerIdParamSchema),
  deliveryController.getCustomerDeliveries
);

router.get(
  "/:id",
  validateParams(deliveryIdParamSchema),
  deliveryController.getDeliveryById
);

router.patch(
  "/:id/status",
  validateParams(deliveryIdParamSchema),
  validateBody(updateDeliveryStatusSchema),
  deliveryController.updateDeliveryStatus
);

export default router;
