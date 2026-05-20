import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]",
        size === "sm" ? "h-9 px-3 text-sm" : "h-11 px-4 text-sm",
        variant === "primary" &&
          "bg-[color:var(--accent)] text-white hover:brightness-110",
        variant === "outline" &&
          "border border-[color:var(--border)] text-white/90 hover:border-white/40",
        variant === "ghost" && "text-white/80 hover:text-white",
        variant === "danger" &&
          "bg-[color:var(--danger)] text-white hover:brightness-110",
        className
      )}
      {...props}
    />
  );
}
