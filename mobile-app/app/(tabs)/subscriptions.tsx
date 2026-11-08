import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "../../src/redux/hooks";
import {
  fetchSubscriptions,
  createSubscription,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  setStatusFilter,
} from "../../src/redux/slices/subscriptionSlice";
import { fetchCustomers } from "../../src/redux/slices/customerSlice";
import { Subscription, SubscriptionStatus, Customer } from "../../src/types";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { StatusBadge } from "../../src/components/ui/Badge";
import { Modal } from "../../src/components/common/Modal";
import { EmptyState } from "../../src/components/common/EmptyState";
import { LoadingSpinner } from "../../src/components/common/LoadingSpinner";
import { APP_CONFIG } from "../../src/constants/app.constants";

export default function SubscriptionsScreen() {
  const dispatch = useAppDispatch();
  const { subscriptions, pagination, isLoading, isSubmitting, statusFilter } =
    useAppSelector((state) => state.subscriptions);
  const { customers } = useAppSelector((state) => state.customers);

  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [pauseModalVisible, setPauseModalVisible] = useState(false);
  const [resumeModalVisible, setResumeModalVisible] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  // Create Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [pricePerTiffin, setPricePerTiffin] = useState("60");
  const [totalTiffins, setTotalTiffins] = useState("60");
  const [notes, setNotes] = useState("");

  // Pause Form State
  const [pauseReason, setPauseReason] = useState("");
  const [expectedResumeDate, setExpectedResumeDate] = useState("");

  const loadData = useCallback(() => {
    dispatch(
      fetchSubscriptions({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        page: 1,
        limit: 50,
      })
    );
    dispatch(fetchCustomers({ page: 1, limit: 100, isActive: "true" }));
  }, [dispatch, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOpenCreateModal = () => {
    if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0]._id);
    }
    setPricePerTiffin("60");
    setTotalTiffins("60");
    setNotes("");
    setCreateModalVisible(true);
  };

  const handleCreateSubscription = async () => {
    if (!selectedCustomerId) {
      Alert.alert("Select Customer", "Please select a customer for this package.");
      return;
    }

    const price = Number(pricePerTiffin);
    const quantity = Number(totalTiffins);

    if (isNaN(price) || price <= 0 || isNaN(quantity) || quantity <= 0) {
      Alert.alert("Invalid Input", "Price and quantity must be positive whole numbers.");
      return;
    }

    const res = await dispatch(
      createSubscription({
        customerId: selectedCustomerId,
        pricePerTiffin: price,
        totalTiffins: quantity,
        notes: notes.trim() || undefined,
      })
    );

    if (createSubscription.fulfilled.match(res)) {
      setCreateModalVisible(false);
      Alert.alert("Success", "Subscription package created successfully.");
    } else {
      Alert.alert("Notice", (res.payload as string) || "Failed to create package.");
    }
  };

  const handleOpenPauseModal = (sub: Subscription) => {
    setSelectedSub(sub);
    setPauseReason("");
    setExpectedResumeDate("");
    setPauseModalVisible(true);
  };

  const handleConfirmPause = async () => {
    if (!selectedSub) return;

    const res = await dispatch(
      pauseSubscription({
        id: selectedSub._id,
        data: {
          reason: pauseReason.trim() || undefined,
          expectedResumeDate: expectedResumeDate.trim() || undefined,
        },
      })
    );

    if (pauseSubscription.fulfilled.match(res)) {
      setPauseModalVisible(false);
      Alert.alert("Success", "Package paused successfully.");
    } else {
      Alert.alert("Notice", (res.payload as string) || "Failed to pause package.");
    }
  };

  const handleOpenResumeModal = (sub: Subscription) => {
    setSelectedSub(sub);
    setResumeModalVisible(true);
  };

  const handleConfirmResume = async () => {
    if (!selectedSub) return;

    const res = await dispatch(
      resumeSubscription({
        id: selectedSub._id,
        data: {},
      })
    );

    if (resumeSubscription.fulfilled.match(res)) {
      setResumeModalVisible(false);
      Alert.alert("Success", "Package resumed successfully.");
    } else {
      Alert.alert("Notice", (res.payload as string) || "Failed to resume package.");
    }
  };

  const handleCancel = (sub: Subscription) => {
    Alert.alert(
      "Cancel Package",
      `Are you sure you want to cancel this package for ${sub.customer?.name}? This action cannot be undone.`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            const res = await dispatch(cancelSubscription(sub._id));
            if (cancelSubscription.fulfilled.match(res)) {
              Alert.alert("Success", "Package cancelled.");
            } else {
              Alert.alert("Notice", (res.payload as string) || "Failed to cancel package.");
            }
          },
        },
      ]
    );
  };

  const calculatedTotal = (Number(pricePerTiffin) || 0) * (Number(totalTiffins) || 0);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-5 pt-3 pb-3 bg-white border-b border-slate-100 flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-bold text-slate-900 tracking-tight">
            Meal Packages
          </Text>
          <Text className="text-xs text-slate-500 font-medium">
            {pagination?.total ?? subscriptions.length} packages listed
          </Text>
        </View>
        <Button
          title="New Package"
          size="sm"
          icon={<Ionicons name="add-circle" size={16} color="#FFFFFF" />}
          onPress={handleOpenCreateModal}
        />
      </View>

      {/* Status Filter Tabs */}
      <View className="py-2.5 px-4 bg-white border-b border-slate-100">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["ALL", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"] as (SubscriptionStatus | "ALL")[]}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isSelected = statusFilter === item;
            return (
              <TouchableOpacity
                onPress={() => dispatch(setStatusFilter(item))}
                className={`py-1.5 px-3.5 rounded-full mr-2 ${
                  isSelected ? "bg-orange-600" : "bg-slate-100"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isSelected ? "text-white" : "text-slate-600"
                  }`}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Subscription List */}
      {isLoading && subscriptions.length === 0 ? (
        <LoadingSpinner message="Loading subscriptions..." />
      ) : (
        <FlatList
          data={subscriptions}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#EA580C"]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="cube-outline"
              title="No Packages Found"
              description="No subscription packages match the selected filter."
              actionTitle="Create New Package"
              onActionPress={handleOpenCreateModal}
            />
          }
          renderItem={({ item }) => {
            const progress =
              item.totalTiffins > 0
                ? Math.min(100, Math.round((item.deliveredQuantity / item.totalTiffins) * 100))
                : 0;

            return (
              <Card className="p-4 mb-3">
                {/* Header */}
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-bold text-slate-900">
                      {item.customer?.name || "Customer"}
                    </Text>
                    <Text className="text-xs text-slate-500 font-medium">
                      {item.customer?.phone}
                    </Text>
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>

                {/* Balance Progress Box */}
                <View className="p-3 bg-slate-50 rounded-xl my-2">
                  <View className="flex-row justify-between items-baseline mb-1">
                    <Text className="text-xs font-bold text-slate-600 uppercase">
                      Remaining Balance
                    </Text>
                    <Text className="text-lg font-extrabold text-orange-600">
                      {item.remainingQuantity}{" "}
                      <Text className="text-xs font-normal text-slate-500">
                        / {item.totalTiffins} meals
                      </Text>
                    </Text>
                  </View>

                  {/* Visual Progress Bar */}
                  <View className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mt-1">
                    <View
                      className="h-full bg-orange-500 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </View>

                  <View className="flex-row justify-between items-center mt-2 pt-1 border-t border-slate-100">
                    <Text className="text-xs text-slate-500">
                      Delivered: <Text className="font-semibold text-slate-700">{item.deliveredQuantity}</Text>
                    </Text>
                    <Text className="text-xs text-slate-500">
                      Rate: <Text className="font-semibold text-slate-700">₹{item.pricePerTiffin}/meal</Text>
                    </Text>
                    <Text className="text-xs text-slate-500">
                      Total: <Text className="font-semibold text-slate-700">₹{item.totalAmount}</Text>
                    </Text>
                  </View>
                </View>

                {/* Pause Info if paused */}
                {item.status === "PAUSED" && item.pauseHistory?.length > 0 && (
                  <View className="p-2 bg-blue-50 border border-blue-100 rounded-lg mb-2 flex-row items-center">
                    <Ionicons name="pause-circle" size={16} color="#2563EB" />
                    <Text className="text-xs text-blue-800 ml-1.5 flex-1">
                      Paused on {new Date(item.pauseHistory[item.pauseHistory.length - 1].pausedAt).toLocaleDateString()}
                      {item.pauseHistory[item.pauseHistory.length - 1].reason
                        ? ` • Reason: ${item.pauseHistory[item.pauseHistory.length - 1].reason}`
                        : ""}
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View className="flex-row gap-2 mt-1">
                  {item.status === "ACTIVE" && (
                    <Button
                      title="Pause"
                      variant="outline"
                      size="sm"
                      icon={<Ionicons name="pause" size={14} color="#EA580C" />}
                      className="flex-1"
                      onPress={() => handleOpenPauseModal(item)}
                    />
                  )}

                  {item.status === "PAUSED" && (
                    <Button
                      title="Resume"
                      variant="secondary"
                      size="sm"
                      icon={<Ionicons name="play" size={14} color="#FFFFFF" />}
                      className="flex-1"
                      onPress={() => handleOpenResumeModal(item)}
                    />
                  )}

                  {(item.status === "ACTIVE" || item.status === "PAUSED") && (
                    <Button
                      title="Cancel"
                      variant="ghost"
                      size="sm"
                      className="px-3"
                      onPress={() => handleCancel(item)}
                    />
                  )}
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Create Subscription Modal */}
      <Modal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        title="Create Meal Package"
        subtitle="Allocate prepaid meals to a customer"
      >
        <View className="py-2">
          {/* Customer Selector */}
          <Text className="text-sm font-medium text-slate-700 mb-1.5">
            Select Customer *
          </Text>
          <View className="bg-slate-50 border border-slate-200 rounded-xl p-2 mb-4 max-h-40">
            <ScrollView nestedScrollEnabled>
              {customers.map((c: Customer) => (
                <TouchableOpacity
                  key={c._id}
                  onPress={() => setSelectedCustomerId(c._id)}
                  className={`p-2.5 rounded-lg mb-1 flex-row justify-between items-center ${
                    selectedCustomerId === c._id ? "bg-orange-100" : "bg-white"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      selectedCustomerId === c._id ? "text-orange-950" : "text-slate-800"
                    }`}
                  >
                    {c.name} ({c.phone})
                  </Text>
                  {selectedCustomerId === c._id && (
                    <Ionicons name="checkmark-circle" size={16} color="#EA580C" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Input
            label="Price per Tiffin (₹) *"
            value={pricePerTiffin}
            onChangeText={setPricePerTiffin}
            keyboardType="numeric"
            placeholder="60"
          />

          <Input
            label="Total Tiffins in Package *"
            value={totalTiffins}
            onChangeText={setTotalTiffins}
            keyboardType="numeric"
            placeholder="60"
          />

          {/* Computed Amount Display */}
          <View className="p-3 bg-orange-50 border border-orange-100 rounded-xl mb-4 flex-row justify-between items-center">
            <Text className="text-xs font-medium text-orange-900">
              Total Package Cost:
            </Text>
            <Text className="text-base font-bold text-orange-600">
              {APP_CONFIG.CURRENCY_SYMBOL}
              {calculatedTotal.toLocaleString()}
            </Text>
          </View>

          <Input
            label="Notes (Optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Special instructions or batch info"
          />

          <Button
            title="Create Package"
            onPress={handleCreateSubscription}
            isLoading={isSubmitting}
            size="lg"
            className="mt-2"
          />
        </View>
      </Modal>

      {/* Pause Modal */}
      <Modal
        visible={pauseModalVisible}
        onClose={() => setPauseModalVisible(false)}
        title="Pause Package"
        subtitle={`Temporary leave for ${selectedSub?.customer?.name}`}
      >
        <View className="py-2">
          <Text className="text-xs text-slate-600 mb-3">
            Meals will not be consumed during pause. The remaining {selectedSub?.remainingQuantity} meals will be preserved until resumed.
          </Text>

          <Input
            label="Reason for Pause (Optional)"
            placeholder="e.g. Going home for vacation"
            value={pauseReason}
            onChangeText={setPauseReason}
          />

          <Input
            label="Expected Resume Date (Optional)"
            placeholder="YYYY-MM-DD"
            value={expectedResumeDate}
            onChangeText={setExpectedResumeDate}
          />

          <Button
            title="Confirm Pause"
            onPress={handleConfirmPause}
            isLoading={isSubmitting}
            size="lg"
            className="mt-2"
          />
        </View>
      </Modal>

      {/* Resume Modal */}
      <Modal
        visible={resumeModalVisible}
        onClose={() => setResumeModalVisible(false)}
        title="Resume Package"
        subtitle={`Resume daily meal service for ${selectedSub?.customer?.name}`}
      >
        <View className="py-2">
          <Text className="text-xs text-slate-600 mb-4">
            Resuming this package will restore daily delivery eligibility for {selectedSub?.customer?.name}. Remaining balance: {selectedSub?.remainingQuantity} meals.
          </Text>

          <Button
            title="Confirm Resume Service"
            onPress={handleConfirmResume}
            isLoading={isSubmitting}
            size="lg"
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
