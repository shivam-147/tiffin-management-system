import { SubscriptionStatus } from "./subscription.model";

export interface CreateSubscriptionInput {
  customerId: string;
  packageCatalogId?: string;
  packageName?: string;
  pricePerTiffin: number;
  totalTiffins: number;
  advancePaid?: number;
  mealsPerDay?: number;
  mealTypes?: string[];
  startDate?: string | Date;
  notes?: string;
}

export interface PauseSubscriptionInput {
  expectedResumeDate?: string | Date;
  reason?: string;
}

export interface ResumeSubscriptionInput {
  resumeDate?: string | Date;
}

export interface SubscriptionQueryInput {
  customerId?: string;
  status?: SubscriptionStatus | "ALL";
  page?: number;
  limit?: number;
}
