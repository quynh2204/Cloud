import { getSession } from "@/lib/auth";
import { salesService } from "@/services/salesService";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/sales/create
 * Create a new sale
 */
export async function POST(request: NextRequest) {
  try {
    // Verify session
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { items, customerEmail } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items are required" },
        { status: 400 }
      );
    }

    // Create sale
    const sale = await salesService.createSale({
      userId: session.userId,
      tenantId: session.tenantId,
      items,
      customerEmail,
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create sale";
    console.error("Sales API error:", message);

    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
