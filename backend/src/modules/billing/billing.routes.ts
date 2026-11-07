import { Router } from "express";
import billingController from "./billing.controller";
import {
  generateBillsSchema,
  recordPaymentSchema,
  billingQuerySchema,
  billIdParamSchema,
} from "./billing.validator";
import { customerIdParamSchema } from "../customers/customer.validator";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../middlewares/validation.middleware";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// Protect all billing routes with admin authentication
router.use(authenticate);

router.post(
  "/generate",
  validateBody(generateBillsSchema),
  billingController.generateMonthlyBills
);

router.get(
  "/",
  validateQuery(billingQuerySchema),
  billingController.getBills
);

router.get(
  "/customer/:customerId",
  validateParams(customerIdParamSchema),
  billingController.getCustomerBills
);

router.get(
  "/:id",
  validateParams(billIdParamSchema),
  billingController.getBillById
);

router.post(
  "/:id/payments",
  validateParams(billIdParamSchema),
  validateBody(recordPaymentSchema),
  billingController.recordPayment
);

router.get(
  "/:id/receipt",
  validateParams(billIdParamSchema),
  billingController.getReceipt
);

export default router;
