import { getSession } from "@/lib/auth";
import { emailService } from "@/services/emailService";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/emails/send
 * Send receipt email for a sale
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
    const { saleId, customerEmail } = body;

    if (!saleId || !customerEmail) {
      return NextResponse.json(
        { error: "Missing saleId or customerEmail" },
        { status: 400 }
      );
    }

    // Call email service
    const result = await emailService.sendReceipt({
      userId: session.userId,
      tenantId: session.tenantId,
      saleId,
      customerEmail,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send email";
    console.error("Email API error:", message);

    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
