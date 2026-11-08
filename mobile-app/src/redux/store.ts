import { configureStore } from "@reduxjs/toolkit";
import authReducer, { forceLogout } from "./slices/authSlice";
import customerReducer from "./slices/customerSlice";
import subscriptionReducer from "./slices/subscriptionSlice";
import deliveryReducer from "./slices/deliverySlice";
import billingReducer from "./slices/billingSlice";
import dashboardReducer from "./slices/dashboardSlice";
import packageReducer from "./slices/packageSlice";
import ApiService from "../services/ApiService";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    customers: customerReducer,
    subscriptions: subscriptionReducer,
    deliveries: deliveryReducer,
    billing: billingReducer,
    dashboard: dashboardReducer,
    packages: packageReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Configure ApiService auth failure callback
ApiService.setOnAuthFailure(() => {
  store.dispatch(forceLogout());
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
