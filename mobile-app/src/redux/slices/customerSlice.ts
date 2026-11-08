import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import ApiService from "../../services/ApiService";
import ENDPOINTS from "../../constants/endpoints";
import { Customer, CustomersListPayload, Pagination } from "../../types";

interface CustomerState {
  customers: Customer[];
  pagination: Pagination | null;
  selectedCustomer: Customer | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  searchQuery: string;
  statusFilter: "all" | "true" | "false";
}

const initialState: CustomerState = {
  customers: [],
  pagination: null,
  selectedCustomer: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  searchQuery: "",
  statusFilter: "all",
};

export const fetchCustomers = createAsyncThunk(
  "customers/fetchList",
  async (
    params: { page?: number; limit?: number; search?: string; isActive?: string } = {},
    { rejectWithValue }
  ) => {
    const query = new URLSearchParams();
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));
    if (params.search) query.append("search", params.search);
    if (params.isActive && params.isActive !== "all") query.append("isActive", params.isActive);

    const queryString = query.toString();
    const response = await ApiService.get<CustomersListPayload>(
      ENDPOINTS.CUSTOMERS.LIST(queryString)
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to fetch customers");
    }

    return response.payload;
  }
);

export const fetchCustomerById = createAsyncThunk(
  "customers/fetchById",
  async (id: string, { rejectWithValue }) => {
    const response = await ApiService.get<Customer>(ENDPOINTS.CUSTOMERS.GET_BY_ID(id));

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to fetch customer");
    }

    return response.payload;
  }
);

export const createCustomer = createAsyncThunk(
  "customers/create",
  async (
    data: {
      name: string;
      phone: string;
      address: string;
      email?: string;
      notes?: string;
      packageCatalogId?: string;
      advanceAmount?: number;
      startDate?: string;
    },
    { rejectWithValue }
  ) => {
    const response = await ApiService.post<Customer>(ENDPOINTS.CUSTOMERS.CREATE, data);

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to create customer");
    }

    return response.payload;
  }
);

export const updateCustomer = createAsyncThunk(
  "customers/update",
  async (
    { id, data }: { id: string; data: Partial<Customer> },
    { rejectWithValue }
  ) => {
    const response = await ApiService.put<Customer>(ENDPOINTS.CUSTOMERS.UPDATE(id), data);

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to update customer");
    }

    return response.payload;
  }
);

export const deactivateCustomer = createAsyncThunk(
  "customers/deactivate",
  async (id: string, { rejectWithValue }) => {
    const response = await ApiService.patch<Customer>(ENDPOINTS.CUSTOMERS.DEACTIVATE(id));

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to deactivate customer");
    }

    return response.payload;
  }
);

const customerSlice = createSlice({
  name: "customers",
  initialState,
  reducers: {
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setStatusFilter: (state, action) => {
      state.statusFilter = action.payload;
    },
    setSelectedCustomer: (state, action) => {
      state.selectedCustomer = action.payload;
    },
    clearCustomerError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // List
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customers = action.payload.customers;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || "Failed to load customers";
      });

    // Get By Id
    builder
      .addCase(fetchCustomerById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedCustomer = action.payload;
      })
      .addCase(fetchCustomerById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || "Failed to load customer details";
      });

    // Create
    builder
      .addCase(createCustomer.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.customers.unshift(action.payload);
        if (state.pagination) {
          state.pagination.total += 1;
        }
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = (action.payload as string) || "Customer creation failed";
      });

    // Update
    builder
      .addCase(updateCustomer.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = state.customers.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.customers[index] = action.payload;
        }
        if (state.selectedCustomer?._id === action.payload._id) {
          state.selectedCustomer = action.payload;
        }
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = (action.payload as string) || "Customer update failed";
      });

    // Deactivate
    builder
      .addCase(deactivateCustomer.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(deactivateCustomer.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = state.customers.findIndex((c) => c._id === action.payload._id);
        if (index !== -1) {
          state.customers[index] = action.payload;
        }
        if (state.selectedCustomer?._id === action.payload._id) {
          state.selectedCustomer = action.payload;
        }
      })
      .addCase(deactivateCustomer.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = (action.payload as string) || "Deactivation failed";
      });
  },
});

export const {
  setSearchQuery,
  setStatusFilter,
  setSelectedCustomer,
  clearCustomerError,
} = customerSlice.actions;

export default customerSlice.reducer;
