import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import ApiService from "../../services/ApiService";
import ENDPOINTS from "../../constants/endpoints";
import {
  Delivery,
  DeliveriesListPayload,
  DeliveryGenerateResult,
  DeliveryStatus,
  MealType,
  Pagination,
} from "../../types";

interface DeliveryState {
  deliveries: Delivery[];
  pagination: Pagination | null;
  selectedDelivery: Delivery | null;
  selectedDate: string; // YYYY-MM-DD
  statusFilter: DeliveryStatus | "ALL";
  mealTypeFilter: MealType | "ALL";
  customerDeliveries: Delivery[];
  generateResult: DeliveryGenerateResult | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const getTodayString = () => new Date().toISOString().slice(0, 10);

const initialState: DeliveryState = {
  deliveries: [],
  pagination: null,
  selectedDelivery: null,
  selectedDate: getTodayString(),
  statusFilter: "ALL",
  mealTypeFilter: "ALL",
  customerDeliveries: [],
  generateResult: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
};

export const generateDailyDeliveries = createAsyncThunk(
  "deliveries/generate",
  async (date: string | undefined, { rejectWithValue }) => {
    const response = await ApiService.post<DeliveryGenerateResult>(
      ENDPOINTS.DELIVERIES.GENERATE,
      date ? { date } : {}
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to generate daily deliveries");
    }

    return response.payload;
  }
);

export const fetchDailyDeliveries = createAsyncThunk(
  "deliveries/fetchList",
  async (
    params: { page?: number; limit?: number; date?: string; status?: string; mealType?: string; customerId?: string } = {},
    { rejectWithValue }
  ) => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));
    if (params.date) query.append("date", params.date);
    if (params.status && params.status !== "ALL") query.append("status", params.status);
    if (params.mealType && params.mealType !== "ALL") query.append("mealType", params.mealType);
    if (params.customerId) query.append("customerId", params.customerId);

    const queryString = query.toString();
    const response = await ApiService.get<DeliveriesListPayload>(
      ENDPOINTS.DELIVERIES.LIST(queryString)
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to fetch deliveries");
    }

    return response.payload;
  }
);

export const fetchDeliveryById = createAsyncThunk(
  "deliveries/fetchById",
  async (id: string, { rejectWithValue }) => {
    const response = await ApiService.get<Delivery>(ENDPOINTS.DELIVERIES.GET_BY_ID(id));

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to fetch delivery details");
    }

    return response.payload;
  }
);

export const fetchCustomerDeliveries = createAsyncThunk(
  "deliveries/fetchCustomerDeliveries",
  async (
    { customerId, page = 1, limit = 20 }: { customerId: string; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    const query = new URLSearchParams();
    query.append("page", String(page));
    query.append("limit", String(limit));

    const response = await ApiService.get<DeliveriesListPayload>(
      ENDPOINTS.DELIVERIES.GET_CUSTOMER_DELIVERIES(customerId, query.toString())
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to fetch customer deliveries");
    }

    return response.payload;
  }
);

export const addExtraDelivery = createAsyncThunk(
  "deliveries/addExtra",
  async (
    payload: {
      customerId: string;
      quantity?: number;
      date?: string;
      mealType?: string;
      notes?: string;
    },
    { rejectWithValue }
  ) => {
    const response = await ApiService.post<Delivery>(
      ENDPOINTS.DELIVERIES.ADD_EXTRA,
      payload
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to record extra delivery");
    }

    return response.payload;
  }
);

export const updateDeliveryStatus = createAsyncThunk(
  "deliveries/updateStatus",
  async (
    { id, status, notes }: { id: string; status: DeliveryStatus; notes?: string },
    { rejectWithValue }
  ) => {
    const response = await ApiService.patch<Delivery>(
      ENDPOINTS.DELIVERIES.UPDATE_STATUS(id),
      { status, notes }
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to update delivery status");
    }

    return response.payload;
  }
);

const deliverySlice = createSlice({
  name: "deliveries",
  initialState,
  reducers: {
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
    },
    setStatusFilter: (state, action) => {
      state.statusFilter = action.payload;
    },
    setMealTypeFilter: (state, action) => {
      state.mealTypeFilter = action.payload;
    },
    setSelectedDelivery: (state, action) => {
      state.selectedDelivery = action.payload;
    },
    clearGenerateResult: (state) => {
      state.generateResult = null;
    },
    clearDeliveryError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Generate
    builder
      .addCase(generateDailyDeliveries.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(generateDailyDeliveries.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.generateResult = action.payload;
      })
      .addCase(generateDailyDeliveries.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = (action.payload as string) || "Failed to generate deliveries";
      });

    // List
    builder
      .addCase(fetchDailyDeliveries.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDailyDeliveries.fulfilled, (state, action) => {
        state.isLoading = false;
        state.deliveries = action.payload.deliveries;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchDailyDeliveries.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || "Failed to load deliveries";
      });

    // Customer Deliveries
    builder
      .addCase(fetchCustomerDeliveries.fulfilled, (state, action) => {
        state.customerDeliveries = action.payload.deliveries;
      });

    // Add Extra
    builder
      .addCase(addExtraDelivery.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(addExtraDelivery.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.deliveries.unshift(action.payload);
      })
      .addCase(addExtraDelivery.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = (action.payload as string) || "Failed to add extra delivery";
      });

    // Update Status
    builder
      .addCase(updateDeliveryStatus.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(updateDeliveryStatus.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = state.deliveries.findIndex((d) => d._id === action.payload._id);
        if (index !== -1) {
          state.deliveries[index] = action.payload;
        }
        if (state.selectedDelivery?._id === action.payload._id) {
          state.selectedDelivery = action.payload;
        }
      })
      .addCase(updateDeliveryStatus.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = (action.payload as string) || "Failed to update delivery status";
      });
  },
});

export const {
  setSelectedDate,
  setStatusFilter,
  setMealTypeFilter,
  setSelectedDelivery,
  clearGenerateResult,
  clearDeliveryError,
} = deliverySlice.actions;

export default deliverySlice.reducer;
