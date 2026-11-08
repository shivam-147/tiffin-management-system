import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { APP_CONFIG } from "../constants/app.constants";

const isWeb = Platform.OS === "web";

export const StorageUtil = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (isWeb) {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.warn(`SecureStore setItem failed for key "${key}":`, error);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (isWeb) {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.warn(`SecureStore getItem failed for key "${key}":`, error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (isWeb) {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.warn(`SecureStore deleteItem failed for key "${key}":`, error);
    }
  },

  async saveAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      this.setItem(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN, accessToken),
      this.setItem(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
    ]);
  },

  async getAccessToken(): Promise<string | null> {
    return this.getItem(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    return this.getItem(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
  },

  async clearAuthTokens(): Promise<void> {
    await Promise.all([
      this.removeItem(APP_CONFIG.STORAGE_KEYS.ACCESS_TOKEN),
      this.removeItem(APP_CONFIG.STORAGE_KEYS.REFRESH_TOKEN),
      this.removeItem(APP_CONFIG.STORAGE_KEYS.ADMIN_USER),
    ]);
  },
};
