import { DeliveryStatus } from "./delivery.model";

export interface GenerateDeliveriesInput {
  date?: string; // YYYY-MM-DD
}

export interface UpdateDeliveryStatusInput {
  status: DeliveryStatus;
  notes?: string;
}

export interface DeliveryQueryInput {
  date?: string; // YYYY-MM-DD
  status?: DeliveryStatus | "ALL";
  customerId?: string;
  page?: number;
  limit?: number;
}
