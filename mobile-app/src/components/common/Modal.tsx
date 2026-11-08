import React from "react";
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/50 justify-end sm:justify-center p-0 sm:p-4">
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View
                className="bg-white rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] shadow-xl"
                style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
              >
                {/* Modal Header */}
                <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                  <View className="flex-1 pr-2">
                    <Text className="text-lg font-bold text-slate-900 tracking-tight">
                      {title}
                    </Text>
                    {subtitle && (
                      <Text className="text-xs text-slate-500 mt-0.5">
                        {subtitle}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={onClose}
                    className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
                  >
                    <Ionicons name="close" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Modal Content */}
                <ScrollView
                  className="mt-3"
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {children}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};
