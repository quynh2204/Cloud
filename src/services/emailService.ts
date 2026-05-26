import { sendReceiptEmail, type ReceiptLine } from "@/lib/email";
import { sendReceiptViaGmailAPI } from "./gmailAPIService";
import prisma from "@/lib/db";

export type EmailPayload = {
  userId: string;
  tenantId: string;
  saleId: string;
  customerEmail: string;
};

/**
 * Email service: handle all email operations
 * Priority: Gmail API (if OAuth configured) → SMTP fallback
 */
export const emailService = {
  /**
   * Send receipt email for a sale
   */
  async sendReceipt(payload: EmailPayload) {
    // Validate email
    if (!payload.customerEmail) {
      throw new Error("Customer email is required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.customerEmail)) {
      throw new Error("Invalid email format");
    }

    // Get sale with tenant and items
    const sale = await prisma.sale.findUnique({
      where: { id: payload.saleId },
      include: {
        tenant: true,
        items: true,
      },
    });

    if (!sale) {
      throw new Error("Sale not found");
    }

    // Verify ownership
    if (sale.tenantId !== payload.tenantId) {
      throw new Error("Unauthorized: sale does not belong to your tenant");
    }

    // Build receipt lines
    const lines: ReceiptLine[] = sale.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
    }));

    // Check if tenant has Gmail OAuth configured
    const emailConfig = await prisma.emailConfig.findUnique({
      where: { tenantId: payload.tenantId },
    });

    if (emailConfig && emailConfig.isConnected) {
      // Use Gmail API
      console.log("📧 Using Gmail API for email...");
      await sendReceiptViaGmailAPI(
        emailConfig.refreshToken,
        emailConfig.gmailEmail,
        {
          to: payload.customerEmail,
          tenantName: sale.tenant.name,
          saleId: sale.id,
          saleDate: sale.createdAt,
          lines,
          subtotalCents: sale.subtotalCents,
          totalCents: sale.totalCents,
        }
      );
    } else {
      // Fallback to SMTP
      console.log("📧 Gmail not configured, using SMTP fallback...");
      await sendReceiptEmail({
        to: payload.customerEmail,
        tenantName: sale.tenant.name,
        tenantId: payload.tenantId,
        saleId: sale.id,
        saleDate: sale.createdAt,
        lines,
        subtotalCents: sale.subtotalCents,
        totalCents: sale.totalCents,
      });
    }

    return {
      success: true,
      message: `Receipt sent to ${payload.customerEmail}`,
    };
  },
};
