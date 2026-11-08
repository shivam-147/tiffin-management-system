import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import ApiService from "../../services/ApiService";
import ENDPOINTS from "../../constants/endpoints";
import { StorageUtil } from "../../utils/storage";
import { Admin, ApiResponse, LoginPayload } from "../../types";

interface AuthState {
  admin: Admin | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
}

const initialState: AuthState = {
  admin: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,
  error: null,
};

export const loginAdmin = createAsyncThunk(
  "auth/login",
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    const response = await ApiService.post<LoginPayload>(ENDPOINTS.AUTH.LOGIN, credentials);

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Login failed");
    }

    const { admin, accessToken, refreshToken, token } = response.payload;
    const finalAccessToken = accessToken || token;

    await StorageUtil.saveAuthTokens(finalAccessToken, refreshToken);
    await StorageUtil.setItem("tms_admin_user", JSON.stringify(admin));
    ApiService.setAccessToken(finalAccessToken);

    return { admin, accessToken: finalAccessToken, refreshToken };
  }
);

export const restoreAuthState = createAsyncThunk(
  "auth/restore",
  async (_, { rejectWithValue }) => {
    const accessToken = await StorageUtil.getAccessToken();
    const refreshToken = await StorageUtil.getRefreshToken();
    const adminUserStr = await StorageUtil.getItem("tms_admin_user");

    if (!accessToken || !refreshToken) {
      return rejectWithValue("No stored session");
    }

    let admin: Admin | null = null;
    if (adminUserStr) {
      try {
        admin = JSON.parse(adminUserStr);
      } catch {
        // ignore
      }
    }

    ApiService.setAccessToken(accessToken);

    // Try fetching fresh profile to verify validity
    const profileRes = await ApiService.get<Admin>(ENDPOINTS.AUTH.PROFILE);
    if (profileRes.success && profileRes.payload) {
      admin = profileRes.payload;
      await StorageUtil.setItem("tms_admin_user", JSON.stringify(admin));
    }

    return {
      admin,
      accessToken,
      refreshToken,
    };
  }
);

export const logoutAdmin = createAsyncThunk(
  "auth/logout",
  async (_, { getState }) => {
    const state = getState() as { auth: AuthState };
    const refreshToken = state.auth.refreshToken || (await StorageUtil.getRefreshToken());

    if (refreshToken) {
      try {
        await ApiService.post(ENDPOINTS.AUTH.LOGOUT, { refreshToken });
      } catch {
        // Safe ignore
      }
    }

    await StorageUtil.clearAuthTokens();
    ApiService.setAccessToken(null);
  }
);

export const logoutAllAdmin = createAsyncThunk(
  "auth/logoutAll",
  async () => {
    try {
      await ApiService.post(ENDPOINTS.AUTH.LOGOUT_ALL);
    } catch {
      // Safe ignore
    }

    await StorageUtil.clearAuthTokens();
    ApiService.setAccessToken(null);
  }
);

export const updateAdminProfile = createAsyncThunk(
  "auth/updateProfile",
  async (
    profileData: {
      name?: string;
      businessName?: string;
      phone?: string;
      address?: string;
      upiId?: string;
    },
    { rejectWithValue }
  ) => {
    const response = await ApiService.put<Admin>(
      ENDPOINTS.AUTH.UPDATE_PROFILE,
      profileData
    );

    if (!response.success || !response.payload) {
      return rejectWithValue(response.message || "Failed to update profile");
    }

    await StorageUtil.setItem("tms_admin_user", JSON.stringify(response.payload));
    return response.payload;
  }
);

export const changeAdminPassword = createAsyncThunk(
  "auth/changePassword",
  async (
    passwords: { currentPassword: string; newPassword: string },
    { rejectWithValue }
  ) => {
    const response = await ApiService.put(ENDPOINTS.AUTH.CHANGE_PASSWORD, passwords);

    if (!response.success) {
      return rejectWithValue(response.message || "Failed to change password");
    }

    // Changing password revokes sessions on backend, so log out
    await StorageUtil.clearAuthTokens();
    ApiService.setAccessToken(null);

    return response.message;
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    forceLogout: (state) => {
      state.admin = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginAdmin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginAdmin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.admin = action.payload.admin;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.error = null;
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = (action.payload as string) || "Invalid email or password";
      });

    // Restore Auth
    builder
      .addCase(restoreAuthState.pending, (state) => {
        state.isInitializing = true;
      })
      .addCase(restoreAuthState.fulfilled, (state, action) => {
        state.isInitializing = false;
        state.isAuthenticated = true;
        state.admin = action.payload.admin;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(restoreAuthState.rejected, (state) => {
        state.isInitializing = false;
        state.isAuthenticated = false;
        state.admin = null;
        state.accessToken = null;
        state.refreshToken = null;
      });

    // Logout
    builder.addCase(logoutAdmin.fulfilled, (state) => {
      state.admin = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    });

    // Logout All
    builder.addCase(logoutAllAdmin.fulfilled, (state) => {
      state.admin = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    });

    // Update Profile
    builder
      .addCase(updateAdminProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateAdminProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.admin = action.payload;
      })
      .addCase(updateAdminProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Change Password
    builder
      .addCase(changeAdminPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changeAdminPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.admin = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      })
      .addCase(changeAdminPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || "Password change failed";
      });
  },
});

export const { clearAuthError, forceLogout } = authSlice.actions;
export default authSlice.reducer;
