"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { salesService } from "@/services/salesService";
import { emailService } from "@/services/emailService";

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

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function createSaleAction(formData: FormData) {
  const session = await requireSession();
  const rawItems = formData.get("items");
  const customerEmail = String(formData.get("customerEmail") || "").trim();
  const customerName = String(formData.get("customerName") || "").trim();
  const customerPhone = String(formData.get("customerPhone") || "").trim();
  const paymentMethod = String(formData.get("paymentMethod") || "cash");
  const amountReceivedCents = formData.get("amountReceivedCents");
  const notes = String(formData.get("notes") || "").trim();

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

  // Use sales service to create sale
  const saleItems = items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));

  let sale;
  try {
    sale = await salesService.createSale({
      userId: session.userId,
      tenantId: session.tenantId,
      items: saleItems,
      customerEmail: customerEmail || undefined,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      paymentMethod,
      amountReceivedCents: amountReceivedCents
        ? parseInt(String(amountReceivedCents), 10)
        : undefined,
      notes: notes || undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create sale failed";
    if (message.includes("Insufficient stock") || message.includes("Stock changed")) {
      redirect(`/pos?error=${encodeURIComponent(message)}`);
    }
    redirect("/pos?error=CreateSaleFailed");
  }
  // Do NOT auto-send email. Cashier must press Send Receipt manually.
  revalidatePath("/transactions");
  redirect(`/transactions/${sale.id}?email=skipped`);
}

export async function sendReceiptAction(formData: FormData) {
  const session = await requireSession();
  const saleId = String(formData.get("saleId") || "");
  const email = String(formData.get("email") || "").trim();

  if (!saleId || !email) {
    redirect(`/transactions/${saleId}?email=missing`);
  }

  if (!isValidEmail(email)) {
    redirect(`/transactions/${saleId}?email=invalid`);
  }

  // Update sale email
  await prisma.sale.update({
    where: { id: saleId },
    data: { customerEmail: email },
  });

  let emailStatus = "failed";
  try {
    await emailService.sendReceipt({
      userId: session.userId,
      tenantId: session.tenantId,
      saleId,
      customerEmail: email,
    });
    emailStatus = "sent";
  } catch (error) {
    console.error("Email send error:", error);
    emailStatus = "failed";
  }
  // Never catch redirect - it must throw
  redirect(`/transactions/${saleId}?email=${emailStatus}`);
}

export async function voidSaleAction(formData: FormData) {
  const session = await requireSession();
  const saleId = String(formData.get("saleId") || "");
  const reason = String(formData.get("reason") || "").trim();
  // Normalize to VOIDED per spec
  const status = "VOIDED";

  if (!saleId) {
    redirect("/transactions?error=MissingSale");
  }

  try {
    await salesService.voidSale({
      saleId,
      tenantId: session.tenantId,
      status: "VOIDED",
      reason: reason || undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "VoidFailed";
    redirect(`/transactions/${saleId}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/pos");
  redirect(`/transactions/${saleId}?success=Voided`);
}

export async function refundSaleAction(formData: FormData) {
  const session = await requireSession();
  const saleId = String(formData.get("saleId") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!saleId) {
    redirect(`/transactions/${saleId}?error=MissingRefundData`);
  }

  try {
    await salesService.refundSale({
      saleId,
      tenantId: session.tenantId,
      userId: session.userId,
      reason: reason || undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RefundFailed";
    redirect(`/transactions/${saleId}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/pos");
  redirect(`/transactions/${saleId}?success=Refunded`);
}
