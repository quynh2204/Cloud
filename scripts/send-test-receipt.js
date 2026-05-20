const nodemailer = require("nodemailer");

function formatMoney(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildReceiptHtml({ tenantName, saleId, saleDate, lines, total }) {
  const rows = lines
    .map(
      (line) => `
        <tr>
          <td>${line.name}</td>
          <td style="text-align:center;">${line.quantity}</td>
          <td style="text-align:right;">${formatMoney(line.unitPrice)}</td>
          <td style="text-align:right;">${formatMoney(line.lineTotal)}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2 style="margin: 0 0 8px;">${tenantName} - Receipt</h2>
      <p style="margin: 0 0 12px;">Transaction: ${saleId}</p>
      <p style="margin: 0 0 12px;">Date: ${saleDate}</p>
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
        <p style="margin: 4px 0 0; font-weight: 700;">Total: ${formatMoney(total)}</p>
      </div>
    </div>
  `;
}

async function main() {
  const recipient = process.argv[2];
  if (!recipient) {
    console.error("Usage: node scripts/send-test-receipt.js recipient@example.com");
    process.exit(1);
  }

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!user || !pass || !from) {
    console.error("SMTP credentials are missing in .env");
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const lines = [
    {
      name: "Silk scarf - Azure",
      quantity: 2,
      unitPrice: 350000,
      lineTotal: 700000,
    },
    {
      name: "Linen scarf - Sand",
      quantity: 1,
      unitPrice: 220000,
      lineTotal: 220000,
    },
  ];

  const html = buildReceiptHtml({
    tenantName: "ScarfPOS Demo",
    saleId: "TEST-RECEIPT-001",
    saleDate: new Date().toLocaleString("vi-VN"),
    lines,
    total: 920000,
  });

  await transporter.sendMail({
    from,
    to: recipient,
    subject: "ScarfPOS receipt TEST-RECEIPT-001",
    html,
  });

  console.log(`Receipt sent to ${recipient}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
