import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "../../src/redux/hooks";
import { fetchPackages, createPackage, deactivatePackage } from "../../src/redux/slices/packageSlice";
import { PackageCatalog } from "../../src/types";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { Modal } from "../../src/components/common/Modal";
import { ConfirmDialog, DialogType } from "../../src/components/common/ConfirmDialog";
import { EmptyState } from "../../src/components/common/EmptyState";
import { LoadingSpinner } from "../../src/components/common/LoadingSpinner";
import { APP_CONFIG } from "../../src/constants/app.constants";

export default function PackagesScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { packages, isLoading, isSubmitting } = useAppSelector((state) => state.packages);

  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // Package Catalog Creation State
  const [catName, setCatName] = useState("");
  const [catTiffins, setCatTiffins] = useState("60");
  const [catPrice, setCatPrice] = useState("60");
  const [catMealsPerDay, setCatMealsPerDay] = useState<1 | 2 | 3>(1);

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
    dispatch(fetchPackages(true));
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchPackages(true));
    setRefreshing(false);
  };

  const handleOpenCreateModal = () => {
    // Reset to clean default values every time the modal opens
    setCatName("");
    setCatTiffins("60");
    setCatPrice("60");
    setCatMealsPerDay(1);
    setCreateModalVisible(true);
  };

  const handleCreatePackageCatalog = async () => {
    if (!catName.trim()) {
      showDialog("Required", "Please enter package plan name", "warning");
      return;
    }

    const tiffins = Number(catTiffins);
    const price = Number(catPrice);
    if (!tiffins || tiffins <= 0 || !price || price <= 0) {
      showDialog("Invalid Inputs", "Tiffins and price must be greater than zero", "warning");
      return;
    }

    const res = await dispatch(
      createPackage({
        name: catName.trim(),
        totalTiffins: tiffins,
        pricePerTiffin: price,
        mealsPerDay: catMealsPerDay,
        mealTypes:
          catMealsPerDay === 1
            ? ["LUNCH"]
            : catMealsPerDay === 2
            ? ["LUNCH", "DINNER"]
            : ["BREAKFAST", "LUNCH", "DINNER"],
      })
    );

    if (createPackage.fulfilled.match(res)) {
      setCreateModalVisible(false);
      setCatName("");
      showDialog("Success", "New reusable package plan created successfully!", "success");
      dispatch(fetchPackages(true));
    } else {
      showDialog("Error", (res.payload as string) || "Failed to create package plan", "danger");
    }
  };

  const handleDeactivatePlan = (pkg: PackageCatalog) => {
    showDialog(
      "Remove Plan",
      `Are you sure you want to remove the plan "${pkg.name}"? Existing customer subscriptions using this plan will remain unaffected.`,
      "danger",
      async () => {
        const res = await dispatch(deactivatePackage(pkg._id));
        if (deactivatePackage.fulfilled.match(res)) {
          showDialog("Plan Removed", `Plan "${pkg.name}" has been removed from catalog.`, "success");
          loadData();
        } else {
          showDialog("Action Failed", (res.payload as string) || "Could not remove plan", "danger");
        }
      },
      true,
      "Remove"
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "left", "right"]}>
      {/* Top Header */}
      <View className="px-5 pt-3 pb-3 bg-white border-b border-slate-100 flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-xl font-bold text-slate-900 tracking-tight">
            Plan Catalog
          </Text>
          <Text className="text-xs text-slate-500 font-medium">
            {packages.length} reusable business plan templates
          </Text>
        </View>

        <Button
          title="New Plan"
          size="sm"
          icon={<Ionicons name="add" size={16} color="#FFFFFF" />}
          onPress={handleOpenCreateModal}
        />
      </View>

      {/* Plan Catalog List */}
      {isLoading && packages.length === 0 ? (
        <LoadingSpinner message="Loading plans..." />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#EA580C"]} />
          }
        >
          {packages.length === 0 ? (
            <EmptyState
              icon="cube-outline"
              title="No Package Plans Configured"
              description="Create reusable plans with frequency (Ex. 1 time/day, 2 times/day, 3 times/day) and standard rates. You can assign these plans to customers from their profile."
              actionTitle="Create Plan Template"
              onActionPress={handleOpenCreateModal}
            />
          ) : (
            packages.map((pkg) => {
              const frequencyLabel =
                pkg.mealsPerDay === 1
                  ? "1 Time / Day (Lunch)"
                  : pkg.mealsPerDay === 2
                  ? "2 Times / Day (Lunch + Dinner)"
                  : "3 Times / Day (Breakfast + Lunch + Dinner)";

              return (
                <Card key={pkg._id} className="p-4 mb-3 border-l-4 border-l-orange-500">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 pr-2">
                      <Text className="text-base font-bold text-slate-900">{pkg.name}</Text>
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="repeat-outline" size={13} color="#EA580C" />
                        <Text className="text-xs font-semibold text-orange-600 ml-1">
                          {frequencyLabel}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                      <Text className="text-[10px] text-orange-700 font-bold uppercase">
                        Rate per Meal
                      </Text>
                      <Text className="text-sm font-extrabold text-orange-600">
                        ₹{pkg.pricePerTiffin}
                      </Text>
                    </View>
                  </View>

                  <View className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 my-1">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-xs text-slate-500">Total Tiffins:</Text>
                      <Text className="text-xs font-bold text-slate-800">{pkg.totalTiffins} meals</Text>
                    </View>
                    <View className="flex-row justify-between items-center mt-1.5">
                      <Text className="text-xs text-slate-500">Total Plan Price:</Text>
                      <Text className="text-base font-extrabold text-orange-600">
                        ₹{pkg.totalAmount.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
                    <Button
                      title="Remove"
                      variant="outline"
                      size="sm"
                      icon={<Ionicons name="trash-outline" size={13} color="#EF4444" />}
                      onPress={() => handleDeactivatePlan(pkg)}
                    />
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Create New Plan Template Modal */}
      <Modal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        title="Create Plan Template"
        subtitle="Define a reusable subscription plan with standard meals and rate"
      >
        <View className="py-2">
          <Input
            label="Plan Name *"
            placeholder="Ex. Monthly Executive, Single Lunch Plan"
            value={catName}
            onChangeText={setCatName}
          />

          <Text className="text-xs font-semibold text-slate-700 mb-1.5">
            Meals per Day (Delivery Frequency) *
          </Text>
          <View className="flex-row gap-2 mb-3">
            {[1, 2, 3].map((num) => (
              <TouchableOpacity
                key={num}
                onPress={() => setCatMealsPerDay(num as 1 | 2 | 3)}
                className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                  catMealsPerDay === num
                    ? "bg-orange-600 border-orange-600"
                    : "bg-white border-slate-200"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    catMealsPerDay === num ? "text-white" : "text-slate-700"
                  }`}
                >
                  {num} Time{num > 1 ? "s" : ""}/day
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Total Tiffins in Plan *"
            placeholder="60"
            value={catTiffins}
            onChangeText={setCatTiffins}
            keyboardType="numeric"
          />

          <Input
            label="Price per Tiffin (₹) *"
            placeholder="60"
            value={catPrice}
            onChangeText={setCatPrice}
            keyboardType="numeric"
          />

          <View className="p-3 bg-orange-50 border border-orange-200 rounded-xl mb-4 flex-row justify-between items-center">
            <Text className="text-xs font-medium text-orange-950">Calculated Plan Cost:</Text>
            <Text className="text-base font-extrabold text-orange-600">
              ₹{((Number(catTiffins) || 0) * (Number(catPrice) || 0)).toLocaleString()}
            </Text>
          </View>

          <Button
            title="Save Package Plan"
            onPress={handleCreatePackageCatalog}
            isLoading={isSubmitting}
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
