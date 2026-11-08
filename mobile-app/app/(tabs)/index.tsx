import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "../../src/redux/hooks";
import { fetchDashboardSummary } from "../../src/redux/slices/dashboardSlice";
import { generateDailyDeliveries } from "../../src/redux/slices/deliverySlice";
import { generateMonthlyBills } from "../../src/redux/slices/billingSlice";
import {
  logoutAdmin,
  logoutAllAdmin,
  changeAdminPassword,
  updateAdminProfile,
} from "../../src/redux/slices/authSlice";
import { StatCard } from "../../src/components/ui/StatCard";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { Modal } from "../../src/components/common/Modal";
import { ConfirmDialog, DialogType } from "../../src/components/common/ConfirmDialog";
import { LoadingSpinner } from "../../src/components/common/LoadingSpinner";
import { APP_CONFIG } from "../../src/constants/app.constants";

export default function DashboardScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  const { summary, isLoading } = useAppSelector((state) => state.dashboard);
  const { admin } = useAppSelector((state) => state.auth);

  const [refreshing, setRefreshing] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);

  // Profile Edit State
  const [ownerName, setOwnerName] = useState(admin?.name || "");
  const [bizName, setBizName] = useState(admin?.businessName || "");
  const [bizPhone, setBizPhone] = useState(admin?.phone || "");
  const [bizAddress, setBizAddress] = useState(admin?.address || "");
  const [bizUpi, setBizUpi] = useState(admin?.upiId || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Custom Confirm Dialog State
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    type: DialogType;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
    onConfirm: () => void;
  }>({
    type: "info",
    title: "",
    message: "",
    onConfirm: () => setDialogVisible(false),
  });

  const showDialog = (
    title: string,
    message: string,
    type: DialogType = "info",
    onConfirm?: () => void,
    showCancel = false,
    confirmText = "OK"
  ) => {
    setDialogConfig({
      type,
      title,
      message,
      confirmText,
      showCancel,
      onConfirm: () => {
        setDialogVisible(false);
        if (onConfirm) onConfirm();
      },
    });
    setDialogVisible(true);
  };

  // Auto-reload on tab focus
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchDashboardSummary());
      if (admin) {
        setOwnerName(admin.name || "");
        setBizName(admin.businessName || "");
        setBizPhone(admin.phone || "");
        setBizAddress(admin.address || "");
        setBizUpi(admin.upiId || "");
      }
    }, [dispatch, admin])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchDashboardSummary());
    setRefreshing(false);
  };

  const handleGenerateTodayDeliveries = async () => {
    const res = await dispatch(generateDailyDeliveries(undefined));
    if (generateDailyDeliveries.fulfilled.match(res)) {
      showDialog(
        "Deliveries Generated",
        `Created ${res.payload.generatedCount} meal slots for today (${res.payload.skippedCount} already scheduled or skipped).`,
        "success"
      );
      dispatch(fetchDashboardSummary());
    } else {
      showDialog("Notice", (res.payload as string) || "Failed to generate deliveries", "warning");
    }
  };

  const handleGenerateMonthBills = async () => {
    const now = new Date();
    const res = await dispatch(
      generateMonthlyBills({ month: now.getMonth() + 1, year: now.getFullYear() })
    );
    if (generateMonthlyBills.fulfilled.match(res)) {
      showDialog(
        "Bills Generated",
        `Generated ${res.payload.billsGenerated} bills (${res.payload.billsUpdated} updated) for ${res.payload.month} ${res.payload.year}.`,
        "success"
      );
      dispatch(fetchDashboardSummary());
    } else {
      showDialog("Notice", (res.payload as string) || "Failed to generate monthly bills", "warning");
    }
  };

  const handleLogout = () => {
    showDialog(
      "Confirm Logout",
      "Are you sure you want to log out of your Tiffin Management account?",
      "danger",
      async () => {
        await dispatch(logoutAdmin());
        router.replace("/(auth)/login" as any);
      },
      true,
      "Log Out"
    );
  };

  const handleLogoutAll = () => {
    showDialog(
      "Logout Everywhere",
      "This will immediately terminate all active sessions across all devices.",
      "danger",
      async () => {
        await dispatch(logoutAllAdmin());
        router.replace("/(auth)/login" as any);
      },
      true,
      "Terminate All"
    );
  };

  const handleSaveProfile = async () => {
    if (!ownerName.trim()) {
      showDialog("Required Field", "Please enter owner name", "warning");
      return;
    }

    setIsUpdatingProfile(true);
    const res = await dispatch(
      updateAdminProfile({
        name: ownerName.trim(),
        businessName: bizName.trim(),
        phone: bizPhone.trim(),
        address: bizAddress.trim(),
        upiId: bizUpi.trim(),
      })
    );
    setIsUpdatingProfile(false);

    if (updateAdminProfile.fulfilled.match(res)) {
      setEditProfileModalVisible(false);
      showDialog("Success", "Business profile updated successfully! These details will appear on PDF invoices.", "success");
    } else {
      showDialog("Error", (res.payload as string) || "Failed to update profile", "danger");
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      showDialog("Incomplete", "Please fill in all password fields", "warning");
      return;
    }
    if (newPassword.length < 8) {
      showDialog("Security Notice", "New password must be at least 8 characters long", "warning");
      return;
    }

    setIsChangingPassword(true);
    const res = await dispatch(
      changeAdminPassword({ currentPassword, newPassword })
    );
    setIsChangingPassword(false);

    if (changeAdminPassword.fulfilled.match(res)) {
      setPasswordModalVisible(false);
      setProfileModalVisible(false);
      showDialog(
        "Password Changed",
        "Password updated successfully. Please login with your new credentials.",
        "success",
        () => router.replace("/(auth)/login" as any)
      );
    } else {
      showDialog("Failed", (res.payload as string) || "Unable to change password", "danger");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="px-5 pt-3 pb-4 bg-white border-b border-slate-100 flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
            {admin?.businessName || "Tiffin Distribution Services"}
          </Text>
          <Text className="text-xl font-bold text-slate-900 tracking-tight" numberOfLines={1}>
            {admin?.name ? `Hi, ${admin.name}` : "Dashboard Overview"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setProfileModalVisible(true)}
          className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center border border-orange-200"
          activeOpacity={0.8}
        >
          <Ionicons name="person" size={20} color="#EA580C" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#EA580C"]} />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
      >
        {isLoading && !summary && <LoadingSpinner message="Fetching dashboard..." />}

        {/* Quick Operations Row */}
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
          Quick Actions
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          <Button
            title="Generate Today's Deliveries"
            icon={<Ionicons name="bicycle-outline" size={16} color="#FFFFFF" />}
            onPress={handleGenerateTodayDeliveries}
            size="sm"
            className="flex-1 min-w-[150px]"
          />
          <Button
            title="Generate Monthly Bills"
            icon={<Ionicons name="receipt-outline" size={16} color="#FFFFFF" />}
            variant="secondary"
            onPress={handleGenerateMonthBills}
            size="sm"
            className="flex-1 min-w-[150px]"
          />
        </View>

        {/* Today's Deliveries Section */}
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
          Today's Deliveries Overview
        </Text>
        <View className="flex-row gap-3 mb-4">
          <StatCard
            title="Total Today"
            value={summary?.deliveriesToday.total ?? 0}
            icon="bicycle"
            color="orange"
            className="flex-1"
          />
          <StatCard
            title="Delivered"
            value={summary?.deliveriesToday.delivered ?? 0}
            icon="checkmark-done"
            color="emerald"
            className="flex-1"
          />
        </View>
        <View className="flex-row gap-3 mb-5">
          <StatCard
            title="Pending Meals"
            value={summary?.deliveriesToday.pending ?? 0}
            icon="time"
            color="amber"
            className="flex-1"
          />
          <StatCard
            title="Skipped / Off"
            value={summary?.deliveriesToday.skipped ?? 0}
            icon="close-circle"
            color="slate"
            className="flex-1"
          />
        </View>

        {/* Subscription & Customer Metrics */}
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
          Active Operations
        </Text>
        <View className="flex-row gap-3 mb-5">
          <StatCard
            title="Active Customers"
            value={summary?.customers.active ?? 0}
            subtitle={`${summary?.customers.total ?? 0} registered`}
            icon="people"
            color="indigo"
            className="flex-1"
          />
          <StatCard
            title="Active Packages"
            value={summary?.packages.active ?? 0}
            subtitle={`${summary?.packages.paused ?? 0} paused`}
            icon="cube"
            color="orange"
            className="flex-1"
          />
        </View>

        {/* Financial Highlights */}
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
          Current Month Financials
        </Text>
        <Card className="p-4 mb-4">
          <View className="flex-row justify-between items-center py-2 border-b border-slate-100">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-indigo-100 items-center justify-center mr-3">
                <Ionicons name="receipt-outline" size={18} color="#4F46E5" />
              </View>
              <Text className="text-sm font-medium text-slate-700">Total Billed</Text>
            </View>
            <Text className="text-base font-bold text-slate-900">
              {APP_CONFIG.CURRENCY_SYMBOL}
              {(summary?.monthlyFinancials.totalBilled ?? 0).toLocaleString()}
            </Text>
          </View>

          <View className="flex-row justify-between items-center py-2 border-b border-slate-100">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-emerald-100 items-center justify-center mr-3">
                <Ionicons name="cash-outline" size={18} color="#16A34A" />
              </View>
              <Text className="text-sm font-medium text-slate-700">Collected</Text>
            </View>
            <Text className="text-base font-bold text-emerald-600">
              {APP_CONFIG.CURRENCY_SYMBOL}
              {(summary?.monthlyFinancials.totalCollected ?? 0).toLocaleString()}
            </Text>
          </View>

          <View className="flex-row justify-between items-center pt-2">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-rose-100 items-center justify-center mr-3">
                <Ionicons name="hourglass-outline" size={18} color="#E11D48" />
              </View>
              <Text className="text-sm font-medium text-slate-700">Pending</Text>
            </View>
            <Text className="text-base font-bold text-rose-600">
              {APP_CONFIG.CURRENCY_SYMBOL}
              {(summary?.monthlyFinancials.totalPending ?? 0).toLocaleString()}
            </Text>
          </View>
        </Card>
      </ScrollView>

      {/* Admin Settings Overview Modal */}
      <Modal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        title="Admin Settings"
        subtitle={admin?.email || "admin@example.com"}
      >
        <View className="py-2">
          <View className="p-4 bg-orange-50 border border-orange-200 rounded-2xl mb-4">
            <Text className="text-xs text-orange-600 font-bold uppercase tracking-wider mb-1">
              {admin?.businessName || "Tiffin Distribution Services"}
            </Text>
            <Text className="text-lg font-extrabold text-slate-900">{admin?.name}</Text>
            <Text className="text-xs text-slate-600 mt-0.5">📞 {admin?.phone || "No phone added"}</Text>
            <Text className="text-xs text-slate-600">📍 {admin?.address || "No address configured"}</Text>
            {admin?.upiId ? <Text className="text-xs text-emerald-700 font-semibold mt-1">💳 UPI: {admin.upiId}</Text> : null}
          </View>

          <Button
            title="Edit Business Profile & Branding"
            variant="primary"
            icon={<Ionicons name="create-outline" size={18} color="#FFFFFF" />}
            onPress={() => {
              setProfileModalVisible(false);
              setEditProfileModalVisible(true);
            }}
            className="mb-3"
          />

          <Button
            title="Change Security Password"
            variant="outline"
            icon={<Ionicons name="key-outline" size={18} color="#334155" />}
            onPress={() => {
              setProfileModalVisible(false);
              setPasswordModalVisible(true);
            }}
            className="mb-3"
          />

          <Button
            title="Log Out (This Device)"
            variant="outline"
            icon={<Ionicons name="log-out-outline" size={18} color="#EA580C" />}
            onPress={handleLogout}
            className="mb-3"
          />

          <Button
            title="Log Out From All Devices"
            variant="danger"
            icon={<Ionicons name="power-outline" size={18} color="#FFFFFF" />}
            onPress={handleLogoutAll}
          />
        </View>
      </Modal>

      {/* Edit Business Profile Modal */}
      <Modal
        visible={editProfileModalVisible}
        onClose={() => setEditProfileModalVisible(false)}
        title="Edit Business Profile"
        subtitle="These details will brand the app dashboard and PDF receipts"
      >
        <View className="py-2">
          <Input
            label="Owner / Manager Name"
            placeholder="Ex. Rajesh Kumar"
            value={ownerName}
            onChangeText={setOwnerName}
          />
          <Input
            label="Tiffin Service Name"
            placeholder="Ex. Annapurna Tiffin Center"
            value={bizName}
            onChangeText={setBizName}
          />
          <Input
            label="Contact Phone"
            placeholder="Ex. 9876543210"
            value={bizPhone}
            onChangeText={setBizPhone}
            keyboardType="phone-pad"
          />
          <Input
            label="Service / Kitchen Address"
            placeholder="Ex. Sector 62, Noida"
            value={bizAddress}
            onChangeText={setBizAddress}
          />
          <Input
            label="UPI ID for Invoices (Optional)"
            placeholder="Ex. tiffin@okaxis"
            value={bizUpi}
            onChangeText={setBizUpi}
          />

          <Button
            title="Save Profile & Branding"
            onPress={handleSaveProfile}
            isLoading={isUpdatingProfile}
            size="lg"
            className="mt-2"
          />
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
        title="Change Password"
        subtitle="Ensure your new password is at least 8 characters long"
      >
        <View className="py-2">
          <Input
            label="Current Password"
            placeholder="Enter current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            isPassword
          />
          <Input
            label="New Password"
            placeholder="Enter new password (min 8 chars)"
            value={newPassword}
            onChangeText={setNewPassword}
            isPassword
          />
          <Button
            title="Update Password"
            onPress={handleChangePassword}
            isLoading={isChangingPassword}
            size="lg"
            className="mt-2"
          />
        </View>
      </Modal>

      {/* Custom High-Quality Confirm / Status Dialog */}
      <ConfirmDialog
        visible={dialogVisible}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        confirmText={dialogConfig.confirmText}
        cancelText={dialogConfig.cancelText}
        showCancel={dialogConfig.showCancel}
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogVisible(false)}
      />
    </SafeAreaView>
  );
}
