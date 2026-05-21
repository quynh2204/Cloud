import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCurrentUserAccess } from "@/lib/access";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const access = await getCurrentUserAccess(session);
    return NextResponse.json({
      userId: session.userId,
      tenantId: session.tenantId,
      tenantName: session.tenantName,
      userName: session.userName,
      role: access.role,
      canManageProducts: access.canManageProducts,
      isOwner: access.isOwner,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
