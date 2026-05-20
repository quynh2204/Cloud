import { cn } from "@/lib/cn";
import type { SelectHTMLAttributes } from "react";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-lg border border-[color:var(--border)] bg-transparent px-3 text-sm text-white",
        "focus:border-[color:var(--accent)] focus:outline-none",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
