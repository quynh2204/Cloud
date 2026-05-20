import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

export default async function TransactionsPage() {
  const session = await requireSession();
  const sales = await prisma.sale.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-white/50">Transactions</p>
        <h1 className="text-3xl font-semibold text-white">Receipts</h1>
        <p className="text-sm text-muted">Review sales by tenant.</p>
      </div>

      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
        {sales.length === 0 && (
          <p className="text-sm text-white/50">
            No transactions yet.
          </p>
        )}
        <div className="space-y-3">
          {sales.map((sale) => (
            <div
              key={sale.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
            >
              <div>
                <p className="text-sm text-white/50">{sale.id}</p>
                <p className="text-sm text-white/80">
                  {sale.createdAt.toLocaleString("vi-VN")}
                </p>
                <p className="text-xs text-white/50">
                  {sale.items.length} items
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/60">Total</p>
                <p className="text-lg font-semibold text-white">
                  {formatMoney(sale.totalCents)}
                </p>
                {sale.customerEmail && (
                  <Badge className="mt-2">Email sent</Badge>
                )}
              </div>
              <Link
                href={`/transactions/${sale.id}`}
                className="text-sm font-medium text-accent"
              >
                View receipt
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
