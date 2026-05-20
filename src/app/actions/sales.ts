"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendReceiptEmail } from "@/lib/email";

type CartItem = {
  productId: string;
  quantity: number;
};

function parseItems(raw: string) {
  const items = JSON.parse(raw) as CartItem[];
  return items
    .filter((item) => item.productId && Number.isFinite(item.quantity))
    .map((item) => ({
      productId: item.productId,
      quantity: Math.max(1, Math.floor(item.quantity)),
    }));
}

export async function createSaleAction(formData: FormData) {
  const session = await requireSession();
  const rawItems = formData.get("items");
  const customerEmail = String(formData.get("customerEmail") || "").trim();

  if (typeof rawItems !== "string" || rawItems.length === 0) {
    redirect("/pos?error=EmptyCart");
  }

  let items: CartItem[] = [];
  try {
    items = parseItems(rawItems);
  } catch {
    redirect("/pos?error=InvalidCart");
  }
  if (!items.length) {
    redirect("/pos?error=EmptyCart");
  }

  const productIds = items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: {
      tenantId: session.tenantId,
      id: { in: productIds },
    },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));

  const lines: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }> = [];
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      redirect("/pos?error=MissingProduct");
    }
    const unitPriceCents = product.priceCents;
    const lineTotalCents = unitPriceCents * item.quantity;
    lines.push({
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPriceCents,
      lineTotalCents,
    });
  }

  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const totalCents = subtotalCents;

  const sale = await prisma.sale.create({
    data: {
      tenantId: session.tenantId,
      userId: session.userId,
      subtotalCents,
      totalCents,
      customerEmail: customerEmail || null,
      items: {
        create: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          lineTotalCents: line.lineTotalCents,
        })),
      },
    },
    include: { items: { include: { product: true } } },
  });

  let emailStatus = "skipped";
  if (customerEmail) {
    try {
      await sendReceiptEmail({
        to: customerEmail,
        tenantName: session.tenantName,
        saleId: sale.id,
        saleDate: sale.createdAt,
        lines: sale.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          lineTotalCents: item.lineTotalCents,
        })),
        subtotalCents: sale.subtotalCents,
        totalCents: sale.totalCents,
      });
      emailStatus = "sent";
    } catch {
      emailStatus = "failed";
    }
  }

  revalidatePath("/transactions");
  redirect(`/transactions/${sale.id}?email=${emailStatus}`);
}

export async function sendReceiptAction(formData: FormData) {
  const session = await requireSession();
  const saleId = String(formData.get("saleId") || "");
  const email = String(formData.get("email") || "").trim();

  if (!saleId || !email) {
    redirect(`/transactions/${saleId}?email=missing`);
  }

  const sale = await prisma.sale.findFirst({
    where: { id: saleId, tenantId: session.tenantId },
    include: { items: { include: { product: true } }, tenant: true },
  });

  if (!sale) {
    redirect("/transactions?error=NotFound");
  }

  await prisma.sale.update({
    where: { id: sale.id },
    data: { customerEmail: email },
  });

  try {
    await sendReceiptEmail({
      to: email,
      tenantName: sale.tenant.name,
      saleId: sale.id,
      saleDate: sale.createdAt,
      lines: sale.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.lineTotalCents,
      })),
      subtotalCents: sale.subtotalCents,
      totalCents: sale.totalCents,
    });
    redirect(`/transactions/${sale.id}?email=sent`);
  } catch {
    redirect(`/transactions/${sale.id}?email=failed`);
  }
}
