import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10");

  try {
    const sales = await prisma.sale.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    const formattedSales = sales.map((sale) => ({
      id: sale.id,
      customerEmail: sale.customerEmail,
      customerName: sale.customerName,
      totalCents: sale.totalCents,
      createdAt: sale.createdAt.toISOString(),
      items: sale.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
      })),
    }));

    return NextResponse.json({ sales: formattedSales });
  } catch (error) {
    console.error("Failed to fetch sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  }
}
