import nodemailer from "nodemailer";
import { google } from "googleapis";
import { formatMoney } from "./format";
import { getAccessToken } from "@/services/gmailOAuthService";
import { isAWSSESConfigured, sendReceiptViaAWSSES } from "@/services/awsSESService";
import prisma from "./db";

export type ReceiptLine = {
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

type ReceiptEmailPayload = {
  to: string;
  tenantName: string;
  saleId: string;
  saleDate: Date;
  lines: ReceiptLine[];
  subtotalCents: number;
  totalCents: number;
  tenantId: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const portStr = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !portStr || !user || !pass) {
    throw new Error(
      "SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env"
    );
  }

  const port = Number(portStr);
  const isSecure = port === 465;

  return {
    host,
    port,
    secure: isSecure,
    auth: { user, pass },
    from,
  };
}

function buildReceiptHtml(payload: ReceiptEmailPayload) {
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

export async function sendReceiptEmail(payload: ReceiptEmailPayload) {
  const html = buildReceiptHtml(payload);
  const subject = `${payload.tenantName} receipt ${payload.saleId}`;

  // 1. Try Gmail OAuth first
  try {
    const emailConfig = await prisma.emailConfig.findUnique({
      where: { tenantId: payload.tenantId },
    });

    if (emailConfig?.isConnected) {
      console.log(`📧 Sending via Gmail OAuth to: ${payload.to}`);
      await sendViaGmailAPI(payload, html, emailConfig);
      return;
    }
  } catch (error) {
    console.warn("Gmail OAuth not available, trying next method...");
  }

  // 2. Try AWS SES (production)
  if (isAWSSESConfigured()) {
    try {
      console.log(`📧 Sending via AWS SES to: ${payload.to}`);
      const fromEmail = process.env.AWS_SES_FROM_EMAIL || "noreply@scarfpos.com";
      await sendReceiptViaAWSSES({
        to: payload.to,
        from: fromEmail,
        subject,
        htmlContent: html,
      });
      return;
    } catch (error) {
      console.warn("AWS SES failed, trying SMTP fallback...");
    }
  }

  // 3. Fallback to SMTP
  console.log(`📧 Sending via SMTP to: ${payload.to}`);
  const config = getSmtpConfig();
  
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  try {
    await transporter.verify();
    console.log("✓ SMTP connection verified");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("✗ SMTP verification failed:", msg);
    throw new Error(`Email server error: ${msg}`);
  }

  try {
    const info = await transporter.sendMail({
      from: config.from,
      to: payload.to,
      subject,
      html,
    });

    console.log("✓ Email sent successfully via SMTP");
    console.log(`   To: ${payload.to}`);
    
    return info;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("✗ Email send failed:", errorMsg);
    throw new Error(`Email delivery failed: ${errorMsg}`);
  }
}

/**
 * Send email via Gmail API (OAuth)
 */
async function sendViaGmailAPI(
  payload: ReceiptEmailPayload,
  html: string,
  emailConfig: { refreshToken: string; gmailEmail: string }
) {
  try {
    const accessToken = await getAccessToken(emailConfig.refreshToken);
    
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: accessToken,
    });
    
    const gmail = google.gmail({ version: "v1", auth });

    // Create email message
    const email = [
      `From: ${emailConfig.gmailEmail}`,
      `To: ${payload.to}`,
      `Subject: ${payload.tenantName} receipt ${payload.saleId}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "",
      html,
    ].join("\r\n");

    const base64Email = Buffer.from(email).toString("base64");

    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: base64Email,
      },
    });

    console.log("✓ Email sent successfully via Gmail API");
    console.log(`   To: ${payload.to}`);
    console.log(`   Message ID: ${result.data.id}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("✗ Gmail API send failed:", msg);
    throw new Error(`Gmail API failed: ${msg}`);
  }
}
