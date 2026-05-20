import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getGmailUserEmail } from "@/services/gmailOAuthService";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";
import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "dev-secret-key-change-in-prod";

function encryptToken(token: string): string {
  return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
}

/**
 * GET /api/auth/google/callback
 * Handle OAuth redirect from Google
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?error=NoCode", request.url)
      );
    }

    // Verify session
    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Exchange code for tokens
    const tokenData = await exchangeCodeForTokens(code);
    const gmailEmail = await getGmailUserEmail(tokenData.accessToken);

    // Encrypt and store refresh token
    const encryptedToken = encryptToken(tokenData.refreshToken);

    await prisma.emailConfig.upsert({
      where: { tenantId: session.tenantId },
      update: {
        gmailEmail,
        refreshToken: encryptedToken,
        isConnected: true,
        updatedAt: new Date(),
      },
      create: {
        tenantId: session.tenantId,
        gmailEmail,
        refreshToken: encryptedToken,
      },
    });

    return NextResponse.redirect(
      new URL("/settings?success=GmailConnected", request.url)
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("OAuth callback error:", msg);
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(msg)}`, request.url)
    );
  }
}
