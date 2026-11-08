const ENDPOINTS = {
  HEALTH: "/health",

  AUTH: {
    LOGIN: "/auth/login",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    LOGOUT_ALL: "/auth/logout-all",
    PROFILE: "/auth/profile",
    UPDATE_PROFILE: "/auth/profile",
    CHANGE_PASSWORD: "/auth/change-password",
  },

  PACKAGES: {
    LIST: (queryString?: string) =>
      queryString ? `/packages?${queryString}` : "/packages",
    CREATE: "/packages",
    GET_BY_ID: (id: string) => `/packages/${id}`,
    UPDATE: (id: string) => `/packages/${id}`,
    DELETE: (id: string) => `/packages/${id}`,
  },

  CUSTOMERS: {
    LIST: (queryString?: string) =>
      queryString ? `/customers?${queryString}` : "/customers",
    CREATE: "/customers",
    GET_BY_ID: (id: string) => `/customers/${id}`,
    UPDATE: (id: string) => `/customers/${id}`,
    DEACTIVATE: (id: string) => `/customers/${id}/deactivate`,
  },

  SUBSCRIPTIONS: {
    LIST: (queryString?: string) =>
      queryString ? `/subscriptions?${queryString}` : "/subscriptions",
    CREATE: "/subscriptions",
    GET_BY_ID: (id: string) => `/subscriptions/${id}`,
    GET_CUSTOMER_ACTIVE: (customerId: string) =>
      `/subscriptions/customer/${customerId}/active`,
    GET_CUSTOMER_HISTORY: (customerId: string) =>
      `/subscriptions/customer/${customerId}`,
    PAUSE: (id: string) => `/subscriptions/${id}/pause`,
    RESUME: (id: string) => `/subscriptions/${id}/resume`,
    CANCEL: (id: string) => `/subscriptions/${id}/cancel`,
  },

  DELIVERIES: {
    GENERATE: "/deliveries/generate",
    ADD_EXTRA: "/deliveries/extra",
    LIST: (queryString?: string) =>
      queryString ? `/deliveries?${queryString}` : "/deliveries",
    GET_BY_ID: (id: string) => `/deliveries/${id}`,
    GET_CUSTOMER_DELIVERIES: (customerId: string, queryString?: string) =>
      queryString
        ? `/deliveries/customer/${customerId}?${queryString}`
        : `/deliveries/customer/${customerId}`,
    UPDATE_STATUS: (id: string) => `/deliveries/${id}/status`,
  },

  BILLING: {
    GENERATE: "/billing/generate",
    LIST: (queryString?: string) =>
      queryString ? `/billing?${queryString}` : "/billing",
    GET_BY_ID: (id: string) => `/billing/${id}`,
    GET_CUSTOMER_BILLS: (customerId: string) => `/billing/customer/${customerId}`,
    RECORD_PAYMENT: (id: string) => `/billing/${id}/payments`,
    GET_RECEIPT: (id: string) => `/billing/${id}/receipt`,
  },

  DASHBOARD: {
    SUMMARY: "/dashboard/summary",
  },
};

export default ENDPOINTS;
