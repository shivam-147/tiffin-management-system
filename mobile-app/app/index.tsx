import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAppSelector } from "../src/redux/hooks";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isInitializing } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!isInitializing) {
      if (isAuthenticated) {
        router.replace("/(tabs)" as any);
      } else {
        router.replace("/(auth)/login" as any);
      }
    }
  }, [isAuthenticated, isInitializing, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#EA580C" />
    </View>
  );
}
