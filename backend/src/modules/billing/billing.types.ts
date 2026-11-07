import { PaymentMethod, PaymentStatus } from "./bill.model";

export interface GenerateBillsInput {
  month?: number; // 1-12
  year?: number;  // e.g. 2026
}

export interface RecordPaymentInput {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string | Date;
  transactionReference?: string;
  notes?: string;
}

export interface BillingQueryInput {
  month?: number;
  year?: number;
  billingPeriod?: string; // YYYY-MM
  paymentStatus?: PaymentStatus | "ALL";
  customerId?: string;
  page?: number;
  limit?: number;
}

export interface ReceiptData {
  businessName: string;
  receiptNumber: string;
  billNumber: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    address: string;
  };
  billingMonth: string;
  billingYear: number;
  totalDeliveredTiffins: number;
  pricePerTiffin: number;
  totalBillAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: PaymentStatus;
  latestPaymentDate: string | null;
  latestPaymentMethod: string | null;
  paymentHistory: Array<{
    paymentId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    transactionReference?: string;
  }>;
  receiptGeneratedDate: string;
}
