import { Request, Response, NextFunction } from "express";
import customerService from "./customer.service";
import { CreateCustomerInput, UpdateCustomerInput, CustomerQueryInput } from "./customer.types";
import { sendSuccess } from "../../utils/response.util";
import { HTTP_STATUS } from "../../constants/http-status.constants";

class CustomerController {
  createCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await customerService.createCustomer(req.body as CreateCustomerInput);
      return sendSuccess(
        res,
        customer,
        "Customer created successfully",
        HTTP_STATUS.CREATED
      );
    } catch (error) {
      next(error);
    }
  };

  getCustomers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await customerService.getCustomers(req.query as unknown as CustomerQueryInput);
      return sendSuccess(
        res,
        result,
        "Customers fetched successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const customer = await customerService.getCustomerById(id);
      return sendSuccess(
        res,
        customer,
        "Customer fetched successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const updated = await customerService.updateCustomer(
        id,
        req.body as UpdateCustomerInput
      );
      return sendSuccess(
        res,
        updated,
        "Customer updated successfully"
      );
    } catch (error) {
      next(error);
    }
  };

  deactivateCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const deactivated = await customerService.deactivateCustomer(id);
      return sendSuccess(
        res,
        deactivated,
        "Customer deactivated successfully"
      );
    } catch (error) {
      next(error);
    }
  };
}

export default new CustomerController();
