import Link from "next/link";
import prisma from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { sendReceiptAction } from "@/app/actions/sales";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const emailStatus: Record<string, string> = {
  sent: "✓ Receipt emailed successfully.",
  failed: "✗ Email failed. Check SMTP settings and try again.",
  missing: "✗ Please provide an email address.",
  invalid: "✗ Invalid email address. Please check and try again.",
  skipped: "No email was sent for this transaction.",
};

export default async function TransactionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ saleId: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { saleId } = await params;
  const session = await requireSession();
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, tenantId: session.tenantId },
    include: { items: { include: { product: true } }, tenant: true },
  });

  if (!sale) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-white">Receipt not found</h1>
        <Link href="/transactions" className="text-accent">
          Back to transactions
        </Link>
      </div>
    );
  }

  const searchParamsData = await searchParams;
  const emailMessage = searchParamsData?.email
    ? emailStatus[searchParamsData.email]
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/50">Receipt</p>
          <h1 className="text-3xl font-semibold text-white">{sale.id}</h1>
          <p className="text-sm text-muted">
            {sale.createdAt.toLocaleString("vi-VN")}
          </p>
        </div>
        <Link href="/transactions" className="text-accent">
          Back to transactions
        </Link>
      </div>

      {emailMessage && (
        <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-white/70">
          {emailMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-white">
            {sale.tenant.name}
          </h2>
          <p className="text-sm text-muted">Scarf store receipt</p>
          <div className="mt-6 space-y-3">
            {sale.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between border-b border-[color:var(--border)] pb-3 text-sm"
              >
                <div>
                  <p className="text-white">{item.product.name}</p>
                  <p className="text-xs text-white/50">
                    Qty {item.quantity} x {formatMoney(item.unitPriceCents)}
                  </p>
                </div>
                <span className="text-white">
                  {formatMoney(item.lineTotalCents)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-2 text-sm text-white/70">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>{formatMoney(sale.subtotalCents)}</span>
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-white">
              <span>Total</span>
              <span>{formatMoney(sale.totalCents)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-white">Email receipt</h2>
          <p className="text-sm text-muted">
            Send the receipt to your customer.
          </p>
          <form action={sendReceiptAction} className="mt-4 space-y-4">
            <input type="hidden" name="saleId" value={sale.id} />
            <Input
              name="email"
              type="email"
              placeholder="customer@mail.com"
              defaultValue={sale.customerEmail || ""}
              required
            />
            <Button type="submit" className="w-full">
              Send receipt
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
