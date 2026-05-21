import Link from "next/link";
import prisma from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type TransactionsSearchParams = {
  fromDate?: string;
  toDate?: string;
  amountRange?: "all" | "0-5000000" | "5000000-20000000" | "20000000+";
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<TransactionsSearchParams>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const amountRange = params.amountRange || "all";

  const where: {
    tenantId: string;
    createdAt?: { gte?: Date; lt?: Date };
    totalCents?: { gte?: number; lt?: number };
  } = {
    tenantId: session.tenantId,
  };

  if (params.fromDate || params.toDate) {
    const fromDate = params.fromDate
      ? new Date(`${params.fromDate}T00:00:00.000`)
      : undefined;
    const toDate = params.toDate
      ? new Date(`${params.toDate}T23:59:59.999`)
      : undefined;

    if ((fromDate && !Number.isNaN(fromDate.getTime())) || (toDate && !Number.isNaN(toDate.getTime()))) {
      where.createdAt = {
        ...(fromDate && !Number.isNaN(fromDate.getTime()) ? { gte: fromDate } : {}),
        ...(toDate && !Number.isNaN(toDate.getTime()) ? { lt: new Date(toDate.getTime() + 1) } : {}),
      };
    }
  }

  if (amountRange === "0-5000000") {
    where.totalCents = { gte: 0, lt: 5000000 };
  }

  if (amountRange === "5000000-20000000") {
    where.totalCents = { gte: 5000000, lt: 20000000 };
  }

  if (amountRange === "20000000+") {
    where.totalCents = { gte: 20000000 };
  }

  const sales = await prisma.sale.findMany({
    where,
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

      <form className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Input name="fromDate" type="date" defaultValue={params.fromDate || ""} />
          <Input name="toDate" type="date" defaultValue={params.toDate || ""} />

          <select
            name="amountRange"
            defaultValue={amountRange}
            className="h-11 rounded-lg border border-[color:var(--border)] bg-transparent px-3 text-sm text-white"
          >
            <option value="all">All values</option>
            <option value="0-5000000">0 - 5,000,000</option>
            <option value="5000000-20000000">5,000,000 - 20,000,000</option>
            <option value="20000000+">Above 20,000,000</option>
          </select>

          <div className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 text-xs text-white/55">
            Date range
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button type="submit" size="sm">
            Apply filters
          </Button>
          <Link href="/transactions" className="text-sm text-white/60 hover:text-white">
            Reset
          </Link>
        </div>
        <p className="mt-3 text-xs text-white/50">Tip: set a from/to date to narrow the receipt list. Amount range is optional and can be combined with the date range.</p>
      </form>

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
                <Badge className="mt-2">{sale.status}</Badge>
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
