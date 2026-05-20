import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default async function DashboardPage() {
  const session = await requireSession();
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  const [productCount, salesToday, salesWeek, revenueToday, recentSales] =
    await Promise.all([
      prisma.product.count({ where: { tenantId: session.tenantId } }),
      prisma.sale.count({
        where: { tenantId: session.tenantId, createdAt: { gte: startOfDay } },
      }),
      prisma.sale.count({
        where: { tenantId: session.tenantId, createdAt: { gte: startOfWeek } },
      }),
      prisma.sale.aggregate({
        where: { tenantId: session.tenantId, createdAt: { gte: startOfDay } },
        _sum: { totalCents: true },
      }),
      prisma.sale.findMany({
        where: { tenantId: session.tenantId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/50">Dashboard</p>
          <h1 className="text-3xl font-semibold text-white">
            Welcome back, {session.userName}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/products">
            <Button variant="outline">Manage products</Button>
          </Link>
          <Link href="/pos">
            <Button>New sale</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <p className="text-sm text-muted">Total products</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {productCount}
          </p>
          <Badge className="mt-4">Inventory</Badge>
        </div>
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <p className="text-sm text-muted">Sales today</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {salesToday}
          </p>
          <Badge className="mt-4">Daily activity</Badge>
        </div>
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <p className="text-sm text-muted">Revenue today</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {formatMoney(revenueToday._sum.totalCents || 0)}
          </p>
          <Badge className="mt-4">Cashflow</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-white">Recent sales</h2>
          <div className="mt-4 space-y-3">
            {recentSales.length === 0 && (
              <p className="text-sm text-white/50">
                No sales yet. Start a new transaction.
              </p>
            )}
            {recentSales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
              >
                <div>
                  <p className="text-sm text-white/60">{sale.id}</p>
                  <p className="text-sm text-white/80">
                    {sale.createdAt.toLocaleString("vi-VN")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/70">Total</p>
                  <p className="text-lg font-semibold text-white">
                    {formatMoney(sale.totalCents)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-white">This week</h2>
          <p className="mt-3 text-sm text-muted">
            {salesWeek} transactions in the last 7 days.
          </p>
          <div className="mt-6 space-y-3 text-sm text-white/60">
            <p>Keep products updated for smoother checkout.</p>
            <p>Use email receipts to build customer trust.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
