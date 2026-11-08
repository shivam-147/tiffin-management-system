import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import ApiService from "../../services/ApiService";
import ENDPOINTS from "../../constants/endpoints";
import {
  Bill,
  BillsListPayload,
  BillingGenerateResult,
  ReceiptData,
  PaymentStatus,
  PaymentMethod,
  Pagination,
} from "../../types";

interface BillingState {
  bills: Bill[];
  pagination: Pagination | null;
  selectedBill: Bill | null;
  customerBills: Bill[];
  receipt: ReceiptData | null;
  generateResult: BillingGenerateResult | null;
  selectedMonth: number;
  selectedYear: number;
  paymentStatusFilter: PaymentStatus | "ALL";
  isLoading: boolean;
  isSubmitting: boolean;
  isReceiptLoading: boolean;
  error: string | null;
}

const now = new Date();

const initialState: BillingState = {
  bills: [],
  pagination: null,
  selectedBill: null,
  customerBills: [],
  receipt: null,
  generateResult: null,
  selectedMonth: now.getMonth() + 1,
  selectedYear: now.getFullYear(),
  paymentStatusFilter: "ALL",
  isLoading: false,
  isSubmitting: false,
  isReceiptLoading: false,
  error: null,
};

export const generateMonthlyBills = createAsyncThunk(
  "billing/generate",
  async (
    params: { month?: number; year?: number } = {},
    { rejectWithValue }
  ) => {
    const response = await ApiService.post<BillingGenerateResult>(
      ENDPOINTS.BILLING.GENERATE,
      params
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to generate monthly bills");
    }

    return response.payload;
  }
);

export const fetchBills = createAsyncThunk(
  "billing/fetchList",
  async (
    params: {
      page?: number;
      limit?: number;
      month?: number;
      year?: number;
      billingPeriod?: string;
      paymentStatus?: string;
      customerId?: string;
    } = {},
    { rejectWithValue }
  ) => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));
    if (params.month) query.append("month", String(params.month));
    if (params.year) query.append("year", String(params.year));
    if (params.billingPeriod) query.append("billingPeriod", params.billingPeriod);
    if (params.paymentStatus && params.paymentStatus !== "ALL")
      query.append("paymentStatus", params.paymentStatus);
    if (params.customerId) query.append("customerId", params.customerId);

    const queryString = query.toString();
    const response = await ApiService.get<BillsListPayload>(
      ENDPOINTS.BILLING.LIST(queryString)
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to fetch bills");
    }

    return response.payload;
  }
);

export const fetchBillById = createAsyncThunk(
  "billing/fetchById",
  async (id: string, { rejectWithValue }) => {
    const response = await ApiService.get<Bill>(ENDPOINTS.BILLING.GET_BY_ID(id));

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to fetch bill details");
    }

    return response.payload;
  }
);

export const fetchCustomerBills = createAsyncThunk(
  "billing/fetchCustomerBills",
  async (customerId: string, { rejectWithValue }) => {
    const response = await ApiService.get<Bill[]>(
      ENDPOINTS.BILLING.GET_CUSTOMER_BILLS(customerId)
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to fetch customer bills");
    }

    return response.payload;
  }
);

export const recordPayment = createAsyncThunk(
  "billing/recordPayment",
  async (
    {
      id,
      data,
    }: {
      id: string;
      data: {
        amount: number;
        paymentMethod: PaymentMethod;
        paymentDate?: string;
        transactionReference?: string;
        notes?: string;
      };
    },
    { rejectWithValue }
  ) => {
    const response = await ApiService.post<Bill>(
      ENDPOINTS.BILLING.RECORD_PAYMENT(id),
      data
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to record payment");
    }

    return response.payload;
  }
);

export const fetchReceipt = createAsyncThunk(
  "billing/fetchReceipt",
  async (billId: string, { rejectWithValue }) => {
    const response = await ApiService.get<ReceiptData>(
      ENDPOINTS.BILLING.GET_RECEIPT(billId)
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to fetch receipt data");
    }

    return response.payload;
  }
);

const billingSlice = createSlice({
  name: "billing",
  initialState,
  reducers: {
    setSelectedMonth: (state, action) => {
      state.selectedMonth = action.payload;
    },
    setSelectedYear: (state, action) => {
      state.selectedYear = action.payload;
    },
    setPaymentStatusFilter: (state, action) => {
      state.paymentStatusFilter = action.payload;
    },
    setSelectedBill: (state, action) => {
      state.selectedBill = action.payload;
    },
    clearReceipt: (state) => {
      state.receipt = null;
    },
    clearBillingGenerateResult: (state) => {
      state.generateResult = null;
    },
    clearBillingError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Generate
    builder
      .addCase(generateMonthlyBills.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(generateMonthlyBills.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.generateResult = action.payload;
      })
      .addCase(generateMonthlyBills.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = (action.payload as string) || "Failed to generate monthly bills";
      });

    // List
    builder
      .addCase(fetchBills.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBills.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bills = action.payload.bills;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchBills.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || "Failed to load bills";
      });

    // Customer Bills
    builder.addCase(fetchCustomerBills.fulfilled, (state, action) => {
      state.customerBills = action.payload;
    });

    // Record Payment
    builder
      .addCase(recordPayment.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(recordPayment.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = state.bills.findIndex((b) => b._id === action.payload._id);
        if (index !== -1) {
          state.bills[index] = action.payload;
        }
        if (state.selectedBill?._id === action.payload._id) {
          state.selectedBill = action.payload;
        }
      })
      .addCase(recordPayment.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = (action.payload as string) || "Failed to record payment";
      });

    // Fetch Receipt
    builder
      .addCase(fetchReceipt.pending, (state) => {
        state.isReceiptLoading = true;
        state.error = null;
      })
      .addCase(fetchReceipt.fulfilled, (state, action) => {
        state.isReceiptLoading = false;
        state.receipt = action.payload;
      })
      .addCase(fetchReceipt.rejected, (state, action) => {
        state.isReceiptLoading = false;
        state.error = (action.payload as string) || "Failed to load receipt";
      });
  },
});

export const {
  setSelectedMonth,
  setSelectedYear,
  setPaymentStatusFilter,
  setSelectedBill,
  clearReceipt,
  clearBillingGenerateResult,
  clearBillingError,
} = billingSlice.actions;

export default billingSlice.reducer;
