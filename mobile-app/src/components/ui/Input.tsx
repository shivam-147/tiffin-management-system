import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  helperText?: string;
  isPassword?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  isPassword = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  className = "",
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const secureTextEntry = isPassword && !showPassword;

  return (
    <View className="mb-4 w-full">
      {label && (
        <Text className="text-sm font-medium text-slate-700 mb-1.5">{label}</Text>
      )}

      <View
        className={`flex-row items-center bg-slate-50 border rounded-xl px-3.5 ${
          error
            ? "border-rose-400"
            : isFocused
            ? "border-orange-500 bg-white"
            : "border-slate-200"
        }`}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={error ? "#F43F5E" : isFocused ? "#EA580C" : "#94A3B8"}
            style={{ marginRight: 8 }}
          />
        )}

        <TextInput
          className={`flex-1 py-3 text-slate-900 text-sm ${className}`}
          placeholderTextColor="#94A3B8"
          secureTextEntry={secureTextEntry}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />

        {isPassword ? (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            className="p-1"
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#64748B"
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity onPress={onRightIconPress} className="p-1">
            <Ionicons name={rightIcon} size={20} color="#64748B" />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <Text className="text-xs text-rose-500 mt-1 font-medium">{error}</Text>
      ) : helperText ? (
        <Text className="text-xs text-slate-400 mt-1">{helperText}</Text>
      ) : null}
    </View>
  );
};
