import { SubscriptionStatus } from "./subscription.model";

export interface CreateSubscriptionInput {
  customerId: string;
  pricePerTiffin: number;
  totalTiffins: number;
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
