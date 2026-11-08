import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "../../src/redux/hooks";
import {
  fetchDailyDeliveries,
  generateDailyDeliveries,
  updateDeliveryStatus,
  setSelectedDate,
  setStatusFilter,
} from "../../src/redux/slices/deliverySlice";
import { Delivery, DeliveryStatus } from "../../src/types";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { StatusBadge } from "../../src/components/ui/Badge";
import { Modal } from "../../src/components/common/Modal";
import { EmptyState } from "../../src/components/common/EmptyState";
import { LoadingSpinner } from "../../src/components/common/LoadingSpinner";

export default function DeliveriesScreen() {
  const dispatch = useAppDispatch();
  const { deliveries, pagination, isLoading, isSubmitting, selectedDate, statusFilter } =
    useAppSelector((state) => state.deliveries);

  const [refreshing, setRefreshing] = useState(false);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [selectedDelivery, setSelectedDeliveryState] = useState<Delivery | null>(null);
  const [pendingStatus, setPendingStatus] = useState<DeliveryStatus>("DELIVERED");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const loadData = useCallback(() => {
    dispatch(
      fetchDailyDeliveries({
        date: selectedDate,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        page: 1,
        limit: 50,
      })
    );
  }, [dispatch, selectedDate, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleGenerateDeliveries = async () => {
    const res = await dispatch(generateDailyDeliveries(selectedDate));
    if (generateDailyDeliveries.fulfilled.match(res)) {
      Alert.alert(
        "Batch Generation Complete",
        `Created ${res.payload.generatedCount} deliveries for ${res.payload.date} (${res.payload.skippedCount} skipped/existing).`
      );
      loadData();
    } else {
      Alert.alert("Notice", (res.payload as string) || "Failed to generate deliveries.");
    }
  };

  const handleQuickStatusChange = async (
    delivery: Delivery,
    newStatus: DeliveryStatus
  ) => {
    if (delivery.status === newStatus) return;

    const res = await dispatch(
      updateDeliveryStatus({
        id: delivery._id,
        status: newStatus,
      })
    );

    if (!updateDeliveryStatus.fulfilled.match(res)) {
      Alert.alert("Status Update Blocked", (res.payload as string) || "Failed to update delivery status.");
    }
  };

  const handleOpenNotesModal = (delivery: Delivery, targetStatus: DeliveryStatus) => {
    setSelectedDeliveryState(delivery);
    setPendingStatus(targetStatus);
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
      Alert.alert("Notice", (res.payload as string) || "Failed to update delivery status.");
    }
  };

  const changeDateByDays = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    dispatch(setSelectedDate(current.toISOString().slice(0, 10)));
  };

  const setDateToToday = () => {
    dispatch(setSelectedDate(new Date().toISOString().slice(0, 10)));
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="px-5 pt-3 pb-3 bg-white border-b border-slate-100 flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-bold text-slate-900 tracking-tight">
            Daily Deliveries
          </Text>
          <Text className="text-xs text-slate-500 font-medium">
            {pagination?.total ?? deliveries.length} records for {selectedDate}
          </Text>
        </View>

        <Button
          title="Generate Today"
          size="sm"
          icon={<Ionicons name="refresh" size={15} color="#FFFFFF" />}
          onPress={handleGenerateDeliveries}
          isLoading={isSubmitting}
        />
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

      {/* Status Filter Tabs */}
      <View className="py-2 px-4 bg-white border-b border-slate-100">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["ALL", "PENDING", "DELIVERED", "SKIPPED", "FAILED"] as (DeliveryStatus | "ALL")[]}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isSelected = statusFilter === item;
            return (
              <TouchableOpacity
                onPress={() => dispatch(setStatusFilter(item))}
                className={`py-1.5 px-3 rounded-full mr-2 ${
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

      {/* Deliveries List */}
      {isLoading && deliveries.length === 0 ? (
        <LoadingSpinner message="Fetching delivery list..." />
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#EA580C"]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="bicycle-outline"
              title="No Deliveries For This Date"
              description={`No deliveries found for ${selectedDate}. Tap 'Generate Today' to create records for active packages.`}
              actionTitle="Generate Records Now"
              onActionPress={handleGenerateDeliveries}
            />
          }
          renderItem={({ item }) => {
            const isDelivered = item.status === "DELIVERED";
            const isSkipped = item.status === "SKIPPED";
            const isFailed = item.status === "FAILED";

            return (
              <Card className="p-4 mb-3">
                <View className="flex-row justify-between items-start mb-1">
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-bold text-slate-900">
                      {item.customer?.name}
                    </Text>
                    <Text className="text-xs text-slate-500 font-medium">
                      {item.customer?.phone}
                    </Text>
                  </View>
                  <StatusBadge status={item.status} size="sm" />
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
            placeholder="e.g. Left with guard, delivered 10 mins early"
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
    </SafeAreaView>
  );
}
