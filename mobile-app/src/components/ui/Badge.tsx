import React from "react";
import { View, Text } from "react-native";

interface BadgeProps {
  label: string;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  size?: "sm" | "md";
}

const variantStyles = {
  success: {
    bg: "bg-emerald-100",
    text: "text-emerald-800",
  },
  warning: {
    bg: "bg-amber-100",
    text: "text-amber-800",
  },
  danger: {
    bg: "bg-rose-100",
    text: "text-rose-800",
  },
  info: {
    bg: "bg-blue-100",
    text: "text-blue-800",
  },
  neutral: {
    bg: "bg-slate-100",
    text: "text-slate-700",
  },
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "neutral",
  size = "md",
}) => {
  const styles = variantStyles[variant] || variantStyles.neutral;
  const padding = size === "sm" ? "px-2 py-0.5" : "px-2.5 py-1";
  const fontSize = size === "sm" ? "text-xs" : "text-xs font-semibold";

  return (
    <View className={`rounded-full self-start ${styles.bg} ${padding}`}>
      <Text className={`${styles.text} ${fontSize}`}>{label}</Text>
    </View>
  );
};

export const StatusBadge: React.FC<{ status: string; size?: "sm" | "md" }> = ({
  status,
  size = "md",
}) => {
  let variant: "success" | "warning" | "danger" | "info" | "neutral" = "neutral";

  switch (status.toUpperCase()) {
    case "ACTIVE":
    case "DELIVERED":
    case "PAID":
      variant = "success";
      break;
    case "PENDING":
    case "PARTIAL":
      variant = "warning";
      break;
    case "PAUSED":
      variant = "info";
      break;
    case "SKIPPED":
    case "FAILED":
    case "CANCELLED":
    case "UNPAID":
      variant = "danger";
      break;
    default:
      variant = "neutral";
  }

  return <Badge label={status} variant={variant} size={size} />;
};
