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
} from "../../src/redux/slices/subscriptionSlice";
import { fetchPackages } from "../../src/redux/slices/packageSlice";
import { Customer } from "../../src/types";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { StatusBadge } from "../../src/components/ui/Badge";
import { Modal } from "../../src/components/common/Modal";
import { ConfirmDialog, DialogType } from "../../src/components/common/ConfirmDialog";
import { EmptyState } from "../../src/components/common/EmptyState";
import { LoadingSpinner } from "../../src/components/common/LoadingSpinner";

export default function CustomersScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { customers, pagination, isLoading, isSubmitting, searchQuery, statusFilter } =
    useAppSelector((state) => state.customers);
  const { activeCustomerSubscription, customerHistory } = useAppSelector((state) => state.subscriptions);
  const { packages } = useAppSelector((state) => state.packages);

  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeCustomer, setActiveCustomerState] = useState<Customer | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [advanceAmount, setAdvanceAmount] = useState<string>("0");

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

  // Auto-reload on tab focus
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
          ? "Customer and meal package activated successfully with recorded advance payment."
          : "Customer successfully added to directory.",
        "success"
      );
      loadData();
    } else {
      showDialog("Registration Error", (res.payload as string) || "Failed to create customer", "danger");
    }
  };

  const handleOpenDetailModal = (customer: Customer) => {
    setActiveCustomerState(customer);
    dispatch(setSelectedCustomer(customer));
    dispatch(fetchCustomerActiveSubscription(customer._id));
    dispatch(fetchCustomerPackageHistory(customer._id));
    setFormName(customer.name);
    setFormPhone(customer.phone);
    setFormAddress(customer.address);
    setFormEmail(customer.email || "");
    setFormNotes(customer.notes || "");
    setEditMode(false);
    setDetailModalVisible(true);
  };

  const handleUpdateCustomer = async () => {
    if (!activeCustomer) return;
    if (!formName.trim() || !formPhone.trim() || !formAddress.trim()) {
      showDialog("Required Fields", "Please enter customer name, phone, and address.", "warning");
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
      setEditMode(false);
      showDialog("Profile Updated", "Customer details updated successfully.", "success");
      loadData();
    } else {
      showDialog("Update Failed", (res.payload as string) || "Failed to update customer", "danger");
    }
  };

  const handleDeactivate = (customer: Customer) => {
    showDialog(
      "Deactivate Customer",
      `Are you sure you want to deactivate ${customer.name}? They will no longer appear for new delivery generations.`,
      "danger",
      async () => {
        const res = await dispatch(deactivateCustomer(customer._id));
        if (deactivateCustomer.fulfilled.match(res)) {
          setDetailModalVisible(false);
          showDialog("Deactivated", "Customer account deactivated.", "info");
          loadData();
        } else {
          showDialog("Action Blocked", (res.payload as string) || "Unable to deactivate customer", "danger");
        }
      },
      true,
      "Deactivate"
    );
  };

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
            <TouchableOpacity activeOpacity={0.7} onPress={() => handleOpenDetailModal(item)}>
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
                  <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Create Customer Modal */}
      <Modal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        title="Add New Customer"
        subtitle="Onboard customer, select meal package and record advance"
      >
        <View className="py-2">
          <Input
            label="Full Name *"
            placeholder="Ex. Rahul Sharma"
            value={formName}
            onChangeText={setFormName}
          />
          <Input
            label="Phone Number *"
            placeholder="Ex. 9876543210"
            value={formPhone}
            onChangeText={setFormPhone}
            keyboardType="phone-pad"
          />
          <Input
            label="Delivery Address *"
            placeholder="Hostel, Room / Flat number, Landmark"
            value={formAddress}
            onChangeText={setFormAddress}
            multiline
          />

          {/* Package Selection */}
          <Text className="text-xs font-semibold text-slate-700 mb-1.5">
            Assign Meal Package Plan
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
                      {pkg.totalTiffins} meals • {pkg.mealsPerDay}x/day • ₹{pkg.pricePerTiffin}/tiffin
                    </Text>
                    <Text className="text-xs font-extrabold text-orange-600 mt-0.5">
                      ₹{pkg.totalAmount.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <Text className="text-xs text-slate-400 mb-3 italic">
              No package templates created yet. You can create plans in Packages tab.
            </Text>
          )}

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

      {/* Customer Detail / Edit Modal */}
      <Modal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        title={editMode ? "Edit Customer Profile" : activeCustomer?.name || "Customer Details"}
        subtitle={activeCustomer?.phone}
      >
        {activeCustomer && (
          <View className="py-2">
            {editMode ? (
              // Edit Form Mode
              <View>
                <Input label="Name *" value={formName} onChangeText={setFormName} />
                <Input
                  label="Phone *"
                  value={formPhone}
                  onChangeText={setFormPhone}
                  keyboardType="phone-pad"
                />
                <Input label="Address *" value={formAddress} onChangeText={setFormAddress} multiline />
                <Input
                  label="Email"
                  value={formEmail}
                  onChangeText={setFormEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Input label="Notes" value={formNotes} onChangeText={setFormNotes} />

                <View className="flex-row gap-2 mt-2">
                  <Button
                    title="Cancel"
                    variant="outline"
                    className="flex-1"
                    onPress={() => setEditMode(false)}
                  />
                  <Button
                    title="Save Changes"
                    className="flex-1"
                    isLoading={isSubmitting}
                    onPress={handleUpdateCustomer}
                  />
                </View>
              </View>
            ) : (
              // View Info Mode
              <View>
                <View className="p-3 bg-slate-50 rounded-xl mb-3">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-xs text-slate-400 font-semibold uppercase">Account Status</Text>
                    <StatusBadge status={activeCustomer.isActive ? "ACTIVE" : "INACTIVE"} size="sm" />
                  </View>
                  <Text className="text-xs text-slate-600 mt-1">
                    <Text className="font-semibold">Address: </Text>
                    {activeCustomer.address}
                  </Text>
                  {activeCustomer.email && (
                    <Text className="text-xs text-slate-600 mt-1">
                      <Text className="font-semibold">Email: </Text>
                      {activeCustomer.email}
                    </Text>
                  )}
                  {activeCustomer.notes && (
                    <Text className="text-xs text-slate-600 mt-1">
                      <Text className="font-semibold">Dietary Notes: </Text>
                      {activeCustomer.notes}
                    </Text>
                  )}
                </View>

                {/* Active Package Section */}
                <View className="p-3 bg-orange-50 border border-orange-100 rounded-xl mb-3">
                  <Text className="text-xs font-bold text-orange-950 uppercase tracking-wider mb-1">
                    Current Meal Package
                  </Text>
                  {activeCustomerSubscription ? (
                    <View>
                      <View className="flex-row justify-between items-center mt-1">
                        <Text className="text-sm font-semibold text-orange-900">
                          {activeCustomerSubscription.remainingQuantity} meals left of {activeCustomerSubscription.totalTiffins}
                        </Text>
                        <StatusBadge status={activeCustomerSubscription.status} size="sm" />
                      </View>
                      <Text className="text-xs text-orange-800 mt-1">
                        Rate: ₹{activeCustomerSubscription.pricePerTiffin}/tiffin • Delivered: {activeCustomerSubscription.deliveredQuantity}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-xs text-orange-700 mt-0.5">
                      No active package found for this customer.
                    </Text>
                  )}
                </View>

                {/* Package History Section (Completed & Previous Subscriptions) */}
                <View className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4">
                  <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Package History & Previous Plans
                  </Text>
                  {customerHistory && customerHistory.length > 0 ? (
                    customerHistory.map((sub) => (
                      <View
                        key={sub._id}
                        className="p-2.5 bg-white rounded-lg border border-slate-100 mb-2"
                      >
                        <View className="flex-row justify-between items-center mb-1">
                          <Text className="text-xs font-bold text-slate-800">
                            {sub.packageName || "Standard Plan"}
                          </Text>
                          <StatusBadge status={sub.status} size="sm" />
                        </View>
                        <Text className="text-[11px] text-slate-500">
                          Total: {sub.totalTiffins} meals • Delivered: {sub.deliveredQuantity} • Rate: ₹{sub.pricePerTiffin}
                        </Text>
                        <Text className="text-[10px] text-slate-400 mt-0.5">
                          Started: {new Date(sub.startDate).toLocaleDateString("en-IN")}
                          {sub.completionDate ? ` • Completed: ${new Date(sub.completionDate).toLocaleDateString("en-IN")}` : ""}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text className="text-xs text-slate-400 italic">
                      No previous package history recorded for this customer.
                    </Text>
                  )}
                </View>

                {/* Actions */}
                <View className="flex-row gap-2">
                  <Button
                    title="Edit Profile"
                    variant="outline"
                    icon={<Ionicons name="create-outline" size={16} color="#334155" />}
                    className="flex-1"
                    onPress={() => setEditMode(true)}
                  />
                  {activeCustomer.isActive && (
                    <Button
                      title="Deactivate"
                      variant="danger"
                      icon={<Ionicons name="trash-outline" size={16} color="#FFFFFF" />}
                      className="flex-1"
                      onPress={() => handleDeactivate(activeCustomer)}
                    />
                  )}
                </View>
              </View>
            )}
          </View>
        )}
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
