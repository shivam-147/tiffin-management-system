import Customer from "../customers/customer.model";
import Subscription from "../subscriptions/subscription.model";
import Delivery from "../deliveries/delivery.model";
import Bill from "../billing/bill.model";

class DashboardService {
  async getSummary() {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const billingPeriod = `${year}-${String(month).padStart(2, "0")}`;

    // Run parallel aggregation pipelines
    const [
      customerStats,
      subscriptionStats,
      deliveryStats,
      billingStats,
    ] = await Promise.all([
      // 1. Customer breakdown
      Customer.aggregate([
        {
          $group: {
            _id: "$isActive",
            count: { $sum: 1 },
          },
        },
      ]),

      // 2. Subscription breakdown & remaining tiffins
      Subscription.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            remainingTiffins: { $sum: "$remainingQuantity" },
          },
        },
      ]),

      // 3. Today's delivery breakdown
      Delivery.aggregate([
        {
          $match: {
            dateString: todayStr,
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      // 4. Current month billing totals
      Bill.aggregate([
        {
          $match: {
            billingPeriod,
          },
        },
        {
          $group: {
            _id: null,
            totalBilling: { $sum: "$totalAmount" },
            totalCollected: { $sum: "$paidAmount" },
            totalPending: { $sum: "$pendingAmount" },
          },
        },
      ]),
    ]);

    // Format customer numbers
    let activeCustomers = 0;
    let inactiveCustomers = 0;
    for (const item of customerStats) {
      if (item._id === true) activeCustomers = item.count;
      if (item._id === false) inactiveCustomers = item.count;
    }

    // Format subscription numbers
    let activePackages = 0;
    let pausedPackages = 0;
    let completedPackages = 0;
    let cancelledPackages = 0;
    let totalRemainingTiffins = 0;

    for (const item of subscriptionStats) {
      if (item._id === "ACTIVE") {
        activePackages = item.count;
        totalRemainingTiffins += item.remainingTiffins;
      } else if (item._id === "PAUSED") {
        pausedPackages = item.count;
        totalRemainingTiffins += item.remainingTiffins;
      } else if (item._id === "COMPLETED") {
        completedPackages = item.count;
      } else if (item._id === "CANCELLED") {
        cancelledPackages = item.count;
      }
    }

    // Format today's delivery numbers
    let todayPending = 0;
    let todayDelivered = 0;
    let todaySkipped = 0;
    let todayFailed = 0;

    for (const item of deliveryStats) {
      if (item._id === "PENDING") todayPending = item.count;
      else if (item._id === "DELIVERED") todayDelivered = item.count;
      else if (item._id === "SKIPPED") todaySkipped = item.count;
      else if (item._id === "FAILED") todayFailed = item.count;
    }

    // Format billing totals
    const currentMonthBilling = billingStats[0] || {
      totalBilling: 0,
      totalCollected: 0,
      totalPending: 0,
    };

    return {
      date: todayStr,
      billingPeriod,
      customers: {
        active: activeCustomers,
        inactive: inactiveCustomers,
        total: activeCustomers + inactiveCustomers,
      },
      packages: {
        active: activePackages,
        paused: pausedPackages,
        completed: completedPackages,
        cancelled: cancelledPackages,
        totalRemainingTiffins,
      },
      deliveriesToday: {
        pending: todayPending,
        delivered: todayDelivered,
        skipped: todaySkipped,
        failed: todayFailed,
        total: todayPending + todayDelivered + todaySkipped + todayFailed,
      },
      monthlyFinancials: {
        period: billingPeriod,
        totalBilled: currentMonthBilling.totalBilling,
        totalCollected: currentMonthBilling.totalCollected,
        totalPending: currentMonthBilling.totalPending,
      },
    };
  }
}

export default new DashboardService();
