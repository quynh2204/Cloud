import { getSession } from "@/lib/auth";
import { salesService } from "@/services/salesService";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/sales/[id]
 * Get sale details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify session
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get sale with authorization
    const sale = await salesService.getSale(id, session.tenantId);

    return NextResponse.json(sale, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch sale";
    console.error("Sales API error:", message);

    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && error.message.includes("Unauthorized") ? 403 : 400 }
    );
  }
}
