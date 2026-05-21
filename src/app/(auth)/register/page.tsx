import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

const errorMessages: Record<string, string> = {
  MissingFields: "Please fill in all fields.",
  InvalidTenant: "Store code is not valid.",
  TenantExists: "Store code already exists.",
  InvalidEmail: "Email format is invalid.",
  EmailExists: "This email is already registered.",
  WeakPassword: "Password must be at least 8 characters.",
  RegisterFailed: "Registration failed. Please try again.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <div className="w-full max-w-lg rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="mb-6">
        <p className="text-sm text-white/50">ScarfPOS</p>
        <h1 className="text-2xl font-semibold text-white">Create your store</h1>
        <p className="text-sm text-muted">
          Spin up a new tenant and invite staff later.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 px-4 py-2 text-sm text-[color:var(--danger)]">
          {errorMessages[error] || "Something went wrong. Try again."}
        </div>
      )}

      <form action={registerAction} className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-white/50">
            Store name
          </label>
          <Input name="tenantName" placeholder="Silk & Co." required />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-white/50">
            Store code
          </label>
          <Input name="tenantSlug" placeholder="silk-scarf" required />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-white/50">
            Owner name
          </label>
          <Input name="userName" placeholder="Store owner" required />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-white/50">
            Email
          </label>
          <Input name="email" type="email" placeholder="owner@store.com" required />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-white/50">
            Password
          </label>
          <PasswordInput
            name="password"
            placeholder="Min 8 characters"
            minLength={8}
            required
          />
        </div>
        <Button type="submit" className="w-full">
          Create tenant
        </Button>
      </form>

      <p className="mt-6 text-sm text-white/60">
        Already registered?{" "}
        <Link href="/login" className="text-accent">
          Sign in
        </Link>
      </p>
    </div>
  );
}
