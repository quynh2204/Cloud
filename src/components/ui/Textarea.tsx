import { cn } from "@/lib/cn";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({
  className,
  value,
  onChange,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  // If onChange is provided, treat as controlled component with value
  // Otherwise, use defaultValue to avoid read-only warning
  if (onChange) {
    return (
      <textarea
        className={cn(
          "min-h-[110px] w-full rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-white",
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
    <textarea
      className={cn(
        "min-h-[110px] w-full rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-white",
        "placeholder:text-white/40 focus:border-[color:var(--accent)] focus:outline-none",
        className
      )}
      defaultValue={value}
      {...props}
    />
  );
}
