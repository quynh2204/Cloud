import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const errorMessages: Record<string, string> = {
  MissingFields: "Please fill in all fields.",
  InvalidTenant: "Store code is not valid.",
  InvalidCredentials: "Login failed. Check store code and credentials.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const error = searchParams?.error;

  return (
    <div className="w-full max-w-lg rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="mb-6">
        <p className="text-sm text-white/50">ScarfPOS</p>
        <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
        <p className="text-sm text-muted">Sign in to your store dashboard.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 px-4 py-2 text-sm text-[color:var(--danger)]">
          {errorMessages[error] || "Something went wrong. Try again."}
        </div>
      )}

      <form action={loginAction} className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-white/50">
            Store code
          </label>
          <Input name="tenantSlug" placeholder="silk-scarf" required />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-white/50">
            Email
          </label>
          <Input name="email" type="email" placeholder="you@store.com" required />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-white/50">
            Password
          </label>
          <Input name="password" type="password" placeholder="********" required />
        </div>
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-sm text-white/60">
        New store?{" "}
        <Link href="/register" className="text-accent">
          Create tenant
        </Link>
      </p>
    </div>
  );
}
