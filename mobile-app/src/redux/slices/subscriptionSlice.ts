import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import ApiService from "../../services/ApiService";
import ENDPOINTS from "../../constants/endpoints";
import {
  Subscription,
  SubscriptionsListPayload,
  Pagination,
  SubscriptionStatus,
} from "../../types";

interface SubscriptionState {
  subscriptions: Subscription[];
  pagination: Pagination | null;
  selectedSubscription: Subscription | null;
  activeCustomerSubscription: Subscription | null;
  customerHistory: Subscription[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  statusFilter: SubscriptionStatus | "ALL";
}

const initialState: SubscriptionState = {
  subscriptions: [],
  pagination: null,
  selectedSubscription: null,
  activeCustomerSubscription: null,
  customerHistory: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
  statusFilter: "ALL",
};

export const fetchSubscriptions = createAsyncThunk(
  "subscriptions/fetchList",
  async (
    params: { page?: number; limit?: number; status?: string; customerId?: string } = {},
    { rejectWithValue }
  ) => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));
    if (params.status && params.status !== "ALL") query.append("status", params.status);
    if (params.customerId) query.append("customerId", params.customerId);

    const queryString = query.toString();
    const response = await ApiService.get<SubscriptionsListPayload>(
      ENDPOINTS.SUBSCRIPTIONS.LIST(queryString)
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to fetch subscriptions");
    }

    return response.payload;
  }
);

export const fetchSubscriptionById = createAsyncThunk(
  "subscriptions/fetchById",
  async (id: string, { rejectWithValue }) => {
    const response = await ApiService.get<Subscription>(
      ENDPOINTS.SUBSCRIPTIONS.GET_BY_ID(id)
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to fetch package details");
    }

    return response.payload;
  }
);

export const fetchCustomerActiveSubscription = createAsyncThunk(
  "subscriptions/fetchCustomerActive",
  async (customerId: string, { rejectWithValue }) => {
    const response = await ApiService.get<Subscription | null>(
      ENDPOINTS.SUBSCRIPTIONS.GET_CUSTOMER_ACTIVE(customerId)
    );

    if (!response.success) {
      return rejectWithValue(response.message || "Failed to fetch active package");
    }

    return response.payload;
  }
);

export const fetchCustomerPackageHistory = createAsyncThunk(
  "subscriptions/fetchCustomerHistory",
  async (customerId: string, { rejectWithValue }) => {
    const response = await ApiService.get<Subscription[]>(
      ENDPOINTS.SUBSCRIPTIONS.GET_CUSTOMER_HISTORY(customerId)
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to fetch customer packages");
    }

    return response.payload;
  }
);

export const createSubscription = createAsyncThunk(
  "subscriptions/create",
  async (
    data: {
      customerId: string;
      pricePerTiffin: number;
      totalTiffins: number;
      startDate?: string;
      notes?: string;
    },
    { rejectWithValue }
  ) => {
    const response = await ApiService.post<Subscription>(
      ENDPOINTS.SUBSCRIPTIONS.CREATE,
      data
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to create subscription package");
    }

    return response.payload;
  }
);

export const pauseSubscription = createAsyncThunk(
  "subscriptions/pause",
  async (
    {
      id,
      data,
    }: {
      id: string;
      data: { expectedResumeDate?: string; reason?: string };
    },
    { rejectWithValue }
  ) => {
    const response = await ApiService.post<Subscription>(
      ENDPOINTS.SUBSCRIPTIONS.PAUSE(id),
      data
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to pause subscription package");
    }

    return response.payload;
  }
);

export const resumeSubscription = createAsyncThunk(
  "subscriptions/resume",
  async (
    { id, data }: { id: string; data: { resumeDate?: string } },
    { rejectWithValue }
  ) => {
    const response = await ApiService.post<Subscription>(
      ENDPOINTS.SUBSCRIPTIONS.RESUME(id),
      data
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to resume subscription package");
    }

    return response.payload;
  }
);

export const cancelSubscription = createAsyncThunk(
  "subscriptions/cancel",
  async (id: string, { rejectWithValue }) => {
    const response = await ApiService.post<Subscription>(
      ENDPOINTS.SUBSCRIPTIONS.CANCEL(id)
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to cancel subscription package");
    }

    return response.payload;
  }
);

const subscriptionSlice = createSlice({
  name: "subscriptions",
  initialState,
  reducers: {
    setStatusFilter: (state, action) => {
      state.statusFilter = action.payload;
    },
    setSelectedSubscription: (state, action) => {
      state.selectedSubscription = action.payload;
    },
    clearSubscriptionError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // List
    builder
      .addCase(fetchSubscriptions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSubscriptions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.subscriptions = action.payload.subscriptions;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchSubscriptions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || "Failed to load packages";
      });

    // Customer Active Package
    builder
      .addCase(fetchCustomerActiveSubscription.fulfilled, (state, action) => {
        state.activeCustomerSubscription = action.payload;
      });

    // Customer History
    builder
      .addCase(fetchCustomerPackageHistory.fulfilled, (state, action) => {
        state.customerHistory = action.payload;
      });

    // Create
    builder
      .addCase(createSubscription.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(createSubscription.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.subscriptions.unshift(action.payload);
        state.activeCustomerSubscription = action.payload;
      })
      .addCase(createSubscription.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = (action.payload as string) || "Package creation failed";
      });

    // Update state helpers for Pause, Resume, Cancel
    const updateSubscriptionInState = (state: SubscriptionState, updated: Subscription) => {
      state.isSubmitting = false;
      const index = state.subscriptions.findIndex((s) => s._id === updated._id);
      if (index !== -1) {
        state.subscriptions[index] = updated;
      }
      if (state.selectedSubscription?._id === updated._id) {
        state.selectedSubscription = updated;
      }
      if (state.activeCustomerSubscription?._id === updated._id) {
        state.activeCustomerSubscription = updated;
      }
    };

    builder
      .addCase(pauseSubscription.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(pauseSubscription.fulfilled, (state, action) => {
        updateSubscriptionInState(state, action.payload);
      })
      .addCase(pauseSubscription.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = (action.payload as string) || "Failed to pause package";
      });

    builder
      .addCase(resumeSubscription.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(resumeSubscription.fulfilled, (state, action) => {
        updateSubscriptionInState(state, action.payload);
      })
      .addCase(resumeSubscription.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = (action.payload as string) || "Failed to resume package";
      });

    builder
      .addCase(cancelSubscription.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(cancelSubscription.fulfilled, (state, action) => {
        updateSubscriptionInState(state, action.payload);
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = (action.payload as string) || "Failed to cancel package";
      });
  },
});

export const {
  setStatusFilter,
  setSelectedSubscription,
  clearSubscriptionError,
} = subscriptionSlice.actions;

export default subscriptionSlice.reducer;
