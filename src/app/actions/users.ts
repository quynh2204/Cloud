"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function createUserAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== "owner") {
    redirect("/team?error=Forbidden");
  }

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "staff").trim();

  if (!name || !email || !password) {
    redirect("/team?error=MissingFields");
  }

  if (password.length < 8) {
    redirect("/team?error=WeakPassword");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    redirect("/team?error=UserExists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: {
        tenantId: session.tenantId,
        name,
        email,
        passwordHash,
        role: role === "owner" ? "owner" : "staff",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Create user failed";
    if (msg.includes("Unique constraint failed")) {
      redirect("/team?error=UserExists");
    }
    console.error("Create user error:", msg);
    redirect("/team?error=CreateFailed");
  }

  revalidatePath("/team");
}

export async function deleteUserAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== "owner") {
    redirect("/team?error=Forbidden");
  }

  const userId = String(formData.get("userId") || "");
  if (!userId) {
    return;
  }

  if (userId === session.userId) {
    redirect("/team?error=CannotDeleteSelf");
  }

  await prisma.user.deleteMany({
    where: { id: userId, tenantId: session.tenantId },
  });

  revalidatePath("/team");
}
