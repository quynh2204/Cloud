import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * GET /api/settings/email-config
 * Get tenant's email configuration
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const emailConfig = await prisma.emailConfig.findUnique({
      where: { tenantId: session.tenantId },
    });

    if (!emailConfig) {
      return NextResponse.json(
        { gmailEmail: null, isConnected: false },
        { status: 200 }
      );
    }

    return NextResponse.json({
      gmailEmail: emailConfig.gmailEmail,
      isConnected: emailConfig.isConnected,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/email-config
 * Disconnect Gmail for tenant
 */
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.emailConfig.update({
      where: { tenantId: session.tenantId },
      data: { isConnected: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
