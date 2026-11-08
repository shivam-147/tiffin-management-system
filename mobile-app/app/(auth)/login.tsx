import React, { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "../../src/redux/hooks";
import { loginAdmin, clearAuthError } from "../../src/redux/slices/authSlice";
import ApiService from "../../src/services/ApiService";
import { Input } from "../../src/components/ui/Input";
import { Button } from "../../src/components/ui/Button";

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("YourStrongPassword123");
  const [showConfig, setShowConfig] = useState(false);
  const [apiUrl, setApiUrl] = useState(ApiService.getBaseUrl());

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }

    dispatch(clearAuthError());
    const result = await dispatch(
      loginAdmin({ email: email.trim().toLowerCase(), password })
    );

    if (loginAdmin.fulfilled.match(result)) {
      router.replace("/(tabs)" as any);
    }
  };

  const handleUpdateApiUrl = () => {
    if (apiUrl.trim()) {
      ApiService.setBaseUrl(apiUrl.trim());
      setShowConfig(false);
      Alert.alert("Success", `API Base URL set to: ${ApiService.getBaseUrl()}`);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-white"
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingVertical: 36,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Branding */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 rounded-3xl bg-orange-500 items-center justify-center shadow-lg shadow-orange-500/30 mb-4">
            <Ionicons name="restaurant" size={38} color="#FFFFFF" />
          </View>
          <Text className="text-2xl font-bold text-slate-900 tracking-tight text-center">
            Tiffin Management
          </Text>
          <Text className="text-sm text-slate-500 mt-1 font-medium text-center">
            Daily meal distribution & billing system
          </Text>
        </View>

        {/* Error Alert */}
        {error && (
          <View className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 mb-5 flex-row items-center">
            <Ionicons name="alert-circle" size={20} color="#E11D48" />
            <Text className="text-xs text-rose-700 font-medium ml-2 flex-1">
              {error}
            </Text>
          </View>
        )}

        {/* Form Inputs */}
        <View className="w-full">
          <Input
            label="Email Address"
            placeholder="admin@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
          />

          <Input
            label="Password"
            placeholder="Enter admin password"
            value={password}
            onChangeText={setPassword}
            isPassword
            leftIcon="lock-closed-outline"
          />

          <Button
            title="Sign In to Dashboard"
            onPress={handleLogin}
            isLoading={isLoading}
            size="lg"
            className="mt-2"
          />
        </View>

        {/* Server Connection Config Modal / Section */}
        <View className="mt-8 pt-6 border-t border-slate-100 items-center">
          <TouchableOpacity
            onPress={() => setShowConfig(!showConfig)}
            className="flex-row items-center py-2"
          >
            <Ionicons name="settings-outline" size={15} color="#94A3B8" />
            <Text className="text-xs text-slate-400 font-medium ml-1.5">
              {showConfig ? "Hide API Server Settings" : "Configure Backend URL"}
            </Text>
          </TouchableOpacity>

          {showConfig && (
            <View className="w-full mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <Text className="text-xs font-semibold text-slate-700 mb-1">
                Backend API Endpoint
              </Text>
              <Text className="text-[11px] text-slate-500 mb-2">
                Use your computer's Wi-Fi IP (e.g. http://192.168.1.5:5000/api/v1) if testing on a real phone.
              </Text>
              <Input
                value={apiUrl}
                onChangeText={setApiUrl}
                placeholder="http://localhost:5000/api/v1"
                autoCapitalize="none"
              />
              <Button
                title="Save URL"
                variant="outline"
                size="sm"
                onPress={handleUpdateApiUrl}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
