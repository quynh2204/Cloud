import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import prisma from "@/lib/db";

const SESSION_COOKIE = "pos_session";
const SESSION_DURATION = "7d";


export type SessionPayload = {
  userId: string;
  tenantId: string;
  tenantName: string;
  userName: string;
  role: string;
};

function isSessionPayload(payload: unknown): payload is SessionPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<SessionPayload>;
  return (
    typeof candidate.userId === "string" &&
    typeof candidate.tenantId === "string" &&
    typeof candidate.tenantName === "string" &&
    typeof candidate.userName === "string" &&
    typeof candidate.role === "string" &&
    candidate.userId.length > 0 &&
    candidate.tenantId.length > 0
  );
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSessionSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSessionSecret());

    if (isSessionPayload(payload)) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: String(payload.tenantId) },
        select: { passwordChangedAt: true },
      });
      const issuedAt =
        typeof (payload as { iat?: unknown }).iat === "number"
          ? ((payload as { iat?: number }).iat ?? null)
          : null;
      const changedAt = tenant?.passwordChangedAt;
      if (issuedAt && changedAt && issuedAt * 1000 < changedAt.getTime()) {
        return null;
      }
    }

    return isSessionPayload(payload) ? payload : null;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
