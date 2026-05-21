import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: {
        passwordChangedAt: true,
      },
    });

    return NextResponse.json({
      passwordChangedAt: tenant?.passwordChangedAt,
    });
  } catch (error) {
    console.error("Failed to fetch security settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch security settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, oldPassword, newPassword } = await request.json();

    if (action === "change-password") {
      if (!oldPassword || !newPassword) {
        return NextResponse.json(
          { error: "Missing password fields" },
          { status: 400 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }

      // Verify old password
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const validPassword = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!validPassword) {
        return NextResponse.json(
          {
            error: "Current password is incorrect",
            errorCode: "INVALID_CURRENT_PASSWORD",
          },
          { status: 401 }
        );
      }

      // Update password
      const newHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: session.userId },
        data: { passwordHash: newHash },
      });

      // Update password changed timestamp
      await prisma.tenant.update({
        where: { id: session.tenantId },
        data: { passwordChangedAt: new Date() },
      });

      return NextResponse.json({ success: true, message: "Password changed" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update security settings:", error);
    return NextResponse.json(
      { error: "Failed to update security settings" },
      { status: 500 }
    );
  }
}
