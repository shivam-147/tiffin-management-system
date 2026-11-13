import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Modal as RNModal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "../../src/redux/hooks";
import {
  fetchCustomers,
  createCustomer,
  updateCustomer,
  deactivateCustomer,
  setSearchQuery,
  setStatusFilter,
  setSelectedCustomer,
} from "../../src/redux/slices/customerSlice";
import {
  fetchCustomerActiveSubscription,
  fetchCustomerPackageHistory,
  createSubscription,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
} from "../../src/redux/slices/subscriptionSlice";
import { fetchCustomerBills, recordPayment } from "../../src/redux/slices/billingSlice";
import { fetchCustomerDeliveries } from "../../src/redux/slices/deliverySlice";
import { fetchPackages } from "../../src/redux/slices/packageSlice";
import { Customer, Subscription, Bill, Delivery, PackageCatalog, PaymentMethod, PaymentStatus } from "../../src/types";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { StatusBadge } from "../../src/components/ui/Badge";
import { Modal } from "../../src/components/common/Modal";
import { ConfirmDialog, DialogType } from "../../src/components/common/ConfirmDialog";
import { EmptyState } from "../../src/components/common/EmptyState";
import { LoadingSpinner } from "../../src/components/common/LoadingSpinner";
import { PdfService } from "../../src/services/PdfService";
import { PAYMENT_METHODS, APP_CONFIG } from "../../src/constants/app.constants";

export default function CustomersScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { admin } = useAppSelector((state) => state.auth);
  const { customers, pagination, isLoading, isSubmitting, searchQuery, statusFilter } =
    useAppSelector((state) => state.customers);
  const { activeCustomerSubscription, customerHistory } = useAppSelector((state) => state.subscriptions);
  const { customerBills } = useAppSelector((state) => state.billing);
  const { customerDeliveries } = useAppSelector((state) => state.deliveries);
  const { packages } = useAppSelector((state) => state.packages);

  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"PACKAGES" | "BILLING" | "DELIVERIES">("PACKAGES");
  const [activeCustomer, setActiveCustomerState] = useState<Customer | null>(null);

  // Edit Profile Form State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Assign Package Form State (inside Customer Profile)
  const [assignPackageModalVisible, setAssignPackageModalVisible] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [packagePricePerTiffin, setPackagePricePerTiffin] = useState<string>("60");
  const [packageTotalTiffins, setPackageTotalTiffins] = useState<string>("60");
  const [packageMealsPerDay, setPackageMealsPerDay] = useState<number>(1);
  const [advanceAmount, setAdvanceAmount] = useState<string>("0");
  const [packageNotes, setPackageNotes] = useState<string>("");

  // Pause Form State
  const [pauseModalVisible, setPauseModalVisible] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [expectedResumeDate, setExpectedResumeDate] = useState("");

  // Record Payment Form State
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<Bill | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [transactionRef, setTransactionRef] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

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
      fetchCustomers({
        page: 1,
        limit: 50,
        search: searchQuery.trim() || undefined,
        isActive: statusFilter === "all" ? undefined : statusFilter,
      })
    );
    dispatch(fetchPackages(true));
  }, [dispatch, searchQuery, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(
      fetchCustomers({
        page: 1,
        limit: 50,
        search: searchQuery.trim() || undefined,
        isActive: statusFilter === "all" ? undefined : statusFilter,
      })
    );
    await dispatch(fetchPackages(true));
    setRefreshing(false);
  };

  // Open Customer Full-Screen Profile
  const handleOpenCustomerProfile = (customer: Customer) => {
    setActiveCustomerState(customer);
    dispatch(setSelectedCustomer(customer));
    setActiveTab("PACKAGES");
    dispatch(fetchCustomerActiveSubscription(customer._id));
    dispatch(fetchCustomerPackageHistory(customer._id));
    dispatch(fetchCustomerBills(customer._id));
    dispatch(fetchCustomerDeliveries({ customerId: customer._id, limit: 50 }));
    setProfileModalVisible(true);
  };

  const reloadCustomerProfileData = (customerId: string) => {
    dispatch(fetchCustomerActiveSubscription(customerId));
    dispatch(fetchCustomerPackageHistory(customerId));
    dispatch(fetchCustomerBills(customerId));
    dispatch(fetchCustomerDeliveries({ customerId, limit: 50 }));
  };

  // Create Customer Form
  const handleOpenCreateModal = () => {
    setFormName("");
    setFormPhone("");
    setFormAddress("");
    setFormEmail("");
    setFormNotes("");
    setSelectedPackageId(packages.length > 0 ? packages[0]._id : "");
    setAdvanceAmount("0");
    setCreateModalVisible(true);
  };

  const handleCreateCustomer = async () => {
    if (!formName.trim() || !formPhone.trim() || !formAddress.trim()) {
      showDialog("Required Fields", "Please enter customer name, phone number, and address.", "warning");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(formPhone.trim())) {
      showDialog("Invalid Phone", "Please enter a valid 10-digit Indian mobile number.", "warning");
      return;
    }

    const res = await dispatch(
      createCustomer({
        name: formName.trim(),
        phone: formPhone.trim(),
        address: formAddress.trim(),
        email: formEmail.trim() || undefined,
        notes: formNotes.trim() || undefined,
        packageCatalogId: selectedPackageId || undefined,
        advanceAmount: Number(advanceAmount) || 0,
      })
    );

    if (createCustomer.fulfilled.match(res)) {
      setCreateModalVisible(false);
      showDialog(
        "Customer Registered",
        selectedPackageId
          ? "Customer and initial meal package registered successfully."
          : "Customer successfully added to directory.",
        "success"
      );
      loadData();
    } else {
      showDialog("Registration Error", (res.payload as string) || "Failed to create customer", "danger");
    }
  };

  // Edit Customer
  const handleOpenEditModal = () => {
    if (!activeCustomer) return;
    setFormName(activeCustomer.name);
    setFormPhone(activeCustomer.phone);
    setFormAddress(activeCustomer.address);
    setFormEmail(activeCustomer.email || "");
    setFormNotes(activeCustomer.notes || "");
    setEditModalVisible(true);
  };

  const handleSaveCustomerProfile = async () => {
    if (!activeCustomer) return;
    if (!formName.trim() || !formPhone.trim() || !formAddress.trim()) {
      showDialog("Required Fields", "Please enter name, phone, and address.", "warning");
      return;
    }

    const res = await dispatch(
      updateCustomer({
        id: activeCustomer._id,
        data: {
          name: formName.trim(),
          phone: formPhone.trim(),
          address: formAddress.trim(),
          email: formEmail.trim() || undefined,
          notes: formNotes.trim() || undefined,
        },
      })
    );

    if (updateCustomer.fulfilled.match(res)) {
      setActiveCustomerState(res.payload);
      setEditModalVisible(false);
      showDialog("Updated", "Customer profile updated successfully.", "success");
      loadData();
    } else {
      showDialog("Update Failed", (res.payload as string) || "Failed to update profile", "danger");
    }
  };

  const handleDeactivate = (customer: Customer) => {
    showDialog(
      "Deactivate Customer",
      `Are you sure you want to deactivate ${customer.name}? Deliveries and subscriptions will stop.`,
      "danger",
      async () => {
        const res = await dispatch(deactivateCustomer(customer._id));
        if (deactivateCustomer.fulfilled.match(res)) {
          setProfileModalVisible(false);
          showDialog("Deactivated", "Customer account deactivated.", "info");
          loadData();
        } else {
          showDialog("Action Blocked", (res.payload as string) || "Unable to deactivate", "danger");
        }
      },
      true,
      "Deactivate"
    );
  };

  // Assign Package (Manual trigger inside customer profile)
  const handleOpenAssignPackageModal = () => {
    if (packages.length > 0) {
      const p = packages[0];
      setSelectedPackageId(p._id);
      setPackagePricePerTiffin(String(p.pricePerTiffin));
      setPackageTotalTiffins(String(p.totalTiffins));
      setPackageMealsPerDay(p.mealsPerDay || 1);
    } else {
      setSelectedPackageId("");
      setPackagePricePerTiffin("60");
      setPackageTotalTiffins("60");
      setPackageMealsPerDay(1);
    }
    setAdvanceAmount("0");
    setPackageNotes("");
    setAssignPackageModalVisible(true);
  };

  const handleSelectPackageTemplate = (pkg: PackageCatalog) => {
    setSelectedPackageId(pkg._id);
    setPackagePricePerTiffin(String(pkg.pricePerTiffin));
    setPackageTotalTiffins(String(pkg.totalTiffins));
    setPackageMealsPerDay(pkg.mealsPerDay || 1);
  };

  const handleConfirmAssignPackage = async () => {
    if (!activeCustomer) return;
    const price = Number(packagePricePerTiffin);
    const count = Number(packageTotalTiffins);

    if (!price || price <= 0 || !count || count <= 0) {
      showDialog("Invalid Inputs", "Price per tiffin and total tiffins must be greater than zero", "warning");
      return;
    }

    const selectedPkg = packages.find((p) => p._id === selectedPackageId);

    const res = await dispatch(
      createSubscription({
        customerId: activeCustomer._id,
        packageCatalogId: selectedPackageId || undefined,
        packageName: selectedPkg?.name || "Standard Plan",
        pricePerTiffin: price,
        totalTiffins: count,
        advancePaid: Number(advanceAmount) || 0,
        mealsPerDay: packageMealsPerDay,
        mealTypes:
          packageMealsPerDay === 1
            ? ["LUNCH"]
            : packageMealsPerDay === 2
            ? ["LUNCH", "DINNER"]
            : ["BREAKFAST", "LUNCH", "DINNER"],
        notes: packageNotes.trim() || undefined,
      })
    );

    if (createSubscription.fulfilled.match(res)) {
      setAssignPackageModalVisible(false);
      showDialog("Package Assigned", "New meal plan activated for customer.", "success");
      reloadCustomerProfileData(activeCustomer._id);
    } else {
      showDialog("Assignment Notice", (res.payload as string) || "Could not assign package", "danger");
    }
  };

  // Pause / Resume / Cancel Package
  const handleConfirmPause = async () => {
    if (!activeCustomerSubscription) return;
    const res = await dispatch(
      pauseSubscription({
        id: activeCustomerSubscription._id,
        data: {
          expectedResumeDate: expectedResumeDate.trim() || undefined,
          reason: pauseReason.trim() || undefined,
        },
      })
    );

    if (pauseSubscription.fulfilled.match(res)) {
      setPauseModalVisible(false);
      showDialog("Package Paused", "Deliveries temporarily paused. Remaining meals preserved.", "success");
      if (activeCustomer) reloadCustomerProfileData(activeCustomer._id);
    } else {
      showDialog("Error", (res.payload as string) || "Failed to pause package", "danger");
    }
  };

  const handleConfirmResume = async () => {
    if (!activeCustomerSubscription) return;
    showDialog(
      "Resume Package",
      "Do you want to resume daily deliveries for this customer starting today?",
      "info",
      async () => {
        const res = await dispatch(
          resumeSubscription({
            id: activeCustomerSubscription._id,
            data: { resumeDate: new Date().toISOString().slice(0, 10) },
          })
        );
        if (resumeSubscription.fulfilled.match(res)) {
          showDialog("Package Resumed", "Daily deliveries resumed.", "success");
          if (activeCustomer) reloadCustomerProfileData(activeCustomer._id);
        } else {
          showDialog("Error", (res.payload as string) || "Failed to resume package", "danger");
        }
      },
      true,
      "Resume"
    );
  };

  const handleConfirmCancel = () => {
    if (!activeCustomerSubscription) return;
    showDialog(
      "Cancel Package",
      "Are you sure you want to cancel this package? Future deliveries will stop.",
      "danger",
      async () => {
        const res = await dispatch(cancelSubscription(activeCustomerSubscription._id));
        if (cancelSubscription.fulfilled.match(res)) {
          showDialog("Package Cancelled", "Meal package cancelled.", "info");
          if (activeCustomer) reloadCustomerProfileData(activeCustomer._id);
        } else {
          showDialog("Error", (res.payload as string) || "Failed to cancel", "danger");
        }
      },
      true,
      "Cancel Plan"
    );
  };

  // Bill Actions inside Customer Profile
  const handleOpenPaymentModal = (bill: Bill) => {
    setSelectedBillForPayment(bill);
    setPaymentAmount(String(bill.pendingAmount));
    setPaymentMethod("CASH");
    setTransactionRef("");
    setPaymentNotes("");
    setPaymentModalVisible(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedBillForPayment || !activeCustomer) return;
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      showDialog("Invalid Amount", "Payment amount must be greater than zero", "warning");
      return;
    }

    const res = await dispatch(
      recordPayment({
        id: selectedBillForPayment._id,
        data: {
          amount: amt,
          paymentMethod,
          transactionReference: transactionRef.trim() || undefined,
          notes: paymentNotes.trim() || undefined,
        },
      })
    );

    if (recordPayment.fulfilled.match(res)) {
      setPaymentModalVisible(false);
      showDialog("Payment Recorded", `Logged ₹${amt} via ${paymentMethod}.`, "success");
      reloadCustomerProfileData(activeCustomer._id);
    } else {
      showDialog("Error", (res.payload as string) || "Failed to record payment", "danger");
    }
  };

  const handlePrintBill = async (bill: Bill) => {
    try {
      await PdfService.printInvoice({
        bill,
        admin,
        deliveries: bill.deliveries || [],
      });
    } catch (err: any) {
      showDialog("Print Error", err.message || "Failed to open print preview", "danger");
    }
  };

  const handleShareBill = async (bill: Bill) => {
    try {
      await PdfService.generateAndShareReceipt({
        bill,
        admin,
        deliveries: bill.deliveries || [],
      });
    } catch (err: any) {
      showDialog("Share Error", err.message || "Failed to export PDF", "danger");
    }
  };

  // Compute Outstanding Dues
  const totalPendingAmount = (customerBills || []).reduce(
    (sum, b) => sum + (b.pendingAmount || 0),
    0
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "left", "right"]}>
      {/* Top Header */}
      <View className="px-5 pt-3 pb-3 bg-white border-b border-slate-100 flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-bold text-slate-900 tracking-tight">Customers</Text>
          <Text className="text-xs text-slate-500 font-medium">
            {pagination?.total ?? customers.length} registered customers
          </Text>
        </View>
        <Button
          title="Add Customer"
          size="sm"
          icon={<Ionicons name="person-add" size={15} color="#FFFFFF" />}
          onPress={handleOpenCreateModal}
        />
      </View>

      {/* Search and Filters Bar */}
      <View className="p-4 bg-white border-b border-slate-100">
        <Input
          placeholder="Search name, phone, or address..."
          value={searchQuery}
          onChangeText={(text) => dispatch(setSearchQuery(text))}
          leftIcon="search-outline"
          className="py-2.5"
        />

        <View className="flex-row gap-2 mt-[-6px]">
          {(["all", "true", "false"] as const).map((filter) => {
            const isSelected = statusFilter === filter;
            const label = filter === "all" ? "All" : filter === "true" ? "Active" : "Inactive";
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => dispatch(setStatusFilter(filter))}
                className={`py-1.5 px-3.5 rounded-full ${
                  isSelected ? "bg-orange-600" : "bg-slate-100"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isSelected ? "text-white" : "text-slate-600"
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Customer List */}
      {isLoading && customers.length === 0 ? (
        <LoadingSpinner message="Loading customer directory..." />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#EA580C"]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No Customers Found"
              description="No customers match your search criteria. Add a new customer to get started."
              actionTitle="Add New Customer"
              onActionPress={handleOpenCreateModal}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.7} onPress={() => handleOpenCustomerProfile(item)}>
              <Card className="p-4 mb-3">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-bold text-slate-900">{item.name}</Text>
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="call-outline" size={13} color="#64748B" />
                      <Text className="text-xs text-slate-600 font-medium ml-1.5">
                        {item.phone}
                      </Text>
                    </View>
                  </View>
                  <StatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />
                </View>

                <View className="flex-row items-center mt-1 pt-2 border-t border-slate-100">
                  <Ionicons name="location-outline" size={14} color="#94A3B8" />
                  <Text className="text-xs text-slate-500 font-medium ml-1 flex-1" numberOfLines={1}>
                    {item.address}
                  </Text>
                  <Text className="text-xs font-bold text-orange-600 mr-1">View Profile</Text>
                  <Ionicons name="chevron-forward" size={16} color="#EA580C" />
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}

      {/* FULL-SCREEN CUSTOMER PROFILE HUB */}
      <RNModal
        visible={profileModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-slate-50">
          {activeCustomer && (
            <View className="flex-1">
              {/* Profile Top Bar */}
              <View className="px-4 py-3 bg-white border-b border-slate-200 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 pr-2">
                  <TouchableOpacity
                    onPress={() => setProfileModalVisible(false)}
                    className="p-2 rounded-xl bg-slate-100 mr-3"
                  >
                    <Ionicons name="arrow-back" size={20} color="#1E293B" />
                  </TouchableOpacity>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>
                      {activeCustomer.name}
                    </Text>
                    <Text className="text-xs text-slate-500">{activeCustomer.phone}</Text>
                  </View>
                </View>

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={handleOpenEditModal}
                    className="p-2 rounded-xl bg-slate-100"
                  >
                    <Ionicons name="pencil" size={18} color="#475569" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeactivate(activeCustomer)}
                    className="p-2 rounded-xl bg-rose-50"
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Financial & Status Banner */}
              <View className="px-4 py-3 bg-white border-b border-slate-200">
                <View className="flex-row gap-3">
                  {/* Dues Card */}
                  <View
                    className={`flex-1 p-3 rounded-2xl border ${
                      totalPendingAmount > 0
                        ? "bg-rose-50 border-rose-200"
                        : "bg-emerald-50 border-emerald-200"
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        totalPendingAmount > 0 ? "text-rose-800" : "text-emerald-800"
                      }`}
                    >
                      Remaining Dues
                    </Text>
                    <Text
                      className={`text-xl font-black mt-0.5 ${
                        totalPendingAmount > 0 ? "text-rose-600" : "text-emerald-700"
                      }`}
                    >
                      ₹{totalPendingAmount.toLocaleString()}
                    </Text>
                    <Text className="text-[10px] text-slate-500 mt-0.5">
                      {totalPendingAmount > 0 ? "Pending collection" : "All payments cleared"}
                    </Text>
                  </View>

                  {/* Customer Info Card */}
                  <View className="flex-1 p-3 bg-slate-50 rounded-2xl border border-slate-200 justify-between">
                    <View>
                      <Text className="text-[10px] font-bold text-slate-400 uppercase">Address</Text>
                      <Text className="text-xs font-semibold text-slate-800 mt-0.5" numberOfLines={2}>
                        {activeCustomer.address}
                      </Text>
                    </View>
                    {activeCustomer.notes ? (
                      <Text className="text-[10px] text-amber-700 mt-1 font-medium" numberOfLines={1}>
                        Diet: {activeCustomer.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Profile Tabs Navigation */}
                <View className="flex-row gap-2 mt-3 pt-3 border-t border-slate-100">
                  {[
                    { key: "PACKAGES", label: "Meal Packages", icon: "cube-outline" },
                    { key: "BILLING", label: `Bills (${customerBills.length})`, icon: "receipt-outline" },
                    { key: "DELIVERIES", label: "Attendance", icon: "calendar-outline" },
                  ].map((tab) => {
                    const isSelected = activeTab === tab.key;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        onPress={() => setActiveTab(tab.key as any)}
                        className={`flex-1 py-2 px-1 rounded-xl flex-row items-center justify-center border ${
                          isSelected
                            ? "bg-orange-600 border-orange-600"
                            : "bg-slate-100 border-slate-100"
                        }`}
                      >
                        <Ionicons
                          name={tab.icon as any}
                          size={14}
                          color={isSelected ? "#FFFFFF" : "#64748B"}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? "text-white" : "text-slate-600"
                          }`}
                        >
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* TAB 1: MEAL PACKAGES & SUBSCRIPTIONS */}
              {activeTab === "PACKAGES" && (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}>
                  {/* Current Active or Payment Pending Subscription Card */}
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Current Subscription
                    </Text>
                    <Button
                      title="Assign New Package"
                      size="sm"
                      variant="primary"
                      icon={<Ionicons name="add" size={14} color="#FFFFFF" />}
                      onPress={handleOpenAssignPackageModal}
                    />
                  </View>

                  {activeCustomerSubscription ? (
                    <Card className="p-4 mb-4 border-l-4 border-l-orange-500">
                      <View className="flex-row justify-between items-start mb-2">
                        <View className="flex-1 pr-2">
                          <Text className="text-base font-extrabold text-slate-900">
                            {activeCustomerSubscription.packageName || "Standard Meal Plan"}
                          </Text>
                          <Text className="text-xs text-slate-500 mt-0.5">
                            {activeCustomerSubscription.mealsPerDay || 1} meal(s) per day • ₹{activeCustomerSubscription.pricePerTiffin}/ea
                          </Text>
                        </View>
                        <StatusBadge status={activeCustomerSubscription.status} size="sm" />
                      </View>

                      {/* Payment Pending Alert Banner */}
                      {activeCustomerSubscription.status === "PAYMENT_PENDING" && (
                        <View className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl my-2 flex-row items-center">
                          <Ionicons name="alert-circle" size={18} color="#D97706" />
                          <Text className="text-xs text-amber-900 font-medium ml-2 flex-1">
                            All {activeCustomerSubscription.totalTiffins} meals served. Pending payment: ₹
                            {(activeCustomerSubscription.totalAmount - (activeCustomerSubscription.advancePaid || 0)).toLocaleString()}. You can assign the next plan anytime.
                          </Text>
                        </View>
                      )}

                      {/* Meal Progress Bar */}
                      <View className="my-2">
                        <View className="flex-row justify-between text-xs mb-1">
                          <Text className="text-xs text-slate-500 font-medium">Delivered Progress:</Text>
                          <Text className="text-xs font-bold text-orange-600">
                            {activeCustomerSubscription.deliveredQuantity} / {activeCustomerSubscription.totalTiffins} meals
                          </Text>
                        </View>
                        <View className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <View
                            className="h-full bg-orange-600 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (activeCustomerSubscription.deliveredQuantity /
                                    (activeCustomerSubscription.totalTiffins || 1)) *
                                    100
                                )
                              )}%`,
                            }}
                          />
                        </View>
                      </View>

                      <View className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex-row justify-between items-center my-1">
                        <Text className="text-xs text-slate-600">Advance Paid:</Text>
                        <Text className="text-xs font-bold text-emerald-700">
                          ₹{(activeCustomerSubscription.advancePaid || 0).toLocaleString()}
                        </Text>
                      </View>

                      {/* Subscription Action Buttons */}
                      <View className="flex-row justify-end gap-2 mt-3 pt-2 border-t border-slate-100">
                        {activeCustomerSubscription.status === "ACTIVE" && (
                          <Button
                            title="Pause Deliveries"
                            variant="outline"
                            size="sm"
                            icon={<Ionicons name="pause" size={13} color="#475569" />}
                            onPress={() => {
                              setPauseReason("");
                              setExpectedResumeDate("");
                              setPauseModalVisible(true);
                            }}
                          />
                        )}
                        {activeCustomerSubscription.status === "PAUSED" && (
                          <Button
                            title="Resume Deliveries"
                            variant="primary"
                            size="sm"
                            icon={<Ionicons name="play" size={13} color="#FFFFFF" />}
                            onPress={handleConfirmResume}
                          />
                        )}
                        <Button
                          title="Cancel"
                          variant="outline"
                          size="sm"
                          onPress={handleConfirmCancel}
                        />
                      </View>
                    </Card>
                  ) : (
                    <Card className="p-4 mb-4 bg-orange-50/50 border border-orange-100 items-center">
                      <Ionicons name="cube-outline" size={32} color="#EA580C" />
                      <Text className="text-sm font-bold text-slate-800 mt-2">No Active Package Running</Text>
                      <Text className="text-xs text-slate-500 text-center mt-1 mb-3">
                        Assign a package plan from the catalog to start daily meal deliveries.
                      </Text>
                      <Button
                        title="Assign Meal Package"
                        size="sm"
                        onPress={handleOpenAssignPackageModal}
                      />
                    </Card>
                  )}

                  {/* Package History Section */}
                  <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-2">
                    Package History ({customerHistory.length})
                  </Text>
                  {customerHistory.length === 0 ? (
                    <Text className="text-xs text-slate-400 italic">No past packages recorded.</Text>
                  ) : (
                    customerHistory.map((sub: Subscription) => (
                      <Card key={sub._id} className="p-3 mb-2.5">
                        <View className="flex-row justify-between items-center mb-1">
                          <Text className="text-xs font-bold text-slate-900">
                            {sub.packageName || "Standard Plan"}
                          </Text>
                          <StatusBadge status={sub.status} size="sm" />
                        </View>
                        <Text className="text-[11px] text-slate-500">
                          {new Date(sub.startDate).toLocaleDateString()} — {sub.completionDate ? new Date(sub.completionDate).toLocaleDateString() : "Ongoing"}
                        </Text>
                        <View className="flex-row justify-between items-center mt-1 pt-1 border-t border-slate-100">
                          <Text className="text-[11px] text-slate-600">
                            Consumed: {sub.deliveredQuantity}/{sub.totalTiffins} meals
                          </Text>
                          <Text className="text-xs font-extrabold text-orange-600">
                            ₹{sub.totalAmount.toLocaleString()}
                          </Text>
                        </View>
                      </Card>
                    ))
                  )}
                </ScrollView>
              )}

              {/* TAB 2: BILLING & INVOICES */}
              {activeTab === "BILLING" && (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}>
                  <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Billing & Payment Statements ({customerBills.length})
                  </Text>

                  {customerBills.length === 0 ? (
                    <EmptyState
                      icon="receipt-outline"
                      title="No Invoices Found"
                      description="Monthly bills will appear here once generated from the Billing tab."
                    />
                  ) : (
                    customerBills.map((bill: Bill) => (
                      <Card key={bill._id} className="p-4 mb-3">
                        <View className="flex-row justify-between items-start mb-2">
                          <View className="flex-1 pr-2">
                            <Text className="text-base font-extrabold text-slate-900">
                              Invoice #{bill.billNumber}
                            </Text>
                            <Text className="text-xs text-slate-500 mt-0.5">
                              Period: {bill.billingMonth}/{bill.billingYear} • {bill.deliveredCount} meals @ ₹{bill.pricePerTiffin}
                            </Text>
                          </View>
                          <StatusBadge status={bill.paymentStatus} size="sm" />
                        </View>

                        {/* Bill Breakdown */}
                        <View className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 my-1.5">
                          <View className="flex-row justify-between items-center text-xs">
                            <Text className="text-xs text-slate-500">Total Bill Amount:</Text>
                            <Text className="text-xs font-bold text-slate-900">₹{bill.totalAmount.toLocaleString()}</Text>
                          </View>
                          <View className="flex-row justify-between items-center text-xs mt-1">
                            <Text className="text-xs text-emerald-700">Paid / Credited Advance:</Text>
                            <Text className="text-xs font-bold text-emerald-700">-₹{bill.paidAmount.toLocaleString()}</Text>
                          </View>
                          <View className="flex-row justify-between items-center text-xs mt-1.5 pt-1.5 border-t border-slate-200">
                            <Text className="text-xs font-bold text-slate-900">Pending Due:</Text>
                            <Text className={`text-sm font-extrabold ${bill.pendingAmount > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                              ₹{bill.pendingAmount.toLocaleString()}
                            </Text>
                          </View>
                        </View>

                        {/* Bill Actions: Print, Share, Record Payment */}
                        <View className="flex-row justify-end items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                          <Button
                            title="Print"
                            variant="outline"
                            size="sm"
                            icon={<Ionicons name="print-outline" size={14} color="#334155" />}
                            onPress={() => handlePrintBill(bill)}
                          />
                          <Button
                            title="Share"
                            variant="outline"
                            size="sm"
                            icon={<Ionicons name="share-social-outline" size={14} color="#334155" />}
                            onPress={() => handleShareBill(bill)}
                          />
                          {bill.paymentStatus !== "PAID" && (
                            <Button
                              title="Record Payment"
                              variant="primary"
                              size="sm"
                              icon={<Ionicons name="card-outline" size={14} color="#FFFFFF" />}
                              onPress={() => handleOpenPaymentModal(bill)}
                            />
                          )}
                        </View>
                      </Card>
                    ))
                  )}
                </ScrollView>
              )}

              {/* TAB 3: DAILY DELIVERIES ATTENDANCE */}
              {activeTab === "DELIVERIES" && (
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}>
                  <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Recent Meal Attendance ({customerDeliveries.length})
                  </Text>

                  {customerDeliveries.length === 0 ? (
                    <EmptyState
                      icon="calendar-outline"
                      title="No Deliveries Logged"
                      description="Daily meal attendance logs will appear here once generated in the Deliveries tab."
                    />
                  ) : (
                    customerDeliveries.map((del: Delivery) => {
                      const meal = (del.mealType || "LUNCH").toUpperCase();
                      const isBreakfast = meal === "BREAKFAST";
                      const isDinner = meal === "DINNER";
                      const isExtra = meal === "EXTRA";
                      const badgeBg = isBreakfast
                        ? "bg-amber-100 text-amber-900"
                        : isDinner
                        ? "bg-indigo-100 text-indigo-950"
                        : isExtra
                        ? "bg-emerald-100 text-emerald-950"
                        : "bg-orange-100 text-orange-950";

                      return (
                        <Card key={del._id} className="p-3 mb-2 flex-row justify-between items-center">
                          <View>
                            <Text className="text-xs font-bold text-slate-900">{del.dateString}</Text>
                            <View className={`self-start px-2 py-0.5 rounded mt-1 ${badgeBg}`}>
                              <Text className="text-[10px] font-bold">
                                {meal} {del.quantity && del.quantity > 1 ? `(${del.quantity}x)` : ""}
                              </Text>
                            </View>
                          </View>
                          <StatusBadge status={del.status} size="sm" />
                        </Card>
                      );
                    })
                  )}
                </ScrollView>
              )}
            </View>
          )}
        </SafeAreaView>
      </RNModal>

      {/* Assign Package Modal (Triggered inside Customer Profile) */}
      <Modal
        visible={assignPackageModalVisible}
        onClose={() => setAssignPackageModalVisible(false)}
        title="Assign Meal Package"
        subtitle={`Configure plan for ${activeCustomer?.name}`}
      >
        <View className="py-2">
          {/* Quick Plan Template Selector */}
          {packages.length > 0 && (
            <>
              <Text className="text-xs font-semibold text-slate-700 mb-1.5">
                Choose Plan Template from Catalog
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
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

          {/* Delivery Frequency Selection */}
          <Text className="text-xs font-semibold text-slate-700 mb-1.5">Delivery Frequency *</Text>
          <View className="flex-row gap-2 mb-3">
            {[1, 2, 3].map((num) => (
              <TouchableOpacity
                key={num}
                onPress={() => setPackageMealsPerDay(num)}
                className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                  packageMealsPerDay === num
                    ? "bg-orange-600 border-orange-600"
                    : "bg-white border-slate-200"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    packageMealsPerDay === num ? "text-white" : "text-slate-700"
                  }`}
                >
                  {num} Time{num > 1 ? "s" : ""}/day
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Price per Tiffin (₹) *"
            value={packagePricePerTiffin}
            onChangeText={setPackagePricePerTiffin}
            keyboardType="numeric"
          />

          <Input
            label="Total Tiffins in Package *"
            value={packageTotalTiffins}
            onChangeText={setPackageTotalTiffins}
            keyboardType="numeric"
          />

          <Input
            label="Advance Payment Received (₹)"
            value={advanceAmount}
            onChangeText={setAdvanceAmount}
            keyboardType="numeric"
            placeholder="0"
          />

          {/* Computed Plan Cost */}
          <View className="p-3 bg-orange-50 border border-orange-200 rounded-xl mb-3 flex-row justify-between items-center">
            <Text className="text-xs font-medium text-orange-950">Total Package Cost:</Text>
            <Text className="text-base font-extrabold text-orange-600">
              ₹{((Number(packageTotalTiffins) || 0) * (Number(packagePricePerTiffin) || 0)).toLocaleString()}
            </Text>
          </View>

          <Input
            label="Dietary / Delivery Notes"
            value={packageNotes}
            onChangeText={setPackageNotes}
            placeholder="Special instructions or delivery timing"
          />

          <Button
            title="Activate Package"
            size="lg"
            className="mt-2"
            isLoading={isSubmitting}
            onPress={handleConfirmAssignPackage}
          />
        </View>
      </Modal>

      {/* Pause Package Modal */}
      <Modal
        visible={pauseModalVisible}
        onClose={() => setPauseModalVisible(false)}
        title="Pause Package"
        subtitle={`Temporary leave for ${activeCustomer?.name}`}
      >
        <View className="py-2">
          <Text className="text-xs text-slate-600 mb-3">
            Meals will not be consumed during pause. The remaining {activeCustomerSubscription?.remainingQuantity} meals will be preserved.
          </Text>

          <Input
            label="Reason for Pause (Optional)"
            value={pauseReason}
            onChangeText={setPauseReason}
            placeholder="Ex. Out of town, vacation"
          />

          <Input
            label="Expected Resume Date (Optional)"
            value={expectedResumeDate}
            onChangeText={setExpectedResumeDate}
            placeholder="YYYY-MM-DD (e.g. 2026-11-20)"
          />

          <Button
            title="Confirm Pause"
            variant="primary"
            onPress={handleConfirmPause}
            isLoading={isSubmitting}
            size="lg"
            className="mt-2"
          />
        </View>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        title="Record Bill Payment"
        subtitle={`Invoice #${selectedBillForPayment?.billNumber} • Pending: ₹${selectedBillForPayment?.pendingAmount?.toLocaleString()}`}
      >
        <View className="py-2">
          <Input
            label="Payment Amount (₹) *"
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            keyboardType="numeric"
          />

          <Text className="text-xs font-semibold text-slate-700 mb-1.5">Payment Method *</Text>
          <View className="flex-row flex-wrap gap-2 mb-3">
            {(PAYMENT_METHODS as readonly PaymentMethod[]).map((method) => {
              const isSelected = paymentMethod === method;
              return (
                <TouchableOpacity
                  key={method}
                  onPress={() => setPaymentMethod(method)}
                  className={`py-2 px-3 rounded-xl border ${
                    isSelected
                      ? "bg-orange-600 border-orange-600"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? "text-white" : "text-slate-700"
                    }`}
                  >
                    {method}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label="Transaction Reference (Optional)"
            placeholder="UPI Ref ID, Cheque number"
            value={transactionRef}
            onChangeText={setTransactionRef}
          />

          <Input
            label="Notes (Optional)"
            placeholder="Cash received by delivery boy, etc."
            value={paymentNotes}
            onChangeText={setPaymentNotes}
          />

          <Button
            title="Confirm Payment"
            onPress={handleConfirmPayment}
            isLoading={isSubmitting}
            size="lg"
            className="mt-2"
          />
        </View>
      </Modal>

      {/* Edit Customer Profile Modal */}
      <Modal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        title="Edit Customer Profile"
        subtitle={activeCustomer?.phone}
      >
        <View className="py-2">
          <Input label="Customer Name *" value={formName} onChangeText={setFormName} />
          <Input
            label="Phone Number *"
            value={formPhone}
            onChangeText={setFormPhone}
            keyboardType="phone-pad"
          />
          <Input label="Delivery Address *" value={formAddress} onChangeText={setFormAddress} multiline />
          <Input
            label="Email Address (Optional)"
            value={formEmail}
            onChangeText={setFormEmail}
            keyboardType="email-address"
          />
          <Input
            label="Dietary / Delivery Notes (Optional)"
            value={formNotes}
            onChangeText={setFormNotes}
          />

          <Button
            title="Save Profile Changes"
            onPress={handleSaveCustomerProfile}
            isLoading={isSubmitting}
            size="lg"
            className="mt-2"
          />
        </View>
      </Modal>

      {/* Create Customer Modal */}
      <Modal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        title="Add New Customer"
        subtitle="Register customer details and optionally assign an initial meal plan"
      >
        <View className="py-2">
          <Input
            label="Full Name *"
            placeholder="Rahul Sharma"
            value={formName}
            onChangeText={setFormName}
          />
          <Input
            label="Phone Number *"
            placeholder="9876543210"
            value={formPhone}
            onChangeText={setFormPhone}
            keyboardType="phone-pad"
            maxLength={10}
          />
          <Input
            label="Delivery Address *"
            placeholder="Flat 102, Gokul Residency, Near City Hospital"
            value={formAddress}
            onChangeText={setFormAddress}
            multiline
            numberOfLines={2}
          />

          <Text className="text-xs font-semibold text-slate-700 mb-1.5">
            Initial Package Plan (Optional)
          </Text>
          {packages.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              <TouchableOpacity
                onPress={() => setSelectedPackageId("")}
                className={`mr-2 p-2.5 rounded-xl border ${
                  selectedPackageId === ""
                    ? "bg-orange-50 border-orange-500"
                    : "bg-white border-slate-200"
                }`}
              >
                <Text className="text-xs font-bold text-slate-800">No Package Now</Text>
                <Text className="text-[10px] text-slate-400">Assign later</Text>
              </TouchableOpacity>

              {packages.map((pkg) => {
                const isSelected = selectedPackageId === pkg._id;
                return (
                  <TouchableOpacity
                    key={pkg._id}
                    onPress={() => setSelectedPackageId(pkg._id)}
                    className={`mr-2.5 p-2.5 rounded-xl border ${
                      isSelected
                        ? "bg-orange-50 border-orange-500"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <Text className="text-xs font-bold text-slate-900">{pkg.name}</Text>
                    <Text className="text-[10px] text-slate-500 mt-0.5">
                      {pkg.totalTiffins} meals • {pkg.mealsPerDay}x/day • ₹{pkg.pricePerTiffin}/ea
                    </Text>
                    <Text className="text-xs font-extrabold text-orange-600 mt-0.5">
                      ₹{pkg.totalAmount.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          {selectedPackageId ? (
            <Input
              label="Advance Payment Collected (₹)"
              placeholder="0"
              value={advanceAmount}
              onChangeText={setAdvanceAmount}
              keyboardType="numeric"
            />
          ) : null}

          <Input
            label="Email Address (Optional)"
            placeholder="rahul@example.com"
            value={formEmail}
            onChangeText={setFormEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Dietary / Delivery Notes (Optional)"
            placeholder="Ex. No spicy, deliver before 1 PM"
            value={formNotes}
            onChangeText={setFormNotes}
          />

          <Button
            title="Register Customer"
            onPress={handleCreateCustomer}
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
