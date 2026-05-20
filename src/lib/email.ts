import nodemailer from "nodemailer";
import { formatMoney } from "./format";

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
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!user || !pass || !from) {
    throw new Error("SMTP credentials are not configured");
  }

  return {
    host,
    port,
    secure: port === 465,
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
  const config = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  const html = buildReceiptHtml(payload);

  await transporter.sendMail({
    from: config.from,
    to: payload.to,
    subject: `${payload.tenantName} receipt ${payload.saleId}`,
    html,
  });
}
