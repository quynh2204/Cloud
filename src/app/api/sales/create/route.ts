import { getSession } from "@/lib/auth";
import { salesService } from "@/services/salesService";
import { NextRequest, NextResponse } from "next/server";
import { PAYMENT_METHOD } from "@/lib/sales";

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
    const {
      items,
      customerEmail,
      customerName,
      customerPhone,
      paymentMethod,
      amountReceivedCents,
      notes,
      taxRate,
      discountCents,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items are required" },
        { status: 400 }
      );
    }

    const normalizedItems = items.map((item: { productId?: unknown; quantity?: unknown }) => ({
      productId: String(item.productId || ""),
      quantity: Number(item.quantity),
    }));

    if (
      normalizedItems.some(
        (item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0
      )
    ) {
      return NextResponse.json(
        { error: "Each item must have a valid productId and positive integer quantity" },
        { status: 400 }
      );
    }

    const normalizedPaymentMethod = paymentMethod
      ? String(paymentMethod)
      : PAYMENT_METHOD.CASH;

    const parsedAmountReceived =
      amountReceivedCents === undefined || amountReceivedCents === null
        ? undefined
        : Number(amountReceivedCents);

    if (
      parsedAmountReceived !== undefined &&
      (!Number.isFinite(parsedAmountReceived) || parsedAmountReceived < 0)
    ) {
      return NextResponse.json(
        { error: "amountReceivedCents must be a non-negative number" },
        { status: 400 }
      );
    }

    const parsedTaxRate =
      taxRate === undefined || taxRate === null ? undefined : Number(taxRate);
    const parsedDiscount =
      discountCents === undefined || discountCents === null
        ? undefined
        : Number(discountCents);

    // Create sale
    const sale = await salesService.createSale({
      userId: session.userId,
      tenantId: session.tenantId,
      items: normalizedItems,
      customerEmail: customerEmail ? String(customerEmail) : undefined,
      customerName: customerName ? String(customerName) : undefined,
      customerPhone: customerPhone ? String(customerPhone) : undefined,
      paymentMethod: normalizedPaymentMethod,
      amountReceivedCents: parsedAmountReceived,
      notes: notes ? String(notes) : undefined,
      taxRate: parsedTaxRate,
      discountCents: parsedDiscount,
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
