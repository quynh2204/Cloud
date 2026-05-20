import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg border border-[color:var(--border)] bg-transparent px-3 text-sm text-white",
        "placeholder:text-white/40 focus:border-[color:var(--accent)] focus:outline-none",
        className
      )}
      {...props}
    />
  );
}
