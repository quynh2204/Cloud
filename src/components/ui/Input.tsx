import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

export function Input({ className, value, onChange, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  // If onChange is provided, treat as controlled component with value
  // Otherwise, use defaultValue to avoid read-only warning
  if (onChange) {
    return (
      <input
        className={cn(
          "h-11 w-full rounded-lg border border-[color:var(--border)] bg-transparent px-3 text-sm text-white",
          "placeholder:text-white/40 focus:border-[color:var(--accent)] focus:outline-none",
          className
        )}
        value={value ?? ""}
        onChange={onChange}
        {...props}
      />
    );
  }

  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg border border-[color:var(--border)] bg-transparent px-3 text-sm text-white",
        "placeholder:text-white/40 focus:border-[color:var(--accent)] focus:outline-none",
        className
      )}
      defaultValue={value}
      {...props}
    />
  );
}
