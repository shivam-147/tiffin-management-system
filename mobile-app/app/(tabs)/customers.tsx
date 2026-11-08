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
  fetchCustomers,
  createCustomer,
  updateCustomer,
  deactivateCustomer,
  setSearchQuery,
  setStatusFilter,
  setSelectedCustomer,
} from "../../src/redux/slices/customerSlice";
import { fetchCustomerActiveSubscription } from "../../src/redux/slices/subscriptionSlice";
import { Customer } from "../../src/types";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { StatusBadge } from "../../src/components/ui/Badge";
import { Modal } from "../../src/components/common/Modal";
import { EmptyState } from "../../src/components/common/EmptyState";
import { LoadingSpinner } from "../../src/components/common/LoadingSpinner";

export default function CustomersScreen() {
  const dispatch = useAppDispatch();
  const { customers, pagination, isLoading, isSubmitting, searchQuery, statusFilter } =
    useAppSelector((state) => state.customers);
  const { activeCustomerSubscription } = useAppSelector((state) => state.subscriptions);

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

  const loadCustomers = useCallback(() => {
    dispatch(
      fetchCustomers({
        search: searchQuery,
        isActive: statusFilter === "all" ? undefined : statusFilter,
        page: 1,
        limit: 50,
      })
    );
  }, [dispatch, searchQuery, statusFilter]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  const handleOpenCreateModal = () => {
    setFormName("");
    setFormPhone("");
    setFormAddress("");
    setFormEmail("");
    setFormNotes("");
    setCreateModalVisible(true);
  };

  const handleCreateCustomer = async () => {
    if (!formName.trim() || !formPhone.trim() || !formAddress.trim()) {
      Alert.alert("Missing Fields", "Name, mobile number, and address are required.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(formPhone.trim())) {
      Alert.alert("Invalid Phone", "Please enter a valid 10-digit Indian mobile number starting with 6-9.");
      return;
    }

    const res = await dispatch(
      createCustomer({
        name: formName.trim(),
        phone: formPhone.trim(),
        address: formAddress.trim(),
        email: formEmail.trim() || undefined,
        notes: formNotes.trim() || undefined,
      })
    );

    if (createCustomer.fulfilled.match(res)) {
      setCreateModalVisible(false);
      Alert.alert("Success", "Customer created successfully");
    } else {
      Alert.alert("Error", (res.payload as string) || "Failed to create customer");
    }
  };

  const handleOpenDetailModal = async (customer: Customer) => {
    setActiveCustomerState(customer);
    dispatch(setSelectedCustomer(customer));
    setEditMode(false);
    setFormName(customer.name);
    setFormPhone(customer.phone);
    setFormAddress(customer.address);
    setFormEmail(customer.email || "");
    setFormNotes(customer.notes || "");
    setDetailModalVisible(true);

    // Fetch active package for this customer
    dispatch(fetchCustomerActiveSubscription(customer._id));
  };

  const handleUpdateCustomer = async () => {
    if (!activeCustomer) return;

    if (!formName.trim() || !formPhone.trim() || !formAddress.trim()) {
      Alert.alert("Missing Fields", "Name, phone, and address are required.");
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
      Alert.alert("Success", "Customer updated successfully");
    } else {
      Alert.alert("Error", (res.payload as string) || "Failed to update customer");
    }
  };

  const handleDeactivate = (customer: Customer) => {
    Alert.alert(
      "Deactivate Customer",
      `Are you sure you want to deactivate ${customer.name}? Customers with active or paused meal packages cannot be deactivated.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            const res = await dispatch(deactivateCustomer(customer._id));
            if (deactivateCustomer.fulfilled.match(res)) {
              setDetailModalVisible(false);
              Alert.alert("Success", "Customer deactivated");
            } else {
              Alert.alert("Action Blocked", (res.payload as string) || "Unable to deactivate customer");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
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
          contentContainerStyle={{ padding: 16 }}
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
              <Card className="p-4">
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

                <View className="flex-row items-start mt-1 pt-2 border-t border-slate-50">
                  <Ionicons name="location-outline" size={14} color="#94A3B8" style={{ marginTop: 2 }} />
                  <Text className="text-xs text-slate-500 ml-1.5 flex-1" numberOfLines={2}>
                    {item.address}
                  </Text>
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
        title="Add Customer"
        subtitle="Register a new meal subscriber"
      >
        <View className="py-2">
          <Input
            label="Full Name *"
            placeholder="e.g. Rahul Sharma"
            value={formName}
            onChangeText={setFormName}
          />
          <Input
            label="Mobile Number *"
            placeholder="10-digit mobile number"
            value={formPhone}
            onChangeText={setFormPhone}
            keyboardType="phone-pad"
            maxLength={10}
          />
          <Input
            label="Delivery Address *"
            placeholder="Hostel, room number, or street address"
            value={formAddress}
            onChangeText={setFormAddress}
            multiline
            numberOfLines={2}
          />
          <Input
            label="Email Address (Optional)"
            placeholder="rahul@example.com"
            value={formEmail}
            onChangeText={setFormEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Special Dietary Notes (Optional)"
            placeholder="e.g. No onion/garlic, deliver before 8:30 PM"
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

      {/* Customer Detail & Edit Modal */}
      <Modal
        visible={detailModalVisible}
        onClose={() => {
          setDetailModalVisible(false);
          setEditMode(false);
        }}
        title={editMode ? "Edit Customer" : activeCustomer?.name || "Customer Details"}
        subtitle={editMode ? "Update contact information" : activeCustomer?.phone}
      >
        {activeCustomer && (
          <View className="py-2">
            {editMode ? (
              // Edit Form
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
                <View className="p-3 bg-orange-50 border border-orange-100 rounded-xl mb-4">
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
    </SafeAreaView>
  );
}
