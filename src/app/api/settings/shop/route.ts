import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

function normalizeBankConfig(data: unknown) {
  if (!data || typeof data !== "object") {
    return undefined;
  }

  const bankConfig = data as Record<string, unknown>;
  return {
    bankName: typeof bankConfig.bankName === "string" ? bankConfig.bankName.trim() : "",
    bankBin: typeof bankConfig.bankBin === "string" ? bankConfig.bankBin.trim() : "",
    accountNumber: typeof bankConfig.accountNumber === "string" ? bankConfig.accountNumber.trim() : "",
    accountName: typeof bankConfig.accountName === "string" ? bankConfig.accountName.trim() : "",
    transferNotePrefix: typeof bankConfig.transferNotePrefix === "string" ? bankConfig.transferNotePrefix.trim() : "",
  } satisfies Record<string, string>;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: {
        name: true,
        description: true,
        phone: true,
        logo: true,
        bankName: true,
        bankBin: true,
        bankAccountNumber: true,
        bankAccountName: true,
        transferNotePrefix: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...tenant,
      bankConfig: {
        bankName: tenant.bankName ?? "",
        bankBin: tenant.bankBin ?? "",
        accountNumber: tenant.bankAccountNumber ?? "",
        accountName: tenant.bankAccountName ?? "",
        transferNotePrefix: tenant.transferNotePrefix ?? "",
      },
    });
  } catch (error) {
    console.error("Failed to fetch shop settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await request.json();

    const bankConfig = normalizeBankConfig(data.bankConfig);

    const updated = await prisma.tenant.update({
      where: { id: session.tenantId },
      data: {
        name: data.name,
        description: data.description,
        phone: data.phone,
        logo: data.logo,
        bankName: bankConfig?.bankName,
        bankBin: bankConfig?.bankBin,
        bankAccountNumber: bankConfig?.accountNumber,
        bankAccountName: bankConfig?.accountName,
        transferNotePrefix: bankConfig?.transferNotePrefix,
      },
      select: {
        name: true,
        description: true,
        phone: true,
        logo: true,
        bankName: true,
        bankBin: true,
        bankAccountNumber: true,
        bankAccountName: true,
        transferNotePrefix: true,
      },
    });

    return NextResponse.json({
      ...updated,
      bankConfig: {
        bankName: updated.bankName ?? "",
        bankBin: updated.bankBin ?? "",
        accountNumber: updated.bankAccountNumber ?? "",
        accountName: updated.bankAccountName ?? "",
        transferNotePrefix: updated.transferNotePrefix ?? "",
      },
    });
  } catch (error) {
    console.error("Failed to update shop settings:", error);
    return NextResponse.json(
      { error: "Failed to update shop settings" },
      { status: 500 }
    );
  }
}
