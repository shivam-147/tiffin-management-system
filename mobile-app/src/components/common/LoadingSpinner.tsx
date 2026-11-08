import React from "react";
import { View, ActivityIndicator, Text } from "react-native";

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Loading...",
  fullScreen = false,
}) => {
  return (
    <View
      className={`items-center justify-center ${
        fullScreen ? "flex-1 bg-white" : "py-8"
      }`}
    >
      <ActivityIndicator size="large" color="#EA580C" />
      {message && (
        <Text className="text-xs text-slate-500 font-medium mt-3">
          {message}
        </Text>
      )}
    </View>
  );
};
