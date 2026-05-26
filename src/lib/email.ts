import nodemailer from "nodemailer";
import { google } from "googleapis";
import { formatMoney } from "./format";
import { getAccessToken } from "@/services/gmailOAuthService";
import { isAWSSESConfigured, sendReceiptViaAWSSES, sendReceiptViaAWSSESRaw } from "@/services/awsSESService";
import prisma from "./db";
import QRCode from "qrcode";
import { TenantBankConfig, resolveTenantBankBin } from "@/lib/bankQr";
import { buildEmvCoPayload } from "@/lib/emvco";

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

function buildReceiptHtml(payload: ReceiptEmailPayload & { qrCid?: string }) {
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
      ${payload.qrCid ? `<div style="margin:12px 0"><img src="cid:${payload.qrCid}" alt="Payment QR" style="width:200px;height:200px;"/></div>` : ""}
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
  // If tenant has bankConfig we will create an EMVCo QR image buffer and embed it
  let qrBuffer: Buffer | undefined;
  const qrCid = "payment-qr@scarfpos";
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: payload.tenantId },
      select: {
        name: true,
        bankName: true,
        bankBin: true,
        bankAccountNumber: true,
        bankAccountName: true,
        transferNotePrefix: true,
      },
    });
    const bankConfig: TenantBankConfig | null = tenant
      ? {
          bankName: tenant.bankName,
          bankBin: tenant.bankBin,
          accountNumber: tenant.bankAccountNumber,
          accountName: tenant.bankAccountName,
          transferNotePrefix: tenant.transferNotePrefix,
        }
      : null;
    const bankBin = resolveTenantBankBin(bankConfig);
    if (bankBin && bankConfig?.accountNumber) {
      const payloadStr = buildEmvCoPayload({
        bankBin,
        accountNumber: bankConfig.accountNumber,
        amount: String(payload.totalCents),
        referenceLabel: `${bankConfig.transferNotePrefix ?? payload.saleId}-${payload.saleId}`,
      });
      qrBuffer = await QRCode.toBuffer(payloadStr, { width: 400 });
      // we'll pass an extended payload with qrCid to the HTML builder and attach the buffer
    }
  } catch (err) {
    console.warn("Failed to build QR for email", err);
  }
  const extendedPayload = qrBuffer ? { ...payload, qrCid } : payload;
  const html = buildReceiptHtml(extendedPayload as ReceiptEmailPayload & { qrCid?: string });
  const subject = `${payload.tenantName} receipt ${payload.saleId}`;

  // 1. Try Gmail OAuth first
  try {
    const emailConfig = await prisma.emailConfig.findUnique({
      where: { tenantId: payload.tenantId },
    });

    if (emailConfig?.isConnected) {
      console.log(`📧 Sending via Gmail OAuth to: ${payload.to}`);
      await sendViaGmailAPI(payload, html, emailConfig, qrBuffer ? [{ filename: "payment-qr.png", content: qrBuffer, cid: qrCid }] : undefined);
      return;
    }
  } catch {
    console.warn("Gmail OAuth not available, trying next method...");
  }

  // 2. Try AWS SES (production)
    if (isAWSSESConfigured()) {
    try {
      console.log(`📧 Sending via AWS SES to: ${payload.to}`);
      const fromEmail = process.env.AWS_SES_FROM_EMAIL || "noreply@scarfpos.com";
      if (qrBuffer) {
        await sendReceiptViaAWSSESRaw({
          to: payload.to,
          from: fromEmail,
          subject,
          htmlContent: html,
          attachments: [{ filename: "payment-qr.png", content: qrBuffer, cid: qrCid }],
        });
      } else {
        await sendReceiptViaAWSSES({
          to: payload.to,
          from: fromEmail,
          subject,
          htmlContent: html,
        });
      }
      return;
    } catch (err) {
      console.warn("AWS SES failed, trying SMTP fallback...", err);
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
    const mailOptions: any = {
      from: config.from,
      to: payload.to,
      subject,
      html,
    };
    if (qrBuffer) {
      mailOptions.attachments = [
        { filename: "payment-qr.png", content: qrBuffer, cid: qrCid },
      ];
    }

    const info = await transporter.sendMail(mailOptions);

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
  emailConfig: { refreshToken: string; gmailEmail: string },
  attachments?: { filename: string; content: Buffer; cid?: string }[]
) {
  try {
    const accessToken = await getAccessToken(emailConfig.refreshToken);
    
    const auth = new google.auth.OAuth2();
    auth.setCredentials({
      access_token: accessToken,
    });
    
    const gmail = google.gmail({ version: "v1", auth });
    
    // If no attachments, send simple HTML as before
    if (!attachments || attachments.length === 0) {
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
      return result;
    }
    
    // Build multipart/related MIME with inline attachments
    const boundaryOuter = "====outer-boundary===";
    const boundaryInner = "====inner-boundary===";
    
    let parts: string[] = [];
    parts.push(`From: ${emailConfig.gmailEmail}`);
    parts.push(`To: ${payload.to}`);
    parts.push(`Subject: ${payload.tenantName} receipt ${payload.saleId}`);
    parts.push("MIME-Version: 1.0");
    parts.push(`Content-Type: multipart/related; boundary="${boundaryOuter}"; type="text/html"`);
    parts.push("");
    
    // inner alternative (only HTML)
    parts.push(`--${boundaryOuter}`);
    parts.push(`Content-Type: multipart/alternative; boundary="${boundaryInner}"`);
    parts.push("");
    parts.push(`--${boundaryInner}`);
    parts.push("Content-Type: text/html; charset=\"UTF-8\"");
    parts.push("");
    parts.push(html);
    parts.push("");
    parts.push(`--${boundaryInner}--`);
    
    // Attach inline images
    for (const att of attachments) {
      parts.push(`--${boundaryOuter}`);
      parts.push(`Content-Type: image/png; name="${att.filename}"`);
      parts.push("Content-Transfer-Encoding: base64");
      if (att.cid) parts.push(`Content-ID: <${att.cid}>`);
      parts.push(`Content-Disposition: inline; filename="${att.filename}"`);
      parts.push("");
      parts.push(att.content.toString("base64"));
      parts.push("");
    }
    
    parts.push(`--${boundaryOuter}--`);
    
    const raw = parts.join("\r\n");
    const base64Email = Buffer.from(raw).toString("base64");
    
    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: base64Email,
      },
    });
    
    console.log("✓ Email sent successfully via Gmail API");
    console.log(`   To: ${payload.to}`);
    console.log(`   Message ID: ${result.data.id}`);
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("✗ Gmail API send failed:", msg);
    throw new Error(`Gmail API failed: ${msg}`);
  }
}
