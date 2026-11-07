import { Router } from "express";
import customerController from "./customer.controller";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
  customerIdParamSchema,
} from "./customer.validator";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../middlewares/validation.middleware";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// Protect all customer routes with admin authentication
router.use(authenticate);

router.post(
  "/",
  validateBody(createCustomerSchema),
  customerController.createCustomer
);

router.get(
  "/",
  validateQuery(customerQuerySchema),
  customerController.getCustomers
);

router.get(
  "/:id",
  validateParams(customerIdParamSchema),
  customerController.getCustomerById
);

router.put(
  "/:id",
  validateParams(customerIdParamSchema),
  validateBody(updateCustomerSchema),
  customerController.updateCustomer
);

router.patch(
  "/:id/deactivate",
  validateParams(customerIdParamSchema),
  customerController.deactivateCustomer
);

export default router;
