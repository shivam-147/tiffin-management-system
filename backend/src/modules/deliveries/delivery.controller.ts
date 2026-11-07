import { Request, Response, NextFunction } from "express";
import deliveryService from "./delivery.service";
import {
  GenerateDeliveriesInput,
  UpdateDeliveryStatusInput,
  DeliveryQueryInput,
} from "./delivery.types";
import { sendSuccess } from "../../utils/response.util";

class DeliveryController {
  generateDailyDeliveries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await deliveryService.generateDailyDeliveries(
        req.body as GenerateDeliveriesInput
      );
      return sendSuccess(
        res,
        result,
        "Daily deliveries generated successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  getDailyDeliveries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await deliveryService.getDailyDeliveries(
        req.query as unknown as DeliveryQueryInput
      );
      return sendSuccess(
        res,
        result,
        "Deliveries fetched successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  getDeliveryById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const delivery = await deliveryService.getDeliveryById(id);
      return sendSuccess(
        res,
        delivery,
        "Delivery fetched successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  getCustomerDeliveries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = req.params.customerId as string;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await deliveryService.getCustomerDeliveries(customerId, page, limit);
      return sendSuccess(
        res,
        result,
        "Customer deliveries fetched successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  updateDeliveryStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const delivery = await deliveryService.updateDeliveryStatus(
        id,
        req.body as UpdateDeliveryStatusInput
      );
      return sendSuccess(
        res,
        delivery,
        "Delivery status updated successfully"
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new DeliveryController();
