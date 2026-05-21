"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type Theme = "dark" | "light";

function setTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  document.cookie = `theme=${theme}; path=/; max-age=31536000`;
}

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    const fromStorage = localStorage.getItem("theme") as Theme | null;
    if (fromStorage === "light" || fromStorage === "dark") {
      return fromStorage;
    }

    return "dark";
  });

  useEffect(() => {
    setTheme(theme);
  }, [theme]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setThemeState(next);
  }

  return (
    <Button variant="outline" type="button" onClick={toggleTheme}>
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </Button>
  );
}
