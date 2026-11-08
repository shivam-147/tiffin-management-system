import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: "orange" | "green" | "blue" | "amber" | "rose" | "purple";
}

const colorMap = {
  orange: {
    bg: "bg-orange-50",
    iconBg: "bg-orange-100",
    iconColor: "#EA580C",
    text: "text-orange-950",
  },
  green: {
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    iconColor: "#16A34A",
    text: "text-emerald-950",
  },
  blue: {
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconColor: "#2563EB",
    text: "text-blue-950",
  },
  amber: {
    bg: "bg-amber-50",
    iconBg: "bg-amber-100",
    iconColor: "#D97706",
    text: "text-amber-950",
  },
  rose: {
    bg: "bg-rose-50",
    iconBg: "bg-rose-100",
    iconColor: "#E11D48",
    text: "text-rose-950",
  },
  purple: {
    bg: "bg-purple-50",
    iconBg: "bg-purple-100",
    iconColor: "#9333EA",
    text: "text-purple-950",
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = "orange",
}) => {
  const c = colorMap[color];

  return (
    <View
      className={`rounded-2xl p-4 flex-1 m-1 border border-slate-100/80 shadow-sm ${c.bg}`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className={`w-9 h-9 rounded-xl items-center justify-center ${c.iconBg}`}>
          <Ionicons name={icon} size={20} color={c.iconColor} />
        </View>
        {subtitle && (
          <Text className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            {subtitle}
          </Text>
        )}
      </View>
      <Text className="text-2xl font-bold text-slate-900 tracking-tight">{value}</Text>
      <Text className="text-xs text-slate-500 mt-0.5 font-medium">{title}</Text>
    </View>
  );
};
