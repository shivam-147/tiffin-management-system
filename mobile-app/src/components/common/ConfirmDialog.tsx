import React from "react";
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type DialogType = "success" | "danger" | "warning" | "info";

export interface ConfirmDialogProps {
  visible: boolean;
  type?: DialogType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  type = "info",
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  showCancel = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const getIconConfig = () => {
    switch (type) {
      case "success":
        return {
          icon: "checkmark-circle" as const,
          bgColor: "bg-emerald-100",
          iconColor: "#059669",
          btnColor: "bg-emerald-600 active:bg-emerald-700",
        };
      case "danger":
        return {
          icon: "alert-circle" as const,
          bgColor: "bg-rose-100",
          iconColor: "#DC2626",
          btnColor: "bg-rose-600 active:bg-rose-700",
        };
      case "warning":
        return {
          icon: "warning" as const,
          bgColor: "bg-amber-100",
          iconColor: "#D97706",
          btnColor: "bg-amber-600 active:bg-amber-700",
        };
      case "info":
      default:
        return {
          icon: "information-circle" as const,
          bgColor: "bg-orange-100",
          iconColor: "#EA580C",
          btnColor: "bg-orange-600 active:bg-orange-700",
        };
    }
  };

  const config = getIconConfig();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View className="flex-1 bg-black/50 items-center justify-center p-5">
          <TouchableWithoutFeedback>
            <View className="w-full max-w-sm bg-white rounded-3xl p-6 items-center shadow-2xl">
              {/* Top Accent Icon Badge */}
              <View
                className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${config.bgColor}`}
              >
                <Ionicons name={config.icon} size={36} color={config.iconColor} />
              </View>

              {/* Title & Message */}
              <Text className="text-xl font-bold text-slate-900 text-center mb-2 tracking-tight">
                {title}
              </Text>
              <Text className="text-sm text-slate-600 text-center leading-5 mb-6">
                {message}
              </Text>

              {/* Action Buttons */}
              <View className="w-full flex-row gap-3">
                {showCancel && (
                  <TouchableOpacity
                    onPress={onCancel}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 bg-slate-50 items-center justify-center active:bg-slate-100"
                  >
                    <Text className="text-sm font-semibold text-slate-700">
                      {cancelText}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 py-3 px-4 rounded-xl items-center justify-center shadow-md ${config.btnColor}`}
                >
                  <Text className="text-sm font-bold text-white">
                    {isLoading ? "Please wait..." : confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};
