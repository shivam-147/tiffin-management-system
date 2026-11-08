import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
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
import { fetchPackages, createPackage, deactivatePackage } from "../../src/redux/slices/packageSlice";
import { fetchCustomers } from "../../src/redux/slices/customerSlice";
import { Subscription, SubscriptionStatus, Customer, PackageCatalog } from "../../src/types";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { StatusBadge } from "../../src/components/ui/Badge";
import { Modal } from "../../src/components/common/Modal";
import { ConfirmDialog, DialogType } from "../../src/components/common/ConfirmDialog";
import { EmptyState } from "../../src/components/common/EmptyState";
import { LoadingSpinner } from "../../src/components/common/LoadingSpinner";
import { APP_CONFIG } from "../../src/constants/app.constants";

export default function SubscriptionsScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { subscriptions, pagination, isLoading, isSubmitting, statusFilter } =
    useAppSelector((state) => state.subscriptions);
  const { packages, isLoading: isPackagesLoading } = useAppSelector((state) => state.packages);
  const { customers } = useAppSelector((state) => state.customers);

  // Top Section Toggle: "Active Subscriptions" vs "Package Plans (Catalog)"
  const [activeTab, setActiveTab] = useState<"ACTIVE_SUBS" | "PACKAGE_PLANS">("ACTIVE_SUBS");

  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createCatalogModalVisible, setCreateCatalogModalVisible] = useState(false);
  const [pauseModalVisible, setPauseModalVisible] = useState(false);
  const [resumeModalVisible, setResumeModalVisible] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);

  // Package Catalog Creation State
  const [catName, setCatName] = useState("");
  const [catTiffins, setCatTiffins] = useState("60");
  const [catPrice, setCatPrice] = useState("60");
  const [catMealsPerDay, setCatMealsPerDay] = useState<1 | 2 | 3>(1);

  // Create Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [pricePerTiffin, setPricePerTiffin] = useState("60");
  const [totalTiffins, setTotalTiffins] = useState("60");
  const [mealsPerDay, setMealsPerDay] = useState<number>(1);
  const [advancePaid, setAdvancePaid] = useState("0");
  const [notes, setNotes] = useState("");

  // Pause Form State
  const [pauseReason, setPauseReason] = useState("");
  const [expectedResumeDate, setExpectedResumeDate] = useState("");

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
    dispatch(fetchSubscriptions({ page: 1, limit: 30, status: statusFilter }));
    dispatch(fetchPackages(true));
    dispatch(fetchCustomers({ page: 1, limit: 50, isActive: "true" }));
  }, [dispatch, statusFilter]);

  // Auto-reload on tab focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchSubscriptions({ page: 1, limit: 30, status: statusFilter }));
    await dispatch(fetchPackages(true));
    setRefreshing(false);
  };

  // Find customer IDs that currently have an ACTIVE or PAUSED package
  const activeCustomerIds = new Set(
    subscriptions
      .filter((s) => s.status === "ACTIVE" || s.status === "PAUSED")
      .map((s) => (typeof s.customer === "string" ? s.customer : s.customer?._id))
      .filter(Boolean)
  );

  // Eligible customers: active account and NOT already subscribed
  const eligibleCustomers = customers.filter(
    (c) => c.isActive && !activeCustomerIds.has(c._id)
  );

  const selectedCustomerObj = customers.find((c) => c._id === selectedCustomerId);

  const handleSelectPackageTemplate = (pkg: PackageCatalog) => {
    setSelectedPackageId(pkg._id);
    setPricePerTiffin(String(pkg.pricePerTiffin));
    setTotalTiffins(String(pkg.totalTiffins));
    setMealsPerDay(pkg.mealsPerDay || 1);
  };

  const handleOpenCreateModal = () => {
    setCustomerDropdownOpen(false);
    if (eligibleCustomers.length > 0) {
      setSelectedCustomerId(eligibleCustomers[0]._id);
    } else {
      setSelectedCustomerId("");
    }
    if (packages.length > 0) {
      handleSelectPackageTemplate(packages[0]);
    } else {
      setSelectedPackageId("");
      setPricePerTiffin("60");
      setTotalTiffins("60");
      setMealsPerDay(1);
    }
    setAdvancePaid("0");
    setNotes("");
    setCreateModalVisible(true);
  };

  const handleOpenCreateCatalogModal = () => {
    // Reset to clean default values every time the modal opens
    setCatName("");
    setCatTiffins("60");
    setCatPrice("60");
    setCatMealsPerDay(1);
    setCreateCatalogModalVisible(true);
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
      setCreateCatalogModalVisible(false);
      setCatName("");
      showDialog("Success", "New reusable package plan created successfully!", "success");
      dispatch(fetchPackages(true));
    } else {
      showDialog("Error", (res.payload as string) || "Failed to create package plan", "danger");
    }
  };

  const handleCreateSubscription = async () => {
    if (!selectedCustomerId) {
      showDialog("Required Field", "Please select a customer", "warning");
      return;
    }

    const price = Number(pricePerTiffin);
    const count = Number(totalTiffins);
    if (!price || price <= 0 || !count || count <= 0) {
      showDialog("Invalid Values", "Price per tiffin and total tiffins must be greater than zero", "warning");
      return;
    }

    const selectedPkg = packages.find((p) => p._id === selectedPackageId);

    const result = await dispatch(
      createSubscription({
        customerId: selectedCustomerId,
        packageCatalogId: selectedPackageId || undefined,
        packageName: selectedPkg?.name || "Standard Plan",
        pricePerTiffin: price,
        totalTiffins: count,
        advancePaid: Number(advancePaid) || 0,
        mealsPerDay,
        mealTypes:
          mealsPerDay === 1
            ? ["LUNCH"]
            : mealsPerDay === 2
            ? ["LUNCH", "DINNER"]
            : ["BREAKFAST", "LUNCH", "DINNER"],
        notes: notes.trim() || undefined,
      })
    );

    if (createSubscription.fulfilled.match(result)) {
      setCreateModalVisible(false);
      showDialog("Package Created", "Meal subscription package has been activated for customer.", "success");
      loadData();
    } else {
      showDialog("Notice", (result.payload as string) || "Failed to create package", "danger");
    }
  };

  const handleConfirmPause = async () => {
    if (!selectedSub) return;
    const res = await dispatch(
      pauseSubscription({
        id: selectedSub._id,
        data: {
          expectedResumeDate: expectedResumeDate.trim() || undefined,
          reason: pauseReason.trim() || undefined,
        },
      })
    );

    if (pauseSubscription.fulfilled.match(res)) {
      setPauseModalVisible(false);
      showDialog("Package Paused", "Daily deliveries are paused. Remaining meals are safely reserved.", "success");
      loadData();
    } else {
      showDialog("Failed", (res.payload as string) || "Failed to pause package", "danger");
    }
  };

  const handleConfirmResume = async () => {
    if (!selectedSub) return;
    const res = await dispatch(resumeSubscription({ id: selectedSub._id }));

    if (resumeSubscription.fulfilled.match(res)) {
      setResumeModalVisible(false);
      showDialog("Service Resumed", "Daily deliveries will now resume for this customer.", "success");
      loadData();
    } else {
      showDialog("Failed", (res.payload as string) || "Failed to resume package", "danger");
    }
  };

  const handleCancel = (sub: Subscription) => {
    showDialog(
      "Cancel Package",
      `Are you sure you want to cancel ${sub.customer?.name}'s package? Remaining ${sub.remainingQuantity} meals will be voided.`,
      "danger",
      async () => {
        const res = await dispatch(cancelSubscription(sub._id));
        if (cancelSubscription.fulfilled.match(res)) {
          showDialog("Cancelled", "Package has been cancelled.", "info");
          loadData();
        } else {
          showDialog("Error", (res.payload as string) || "Could not cancel package", "danger");
        }
      },
      true,
      "Cancel Package"
    );
  };

  const handleDeactivatePlan = (pkg: PackageCatalog) => {
    showDialog(
      "Deactivate Plan",
      `Are you sure you want to remove the plan "${pkg.name}" from your catalog? Existing customer packages will not be affected.`,
      "danger",
      async () => {
        const res = await dispatch(deactivatePackage(pkg._id));
        if (deactivatePackage.fulfilled.match(res)) {
          showDialog("Removed", "Plan template removed from active catalog.", "info");
        } else {
          showDialog("Error", (res.payload as string) || "Could not deactivate plan", "danger");
        }
      },
      true,
      "Remove Plan"
    );
  };

  const calculatedTotal = (Number(pricePerTiffin) || 0) * (Number(totalTiffins) || 0);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="px-5 pt-3 pb-3 bg-white border-b border-slate-100 flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-xl font-bold text-slate-900 tracking-tight">
            Meal Packages
          </Text>
          <Text className="text-xs text-slate-500 font-medium">
            {activeTab === "ACTIVE_SUBS"
              ? `${pagination?.total ?? subscriptions.length} customer subscriptions`
              : `${packages.length} reusable plan templates`}
          </Text>
        </View>

        <View className="flex-row gap-2">
          <Button
            title="+ New Plan"
            variant="outline"
            size="sm"
            onPress={handleOpenCreateCatalogModal}
          />
          <Button
            title="Assign Package"
            size="sm"
            icon={<Ionicons name="add-circle" size={16} color="#FFFFFF" />}
            onPress={handleOpenCreateModal}
          />
        </View>
      </View>

      {/* Main View Switcher: Active Customer Subscriptions vs Reusable Package Plans */}
      <View className="px-4 py-2.5 bg-white border-b border-slate-100 flex-row gap-2">
        <TouchableOpacity
          onPress={() => setActiveTab("ACTIVE_SUBS")}
          className={`flex-1 py-2 rounded-xl items-center justify-center ${
            activeTab === "ACTIVE_SUBS" ? "bg-orange-600" : "bg-slate-100"
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              activeTab === "ACTIVE_SUBS" ? "text-white" : "text-slate-600"
            }`}
          >
            Customer Subscriptions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("PACKAGE_PLANS")}
          className={`flex-1 py-2 rounded-xl items-center justify-center ${
            activeTab === "PACKAGE_PLANS" ? "bg-orange-600" : "bg-slate-100"
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              activeTab === "PACKAGE_PLANS" ? "text-white" : "text-slate-600"
            }`}
          >
            Plan Catalog ({packages.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* VIEW 1: REUSABLE PACKAGE CATALOG (Plans with Frequency: 1, 2, or 3 times a day) */}
      {activeTab === "PACKAGE_PLANS" ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#EA580C"]} />
          }
        >
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Available Business Plans
            </Text>
            <TouchableOpacity onPress={handleOpenCreateCatalogModal}>
              <Text className="text-xs font-bold text-orange-600">+ Create New Plan</Text>
            </TouchableOpacity>
          </View>

          {packages.length === 0 ? (
            <EmptyState
              icon="cube-outline"
              title="No Package Plans Configured"
              description="Create reusable plans with frequency (Ex., 1 time/day, 2 times/day, 3 times/day) and standard rates."
              actionTitle="Create Plan Template"
              onActionPress={handleOpenCreateCatalogModal}
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
                <Card key={pkg._id} className="p-4 mb-3">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 pr-2">
                      <Text className="text-base font-bold text-slate-900">{pkg.name}</Text>
                      {pkg.description ? (
                        <Text className="text-xs text-slate-500 mt-0.5">{pkg.description}</Text>
                      ) : null}
                    </View>
                    <View className="bg-orange-100 px-2.5 py-1 rounded-lg">
                      <Text className="text-xs font-extrabold text-orange-700">
                        {pkg.mealsPerDay} Time{pkg.mealsPerDay > 1 ? "s" : ""}/day
                      </Text>
                    </View>
                  </View>

                  {/* Frequency & Plan Highlights */}
                  <View className="bg-slate-50 rounded-xl p-3 my-2 border border-slate-100">
                    <View className="flex-row items-center mb-1.5">
                      <Ionicons name="time-outline" size={14} color="#EA580C" />
                      <Text className="text-xs font-bold text-slate-800 ml-1.5">
                        Delivery Frequency: {frequencyLabel}
                      </Text>
                    </View>

                    <View className="flex-row justify-between items-center pt-2 border-t border-slate-200/60">
                      <Text className="text-xs text-slate-600">
                        Total Capacity: <Text className="font-bold text-slate-900">{pkg.totalTiffins} Tiffins</Text>
                      </Text>
                      <Text className="text-xs text-slate-600">
                        Rate: <Text className="font-bold text-slate-900">₹{pkg.pricePerTiffin}/meal</Text>
                      </Text>
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
                      title="Assign to Customer"
                      variant="primary"
                      size="sm"
                      icon={<Ionicons name="person-add" size={14} color="#FFFFFF" />}
                      onPress={() => {
                        handleSelectPackageTemplate(pkg);
                        setCreateModalVisible(true);
                      }}
                    />
                    <Button
                      title="Remove"
                      variant="outline"
                      size="sm"
                      onPress={() => handleDeactivatePlan(pkg)}
                    />
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>
      ) : (
        /* VIEW 2: CUSTOMER SUBSCRIPTIONS (Showing Assigned Customer, Delivery Frequency & Remaining Quota) */
        <>
          {/* Status Filter Tabs */}
          <View className="py-2 px-4 bg-white border-b border-slate-100">
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

          {/* Subscriptions List */}
          {isLoading && subscriptions.length === 0 ? (
            <LoadingSpinner message="Loading subscriptions..." />
          ) : (
            <FlatList
              data={subscriptions}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#EA580C"]} />
              }
              ListEmptyComponent={
                <EmptyState
                  icon="cube-outline"
                  title="No Subscriptions Found"
                  description="No customer subscription records match this filter. Assign a package to get started."
                  actionTitle="Assign Package"
                  onActionPress={handleOpenCreateModal}
                />
              }
              renderItem={({ item }) => {
                const progressPercent = Math.min(
                  100,
                  Math.round((item.deliveredQuantity / item.totalTiffins) * 100)
                );

                const mealsPerDay = item.mealsPerDay || 1;
                const frequencyText =
                  mealsPerDay === 1
                    ? "1 Meal / Day (Lunch)"
                    : mealsPerDay === 2
                    ? "2 Meals / Day (Lunch + Dinner)"
                    : "3 Meals / Day (Full Board)";

                return (
                  <Card className="p-4 mb-3">
                    {/* Customer & Plan Header */}
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1 pr-2">
                        <Text className="text-base font-bold text-slate-900">
                          {item.customer?.name || "Unknown Customer"}
                        </Text>
                        <Text className="text-xs text-slate-500 font-medium">
                          📞 {item.customer?.phone || "-"}
                        </Text>
                      </View>
                      <StatusBadge status={item.status} />
                    </View>

                    {/* Prominent Delivery Frequency Badge */}
                    <View className="flex-row items-center gap-1.5 mb-2 bg-orange-50 border border-orange-200/60 px-2.5 py-1.5 rounded-xl">
                      <Ionicons name="repeat" size={15} color="#EA580C" />
                      <Text className="text-xs font-bold text-orange-950 flex-1">
                        Frequency: {frequencyText}
                      </Text>
                      <View className="bg-white px-2 py-0.5 rounded border border-orange-200">
                        <Text className="text-[10px] font-bold text-orange-600">
                          {item.packageName || "Custom Plan"}
                        </Text>
                      </View>
                    </View>

                    {/* Balance & Progress Row */}
                    <View className="bg-slate-50 rounded-xl p-3 my-1">
                      <View className="flex-row justify-between items-center mb-1.5">
                        <Text className="text-xs font-medium text-slate-600">
                          Delivered:{" "}
                          <Text className="font-bold text-slate-900">
                            {item.deliveredQuantity}
                          </Text>{" "}
                          / {item.totalTiffins} meals
                        </Text>
                        <Text className="text-xs font-bold text-orange-600">
                          {item.remainingQuantity} remaining
                        </Text>
                      </View>

                      {/* Progress Bar */}
                      <View className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <View
                          className="bg-orange-500 h-2 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </View>

                      <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-slate-200/60">
                        <Text className="text-xs text-slate-500">
                          Rate: ₹{item.pricePerTiffin}/tiffin
                        </Text>
                        <Text className="text-xs font-bold text-slate-800">
                          Total: {APP_CONFIG.CURRENCY_SYMBOL}
                          {item.totalAmount.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    {/* Action Buttons based on status */}
                    <View className="flex-row justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
                      {item.status === "ACTIVE" && (
                        <>
                          <Button
                            title="Pause"
                            variant="outline"
                            size="sm"
                            icon={<Ionicons name="pause" size={14} color="#334155" />}
                            onPress={() => {
                              setSelectedSub(item);
                              setPauseModalVisible(true);
                            }}
                          />
                          <Button
                            title="Cancel"
                            variant="danger"
                            size="sm"
                            onPress={() => handleCancel(item)}
                          />
                        </>
                      )}

                      {item.status === "PAUSED" && (
                        <>
                          <Button
                            title="Resume Service"
                            variant="primary"
                            size="sm"
                            icon={<Ionicons name="play" size={14} color="#FFFFFF" />}
                            onPress={() => {
                              setSelectedSub(item);
                              setResumeModalVisible(true);
                            }}
                          />
                          <Button
                            title="Cancel"
                            variant="danger"
                            size="sm"
                            onPress={() => handleCancel(item)}
                          />
                        </>
                      )}
                    </View>
                  </Card>
                );
              }}
            />
          )}
        </>
      )}

      {/* Create Reusable Package Plan Modal */}
      <Modal
        visible={createCatalogModalVisible}
        onClose={() => setCreateCatalogModalVisible(false)}
        title="Create Package Plan"
        subtitle="Define a reusable meal plan with frequency (1, 2, or 3 times a day)"
      >
        <View className="py-2">
          <Input
            label="Plan Name *"
            placeholder="Ex. Executive Lunch + Dinner (60 Meals)"
            value={catName}
            onChangeText={setCatName}
          />

          <Text className="text-xs font-semibold text-slate-700 mb-2">Delivery Frequency (Meals per Day) *</Text>
          <View className="flex-row gap-2 mb-4">
            {[1, 2, 3].map((num) => (
              <TouchableOpacity
                key={num}
                onPress={() => setCatMealsPerDay(num as 1 | 2 | 3)}
                className={`flex-1 py-2.5 px-3 rounded-xl border items-center justify-center ${
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
                <Text
                  className={`text-[10px] mt-0.5 ${
                    catMealsPerDay === num ? "text-orange-100" : "text-slate-400"
                  }`}
                >
                  {num === 1 ? "Lunch" : num === 2 ? "Lunch+Dinner" : "Full Board"}
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

      {/* Assign Package to Customer Modal */}
      <Modal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        title="Assign Meal Package"
        subtitle="Select a customer and pick a predefined plan or custom quota"
      >
        <View className="py-2">
          {/* Customer Selection Dropdown */}
          <View className="flex-row justify-between items-center mb-1.5">
            <Text className="text-sm font-medium text-slate-700">
              Select Customer *
            </Text>
            <Text className="text-[11px] font-semibold text-slate-400">
              {eligibleCustomers.length} eligible
            </Text>
          </View>

          {eligibleCustomers.length === 0 ? (
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4">
              <View className="flex-row items-center mb-1">
                <Ionicons name="information-circle" size={18} color="#D97706" />
                <Text className="text-xs font-bold text-amber-900 ml-1.5">
                  No Eligible Customers Available
                </Text>
              </View>
              <Text className="text-[11px] text-amber-800 leading-4">
                {customers.length === 0
                  ? "No customers are registered yet. Register a customer first from the Customers tab."
                  : "All active customers currently have an ongoing meal package. Wait until their active package completes or register a new customer."}
              </Text>
            </View>
          ) : (
            <View className="mb-4">
              {/* Dropdown Header Trigger */}
              <TouchableOpacity
                onPress={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                className="border border-slate-300 rounded-xl p-3 bg-white flex-row justify-between items-center"
              >
                <View className="flex-row items-center flex-1 pr-2">
                  <Ionicons name="person-outline" size={18} color="#EA580C" />
                  <View className="ml-2.5 flex-1">
                    <Text className="text-xs font-bold text-slate-900" numberOfLines={1}>
                      {selectedCustomerObj
                        ? `${selectedCustomerObj.name} (${selectedCustomerObj.phone})`
                        : "Choose an eligible customer..."}
                    </Text>
                    {selectedCustomerObj?.address ? (
                      <Text className="text-[10px] text-slate-500" numberOfLines={1}>
                        {selectedCustomerObj.address}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Ionicons
                  name={customerDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#64748B"
                />
              </TouchableOpacity>

              {/* Dropdown List */}
              {customerDropdownOpen && (
                <View className="border border-slate-200 rounded-xl bg-slate-50 p-2 mt-1 max-h-44">
                  <ScrollView nestedScrollEnabled>
                    {eligibleCustomers.map((c: Customer) => {
                      const isChosen = selectedCustomerId === c._id;
                      return (
                        <TouchableOpacity
                          key={c._id}
                          onPress={() => {
                            setSelectedCustomerId(c._id);
                            setCustomerDropdownOpen(false);
                          }}
                          className={`p-2.5 rounded-lg mb-1 flex-row justify-between items-center ${
                            isChosen
                              ? "bg-orange-100 border border-orange-300"
                              : "bg-white border border-slate-100"
                          }`}
                        >
                          <View className="flex-1 pr-2">
                            <Text
                              className={`text-xs font-bold ${
                                isChosen ? "text-orange-950" : "text-slate-800"
                              }`}
                            >
                              {c.name}
                            </Text>
                            <Text className="text-[11px] text-slate-500">{c.phone}</Text>
                            {c.address ? (
                              <Text className="text-[10px] text-slate-400" numberOfLines={1}>
                                {c.address}
                              </Text>
                            ) : null}
                          </View>
                          {isChosen ? (
                            <Ionicons name="checkmark-circle" size={18} color="#EA580C" />
                          ) : (
                            <Ionicons name="ellipse-outline" size={16} color="#CBD5E1" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* Quick Package Plan Selection */}
          {packages.length > 0 && (
            <>
              <Text className="text-xs font-semibold text-slate-700 mb-1.5">
                Choose Reusable Plan Template
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {packages.map((pkg) => {
                  const isSelected = selectedPackageId === pkg._id;
                  return (
                    <TouchableOpacity
                      key={pkg._id}
                      onPress={() => handleSelectPackageTemplate(pkg)}
                      className={`mr-2.5 p-3 rounded-xl border ${
                        isSelected
                          ? "bg-orange-50 border-orange-500"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <Text className="text-xs font-bold text-slate-900">{pkg.name}</Text>
                      <Text className="text-[11px] text-slate-500 mt-0.5">
                        {pkg.totalTiffins} meals • {pkg.mealsPerDay}x/day • ₹{pkg.pricePerTiffin}/ea
                      </Text>
                      <Text className="text-xs font-extrabold text-orange-600 mt-1">
                        ₹{pkg.totalAmount.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Frequency Selection for this subscription */}
          <Text className="text-xs font-semibold text-slate-700 mb-1.5">Delivery Frequency *</Text>
          <View className="flex-row gap-2 mb-3">
            {[1, 2, 3].map((num) => (
              <TouchableOpacity
                key={num}
                onPress={() => setMealsPerDay(num)}
                className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                  mealsPerDay === num
                    ? "bg-orange-600 border-orange-600"
                    : "bg-white border-slate-200"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    mealsPerDay === num ? "text-white" : "text-slate-700"
                  }`}
                >
                  {num} Time{num > 1 ? "s" : ""}/day
                </Text>
              </TouchableOpacity>
            ))}
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

          <Input
            label="Advance Payment Received (₹)"
            value={advancePaid}
            onChangeText={setAdvancePaid}
            keyboardType="numeric"
            placeholder="0"
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
            placeholder="Special instructions or room number"
          />

          <Button
            title={eligibleCustomers.length === 0 ? "No Eligible Customer" : "Activate Package"}
            disabled={eligibleCustomers.length === 0 || !selectedCustomerId}
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
            placeholder="Ex. Going home for vacation"
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
