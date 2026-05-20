import { google } from "googleapis";
import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "dev-secret-key-change-in-prod";

/**
 * Gmail OAuth Service
 * Handles authorization and token management for tenant Gmail accounts
 */

function encryptToken(token: string): string {
  return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
}

function decryptToken(encrypted: string): string {
  const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return decrypted.toString(CryptoJS.enc.Utf8);
}

export function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google OAuth not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI in .env"
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthorizationUrl(): string {
  const oauth2Client = getOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent",
  });
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuthClient();

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      throw new Error("No refresh token returned from Google");
    }

    return {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token || "",
      expiresIn: tokens.expiry_date || Date.now() + 3600000,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to exchange code for tokens: ${msg}`);
  }
}

export async function getAccessToken(
  encryptedRefreshToken: string
): Promise<string> {
  const refreshToken = decryptToken(encryptedRefreshToken);
  const oauth2Client = getOAuthClient();

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials.access_token || "";
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to refresh access token: ${msg}`);
  }
}

export async function getGmailUserEmail(accessToken: string): Promise<string> {
  try {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Gmail user info request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.email;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get Gmail user info: ${msg}`);
  }
}

export { encryptToken, decryptToken };
