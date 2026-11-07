import { Request, Response, NextFunction } from "express";
import billingService from "./billing.service";
import {
  GenerateBillsInput,
  RecordPaymentInput,
  BillingQueryInput,
} from "./billing.types";
import { sendSuccess } from "../../utils/response.util";

class BillingController {
  generateMonthlyBills = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await billingService.generateMonthlyBills(
        req.body as GenerateBillsInput
      );
      return sendSuccess(
        res,
        result,
        "Monthly bills generated successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  getBills = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await billingService.getBills(
        req.query as unknown as BillingQueryInput
      );
      return sendSuccess(
        res,
        result,
        "Bills fetched successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  getBillById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const bill = await billingService.getBillById(id);
      return sendSuccess(
        res,
        bill,
        "Bill fetched successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  getCustomerBills = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.params.customerId as string;
      const bills = await billingService.getCustomerBills(customerId);
      return sendSuccess(
        res,
        bills,
        "Customer bills fetched successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  recordPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const bill = await billingService.recordPayment(
        id,
        req.body as RecordPaymentInput
      );
      return sendSuccess(
        res,
        bill,
        "Payment recorded successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  getReceipt = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const receipt = await billingService.getReceipt(id);
      return sendSuccess(
        res,
        receipt,
        "Receipt generated successfully"
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new BillingController();
