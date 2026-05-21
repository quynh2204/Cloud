import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

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
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json(tenant);
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

    const updated = await prisma.tenant.update({
      where: { id: session.tenantId },
      data: {
        name: data.name,
        description: data.description,
        phone: data.phone,
        logo: data.logo,
      },
      select: {
        name: true,
        description: true,
        phone: true,
        logo: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update shop settings:", error);
    return NextResponse.json(
      { error: "Failed to update shop settings" },
      { status: 500 }
    );
  }
}
