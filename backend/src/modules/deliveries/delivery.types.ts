import { DeliveryStatus, MealType } from "./delivery.model";

export interface GenerateDeliveriesInput {
  date?: string; // YYYY-MM-DD
}

export interface AddExtraDeliveryInput {
  customerId: string;
  quantity?: number;
  date?: string;
  mealType?: MealType;
  notes?: string;
}

export interface UpdateDeliveryStatusInput {
  status: DeliveryStatus;
  notes?: string;
}

export interface DeliveryQueryInput {
  date?: string; // YYYY-MM-DD
  status?: DeliveryStatus | "ALL";
  mealType?: MealType | "ALL";
  customerId?: string;
  page?: number;
  limit?: number;
}
