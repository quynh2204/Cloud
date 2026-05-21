import prisma from "@/lib/db";
import type { SessionPayload } from "@/lib/auth";

export type CurrentUserAccess = {
  id: string;
  role: string;
  canManageProducts: boolean;
  isOwner: boolean;
};

export async function getCurrentUserAccess(session: SessionPayload) {
  const user = await prisma.user.findFirst({
    where: { id: session.userId, tenantId: session.tenantId },
    select: {
      id: true,
      role: true,
      canManageProducts: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    ...user,
    isOwner: user.role === "owner",
    canManageProducts: user.role === "owner" || user.canManageProducts,
  } satisfies CurrentUserAccess;
}

export async function canEditProducts(session: SessionPayload) {
  const access = await getCurrentUserAccess(session);
  return access.canManageProducts;
}
