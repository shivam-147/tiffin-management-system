import { Request, Response, NextFunction } from "express";
import subscriptionService from "./subscription.service";
import {
  CreateSubscriptionInput,
  PauseSubscriptionInput,
  ResumeSubscriptionInput,
  SubscriptionQueryInput,
} from "./subscription.types";
import { sendSuccess } from "../../utils/response.util";
import { HTTP_STATUS } from "../../constants/http-status.constants";

class SubscriptionController {
  createSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscription = await subscriptionService.createSubscription(
        req.body as CreateSubscriptionInput
      );
      return sendSuccess(
        res,
        subscription,
        "Subscription package created successfully",
        HTTP_STATUS.CREATED
      );
    } catch (error) {
      next(error);
    }
  };

  getSubscriptions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await subscriptionService.getSubscriptions(
        req.query as unknown as SubscriptionQueryInput
      );
      return sendSuccess(
        res,
        result,
        "Subscriptions fetched successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  getSubscriptionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const subscription = await subscriptionService.getSubscriptionById(id);
      return sendSuccess(
        res,
        subscription,
        "Subscription fetched successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  getCustomerActiveSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.params.customerId as string;
      const subscription = await subscriptionService.getCustomerActiveSubscription(customerId);
      return sendSuccess(
        res,
        subscription,
        subscription ? "Active package fetched successfully" : "No active package found for customer"
      );
    } catch (error) {
      next(error);
    }
  };

  getCustomerPackageHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.params.customerId as string;
      const subscriptions = await subscriptionService.getCustomerPackageHistory(customerId);
      return sendSuccess(
        res,
        subscriptions,
        "Customer package history fetched successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  pauseSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const subscription = await subscriptionService.pauseSubscription(
        id,
        req.body as PauseSubscriptionInput
      );
      return sendSuccess(
        res,
        subscription,
        "Subscription package paused successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  resumeSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const subscription = await subscriptionService.resumeSubscription(
        id,
        req.body as ResumeSubscriptionInput
      );
      return sendSuccess(
        res,
        subscription,
        "Subscription package resumed successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  cancelSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const subscription = await subscriptionService.cancelSubscription(id);
      return sendSuccess(
        res,
        subscription,
        "Subscription package cancelled successfully"
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new SubscriptionController();
