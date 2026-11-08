import "../global.css";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { store } from "../src/redux/store";
import { useAppDispatch, useAppSelector } from "../src/redux/hooks";
import { restoreAuthState } from "../src/redux/slices/authSlice";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";

function AppNavigation() {
  const dispatch = useAppDispatch();
  const { isInitializing } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(restoreAuthState());
  }, [dispatch]);

  if (isInitializing) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#EA580C" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F8FAFC" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AppNavigation />
      </SafeAreaProvider>
    </Provider>
  );
}
