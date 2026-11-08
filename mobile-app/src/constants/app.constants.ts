export const APP_CONFIG = {
  APP_NAME: "Tiffin Management System",
  CURRENCY_SYMBOL: "₹",
  STORAGE_KEYS: {
    ACCESS_TOKEN: "tms_access_token",
    REFRESH_TOKEN: "tms_refresh_token",
    ADMIN_USER: "tms_admin_user",
  },
  DEFAULT_PAGE_SIZE: 10,
  DELIVERY_PAGE_SIZE: 20,
};

export const DELIVERY_STATUSES = {
  PENDING: "PENDING",
  DELIVERED: "DELIVERED",
  SKIPPED: "SKIPPED",
  FAILED: "FAILED",
} as const;

export const PACKAGE_STATUSES = {
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export const PAYMENT_STATUSES = {
  UNPAID: "UNPAID",
  PARTIAL: "PARTIAL",
  PAID: "PAID",
} as const;

export const PAYMENT_METHODS = [
  "CASH",
  "UPI",
  "BANK_TRANSFER",
  "CHEQUE",
  "OTHER",
] as const;
