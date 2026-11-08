import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Bill, Admin, Delivery } from "../types";

export interface GeneratePdfOptions {
  bill: Bill;
  admin?: Admin | null;
  deliveries?: Delivery[];
}

export class PdfService {
  /**
   * Builds the formatted HTML for the commercial invoice.
   */
  static buildInvoiceHtml({ bill, admin, deliveries = [] }: GeneratePdfOptions): string {
    const businessName = admin?.businessName || "Tiffin Distribution Services";
    const businessPhone = admin?.phone || "+91 98765 43210";
    const businessAddress = admin?.address || "Service Center";
    const upiId = admin?.upiId || "";

    const customerName = bill.customer?.name || "Valued Customer";
    const customerPhone = bill.customer?.phone || "-";
    const customerAddress = bill.customer?.address || "-";

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[bill.billingMonth - 1] || bill.billingMonth;

    // Use deliveries passed in options or from bill object
    const deliveryList = (deliveries && deliveries.length > 0) ? deliveries : (bill.deliveries || []);

    // Build day-by-day delivery map: { "YYYY-MM-DD": { breakfast: boolean, lunch: boolean, dinner: boolean, extra: number } }
    const daysMap: Record<string, { breakfast: boolean; lunch: boolean; dinner: boolean; extra: number }> = {};

    deliveryList.forEach((d) => {
      const dateKey = d.dateString;
      if (!daysMap[dateKey]) {
        daysMap[dateKey] = { breakfast: false, lunch: false, dinner: false, extra: 0 };
      }
      const type = (d.mealType || "LUNCH").toUpperCase();
      if (type === "BREAKFAST") daysMap[dateKey].breakfast = true;
      else if (type === "LUNCH") daysMap[dateKey].lunch = true;
      else if (type === "DINNER") daysMap[dateKey].dinner = true;
      else daysMap[dateKey].extra += d.quantity || 1;
    });

    // Sort days chronologically
    const sortedDates = Object.keys(daysMap).sort();

    const deliveryRows =
      sortedDates.length > 0
        ? sortedDates
            .map((dateStr) => {
              const day = daysMap[dateStr];
              const dateFormatted = new Date(`${dateStr}T00:00:00.000Z`).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              const markCheck = `<span style="color: #059669; font-weight: bold; font-size: 15px;">✓</span>`;
              const markCross = `<span style="color: #CBD5E1; font-weight: normal; font-size: 13px;">✕</span>`;

              return `
              <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 7px 10px; font-size: 12px; font-weight: 600; color: #1E293B;">${dateFormatted}</td>
                <td style="padding: 7px 10px; font-size: 12px; text-align: center;">${day.breakfast ? markCheck : markCross}</td>
                <td style="padding: 7px 10px; font-size: 12px; text-align: center;">${day.lunch ? markCheck : markCross}</td>
                <td style="padding: 7px 10px; font-size: 12px; text-align: center;">${day.dinner ? markCheck : markCross}</td>
                <td style="padding: 7px 10px; font-size: 12px; text-align: center; color: #EA580C; font-weight: bold;">${day.extra > 0 ? `+${day.extra}` : "-"}</td>
              </tr>
            `;
            })
            .join("")
        : `<tr><td colspan="5" style="padding: 10px; text-align: center; color: #94A3B8; font-style: italic;">No specific daily meal slots recorded for this month</td></tr>`;

    const paymentsRows =
      bill.payments && bill.payments.length > 0
        ? bill.payments
            .map(
              (p, idx) => `
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 9px 8px; font-size: 12px; color: #334155;">#${idx + 1}</td>
            <td style="padding: 9px 8px; font-size: 12px; color: #334155;">${new Date(
              p.paymentDate
            ).toLocaleDateString("en-IN")}</td>
            <td style="padding: 9px 8px; font-size: 12px; font-weight: 600; color: #0F172A;">${
              p.paymentMethod
            }</td>
            <td style="padding: 9px 8px; font-size: 12px; color: #64748B;">${
              p.transactionReference || "-"
            }</td>
            <td style="padding: 9px 8px; font-size: 12px; font-weight: bold; color: #059669; text-align: right;">₹${p.amount.toLocaleString(
              "en-IN"
            )}</td>
          </tr>
        `
            )
            .join("")
        : `<tr><td colspan="5" style="padding: 10px; text-align: center; color: #94A3B8; font-style: italic;">No payment transactions recorded yet</td></tr>`;

    const statusBadgeColor =
      bill.paymentStatus === "PAID"
        ? "#059669"
        : bill.paymentStatus === "PARTIAL"
        ? "#D97706"
        : "#DC2626";

    const statusBadgeBg =
      bill.paymentStatus === "PAID"
        ? "#ECFDF5"
        : bill.paymentStatus === "PARTIAL"
        ? "#FFFBEB"
        : "#FEF2F2";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice ${bill.billNumber}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1E293B;
              margin: 0;
              padding: 24px;
              background-color: #FFFFFF;
            }
            .header-table {
              width: 100%;
              border-bottom: 2px solid #EA580C;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .biz-title {
              font-size: 22px;
              font-weight: 800;
              color: #EA580C;
              margin: 0 0 4px 0;
            }
            .biz-sub {
              font-size: 11px;
              color: #64748B;
              margin: 2px 0;
            }
            .inv-badge {
              display: inline-block;
              background: ${statusBadgeBg};
              color: ${statusBadgeColor};
              border: 1px solid ${statusBadgeColor};
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.5px;
            }
            .info-box {
              background-color: #F8FAFC;
              border: 1px solid #E2E8F0;
              border-radius: 10px;
              padding: 12px 14px;
              margin-bottom: 16px;
            }
            table.items {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            table.items th {
              background-color: #F1F5F9;
              color: #475569;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 8px 10px;
              text-align: left;
            }
            .summary-table {
              width: 320px;
              margin-left: auto;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .summary-table td {
              padding: 6px 10px;
              font-size: 13px;
            }
            .footer {
              border-top: 1px dashed #CBD5E1;
              padding-top: 16px;
              font-size: 10px;
              color: #94A3B8;
              text-align: center;
              margin-top: 24px;
            }
          </style>
        </head>
        <body>
          <!-- Header -->
          <table class="header-table">
            <tr>
              <td style="vertical-align: top;">
                <h1 class="biz-title">${businessName}</h1>
                <p class="biz-sub">📍 ${businessAddress}</p>
                <p class="biz-sub">📞 ${businessPhone} ${upiId ? `| 💳 UPI: ${upiId}` : ""}</p>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <div class="inv-badge">${bill.paymentStatus}</div>
                <h3 style="margin: 6px 0 2px 0; font-size: 15px; color: #0F172A;">INVOICE / RECEIPT</h3>
                <p style="margin: 0; font-size: 12px; font-weight: 600; color: #EA580C;">${bill.billNumber}</p>
                <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748B;">Date: ${new Date().toLocaleDateString("en-IN")}</p>
              </td>
            </tr>
          </table>

          <!-- Customer & Period Info -->
          <table style="width: 100%; margin-bottom: 16px;">
            <tr>
              <td style="width: 50%; vertical-align: top; padding-right: 8px;">
                <div class="info-box">
                  <div style="font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 4px;">Billed To:</div>
                  <div style="font-size: 14px; font-weight: 700; color: #0F172A;">${customerName}</div>
                  <div style="font-size: 12px; color: #475569; margin-top: 2px;">📞 ${customerPhone}</div>
                  <div style="font-size: 11px; color: #64748B; margin-top: 2px;">📍 ${customerAddress}</div>
                </div>
              </td>
              <td style="width: 50%; vertical-align: top; padding-left: 8px;">
                <div class="info-box">
                  <div style="font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 4px;">Billing Period:</div>
                  <div style="font-size: 14px; font-weight: 700; color: #0F172A;">${monthName} ${bill.billingYear}</div>
                  <div style="font-size: 12px; color: #475569; margin-top: 2px;">Delivered Meals: <strong>${bill.deliveredCount} Tiffins</strong></div>
                  <div style="font-size: 11px; color: #64748B; margin-top: 2px;">Rate: ₹${bill.pricePerTiffin} per meal</div>
                </div>
              </td>
            </tr>
          </table>

          <!-- Daily Meal Log Table (Requested by User) -->
          <h4 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin: 12px 0 6px 0;">
            📅 Daily Meal Distribution Log (${monthName} ${bill.billingYear})
          </h4>
          <table class="items" style="border: 1px solid #E2E8F0; margin-bottom: 20px;">
            <thead>
              <tr>
                <th style="width: 32%;">Date</th>
                <th style="text-align: center; width: 17%;">Breakfast</th>
                <th style="text-align: center; width: 17%;">Lunch</th>
                <th style="text-align: center; width: 17%;">Dinner</th>
                <th style="text-align: center; width: 17%;">Extra</th>
              </tr>
            </thead>
            <tbody>
              ${deliveryRows}
            </tbody>
          </table>

          <!-- Financial Breakdown Table -->
          <h4 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin: 16px 0 6px 0;">
            💰 Cost Breakdown & Advance Adjustments
          </h4>
          <table class="items">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: center;">Rate</th>
                <th style="text-align: center;">Delivered</th>
                <th style="text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="padding: 10px 8px; font-size: 13px; font-weight: 600; color: #0F172A;">
                  Meals Delivered in ${monthName} ${bill.billingYear}
                  <div style="font-size: 11px; font-weight: normal; color: #64748B;">Only confirmed delivered meals are charged</div>
                </td>
                <td style="padding: 10px 8px; font-size: 13px; text-align: center; color: #334155;">₹${bill.pricePerTiffin}</td>
                <td style="padding: 10px 8px; font-size: 13px; text-align: center; font-weight: 600; color: #0F172A;">${bill.deliveredCount}</td>
                <td style="padding: 10px 8px; font-size: 13px; text-align: right; font-weight: 700; color: #0F172A;">₹${bill.totalAmount.toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>

          <!-- Payments & Advance Credits Recorded -->
          <h4 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin: 16px 0 6px 0;">
            💳 Payments & Advance Deposits Credited
          </h4>
          <table class="items">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Mode</th>
                <th>Ref ID / Details</th>
                <th style="text-align: right;">Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              ${paymentsRows}
            </tbody>
          </table>

          <!-- Summary Box -->
          <table class="summary-table">
            <tr>
              <td style="color: #64748B;">Total Billed Amount:</td>
              <td style="text-align: right; font-weight: 600; color: #0F172A;">₹${bill.totalAmount.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td style="color: #059669; font-weight: 600;">Advance & Payments Received:</td>
              <td style="text-align: right; font-weight: 700; color: #059669;">₹${bill.paidAmount.toLocaleString("en-IN")}</td>
            </tr>
            <tr style="border-top: 2px solid #E2E8F0; font-weight: bold;">
              <td style="color: #DC2626; font-size: 15px; padding-top: 10px;">Outstanding Balance:</td>
              <td style="text-align: right; color: #DC2626; font-size: 17px; padding-top: 10px;">₹${bill.pendingAmount.toLocaleString("en-IN")}</td>
            </tr>
          </table>

          <!-- Signature & Signoff -->
          <table style="width: 100%; margin-top: 20px;">
            <tr>
              <td style="width: 60%; vertical-align: bottom;">
                <p style="font-size: 12px; color: #64748B; margin: 0;">Thank you for subscribing to our fresh meal service!</p>
                <p style="font-size: 11px; color: #94A3B8; margin: 4px 0 0 0;">For queries, contact ${businessPhone}</p>
              </td>
              <td style="width: 40%; text-align: center; vertical-align: bottom;">
                <div style="border-bottom: 1px solid #94A3B8; width: 160px; margin: 0 auto 6px auto;"></div>
                <div style="font-size: 12px; font-weight: 700; color: #0F172A;">Authorized Signatory</div>
                <div style="font-size: 11px; color: #64748B;">${businessName}</div>
              </td>
            </tr>
          </table>

          <!-- Footer -->
          <div class="footer">
            Generated via Tiffin Management System • Computer generated invoice • ${new Date().toISOString()}
          </div>
        </body>
      </html>
    `;
    return html;
  }

  /**
   * Directly prints HTML or opens the system native print preview dialog
   * according to Expo Print docs: https://docs.expo.dev/versions/latest/sdk/print/
   */
  static async printInvoice(options: GeneratePdfOptions): Promise<void> {
    const html = this.buildInvoiceHtml(options);
    await Print.printAsync({ html });
  }

  /**
   * Generates a PDF file and shares via native share sheet.
   * If native sharing rejects or is unavailable, seamlessly falls back to system print preview.
   */
  static async generateAndShareReceipt(options: GeneratePdfOptions): Promise<void> {
    const html = this.buildInvoiceHtml(options);
    const { bill } = options;

    try {
      // 1. Generate client-side PDF file via expo-print
      const { uri: generatedUri } = await Print.printToFileAsync({ html });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        // Fall back to print dialog if sharing is not supported
        await Print.printAsync({ html });
        return;
      }

      // Try native share
      try {
        await Sharing.shareAsync(generatedUri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
          dialogTitle: `Share Invoice ${bill.billNumber}`,
        });
      } catch {
        // If direct share fails, copy to documents directory and share
        try {
          const safeFilename = `Invoice_${bill.billNumber}_${Date.now()}.pdf`;
          const docDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
          const targetUri = `${docDir}${safeFilename}`;
          await FileSystem.copyAsync({ from: generatedUri, to: targetUri });

          let shareUri = targetUri;
          if (Platform.OS === "android") {
            try {
              shareUri = await FileSystem.getContentUriAsync(targetUri);
            } catch {
              shareUri = targetUri.startsWith("file://") ? targetUri : `file://${targetUri}`;
            }
          }
          await Sharing.shareAsync(shareUri, {
            UTI: ".pdf",
            mimeType: "application/pdf",
            dialogTitle: `Share Invoice ${bill.billNumber}`,
          });
        } catch {
          // If still fails, fall back to Print.printAsync (user can preview and save to PDF)
          await Print.printAsync({ html });
        }
      }
    } catch {
      // Ultimate fallback: system print
      await Print.printAsync({ html });
    }
  }
}

export default PdfService;
