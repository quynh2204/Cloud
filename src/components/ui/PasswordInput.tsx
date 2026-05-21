"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/Input";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        className={className ? `${className} pr-12` : "pr-12"}
        type={show ? "text" : "password"}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-3 text-xs font-medium text-white/60 hover:text-white"
        onClick={() => setShow((prev) => !prev)}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? "🙈" : "👁"}
      </button>
    </div>
  );
}
