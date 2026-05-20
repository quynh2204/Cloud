"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { toCents } from "@/lib/format";

export async function createProductAction(formData: FormData) {
  const session = await requireSession();
  const name = String(formData.get("name") || "").trim();
  const priceInput = String(formData.get("price") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const imageUrl = String(formData.get("imageUrl") || "").trim();

  if (!name || !priceInput) {
    return;
  }

  const priceCents = toCents(priceInput);

  await prisma.product.create({
    data: {
      tenantId: session.tenantId,
      name,
      priceCents,
      category: category || null,
      description: description || null,
      imageUrl: imageUrl || null,
    },
  });

  revalidatePath("/products");
}

export async function updateProductAction(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const priceInput = String(formData.get("price") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const imageUrl = String(formData.get("imageUrl") || "").trim();

  if (!id || !name || !priceInput) {
    return;
  }

  const priceCents = toCents(priceInput);

  await prisma.product.updateMany({
    where: { id, tenantId: session.tenantId },
    data: {
      name,
      priceCents,
      category: category || null,
      description: description || null,
      imageUrl: imageUrl || null,
    },
  });

  revalidatePath("/products");
}

export async function deleteProductAction(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") || "");

  if (!id) {
    return;
  }

  await prisma.product.deleteMany({
    where: { id, tenantId: session.tenantId },
  });

  revalidatePath("/products");
}
