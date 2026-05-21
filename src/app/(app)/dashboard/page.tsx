import Link from "next/link";
import prisma from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { getCurrentUserAccess } from "@/lib/access";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default async function DashboardPage() {
  const session = await requireSession();
  const access = await getCurrentUserAccess(session);
  const isOwner = access.isOwner;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const previousWeekStart = new Date(startOfWeek);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const monthWindowStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const visibleSalesWhere = {
    tenantId: session.tenantId,
    ...(isOwner ? {} : { userId: session.userId }),
  };

  const [productCount, salesToday, salesWeek, revenueToday, recentSales, saleItems] =
    await Promise.all([
      prisma.product.count({ where: { tenantId: session.tenantId } }),
      prisma.sale.count({
        where: {
          ...visibleSalesWhere,
          createdAt: { gte: startOfDay },
          status: { notIn: ["VOIDED", "REFUNDED"] },
        },
      }),
      prisma.sale.count({
        where: {
          ...visibleSalesWhere,
          createdAt: { gte: startOfWeek },
          status: { notIn: ["VOIDED", "REFUNDED"] },
        },
      }),
      prisma.sale.aggregate({
        where: {
          ...visibleSalesWhere,
          createdAt: { gte: startOfDay },
          status: { notIn: ["VOIDED", "REFUNDED"] },
        },
        _sum: { totalCents: true },
      }),
      prisma.sale.findMany({
        where: {
          ...visibleSalesWhere,
          status: { notIn: ["VOIDED", "REFUNDED"] },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.saleItem.findMany({
        where: {
          sale: {
            ...visibleSalesWhere,
            status: { notIn: ["VOIDED", "REFUNDED"] },
            createdAt: { gte: monthWindowStart },
          },
        },
        include: {
          sale: { select: { createdAt: true } },
          product: { select: { name: true, category: true, costCents: true } },
        },
      }),
    ]);

  const monthlyBuckets = Array.from({ length: 6 }, (_, offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - offset), 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("vi-VN", { month: "short" }),
      value: 0,
    };
  });

  const monthlyMap = new Map(monthlyBuckets.map((item) => [item.key, item]));
  for (const item of saleItems) {
    const key = `${item.sale.createdAt.getFullYear()}-${item.sale.createdAt.getMonth()}`;
    const bucket = monthlyMap.get(key);
    if (bucket) {
      bucket.value += item.lineTotalCents;
    }
  }

  const maxMonthlyRevenue = Math.max(...monthlyBuckets.map((bucket) => bucket.value), 1);

  const currentWeekRevenue = saleItems
    .filter((item) => item.sale.createdAt >= startOfWeek)
    .reduce((sum, item) => sum + item.lineTotalCents, 0);
  const previousWeekRevenue = saleItems
    .filter(
      (item) =>
        item.sale.createdAt >= previousWeekStart && item.sale.createdAt < startOfWeek
    )
    .reduce((sum, item) => sum + item.lineTotalCents, 0);

  const weekDeltaPercent =
    previousWeekRevenue === 0
      ? 100
      : Math.round(((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100);

  const productAgg = new Map<string, { name: string; revenue: number; quantity: number }>();
  const categoryAgg = new Map<string, number>();
  let cogsToday = 0;
  let cogsMonth = 0;

  for (const item of saleItems) {
    const existingProduct = productAgg.get(item.productId) || {
      name: item.product.name,
      revenue: 0,
      quantity: 0,
    };
    existingProduct.revenue += item.lineTotalCents;
    existingProduct.quantity += item.quantity;
    productAgg.set(item.productId, existingProduct);

    const category = item.product.category || "Uncategorized";
    categoryAgg.set(category, (categoryAgg.get(category) || 0) + item.lineTotalCents);

    if (item.sale.createdAt >= startOfDay) {
      cogsToday += item.quantity * item.product.costCents;
    }

    cogsMonth += item.quantity * item.product.costCents;
  }

  const topProducts = Array.from(productAgg.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const totalCategoryRevenue = Array.from(categoryAgg.values()).reduce((sum, v) => sum + v, 0) || 1;
  const categoryShare = Array.from(categoryAgg.entries())
    .map(([category, revenue]) => ({
      category,
      revenue,
      percent: Math.round((revenue / totalCategoryRevenue) * 100),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 4);

  const chartWidth = 720;
  const chartHeight = 240;
  const chartPadding = 24;
  const linePoints = monthlyBuckets.map((bucket, index) => {
    const x =
      chartPadding +
      (index * (chartWidth - chartPadding * 2)) /
        Math.max(monthlyBuckets.length - 1, 1);
    const normalized = bucket.value / maxMonthlyRevenue;
    const y = chartHeight - chartPadding - normalized * (chartHeight - chartPadding * 2);
    return { x, y };
  });
  const linePath = linePoints
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");

  const revenueTodayCents = revenueToday._sum.totalCents || 0;
  const grossProfitToday = revenueTodayCents - cogsToday;
  const grossProfitMonth = saleItems.reduce((sum, item) => sum + item.lineTotalCents, 0) - cogsMonth;
  const profitMarginToday = revenueTodayCents > 0 ? Math.round((grossProfitToday / revenueTodayCents) * 100) : 0;

  const overviewCards = isOwner
    ? [
        { label: "Total products", value: String(productCount), note: "Inventory" },
        { label: "Sales today", value: String(salesToday), note: "All receipts" },
        { label: "Revenue today", value: formatMoney(revenueTodayCents), note: "Cashflow" },
        { label: "COGS today", value: formatMoney(cogsToday), note: "Goods cost" },
        { label: "Gross profit", value: formatMoney(grossProfitToday), note: `${profitMarginToday}% margin` },
      ]
    : [
        { label: "My products", value: String(productCount), note: "Catalog" },
        { label: "My sales today", value: String(salesToday), note: "Your receipts" },
        { label: "My revenue today", value: formatMoney(revenueTodayCents), note: "Your sales" },
      ];

  const donutGradient =
    categoryShare.length > 0
      ? `conic-gradient(${categoryShare
          .map((item, index) => {
            const start = categoryShare.slice(0, index).reduce((sum, slice) => sum + slice.percent, 0);
            const end = start + item.percent;
            const colors = ["#4f7cff", "#29d6b2", "#f7b955", "#ff6b8a"];
            return `${colors[index % colors.length]} ${start}% ${end}%`;
          })
          .join(", ")})`
      : "conic-gradient(#4f7cff 0 100%)";

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

      <div className={`grid gap-4 ${isOwner ? "md:grid-cols-2 xl:grid-cols-5" : "md:grid-cols-3"}`}>
        {overviewCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{card.value}</p>
            <Badge className="mt-4">{card.note}</Badge>
          </div>
        ))}
      </div>

      {isOwner && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            <p className="text-sm text-muted">Monthly COGS</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatMoney(cogsMonth)}</p>
            <p className="mt-2 text-sm text-white/55">Cost of goods sold in the last 6 months window.</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            <p className="text-sm text-muted">Monthly gross profit</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatMoney(grossProfitMonth)}</p>
            <p className="mt-2 text-sm text-white/55">Revenue minus product cost for the same period.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Revenue trend</h2>
              <p className="text-sm text-white/55">Six-month business overview</p>
            </div>
            <Badge className="bg-white/10 text-white/80">{formatMoney(currentWeekRevenue)} this week</Badge>
          </div>

          <div className="mt-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-64 w-full">
              {[0, 25, 50, 75, 100].map((tick) => (
                <line
                  key={tick}
                  x1={chartPadding}
                  x2={chartWidth - chartPadding}
                  y1={chartPadding + ((chartHeight - chartPadding * 2) * tick) / 100}
                  y2={chartPadding + ((chartHeight - chartPadding * 2) * tick) / 100}
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="4 6"
                />
              ))}
              <path d={linePath} fill="none" stroke="#4f7cff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {linePoints.map((point, index) => (
                <circle key={index} cx={point.x} cy={point.y} r="5" fill="#4f7cff" stroke="#0f1220" strokeWidth="3" />
              ))}
            </svg>
            <div className="mt-3 grid grid-cols-6 gap-2 text-xs text-white/60">
              {monthlyBuckets.map((bucket) => (
                <div key={bucket.key} className="text-center">
                  <div className="truncate">{bucket.label}</div>
                  <div className="mt-1 text-white/85">{formatMoney(bucket.value)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-white">Category mix</h2>
          <p className="text-sm text-white/55">Share of revenue by category</p>
          <div className="mt-5 flex items-center justify-center">
            <div
              className="relative h-52 w-52 rounded-full"
              style={{ background: donutGradient }}
            >
              <div className="absolute inset-6 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]" />
              <div className="absolute inset-0 flex items-center justify-center text-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">Revenue</p>
                  <p className="text-2xl font-semibold text-white">{formatMoney(totalCategoryRevenue)}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {categoryShare.map((item, index) => (
              <div key={item.category} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-white/75">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ["#4f7cff", "#29d6b2", "#f7b955", "#ff6b8a"][index % 4] }} />
                  {item.category}
                </div>
                <span className="text-white/70">{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-white">Top products by revenue</h2>
          <div className="mt-4 space-y-3">
            {topProducts.length === 0 && (
              <p className="text-sm text-white/50">
                No product data yet.
              </p>
            )}
            {topProducts.map((product, index) => (
              <div
                key={product.name}
                className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
              >
                <div>
                  <p className="text-sm text-white/60">#{index + 1}</p>
                  <p className="text-sm text-white/80">{product.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/70">Revenue</p>
                  <p className="text-lg font-semibold text-white">
                    {formatMoney(product.revenue)}
                  </p>
                  <p className="text-xs text-white/50">Qty sold: {product.quantity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-white">Weekly momentum</h2>
          <p className="mt-3 text-sm text-muted">{salesWeek} transactions in the last 7 days.</p>
          <p className="mt-4 text-2xl font-semibold text-white">
            {weekDeltaPercent >= 0 ? "+" : ""}
            {weekDeltaPercent}%
          </p>
          <p className="mt-1 text-sm text-white/60">vs previous week revenue</p>
          <div className="mt-4 text-sm text-white/70 space-y-1">
            <p>Current week: {formatMoney(currentWeekRevenue)}</p>
            <p>Previous week: {formatMoney(previousWeekRevenue)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-white">Recent sales</h2>
        <div className="mt-4 space-y-3">
          {recentSales.length === 0 && (
            <p className="text-sm text-white/50">No sales yet. Start a new transaction.</p>
          )}
          {recentSales.map((sale) => (
            <div
              key={sale.id}
              className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
            >
              <div>
                <p className="text-sm text-white/60">{sale.id}</p>
                <p className="text-sm text-white/80">{sale.createdAt.toLocaleString("vi-VN")}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/70">Total</p>
                <p className="text-lg font-semibold text-white">{formatMoney(sale.totalCents)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
