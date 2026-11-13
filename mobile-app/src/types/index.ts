export interface ErrorDetail {
  field: string;
  code: string;
  message: string;
  location: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  error_code: string | null;
  detail: ErrorDetail[];
  payload: T | null;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<K extends string, T> {
  [key: string]: any;
  pagination: Pagination;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  businessName?: string;
  phone?: string;
  address?: string;
  upiId?: string;
}

export interface PackageCatalog {
  _id: string;
  name: string;
  description?: string;
  totalTiffins: number;
  pricePerTiffin: number;
  totalAmount: number;
  mealsPerDay: 1 | 2 | 3;
  mealTypes: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginPayload {
  admin: Admin;
  accessToken: string;
  refreshToken: string;
  token: string;
}

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  address: string;
  email?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomersListPayload {
  customers: Customer[];
  pagination: Pagination;
}

export type SubscriptionStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "PAYMENT_PENDING" | "CANCELLED";

export interface PauseEntry {
  pausedAt: string;
  expectedResumeDate?: string | null;
  resumedAt?: string | null;
  reason?: string | null;
}

export interface Subscription {
  _id: string;
  customer: Customer;
  packageCatalog?: PackageCatalog | string;
  packageName?: string;
  pricePerTiffin: number;
  totalTiffins: number;
  deliveredQuantity: number;
  remainingQuantity: number;
  totalAmount: number;
  advancePaid?: number;
  mealsPerDay?: number;
  mealTypes?: string[];
  status: SubscriptionStatus;
  startDate: string;
  completionDate?: string | null;
  pauseHistory: PauseEntry[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionsListPayload {
  subscriptions: Subscription[];
  pagination: Pagination;
}

export type DeliveryStatus = "PENDING" | "DELIVERED" | "SKIPPED" | "FAILED";
export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "EXTRA";

export interface Delivery {
  _id: string;
  customer: Customer;
  subscription: {
    _id: string;
    pricePerTiffin: number;
    totalTiffins: number;
    deliveredQuantity: number;
    remainingQuantity: number;
    status: SubscriptionStatus;
  };
  deliveryDate: string;
  dateString: string;
  mealType?: MealType;
  quantity?: number;
  status: DeliveryStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveriesListPayload {
  deliveries: Delivery[];
  pagination: Pagination;
}

export interface DeliveryGenerateResult {
  date: string;
  generatedCount: number;
  skippedCount: number;
  totalEligible: number;
}

export type PaymentMethod = "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "OTHER";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

export interface PaymentRecord {
  paymentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionReference?: string | null;
  notes?: string | null;
  recordedAt: string;
}

export interface Bill {
  _id: string;
  billNumber: string;
  customer: Customer;
  billingMonth: number;
  billingYear: number;
  billingPeriod: string;
  deliveredCount: number;
  pricePerTiffin: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: PaymentStatus;
  payments: PaymentRecord[];
  deliveries?: Delivery[];
  createdAt: string;
  updatedAt: string;
}

export interface BillsListPayload {
  bills: Bill[];
  pagination: Pagination;
}

export interface BillingGenerateResult {
  billingPeriod: string;
  month: string;
  year: number;
  billsGenerated: number;
  billsUpdated: number;
  billsSkipped: number;
  totalCustomersWithDeliveries: number;
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

export interface DashboardSummary {
  date: string;
  billingPeriod: string;
  customers: {
    active: number;
    inactive: number;
    total: number;
  };
  packages: {
    active: number;
    paused: number;
    completed: number;
    cancelled: number;
    totalRemainingTiffins: number;
  };
  deliveriesToday: {
    pending: number;
    delivered: number;
    skipped: number;
    failed: number;
    total: number;
  };
  monthlyFinancials: {
    period: string;
    totalBilled: number;
    totalCollected: number;
    totalPending: number;
  };
}
