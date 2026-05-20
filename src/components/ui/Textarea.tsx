import { cn } from "@/lib/cn";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[110px] w-full rounded-lg border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-white",
        "placeholder:text-white/40 focus:border-[color:var(--accent)] focus:outline-none",
        className
      )}
      {...props}
    />
  );
}
