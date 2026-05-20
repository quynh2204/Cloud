import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { logoutAction } from "@/app/actions/auth";
import { requireSession } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex h-screen">
      <Sidebar tenantName={session.tenantName} userName={session.userName} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--surface)] px-8 py-4">
          <div>
            <p className="text-sm text-white/50">Tenant</p>
            <h2 className="text-lg font-semibold text-white">
              {session.tenantName}
            </h2>
          </div>
          <form action={logoutAction}>
            <Button variant="outline" type="submit">
              Log out
            </Button>
          </form>
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
