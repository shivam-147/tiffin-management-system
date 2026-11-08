import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "../../src/redux/hooks";
import { fetchDashboardSummary } from "../../src/redux/slices/dashboardSlice";
import { generateDailyDeliveries } from "../../src/redux/slices/deliverySlice";
import { generateMonthlyBills } from "../../src/redux/slices/billingSlice";
import {
  logoutAdmin,
  logoutAllAdmin,
  changeAdminPassword,
} from "../../src/redux/slices/authSlice";
import { StatCard } from "../../src/components/ui/StatCard";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { Modal } from "../../src/components/common/Modal";
import { LoadingSpinner } from "../../src/components/common/LoadingSpinner";
import { APP_CONFIG } from "../../src/constants/app.constants";

export default function DashboardScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { summary, isLoading } = useAppSelector((state) => state.dashboard);
  const { admin } = useAppSelector((state) => state.auth);

  const [refreshing, setRefreshing] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const loadData = useCallback(() => {
    dispatch(fetchDashboardSummary());
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchDashboardSummary());
    setRefreshing(false);
  };

  const handleGenerateTodayDeliveries = async () => {
    const res = await dispatch(generateDailyDeliveries(undefined));
    if (generateDailyDeliveries.fulfilled.match(res)) {
      Alert.alert(
        "Deliveries Generated",
        `Created ${res.payload.generatedCount} deliveries for active packages (${res.payload.skippedCount} already existed/skipped).`
      );
      dispatch(fetchDashboardSummary());
    } else {
      Alert.alert("Notice", (res.payload as string) || "Failed to generate deliveries");
    }
  };

  const handleGenerateMonthBills = async () => {
    const now = new Date();
    const res = await dispatch(
      generateMonthlyBills({ month: now.getMonth() + 1, year: now.getFullYear() })
    );
    if (generateMonthlyBills.fulfilled.match(res)) {
      Alert.alert(
        "Bills Generated",
        `Generated ${res.payload.billsGenerated} bills (${res.payload.billsUpdated} updated, ${res.payload.billsSkipped} skipped) for ${res.payload.month} ${res.payload.year}.`
      );
      dispatch(fetchDashboardSummary());
    } else {
      Alert.alert("Notice", (res.payload as string) || "Failed to generate monthly bills");
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out of TMS?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await dispatch(logoutAdmin());
          router.replace("/(auth)/login" as any);
        },
      },
    ]);
  };

  const handleLogoutAll = () => {
    Alert.alert(
      "Logout From All Devices",
      "This will terminate all active admin sessions on all devices.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout Everywhere",
          style: "destructive",
          onPress: async () => {
            await dispatch(logoutAllAdmin());
            router.replace("/(auth)/login" as any);
          },
        },
      ]
    );
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert("Error", "Please fill in all password fields");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Error", "New password must be at least 8 characters long");
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
      Alert.alert(
        "Success",
        "Password changed successfully. Please log in with your new password.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/(auth)/login" as any),
          },
        ]
      );
    } else {
      Alert.alert("Failed", (res.payload as string) || "Unable to change password");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-5 pt-3 pb-4 bg-white border-b border-slate-100 flex-row items-center justify-between">
        <View>
          <Text className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
            {summary?.date ? new Date(summary.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Today"}
          </Text>
          <Text className="text-xl font-bold text-slate-900 tracking-tight">
            Hi, {admin?.name || "Admin"}
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
        contentContainerStyle={{ padding: 16 }}
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
          Today's Deliveries
        </Text>
        <View className="flex-row mb-1">
          <StatCard
            title="Pending"
            value={summary?.deliveriesToday.pending ?? 0}
            icon="time-outline"
            color="amber"
          />
          <StatCard
            title="Delivered"
            value={summary?.deliveriesToday.delivered ?? 0}
            icon="checkmark-circle-outline"
            color="green"
          />
        </View>
        <View className="flex-row mb-4">
          <StatCard
            title="Skipped"
            value={summary?.deliveriesToday.skipped ?? 0}
            icon="play-skip-forward-outline"
            color="purple"
          />
          <StatCard
            title="Failed"
            value={summary?.deliveriesToday.failed ?? 0}
            icon="close-circle-outline"
            color="rose"
          />
        </View>

        {/* Remaining Tiffins Hero Banner */}
        <Card className="bg-gradient-to-r from-orange-600 to-amber-600 border-0 p-5 mb-4 shadow-md shadow-orange-500/20">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xs font-semibold text-orange-800 uppercase tracking-wider">
                Active Package Inventory
              </Text>
              <Text className="text-3xl font-extrabold text-orange-900 mt-1">
                {summary?.packages.totalRemainingTiffins ?? 0}
              </Text>
              <Text className="text-xs text-orange-800 mt-1">
                Remaining meals to be delivered across active customers
              </Text>
            </View>
            <View className="w-14 h-14 rounded-2xl bg-white/20 items-center justify-center">
              <Ionicons name="fast-food-outline" size={32} color="#9A3412" />
            </View>
          </View>
        </Card>

        {/* Meal Packages Breakdown */}
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
          Meal Packages & Customers
        </Text>
        <View className="flex-row mb-4">
          <StatCard
            title="Active Packages"
            value={summary?.packages.active ?? 0}
            icon="cube-outline"
            color="orange"
          />
          <StatCard
            title="Paused Packages"
            value={summary?.packages.paused ?? 0}
            icon="pause-circle-outline"
            color="blue"
          />
          <StatCard
            title="Active Customers"
            value={summary?.customers.active ?? 0}
            icon="people-outline"
            color="green"
          />
        </View>

        {/* Monthly Financials */}
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
          Monthly Financials ({summary?.monthlyFinancials.period || "Current Month"})
        </Text>
        <Card className="p-4">
          <View className="flex-row justify-between items-center py-2 border-b border-slate-100">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center mr-3">
                <Ionicons name="document-text-outline" size={18} color="#475569" />
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

      {/* Admin Profile Modal */}
      <Modal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        title="Admin Settings"
        subtitle={admin?.email || "admin@example.com"}
      >
        <View className="py-2">
          <View className="p-3 bg-slate-50 rounded-xl mb-4">
            <Text className="text-xs text-slate-500 font-medium">Logged in Administrator</Text>
            <Text className="text-base font-bold text-slate-900">{admin?.name}</Text>
            <Text className="text-xs text-slate-600">{admin?.email}</Text>
          </View>

          <Button
            title="Change Password"
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
    </SafeAreaView>
  );
}
