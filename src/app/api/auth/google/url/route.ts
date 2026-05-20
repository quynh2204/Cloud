import { NextRequest, NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/services/gmailOAuthService";

/**
 * GET /api/auth/google/url
 * Get the OAuth authorization URL
 */
export async function GET() {
  try {
    const url = getAuthorizationUrl();
    return NextResponse.json({ url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
