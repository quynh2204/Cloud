"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/team", label: "Team" },
  { href: "/pos", label: "PoS" },
  { href: "/transactions", label: "Transactions" },
];

type SidebarProps = {
  tenantName: string;
  userName: string;
};

export function Sidebar({ tenantName, userName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-[color:var(--border)] bg-[color:var(--surface)]">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--accent)] text-lg font-semibold">
          S
        </div>
        <div>
          <p className="text-sm text-white/60">Scarf PoS</p>
          <p className="text-lg font-semibold text-white">{tenantName}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-2 px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[color:var(--border)] px-6 py-4 text-xs text-white/60">
        Signed in as
        <span className="block text-sm font-semibold text-white">{userName}</span>
      </div>
    </aside>
  );
}
