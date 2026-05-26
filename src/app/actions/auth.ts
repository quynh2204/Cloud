"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { clearSession, createSession } from "@/lib/auth";

function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function registerAction(formData: FormData) {
  const tenantName = String(formData.get("tenantName") || "").trim();
  const tenantSlugInput = String(formData.get("tenantSlug") || "").trim();
  const userName = String(formData.get("userName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!tenantName || !tenantSlugInput || !userName || !email || !password) {
    redirect("/register?error=MissingFields");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    redirect("/register?error=InvalidEmail");
  }

  if (password.length < 8) {
    redirect("/register?error=WeakPassword");
  }

  const tenantSlug = normalizeSlug(tenantSlugInput);
  if (!tenantSlug) {
    redirect("/register?error=InvalidTenant");
  }

  const existingTenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
  });

  if (existingTenant) {
    redirect("/register?error=TenantExists");
  }

  // Check if email already exists globally (unique constraint)
  const existingUser = await prisma.user.findFirst({
    where: { email },
  });

  if (existingUser) {
    redirect("/register?error=EmailExists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let tenant;
  try {
    tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        slug: tenantSlug,
        users: {
          create: {
            name: userName,
            email,
            passwordHash,
            role: "owner",
          },
        },
      },
      include: { users: true },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Registration failed";
    if (msg.includes("Unique constraint failed")) {
      redirect("/register?error=EmailExists");
    }
    console.error("Register error:", msg);
    redirect("/register?error=RegisterFailed");
  }

  // Move redirect outside try-catch (must throw to work properly)
  const user = tenant.users[0];
  await createSession({
    userId: user.id,
    tenantId: tenant.id,
    tenantName: tenant.name,
    userName: user.name,
    role: user.role,
  });

  redirect("/dashboard");
}

export async function loginAction(formData: FormData) {
  const tenantSlugInput = String(formData.get("tenantSlug") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!tenantSlugInput || !email || !password) {
    redirect("/login?error=MissingFields");
  }

  const tenantSlug = normalizeSlug(tenantSlugInput);
  if (!tenantSlug) {
    redirect("/login?error=InvalidTenant");
  }

  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug },
  });

  if (!tenant) {
    redirect("/login?error=InvalidCredentials");
  }

  const user = await prisma.user.findFirst({
    where: {
      email,
    },
  });

  if (!user || user.tenantId !== tenant.id) {
    redirect("/login?error=InvalidCredentials");
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    redirect("/login?error=InvalidCredentials");
  }

  await createSession({
    userId: user.id,
    tenantId: tenant.id,
    tenantName: tenant.name,
    userName: user.name,
    role: user.role,
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
