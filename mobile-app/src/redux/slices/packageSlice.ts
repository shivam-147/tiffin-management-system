import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import ApiService from "../../services/ApiService";
import ENDPOINTS from "../../constants/endpoints";
import { PackageCatalog, ApiResponse } from "../../types";

interface PackageState {
  packages: PackageCatalog[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: PackageState = {
  packages: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
};

export const fetchPackages = createAsyncThunk<
  PackageCatalog[],
  boolean | undefined,
  { rejectValue: string }
>("packages/fetchAll", async (activeOnly = true, { rejectWithValue }) => {
  try {
    const res = await ApiService.get<PackageCatalog[]>(
      ENDPOINTS.PACKAGES.LIST(`activeOnly=${activeOnly}`)
    );
    return res.payload || [];
  } catch (err: any) {
    return rejectWithValue(err.message || "Failed to load packages");
  }
});

export const createPackage = createAsyncThunk<
  PackageCatalog,
  Partial<PackageCatalog>,
  { rejectValue: string }
>("packages/create", async (data, { rejectWithValue }) => {
  try {
    const res = await ApiService.post<PackageCatalog>(
      ENDPOINTS.PACKAGES.CREATE,
      data
    );
    return res.payload!;
  } catch (err: any) {
    return rejectWithValue(err.message || "Failed to create package");
  }
});

export const deactivatePackage = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("packages/deactivate", async (id, { rejectWithValue }) => {
  try {
    await ApiService.delete(ENDPOINTS.PACKAGES.DELETE(id));
    return id;
  } catch (err: any) {
    return rejectWithValue(err.message || "Failed to deactivate package");
  }
});

const packageSlice = createSlice({
  name: "packages",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPackages.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPackages.fulfilled, (state, action) => {
        state.isLoading = false;
        state.packages = action.payload;
      })
      .addCase(fetchPackages.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Error fetching packages";
      })
      .addCase(createPackage.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(createPackage.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.packages.unshift(action.payload);
      })
      .addCase(createPackage.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload || "Error creating package";
      })
      .addCase(deactivatePackage.fulfilled, (state, action) => {
        state.packages = state.packages.filter((p) => p._id !== action.payload);
      });
  },
});

export default packageSlice.reducer;
