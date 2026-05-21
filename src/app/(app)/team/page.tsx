import prisma from "@/lib/db";
import { requireSession } from "@/lib/auth";
import {
  createUserAction,
  deleteUserAction,
  updateUserPermissionsAction,
} from "@/app/actions/users";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const errorMessages: Record<string, string> = {
  MissingFields: "Fill in all required fields.",
  UserExists: "Email already exists.",
  Forbidden: "Only owners can manage users.",
  CannotDeleteSelf: "You cannot delete your own account.",
  WeakPassword: "Password must be at least 8 characters.",
  CreateFailed: "Failed to create user. Please try again.",
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const isOwner = session.role === "owner";
  const users = await prisma.user.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      canManageProducts: true,
      createdAt: true,
    },
  });

  const params = await searchParams;
  const error = params?.error
    ? errorMessages[params.error]
    : undefined;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-white/50">Team</p>
        <h1 className="text-3xl font-semibold text-white">Staff users</h1>
        <p className="text-sm text-muted">
          Add staff accounts for your tenant.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 px-4 py-2 text-sm text-[color:var(--danger)]">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-white">Add user</h2>
        {isOwner ? (
          <form action={createUserAction} className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-wide text-white/50">
                Full name
              </label>
              <Input name="name" placeholder="Staff name" required />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-white/50">
                Email
              </label>
              <Input name="email" type="email" placeholder="staff@store.com" required />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-white/50">
                Password
              </label>
              <Input
                name="password"
                type="password"
                placeholder="Min 8 characters"
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-white/50">
                Role
              </label>
              <Select name="role" defaultValue="staff">
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </Select>
            </div>
            <label className="flex items-center gap-3 text-sm text-white/75 md:col-span-2">
              <input
                type="checkbox"
                name="canManageProducts"
                className="h-4 w-4 rounded border-[color:var(--border)] bg-transparent text-[color:var(--accent)]"
              />
              Allow product add/update
            </label>
            <div className="md:col-span-2">
              <Button type="submit" className="w-fit">
                Create user
              </Button>
            </div>
          </form>
        ) : (
          <p className="mt-3 text-sm text-white/50">
            Only owners can create new users.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-white">Current users</h2>
        <div className="mt-4 space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
            >
              <div>
                <p className="text-sm text-white">{user.name}</p>
                <p className="text-xs text-white/50">{user.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-white/50">Role</p>
                <p className="text-sm text-white">{user.role}</p>
              </div>
              {isOwner && user.role !== "owner" && (
                <form action={updateUserPermissionsAction} className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] px-3 py-2">
                  <input type="hidden" name="userId" value={user.id} />
                  <label className="flex items-center gap-2 text-xs text-white/70">
                    <input
                      type="checkbox"
                      name="canManageProducts"
                      defaultChecked={user.canManageProducts}
                      className="h-4 w-4 rounded border-[color:var(--border)] bg-transparent text-[color:var(--accent)]"
                    />
                    Product add/update
                  </label>
                  <Button type="submit" size="sm" variant="outline">
                    Save
                  </Button>
                </form>
              )}
              {isOwner && (
                <form action={deleteUserAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <Button type="submit" variant="danger" size="sm">
                    Remove
                  </Button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
