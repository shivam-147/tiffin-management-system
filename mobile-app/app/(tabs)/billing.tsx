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
  fetchBills,
  fetchBillById,
  generateMonthlyBills,
  recordPayment,
  setSelectedMonth,
  setSelectedYear,
  setPaymentStatusFilter,
} from "../../src/redux/slices/billingSlice";
import { Bill, PaymentMethod, PaymentStatus } from "../../src/types";
import { Card } from "../../src/components/ui/Card";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { StatusBadge } from "../../src/components/ui/Badge";
import { Modal } from "../../src/components/common/Modal";
import { ConfirmDialog, DialogType } from "../../src/components/common/ConfirmDialog";
import { EmptyState } from "../../src/components/common/EmptyState";
import { LoadingSpinner } from "../../src/components/common/LoadingSpinner";
import { APP_CONFIG, PAYMENT_METHODS } from "../../src/constants/app.constants";
import PdfService from "../../src/services/PdfService";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function BillingScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const {
    bills,
    pagination,
    isLoading,
    isSubmitting,
    selectedMonth,
    selectedYear,
    paymentStatusFilter,
  } = useAppSelector((state) => state.billing);
  const { admin } = useAppSelector((state) => state.auth);

  const [refreshing, setRefreshing] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [transactionRef, setTransactionRef] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
      fetchBills({
        month: selectedMonth,
        year: selectedYear,
        paymentStatus: paymentStatusFilter === "ALL" ? undefined : paymentStatusFilter,
        page: 1,
        limit: 50,
      })
    );
  }, [dispatch, selectedMonth, selectedYear, paymentStatusFilter]);

  // Auto-reload on tab focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(
      fetchBills({
        month: selectedMonth,
        year: selectedYear,
        paymentStatus: paymentStatusFilter === "ALL" ? undefined : paymentStatusFilter,
        page: 1,
        limit: 50,
      })
    );
    setRefreshing(false);
  };

  const changeMonth = (delta: number) => {
    let nextMonth = selectedMonth + delta;
    let nextYear = selectedYear;

    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }

    dispatch(setSelectedMonth(nextMonth));
    dispatch(setSelectedYear(nextYear));
  };

  const handleGenerateBills = async () => {
    const res = await dispatch(
      generateMonthlyBills({ month: selectedMonth, year: selectedYear })
    );

    if (generateMonthlyBills.fulfilled.match(res)) {
      showDialog(
        "Bills Calculated",
        `Generated ${res.payload.billsGenerated} customer bills (${res.payload.billsUpdated} updated, ${res.payload.billsSkipped} skipped) based strictly on delivered meals.`,
        "success"
      );
      loadData();
    } else {
      showDialog("Billing Failed", (res.payload as string) || "Failed to generate monthly bills", "danger");
    }
  };

  const handleOpenPaymentModal = (bill: Bill) => {
    setSelectedBill(bill);
    setPaymentAmount(String(bill.pendingAmount));
    setPaymentMethod("CASH");
    setTransactionRef("");
    setPaymentNotes("");
    setPaymentModalVisible(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedBill) return;

    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      showDialog("Invalid Amount", "Payment amount must be greater than zero", "warning");
      return;
    }

    const res = await dispatch(
      recordPayment({
        id: selectedBill._id,
        data: {
          amount: amt,
          paymentMethod,
          transactionReference: transactionRef.trim() || undefined,
          notes: paymentNotes.trim() || undefined,
        },
      })
    );

    if (recordPayment.fulfilled.match(res)) {
      const updatedBill = res.payload;
      setPaymentModalVisible(false);
      showDialog(
        "Payment Recorded",
        `Successfully logged ₹${amt} via ${paymentMethod}. Outstanding balance: ₹${updatedBill.pendingAmount}.`,
        "success",
        () => handleSharePdfReceipt(updatedBill)
      );
      loadData();
    } else {
      showDialog("Payment Error", (res.payload as string) || "Failed to record payment", "danger");
    }
  };

  const handlePrintReceipt = async (bill: Bill) => {
    try {
      setIsGeneratingPdf(true);
      const res = await dispatch(fetchBillById(bill._id));
      const fullBill = fetchBillById.fulfilled.match(res) ? res.payload : bill;

      await PdfService.printInvoice({
        bill: fullBill,
        admin,
        deliveries: fullBill.deliveries || [],
      });
    } catch (err: any) {
      showDialog("Print Error", err.message || "Failed to open system print dialog", "danger");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSharePdfReceipt = async (bill: Bill) => {
    try {
      setIsGeneratingPdf(true);
      // Fetch full bill details with its daily meal deliveries
      const res = await dispatch(fetchBillById(bill._id));
      const fullBill = fetchBillById.fulfilled.match(res) ? res.payload : bill;

      await PdfService.generateAndShareReceipt({
        bill: fullBill,
        admin,
        deliveries: fullBill.deliveries || [],
      });
    } catch (err: any) {
      showDialog("PDF Export Error", err.message || "Failed to generate or share client PDF receipt", "danger");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "left", "right"]}>
      {/* Top Header */}
      <View className="px-5 pt-3 pb-3 bg-white border-b border-slate-100 flex-row items-center justify-between">
        <View className="flex-1 pr-2">
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
          contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}
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
                      📞 {item.customer?.phone} • Bill #{item.billNumber}
                    </Text>
                  </View>
                  <StatusBadge status={item.paymentStatus} />
                </View>

                {/* Metrics Breakdown */}
                <View className="bg-slate-50 rounded-xl p-3 my-2">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-xs text-slate-600 font-medium">Delivered Meals</Text>
                    <Text className="text-xs font-bold text-slate-800">
                      {item.deliveredCount} tiffins @ ₹{item.pricePerTiffin} / Each
                    </Text>
                  </View>

                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-xs text-slate-600 font-medium">Total Billed</Text>
                    <Text className="text-xs font-bold text-slate-900">
                      {APP_CONFIG.CURRENCY_SYMBOL}
                      {item.totalAmount.toLocaleString()}
                    </Text>
                  </View>

                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-xs text-emerald-700 font-medium">Paid So Far</Text>
                    <Text className="text-xs font-bold text-emerald-700">
                      {APP_CONFIG.CURRENCY_SYMBOL}
                      {item.paidAmount.toLocaleString()}
                    </Text>
                  </View>

                  <View className="flex-row justify-between items-center pt-1.5 border-t border-slate-200">
                    <Text className="text-xs font-bold text-rose-700">Pending Due</Text>
                    <Text className="text-sm font-extrabold text-rose-700">
                      {APP_CONFIG.CURRENCY_SYMBOL}
                      {item.pendingAmount.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row justify-end items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                  <Button
                    title="Print & Share"
                    variant="outline"
                    size="sm"
                    icon={<Ionicons name="print-outline" size={15} color="#334155" />}
                    onPress={() => handlePrintReceipt(item)}
                    isLoading={isGeneratingPdf}
                  />

                  {item.paymentStatus !== "PAID" && (
                    <Button
                      title="Record Payment"
                      variant="primary"
                      size="sm"
                      icon={<Ionicons name="card-outline" size={15} color="#FFFFFF" />}
                      onPress={() => handleOpenPaymentModal(item)}
                    />
                  )}
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
        subtitle={`Collect payment for ${selectedBill?.customer?.name} (#${selectedBill?.billNumber})`}
      >
        <View className="py-2">
          {/* Outstanding Balance Banner */}
          <View className="p-3 bg-rose-50 border border-rose-200 rounded-xl mb-4 flex-row justify-between items-center">
            <Text className="text-xs font-semibold text-rose-900">Pending Balance:</Text>
            <Text className="text-base font-extrabold text-rose-700">
              ₹{selectedBill?.pendingAmount?.toLocaleString()}
            </Text>
          </View>

          <Input
            label="Payment Amount (₹) *"
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            keyboardType="numeric"
            placeholder="Enter received amount"
          />

          {/* Payment Method Selector */}
          <Text className="text-xs font-semibold text-slate-700 mb-1.5">Payment Method *</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
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
                    className={`text-xs font-bold ${
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
            label="Transaction / Reference ID (Optional)"
            placeholder="Ex. UPI Ref / Cheque No."
            value={transactionRef}
            onChangeText={setTransactionRef}
          />

          <Input
            label="Remarks (Optional)"
            placeholder="Ex. Paid in full for current month"
            value={paymentNotes}
            onChangeText={setPaymentNotes}
          />

          <Button
            title="Confirm Payment & Share PDF"
            onPress={handleConfirmPayment}
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
