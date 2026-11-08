import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppDispatch, useAppSelector } from "../../src/redux/hooks";
import {
  fetchBills,
  generateMonthlyBills,
  recordPayment,
  fetchReceipt,
  setSelectedMonth,
  setSelectedYear,
  setPaymentStatusFilter,
  clearReceipt,
} from "../../src/redux/slices/billingSlice";
import { Bill, PaymentMethod, PaymentStatus } from "../../src/types";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { StatusBadge } from "../../src/components/ui/Badge";
import { Modal } from "../../src/components/common/Modal";
import { EmptyState } from "../../src/components/common/EmptyState";
import { LoadingSpinner } from "../../src/components/common/LoadingSpinner";
import { APP_CONFIG, PAYMENT_METHODS } from "../../src/constants/app.constants";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function BillingScreen() {
  const dispatch = useAppDispatch();
  const {
    bills,
    pagination,
    receipt,
    isLoading,
    isSubmitting,
    isReceiptLoading,
    selectedMonth,
    selectedYear,
    paymentStatusFilter,
  } = useAppSelector((state) => state.billing);

  const [refreshing, setRefreshing] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedBill, setSelectedBillState] = useState<Bill | null>(null);

  // Payment Form States
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI");
  const [transactionRef, setTransactionRef] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const loadData = useCallback(() => {
    dispatch(
      fetchBills({
        month: selectedMonth,
        year: selectedYear,
        paymentStatus: paymentStatusFilter === "ALL" ? undefined : paymentStatusFilter,
        page: 1,
        limit: 50,
      })
    );
  }, [dispatch, selectedMonth, selectedYear, paymentStatusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleGenerateBills = async () => {
    const res = await dispatch(
      generateMonthlyBills({ month: selectedMonth, year: selectedYear })
    );

    if (generateMonthlyBills.fulfilled.match(res)) {
      Alert.alert(
        "Monthly Bills Generated",
        `Created ${res.payload.billsGenerated} bills (${res.payload.billsUpdated} updated, ${res.payload.billsSkipped} skipped) for ${res.payload.month} ${res.payload.year}.`
      );
      loadData();
    } else {
      Alert.alert("Notice", (res.payload as string) || "Failed to generate bills.");
    }
  };

  const handleOpenPaymentModal = (bill: Bill) => {
    setSelectedBillState(bill);
    setPaymentAmount(String(bill.pendingAmount));
    setPaymentMethod("UPI");
    setTransactionRef("");
    setPaymentNotes("");
    setPaymentModalVisible(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedBill) return;

    const amount = Number(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid positive payment amount.");
      return;
    }

    if (amount > selectedBill.pendingAmount) {
      Alert.alert(
        "Amount Exceeded",
        `Payment cannot exceed the outstanding amount of ₹${selectedBill.pendingAmount}.`
      );
      return;
    }

    const res = await dispatch(
      recordPayment({
        id: selectedBill._id,
        data: {
          amount,
          paymentMethod,
          transactionReference: transactionRef.trim() || undefined,
          notes: paymentNotes.trim() || undefined,
        },
      })
    );

    if (recordPayment.fulfilled.match(res)) {
      setPaymentModalVisible(false);
      Alert.alert("Success", "Payment recorded successfully.");
      loadData();
    } else {
      Alert.alert("Notice", (res.payload as string) || "Failed to record payment.");
    }
  };

  const handleViewReceipt = async (bill: Bill) => {
    setSelectedBillState(bill);
    setReceiptModalVisible(true);
    await dispatch(fetchReceipt(bill._id));
  };

  const handleShareReceipt = async () => {
    if (!receipt) return;

    const shareMessage = `*TIFFIN SERVICE RECEIPT*
${receipt.businessName}
Receipt No: ${receipt.receiptNumber}
Bill No: ${receipt.billNumber}
Date: ${new Date(receipt.receiptGeneratedDate).toLocaleDateString()}

*Customer:* ${receipt.customer.name} (${receipt.customer.phone})
*Billing Month:* ${receipt.billingMonth} ${receipt.billingYear}

*Meals Delivered:* ${receipt.totalDeliveredTiffins} tiffins
*Rate:* ₹${receipt.pricePerTiffin}/tiffin
*Total Amount:* ₹${receipt.totalBillAmount}
*Paid Amount:* ₹${receipt.paidAmount}
*Pending Balance:* ₹${receipt.pendingAmount}
*Status:* ${receipt.paymentStatus}

Thank you for subscribing to ${receipt.businessName}!`;

    try {
      await Share.share({
        message: shareMessage,
        title: `Receipt ${receipt.receiptNumber}`,
      });
    } catch {
      // ignore
    }
  };

  const changeMonth = (direction: number) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }

    dispatch(setSelectedMonth(newMonth));
    dispatch(setSelectedYear(newYear));
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Top Header */}
      <View className="px-5 pt-3 pb-3 bg-white border-b border-slate-100 flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-bold text-slate-900 tracking-tight">
            Monthly Billing
          </Text>
          <Text className="text-xs text-slate-500 font-medium">
            {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </Text>
        </View>

        <Button
          title="Generate Bills"
          size="sm"
          icon={<Ionicons name="receipt" size={15} color="#FFFFFF" />}
          onPress={handleGenerateBills}
          isLoading={isSubmitting}
        />
      </View>

      {/* Month Selector Bar */}
      <View className="bg-white px-4 py-2.5 border-b border-slate-100 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => changeMonth(-1)}
          className="p-1.5 rounded-lg bg-slate-100"
        >
          <Ionicons name="chevron-back" size={18} color="#334155" />
        </TouchableOpacity>

        <Text className="text-sm font-bold text-slate-800">
          {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
        </Text>

        <TouchableOpacity
          onPress={() => changeMonth(1)}
          className="p-1.5 rounded-lg bg-slate-100"
        >
          <Ionicons name="chevron-forward" size={18} color="#334155" />
        </TouchableOpacity>
      </View>

      {/* Payment Status Filter Tabs */}
      <View className="py-2 px-4 bg-white border-b border-slate-100">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["ALL", "UNPAID", "PARTIAL", "PAID"] as (PaymentStatus | "ALL")[]}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isSelected = paymentStatusFilter === item;
            return (
              <TouchableOpacity
                onPress={() => dispatch(setPaymentStatusFilter(item))}
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

      {/* Bills List */}
      {isLoading && bills.length === 0 ? (
        <LoadingSpinner message="Fetching customer bills..." />
      ) : (
        <FlatList
          data={bills}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#EA580C"]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="wallet-outline"
              title="No Bills for this Month"
              description={`No billing records generated for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}. Tap 'Generate Bills' to calculate amounts from delivered meals.`}
              actionTitle="Generate Monthly Bills"
              onActionPress={handleGenerateBills}
            />
          }
          renderItem={({ item }) => {
            return (
              <Card className="p-4 mb-3">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-bold text-slate-900">
                      {item.customer?.name}
                    </Text>
                    <Text className="text-xs text-slate-500 font-medium">
                      {item.customer?.phone} • {item.billNumber}
                    </Text>
                  </View>
                  <StatusBadge status={item.paymentStatus} size="sm" />
                </View>

                {/* Financial Overview */}
                <View className="p-3 bg-slate-50 rounded-xl my-2">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-xs text-slate-500">Delivered Meals:</Text>
                    <Text className="text-xs font-bold text-slate-800">
                      {item.deliveredCount} tiffins @ ₹{item.pricePerTiffin}
                    </Text>
                  </View>

                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-xs text-slate-500">Total Billed:</Text>
                    <Text className="text-sm font-extrabold text-slate-900">
                      {APP_CONFIG.CURRENCY_SYMBOL}{item.totalAmount}
                    </Text>
                  </View>

                  <View className="flex-row justify-between items-center pt-1 border-t border-slate-200">
                    <View>
                      <Text className="text-[10px] text-slate-400 uppercase font-bold">Paid</Text>
                      <Text className="text-xs font-bold text-emerald-600">
                        {APP_CONFIG.CURRENCY_SYMBOL}{item.paidAmount}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[10px] text-slate-400 uppercase font-bold">Outstanding</Text>
                      <Text className="text-sm font-extrabold text-rose-600">
                        {APP_CONFIG.CURRENCY_SYMBOL}{item.pendingAmount}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row gap-2 mt-2">
                  {item.paymentStatus !== "PAID" && (
                    <Button
                      title="Record Payment"
                      variant="primary"
                      size="sm"
                      icon={<Ionicons name="card" size={14} color="#FFFFFF" />}
                      className="flex-1"
                      onPress={() => handleOpenPaymentModal(item)}
                    />
                  )}

                  <Button
                    title="View Receipt"
                    variant="outline"
                    size="sm"
                    icon={<Ionicons name="receipt-outline" size={14} color="#475569" />}
                    className="flex-1"
                    onPress={() => handleViewReceipt(item)}
                  />
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Record Payment Modal */}
      <Modal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        title="Record Payment"
        subtitle={`Bill ${selectedBill?.billNumber} for ${selectedBill?.customer?.name}`}
      >
        <View className="py-2">
          <View className="p-3 bg-slate-50 rounded-xl mb-3 flex-row justify-between items-center">
            <Text className="text-xs text-slate-500">Current Outstanding:</Text>
            <Text className="text-base font-extrabold text-rose-600">
              {APP_CONFIG.CURRENCY_SYMBOL}{selectedBill?.pendingAmount}
            </Text>
          </View>

          <Input
            label="Payment Amount (₹) *"
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            keyboardType="numeric"
            placeholder="Enter payment amount"
          />

          <Text className="text-sm font-medium text-slate-700 mb-1.5">
            Payment Mode *
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {PAYMENT_METHODS.map((method) => {
              const isSelected = paymentMethod === method;
              return (
                <TouchableOpacity
                  key={method}
                  onPress={() => setPaymentMethod(method)}
                  className={`py-2 px-3.5 rounded-xl border ${
                    isSelected
                      ? "bg-orange-600 border-orange-600"
                      : "bg-slate-50 border-slate-200"
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
            placeholder="UPI Ref ID, Cheque No, or UTR"
            value={transactionRef}
            onChangeText={setTransactionRef}
          />

          <Input
            label="Remarks (Optional)"
            placeholder="e.g. Paid in cash at delivery"
            value={paymentNotes}
            onChangeText={setPaymentNotes}
          />

          <Button
            title="Confirm Payment"
            onPress={handleRecordPayment}
            isLoading={isSubmitting}
            size="lg"
            className="mt-2"
          />
        </View>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        visible={receiptModalVisible}
        onClose={() => {
          setReceiptModalVisible(false);
          dispatch(clearReceipt());
        }}
        title="Payment Receipt"
        subtitle={receipt?.receiptNumber || "Loading..."}
      >
        {isReceiptLoading && !receipt ? (
          <LoadingSpinner message="Generating receipt..." />
        ) : receipt ? (
          <View className="py-2">
            {/* Receipt Box */}
            <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
              {/* Header */}
              <View className="items-center pb-3 border-b border-dashed border-slate-300">
                <Text className="text-base font-extrabold text-slate-900 tracking-tight">
                  {receipt.businessName}
                </Text>
                <Text className="text-xs text-slate-500 font-medium">
                  {receipt.billingMonth} {receipt.billingYear} Statement
                </Text>
              </View>

              {/* Customer Info */}
              <View className="py-3 border-b border-dashed border-slate-300">
                <Text className="text-xs text-slate-400 font-bold uppercase">Customer</Text>
                <Text className="text-sm font-bold text-slate-800">{receipt.customer.name}</Text>
                <Text className="text-xs text-slate-600">{receipt.customer.phone}</Text>
                <Text className="text-xs text-slate-500 mt-0.5">{receipt.customer.address}</Text>
              </View>

              {/* Meal Itemization */}
              <View className="py-3 border-b border-dashed border-slate-300">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-xs text-slate-600">Delivered Meals</Text>
                  <Text className="text-xs font-semibold text-slate-800">
                    {receipt.totalDeliveredTiffins} meals
                  </Text>
                </View>
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-xs text-slate-600">Rate per Meal</Text>
                  <Text className="text-xs font-semibold text-slate-800">
                    ₹{receipt.pricePerTiffin}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center pt-1">
                  <Text className="text-sm font-bold text-slate-900">Total Billed</Text>
                  <Text className="text-sm font-extrabold text-slate-900">
                    ₹{receipt.totalBillAmount}
                  </Text>
                </View>
              </View>

              {/* Payment Summary */}
              <View className="py-3">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-xs font-semibold text-emerald-700">Total Paid</Text>
                  <Text className="text-xs font-bold text-emerald-700">₹{receipt.paidAmount}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-xs font-semibold text-rose-700">Pending Due</Text>
                  <Text className="text-xs font-bold text-rose-700">₹{receipt.pendingAmount}</Text>
                </View>

                <View className="flex-row justify-between items-center pt-2 border-t border-slate-200">
                  <Text className="text-xs font-bold text-slate-700">Status</Text>
                  <StatusBadge status={receipt.paymentStatus} size="sm" />
                </View>
              </View>

              {/* Payment History Log */}
              {receipt.paymentHistory?.length > 0 && (
                <View className="pt-2 border-t border-dashed border-slate-300">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Payment History
                  </Text>
                  {receipt.paymentHistory.map((p, idx) => (
                    <View key={idx} className="flex-row justify-between items-center py-1">
                      <Text className="text-[11px] text-slate-600">
                        {p.paymentMethod} • {new Date(p.paymentDate).toLocaleDateString()}
                      </Text>
                      <Text className="text-[11px] font-bold text-emerald-600">
                        +₹{p.amount}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Share Action */}
            <Button
              title="Share Receipt (WhatsApp / SMS)"
              variant="primary"
              icon={<Ionicons name="share-social-outline" size={18} color="#FFFFFF" />}
              onPress={handleShareReceipt}
              size="lg"
            />
          </View>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}
