import { google } from "googleapis";
import { getAccessToken } from "./gmailOAuthService";
import { formatMoney } from "@/lib/format";

export type ReceiptLine = {
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

type GmailReceiptPayload = {
  to: string;
  tenantName: string;
  saleId: string;
  saleDate: Date;
  lines: ReceiptLine[];
  subtotalCents: number;
  totalCents: number;
};

function buildReceiptHtml(payload: GmailReceiptPayload) {
  const rows = payload.lines
    .map(
      (line) =>
        `<tr>
          <td>${line.name}</td>
          <td style="text-align:center;">${line.quantity}</td>
          <td style="text-align:right;">${formatMoney(line.unitPriceCents)}</td>
          <td style="text-align:right;">${formatMoney(line.lineTotalCents)}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2 style="margin: 0 0 8px;">${payload.tenantName} - Receipt</h2>
      <p style="margin: 0 0 12px;">Transaction: ${payload.saleId}</p>
      <p style="margin: 0 0 12px;">Date: ${payload.saleDate.toLocaleString("vi-VN")}</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom: 1px solid #ddd; padding: 6px 0;">Item</th>
            <th style="text-align:center; border-bottom: 1px solid #ddd; padding: 6px 0;">Qty</th>
            <th style="text-align:right; border-bottom: 1px solid #ddd; padding: 6px 0;">Price</th>
            <th style="text-align:right; border-bottom: 1px solid #ddd; padding: 6px 0;">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top: 16px; text-align: right;">
        <p style="margin: 0;">Subtotal: ${formatMoney(payload.subtotalCents)}</p>
        <p style="margin: 4px 0 0; font-weight: 700;">Total: ${formatMoney(payload.totalCents)}</p>
      </div>
    </div>
  `;
}

/**
 * Send receipt via Gmail API using tenant's OAuth credentials
 */
export async function sendReceiptViaGmailAPI(
  encryptedRefreshToken: string,
  fromEmail: string,
  payload: GmailReceiptPayload
) {
  console.log(`📧 Sending via Gmail API to: ${payload.to}`);

  try {
    // Get fresh access token
    const accessToken = await getAccessToken(encryptedRefreshToken);

    // Create Gmail client
    const gmail = google.gmail({ version: "v1" });

    const html = buildReceiptHtml(payload);

    // Build email message
    const message = [
      `From: ${fromEmail}`,
      `To: ${payload.to}`,
      `Subject: ${payload.tenantName} receipt ${payload.saleId}`,
      "MIME-Version: 1.0",
      'Content-type: text/html; charset="UTF-8"',
      "",
      html,
    ].join("\n");

    // Base64 encode the message
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    // Send email via Gmail API
    const result = await gmail.users.messages.send(
      {
        userId: "me",
        requestBody: {
          raw: encodedMessage,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log("✓ Email sent successfully via Gmail API");
    console.log(`   To: ${payload.to}`);
    console.log(`   Message ID: ${result.data.id}`);

    return result.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("✗ Gmail API send failed:", errorMsg);
    throw new Error(`Gmail API delivery failed: ${errorMsg}`);
  }
}
