import { cn } from "@/lib/cn";
import type { SelectHTMLAttributes } from "react";

export function Select({
  className,
  children,
  value,
  onChange,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  // If onChange is provided, treat as controlled component with value
  // Otherwise, use defaultValue to avoid read-only warning
  if (onChange) {
    return (
      <select
        className={cn(
          "h-11 w-full rounded-lg border border-[color:var(--border)] bg-transparent px-3 text-sm text-white",
          "focus:border-[color:var(--accent)] focus:outline-none",
          className
        )}
        value={value ?? ""}
        onChange={onChange}
        {...props}
      >
        {children}
      </select>
    );
  }

  return (
    <select
      className={cn(
        "h-11 w-full rounded-lg border border-[color:var(--border)] bg-transparent px-3 text-sm text-white",
        "focus:border-[color:var(--accent)] focus:outline-none",
        className
      )}
      defaultValue={value}
      {...props}
    >
      {children}
    </select>
  );
}
