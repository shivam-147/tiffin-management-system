import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = "primary",
  size = "md",
  isLoading = false,
  icon,
  disabled,
  style,
  className = "",
  ...rest
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          container: "bg-orange-600 active:bg-orange-700",
          text: "text-white font-semibold",
          fallbackBg: "#EA580C",
          fallbackText: "#FFFFFF",
          borderWidth: 0,
          borderColor: "transparent",
        };
      case "secondary":
        return {
          container: "bg-slate-900 active:bg-slate-800",
          text: "text-white font-semibold",
          fallbackBg: "#0F172A",
          fallbackText: "#FFFFFF",
          borderWidth: 0,
          borderColor: "transparent",
        };
      case "outline":
        return {
          container: "bg-transparent border border-slate-300 active:bg-slate-100",
          text: "text-slate-700 font-medium",
          fallbackBg: "transparent",
          fallbackText: "#334155",
          borderWidth: 1,
          borderColor: "#CBD5E1",
        };
      case "danger":
        return {
          container: "bg-rose-600 active:bg-rose-700",
          text: "text-white font-semibold",
          fallbackBg: "#E11D48",
          fallbackText: "#FFFFFF",
          borderWidth: 0,
          borderColor: "transparent",
        };
      case "ghost":
        return {
          container: "bg-transparent active:bg-slate-100",
          text: "text-orange-600 font-medium",
          fallbackBg: "transparent",
          fallbackText: "#EA580C",
          borderWidth: 0,
          borderColor: "transparent",
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return {
          container: "py-2 px-3 rounded-lg",
          text: "text-xs",
          paddingVertical: 8,
          paddingHorizontal: 12,
          fontSize: 12,
          borderRadius: 8,
        };
      case "md":
        return {
          container: "py-3 px-4 rounded-xl",
          text: "text-sm",
          paddingVertical: 12,
          paddingHorizontal: 16,
          fontSize: 14,
          borderRadius: 12,
        };
      case "lg":
        return {
          container: "py-3.5 px-6 rounded-xl",
          text: "text-base",
          paddingVertical: 14,
          paddingHorizontal: 20,
          fontSize: 16,
          borderRadius: 14,
        };
    }
  };

  const variantStyle = getVariantStyles();
  const sizeStyle = getSizeStyles();
  const isDisabled = disabled || isLoading;

  // Comprehensive fallback styling to guarantee visibility on all platforms
  const fallbackContainerStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: variantStyle.fallbackBg,
    paddingVertical: sizeStyle.paddingVertical,
    paddingHorizontal: sizeStyle.paddingHorizontal,
    borderRadius: sizeStyle.borderRadius,
    borderWidth: variantStyle.borderWidth,
    borderColor: variantStyle.borderColor,
    opacity: isDisabled ? 0.6 : 1,
  };

  const fallbackTextStyle: TextStyle = {
    color: variantStyle.fallbackText,
    fontSize: sizeStyle.fontSize,
    fontWeight: "600",
    textAlign: "center",
  };

  return (
    <TouchableOpacity
      className={`flex-row items-center justify-center ${variantStyle.container} ${sizeStyle.container} ${
        isDisabled ? "opacity-50" : ""
      } ${className}`}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[fallbackContainerStyle, style]}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === "outline" || variant === "ghost" ? "#EA580C" : "#FFFFFF"}
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            className={`${variantStyle.text} ${sizeStyle.text} ${icon ? "ml-2" : ""}`}
            style={[fallbackTextStyle, icon ? { marginLeft: 8 } : undefined]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};
