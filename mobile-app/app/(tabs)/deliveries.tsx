import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "../../src/redux/hooks";
import {
  fetchDailyDeliveries,
  generateDailyDeliveries,
  addExtraDelivery,
  updateDeliveryStatus,
  setSelectedDate,
  setStatusFilter,
  setMealTypeFilter,
} from "../../src/redux/slices/deliverySlice";
import { fetchCustomers } from "../../src/redux/slices/customerSlice";
import { Delivery, DeliveryStatus, MealType, Customer } from "../../src/types";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { StatusBadge } from "../../src/components/ui/Badge";
import { Modal } from "../../src/components/common/Modal";
import { ConfirmDialog, DialogType } from "../../src/components/common/ConfirmDialog";
import { EmptyState } from "../../src/components/common/EmptyState";
import { LoadingSpinner } from "../../src/components/common/LoadingSpinner";

export default function DeliveriesScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { deliveries, pagination, isLoading, isSubmitting, selectedDate, statusFilter, mealTypeFilter } =
    useAppSelector((state) => state.deliveries);
  const { customers } = useAppSelector((state) => state.customers);

  const [refreshing, setRefreshing] = useState(false);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [extraModalVisible, setExtraModalVisible] = useState(false);
  const [selectedDelivery, setSelectedDeliveryState] = useState<Delivery | null>(null);
  const [pendingStatus, setPendingStatus] = useState<DeliveryStatus>("DELIVERED");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // Extra Delivery Form State
  const [extraCustomerId, setExtraCustomerId] = useState("");
  const [extraQuantity, setExtraQuantity] = useState("1");
  const [extraMealType, setExtraMealType] = useState<"EXTRA" | "LUNCH" | "DINNER" | "BREAKFAST">("EXTRA");
  const [extraNotes, setExtraNotes] = useState("");

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

  const loadData = useCallback(() => {
    dispatch(
      fetchDailyDeliveries({
        date: selectedDate,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        mealType: mealTypeFilter === "ALL" ? undefined : mealTypeFilter,
        page: 1,
        limit: 50,
      })
    );
    dispatch(fetchCustomers({ page: 1, limit: 50, isActive: "true" }));
  }, [dispatch, selectedDate, statusFilter, mealTypeFilter]);

  // Auto-reload on tab focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(
      fetchDailyDeliveries({
        date: selectedDate,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        mealType: mealTypeFilter === "ALL" ? undefined : mealTypeFilter,
        page: 1,
        limit: 50,
      })
    );
    setRefreshing(false);
  };

  const changeDateByDays = (deltaDays: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + deltaDays);
    dispatch(setSelectedDate(current.toISOString().slice(0, 10)));
  };

  const setDateToToday = () => {
    dispatch(setSelectedDate(new Date().toISOString().slice(0, 10)));
  };

  const handleGenerateDeliveries = async () => {
    const res = await dispatch(generateDailyDeliveries(selectedDate));
    if (generateDailyDeliveries.fulfilled.match(res)) {
      showDialog(
        "Deliveries Generated",
        `Created ${res.payload.generatedCount} meal delivery slots for ${selectedDate} (${res.payload.skippedCount} already existed/skipped).`,
        "success"
      );
      loadData();
    } else {
      showDialog("Notice", (res.payload as string) || "Failed to generate deliveries", "danger");
    }
  };

  const handleQuickStatusChange = async (delivery: Delivery, newStatus: DeliveryStatus) => {
    if (delivery.status === newStatus) return;

    const res = await dispatch(
      updateDeliveryStatus({
        id: delivery._id,
        status: newStatus,
      })
    );

    if (!updateDeliveryStatus.fulfilled.match(res)) {
      showDialog("Action Failed", (res.payload as string) || "Could not update status", "danger");
    }
  };

  const handleOpenNotesModal = (delivery: Delivery, statusToSet: DeliveryStatus) => {
    setSelectedDeliveryState(delivery);
    setPendingStatus(statusToSet);
    setDeliveryNotes(delivery.notes || "");
    setNotesModalVisible(true);
  };

  const handleConfirmStatusWithNotes = async () => {
    if (!selectedDelivery) return;

    const res = await dispatch(
      updateDeliveryStatus({
        id: selectedDelivery._id,
        status: pendingStatus,
        notes: deliveryNotes.trim() || undefined,
      })
    );

    setNotesModalVisible(false);

    if (!updateDeliveryStatus.fulfilled.match(res)) {
      showDialog("Action Failed", (res.payload as string) || "Could not update status", "danger");
    }
  };

  const handleOpenExtraModal = () => {
    if (customers.length > 0) {
      setExtraCustomerId(customers[0]._id);
    }
    setExtraQuantity("1");
    setExtraMealType("EXTRA");
    setExtraNotes("");
    setExtraModalVisible(true);
  };

  const handleConfirmExtraDelivery = async () => {
    if (!extraCustomerId) {
      showDialog("Required", "Please select a customer", "warning");
      return;
    }

    const qty = Number(extraQuantity);
    if (!qty || qty <= 0) {
      showDialog("Invalid Quantity", "Extra quantity must be at least 1", "warning");
      return;
    }

    const res = await dispatch(
      addExtraDelivery({
        customerId: extraCustomerId,
        quantity: qty,
        date: selectedDate,
        mealType: extraMealType,
        notes: extraNotes.trim() || undefined,
      })
    );

    if (addExtraDelivery.fulfilled.match(res)) {
      setExtraModalVisible(false);
      showDialog("Extra Tiffin Logged", `Recorded ${qty} extra tiffin(s) for customer. Deducted from their remaining balance.`, "success");
      loadData();
    } else {
      showDialog("Action Blocked", (res.payload as string) || "Cannot log extra delivery", "danger");
    }
  };

  const displayedDeliveries = deliveries.filter((item) => {
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
    if (mealTypeFilter !== "ALL") {
      const itemMeal = (item.mealType || "LUNCH").toUpperCase();
      if (itemMeal !== mealTypeFilter) return false;
    }
    return true;
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="px-5 pt-3 pb-3 bg-white border-b border-slate-100 flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-xl font-bold text-slate-900 tracking-tight">
            Daily Deliveries
          </Text>
          <Text className="text-xs text-slate-500 font-medium">
            {displayedDeliveries.length} records • {selectedDate}
          </Text>
        </View>

        <View className="flex-row gap-2">
          <Button
            title="+ Extra"
            variant="outline"
            size="sm"
            onPress={handleOpenExtraModal}
          />
          <Button
            title="Generate"
            size="sm"
            icon={<Ionicons name="refresh" size={15} color="#FFFFFF" />}
            onPress={handleGenerateDeliveries}
            isLoading={isSubmitting}
          />
        </View>
      </View>

      {/* Date Navigation Bar */}
      <View className="bg-white px-4 py-2.5 border-b border-slate-100 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => changeDateByDays(-1)}
          className="p-1.5 rounded-lg bg-slate-100"
        >
          <Ionicons name="chevron-back" size={18} color="#334155" />
        </TouchableOpacity>

        <TouchableOpacity onPress={setDateToToday} className="items-center">
          <Text className="text-sm font-bold text-slate-800">{selectedDate}</Text>
          <Text className="text-[10px] text-orange-600 font-semibold uppercase">
            {selectedDate === new Date().toISOString().slice(0, 10) ? "Today" : "Tap for Today"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => changeDateByDays(1)}
          className="p-1.5 rounded-lg bg-slate-100"
        >
          <Ionicons name="chevron-forward" size={18} color="#334155" />
        </TouchableOpacity>
      </View>

      {/* Combined Filters: Status & Meal Time */}
      <View className="py-2.5 px-4 bg-white border-b border-slate-100">
        {/* Row 1: Status Filter */}
        <View className="flex-row items-center mb-2">
          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2 w-14">
            Status:
          </Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={true}
            data={["ALL", "PENDING", "DELIVERED", "SKIPPED", "FAILED"] as (DeliveryStatus | "ALL")[]}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected = statusFilter === item;
              return (
                <TouchableOpacity
                  onPress={() => dispatch(setStatusFilter(item))}
                  className={`py-1 px-3 rounded-full mr-1.5 ${
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

        {/* Row 2: Meal Type Filter (Breakfast, Lunch, Dinner, Extra) */}
        <View className="flex-row items-center">
          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2 w-12">
            Meal:
          </Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { label: "ALL MEALS", value: "ALL" },
              { label: "🍳 Breakfast", value: "BREAKFAST" },
              { label: "🍱 Lunch", value: "LUNCH" },
              { label: "🍲 Dinner", value: "DINNER" },
              { label: "➕ Extra", value: "EXTRA" },
            ] as { label: string; value: MealType | "ALL" }[]}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => {
              const isSelected = mealTypeFilter === item.value;
              return (
                <TouchableOpacity
                  onPress={() => dispatch(setMealTypeFilter(item.value))}
                  className={`py-1 px-2.5 rounded-full mr-1.5 border ${
                    isSelected
                      ? "bg-amber-600 border-amber-600"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? "text-white" : "text-slate-600"
                    }`}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>

      {/* Deliveries List */}
      {isLoading && displayedDeliveries.length === 0 ? (
        <LoadingSpinner message="Fetching delivery list..." />
      ) : (
        <FlatList
          data={displayedDeliveries}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#EA580C"]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="bicycle-outline"
              title="No Deliveries Found"
              description={`No deliveries matching filters (Status: ${statusFilter}, Meal: ${mealTypeFilter}) for ${selectedDate}.`}
              actionTitle="Generate Records Now"
              onActionPress={handleGenerateDeliveries}
            />
          }
          renderItem={({ item }) => {
            const isDelivered = item.status === "DELIVERED";
            const isSkipped = item.status === "SKIPPED";
            const isFailed = item.status === "FAILED";

            const meal = (item.mealType || "LUNCH").toUpperCase();
            const isBreakfast = meal === "BREAKFAST";
            const isDinner = meal === "DINNER";
            const isExtra = meal === "EXTRA";
            const badgeClass = isBreakfast
              ? "bg-amber-100 border-amber-300"
              : isDinner
              ? "bg-indigo-100 border-indigo-300"
              : isExtra
              ? "bg-emerald-100 border-emerald-300"
              : "bg-orange-100 border-orange-300";
            const textClass = isBreakfast
              ? "text-amber-900"
              : isDinner
              ? "text-indigo-950"
              : isExtra
              ? "text-emerald-950"
              : "text-orange-950";
            const iconName = isBreakfast
              ? "sunny-outline"
              : isDinner
              ? "moon-outline"
              : isExtra
              ? "add-circle-outline"
              : "restaurant-outline";

            return (
              <Card className="p-4 mb-3">
                <View className="flex-row justify-between items-start mb-1.5">
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-bold text-slate-900">
                      {item.customer?.name}
                    </Text>
                    <View className="flex-row items-center mt-0.5">
                      <Ionicons name="call-outline" size={12} color="#64748B" />
                      <Text className="text-xs text-slate-600 ml-1 font-medium">
                        {item.customer?.phone}
                      </Text>
                    </View>
                  </View>

                  <View className="items-end">
                    <StatusBadge status={item.status} size="sm" />
                    <View className={`flex-row items-center border px-2 py-0.5 rounded-md mt-1 ${badgeClass}`}>
                      <Ionicons name={iconName} size={10} color="#334155" style={{ marginRight: 3 }} />
                      <Text className={`text-[10px] font-bold ${textClass}`}>
                        {meal} {item.quantity && item.quantity > 1 ? `(${item.quantity}x)` : ""}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Delivery Address */}
                <View className="flex-row items-start my-1.5">
                  <Ionicons name="location-outline" size={14} color="#94A3B8" style={{ marginTop: 1 }} />
                  <Text className="text-xs text-slate-600 ml-1.5 flex-1">
                    {item.customer?.address}
                  </Text>
                </View>

                {/* Notes if available */}
                {item.notes && (
                  <View className="p-2 bg-slate-50 rounded-lg my-1 flex-row items-center">
                    <Ionicons name="document-text-outline" size={13} color="#64748B" />
                    <Text className="text-[11px] text-slate-600 ml-1.5 flex-1">
                      {item.notes}
                    </Text>
                  </View>
                )}

                {/* Status Action Buttons */}
                <View className="flex-row items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                  <TouchableOpacity
                    onPress={() => handleQuickStatusChange(item, "DELIVERED")}
                    className={`flex-1 py-2 rounded-xl flex-row items-center justify-center ${
                      isDelivered ? "bg-emerald-600" : "bg-emerald-50 active:bg-emerald-100 border border-emerald-200"
                    }`}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={15}
                      color={isDelivered ? "#FFFFFF" : "#16A34A"}
                    />
                    <Text
                      className={`text-xs font-semibold ml-1.5 ${
                        isDelivered ? "text-white" : "text-emerald-700"
                      }`}
                    >
                      Delivered
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleQuickStatusChange(item, "SKIPPED")}
                    className={`flex-1 py-2 rounded-xl flex-row items-center justify-center ${
                      isSkipped ? "bg-amber-500" : "bg-amber-50 active:bg-amber-100 border border-amber-200"
                    }`}
                  >
                    <Ionicons
                      name="play-skip-forward"
                      size={14}
                      color={isSkipped ? "#FFFFFF" : "#D97706"}
                    />
                    <Text
                      className={`text-xs font-semibold ml-1.5 ${
                        isSkipped ? "text-white" : "text-amber-800"
                      }`}
                    >
                      Skip
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleQuickStatusChange(item, "FAILED")}
                    className={`flex-1 py-2 rounded-xl flex-row items-center justify-center ${
                      isFailed ? "bg-rose-600" : "bg-rose-50 active:bg-rose-100 border border-rose-200"
                    }`}
                  >
                    <Ionicons
                      name="close-circle"
                      size={15}
                      color={isFailed ? "#FFFFFF" : "#E11D48"}
                    />
                    <Text
                      className={`text-xs font-semibold ml-1.5 ${
                        isFailed ? "text-white" : "text-rose-700"
                      }`}
                    >
                      Failed
                    </Text>
                  </TouchableOpacity>

                  {/* Add Notes Button */}
                  <TouchableOpacity
                    onPress={() => handleOpenNotesModal(item, item.status)}
                    className="p-2 rounded-xl bg-slate-100"
                  >
                    <Ionicons name="create-outline" size={16} color="#475569" />
                  </TouchableOpacity>
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Extra Tiffin On-Demand Modal */}
      <Modal
        visible={extraModalVisible}
        onClose={() => setExtraModalVisible(false)}
        title="Add Extra Tiffin"
        subtitle="Log an extra meal for a customer on demand (deducts from package)"
      >
        <View className="py-2">
          <Text className="text-xs font-semibold text-slate-700 mb-1.5">
            Select Customer *
          </Text>
          <View className="bg-slate-50 border border-slate-200 rounded-xl p-2 mb-3 max-h-36">
            <ScrollView nestedScrollEnabled>
              {customers.map((c: Customer) => (
                <TouchableOpacity
                  key={c._id}
                  onPress={() => setExtraCustomerId(c._id)}
                  className={`p-2.5 rounded-lg mb-1 flex-row justify-between items-center ${
                    extraCustomerId === c._id ? "bg-orange-100" : "bg-white"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      extraCustomerId === c._id ? "text-orange-950" : "text-slate-800"
                    }`}
                  >
                    {c.name} ({c.phone})
                  </Text>
                  {extraCustomerId === c._id && (
                    <Ionicons name="checkmark-circle" size={16} color="#EA580C" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Input
            label="Extra Quantity *"
            placeholder="1"
            value={extraQuantity}
            onChangeText={setExtraQuantity}
            keyboardType="numeric"
          />

          <Input
            label="Delivery Remarks / Guest Info"
            placeholder="Ex. Extra dinner for visiting friend"
            value={extraNotes}
            onChangeText={setExtraNotes}
          />

          <Button
            title="Log Extra Tiffin & Deliver"
            onPress={handleConfirmExtraDelivery}
            isLoading={isSubmitting}
            size="lg"
            className="mt-2"
          />
        </View>
      </Modal>

      {/* Notes Modal */}
      <Modal
        visible={notesModalVisible}
        onClose={() => setNotesModalVisible(false)}
        title="Delivery Note"
        subtitle={`Note for ${selectedDelivery?.customer?.name}`}
      >
        <View className="py-2">
          <Input
            label="Delivery Remarks"
            placeholder="Ex. Left with guard, delivered 10 mins early"
            value={deliveryNotes}
            onChangeText={setDeliveryNotes}
            multiline
            numberOfLines={3}
          />

          <Button
            title="Save Note & Update"
            onPress={handleConfirmStatusWithNotes}
            size="lg"
            className="mt-2"
          />
        </View>
      </Modal>

      {/* Custom Confirm Dialog */}
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
