import { Platform } from "react-native";
import { StorageUtil } from "../utils/storage";
import { ApiResponse, ErrorDetail } from "../types";
import { logger } from "../utils/logger";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method: HttpMethod;
  endpoint: string;
  body?: unknown;
  headers?: Record<string, string>;
  isRetry?: boolean;
}

class ApiService {
  private baseUrl: string;
  private accessToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string | null) => void> = [];
  private onAuthFailureCallback: (() => void) | null = null;

  constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.31.232:5000/api/v1'
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, "");
  }

  public setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public setOnAuthFailure(callback: () => void): void {
    this.onAuthFailureCallback = callback;
  }

  private onTokenRefreshed(newToken: string | null): void {
    this.refreshSubscribers.forEach((callback) => callback(newToken));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(callback: (token: string | null) => void): void {
    this.refreshSubscribers.push(callback);
  }

  private async executeFetch<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    const { method, endpoint, body, isRetry = false } = options;
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
    // Ensure access token is loaded
    if (!this.accessToken) {
      this.accessToken = await StorageUtil.getAccessToken();
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const fetchConfig: RequestInit = {
      method,
      headers,
    };

    if (body !== undefined && body !== null && method !== "GET" && method !== "DELETE") {
      fetchConfig.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      logger.log(`[HTTP Request] ${method} ${endpoint}`);
      response = await fetch(url, fetchConfig);
    } catch (networkError: any) {
      logger.error(`[HTTP Network Error] ${method} ${endpoint}:`, networkError?.message || networkError);
      return {
        success: false,
        message: networkError?.message || "Network request failed. Please check your connection.",
        error_code: "NETWORK_ERROR",
        detail: [
          {
            field: "network",
            code: "UNREACHABLE",
            message: "Unable to connect to backend server",
            location: "network",
          },
        ],
        payload: null,
      };
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      data = {
        success: response.ok,
        message: response.ok ? "Success" : `HTTP Error ${response.status}`,
        error_code: response.ok ? null : "HTTP_ERROR",
        detail: [],
        payload: null,
      };
    }

    // Handle 401 Unauthorized for token refresh
    const isAuthRoute = endpoint.includes("/auth/login") || endpoint.includes("/auth/refresh");

    if (response.status === 401 && !isRetry && !isAuthRoute) {
      if (this.isRefreshing) {
        // Wait for the ongoing refresh
        return new Promise<ApiResponse<T>>((resolve) => {
          this.addRefreshSubscriber(async (newToken) => {
            if (newToken) {
              resolve(this.executeFetch<T>({ ...options, isRetry: true }));
            } else {
              resolve(data as ApiResponse<T>);
            }
          });
        });
      }

      this.isRefreshing = true;

      try {
        const refreshToken = await StorageUtil.getRefreshToken();
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const refreshResponse = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });

        const refreshData = await refreshResponse.json();

        if (refreshResponse.ok && refreshData.success && refreshData.payload) {
          const newAccessToken =
            refreshData.payload.accessToken || refreshData.payload.token;
          const newRefreshToken = refreshData.payload.refreshToken;

          this.accessToken = newAccessToken;
          await StorageUtil.saveAuthTokens(newAccessToken, newRefreshToken);

          this.isRefreshing = false;
          this.onTokenRefreshed(newAccessToken);

          // Retry the original request
          return this.executeFetch<T>({ ...options, isRetry: true });
        } else {
          throw new Error(refreshData.message || "Token refresh failed");
        }
      } catch (refreshErr) {
        this.isRefreshing = false;
        this.accessToken = null;
        await StorageUtil.clearAuthTokens();
        this.onTokenRefreshed(null);

        if (this.onAuthFailureCallback) {
          this.onAuthFailureCallback();
        }

        return {
          success: false,
          message: "Session expired. Please log in again.",
          error_code: "UNAUTHORIZED",
          detail: [],
          payload: null,
        };
      }
    }

    // Ensure standard response structure is returned
    const standardizedResponse: ApiResponse<T> = {
      success: typeof data.success === "boolean" ? data.success : response.ok,
      message: data.message || (response.ok ? "Request successful" : "Request failed"),
      error_code: data.error_code !== undefined ? data.error_code : response.ok ? null : "ERROR",
      detail: Array.isArray(data.detail) ? data.detail : [],
      payload: data.payload !== undefined ? data.payload : null,
    };

    if (response.ok) {
      logger.info(`[HTTP Success] ${method} ${endpoint} (${response.status})`);
    } else if (response.status >= 500) {
      logger.error(`[HTTP Server Error] ${method} ${endpoint} (${response.status}):`, standardizedResponse.message);
    } else {
      logger.warn(`[HTTP Client Error] ${method} ${endpoint} (${response.status}):`, standardizedResponse.message);
    }

    return standardizedResponse;
  }

  // --- STRICT REQUIRED HTTP METHODS ---

  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.executeFetch<T>({ method: "GET", endpoint });
  }

  async post<T = any>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.executeFetch<T>({ method: "POST", endpoint, body });
  }

  async put<T = any>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.executeFetch<T>({ method: "PUT", endpoint, body });
  }

  async patch<T = any>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.executeFetch<T>({ method: "PATCH", endpoint, body });
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.executeFetch<T>({ method: "DELETE", endpoint });
  }
}

export default new ApiService();
