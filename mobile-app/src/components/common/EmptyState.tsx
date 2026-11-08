import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../ui/Button";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionTitle?: string;
  onActionPress?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "cube-outline",
  title,
  description,
  actionTitle,
  onActionPress,
}) => {
  return (
    <View className="items-center justify-center p-8 my-6">
      <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-4">
        <Ionicons name={icon} size={32} color="#94A3B8" />
      </View>
      <Text className="text-base font-semibold text-slate-800 text-center mb-1">
        {title}
      </Text>
      {description && (
        <Text className="text-xs text-slate-500 text-center max-w-[260px] mb-4">
          {description}
        </Text>
      )}
      {actionTitle && onActionPress && (
        <Button
          title={actionTitle}
          onPress={onActionPress}
          variant="outline"
          size="sm"
        />
      )}
    </View>
  );
};
