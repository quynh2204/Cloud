"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { toCents } from "@/lib/format";
import { canEditProducts, getCurrentUserAccess } from "@/lib/access";

export async function createProductAction(formData: FormData) {
  const session = await requireSession();
  if (!(await canEditProducts(session))) {
    redirect("/products?error=Forbidden");
  }
  const name = String(formData.get("name") || "").trim();
  const priceInput = String(formData.get("price") || "").trim();
  const costInput = String(formData.get("cost") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const imageUrl = String(formData.get("imageUrl") || "").trim();
  const stockQuantity = Math.max(
    0,
    parseInt(String(formData.get("stockQuantity") || "0"), 10) || 0
  );

  if (!name || !priceInput) {
    return;
  }

  const priceCents = toCents(priceInput);
  const costCents = costInput ? toCents(costInput) : 0;

  await prisma.product.create({
    data: {
      tenantId: session.tenantId,
      name,
      priceCents,
      costCents,
      stockQuantity,
      category: category || null,
      description: description || null,
      imageUrl: imageUrl || null,
    },
  });

  revalidatePath("/products");
}

export async function updateProductAction(formData: FormData) {
  const session = await requireSession();
  if (!(await canEditProducts(session))) {
    redirect("/products?error=Forbidden");
  }
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const priceInput = String(formData.get("price") || "").trim();
  const costInput = String(formData.get("cost") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const imageUrl = String(formData.get("imageUrl") || "").trim();
  const stockQuantity = Math.max(
    0,
    parseInt(String(formData.get("stockQuantity") || "0"), 10) || 0
  );

  if (!id || !name || !priceInput) {
    return;
  }

  const priceCents = toCents(priceInput);
  const costCents = costInput ? toCents(costInput) : 0;

  await prisma.product.updateMany({
    where: { id, tenantId: session.tenantId },
    data: {
      name,
      priceCents,
      costCents,
      stockQuantity,
      category: category || null,
      description: description || null,
      imageUrl: imageUrl || null,
    },
  });

  revalidatePath("/products");
}

export async function deleteProductAction(formData: FormData) {
  const session = await requireSession();
  const user = await getCurrentUserAccess(session);
  if (!user.isOwner) {
    redirect("/products?error=Forbidden");
  }
  const id = String(formData.get("id") || "");
  const confirmation = String(formData.get("confirmation") || "");

  if (!id || confirmation !== "DELETE") {
    return;
  }

  await prisma.product.deleteMany({
    where: { id, tenantId: session.tenantId },
  });

  revalidatePath("/products");
}
