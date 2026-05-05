"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

const COLORS: Record<string, string> = {
  light: "#ffffff",
  dark:  "#1a1a1a",
};

export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const color = COLORS[resolvedTheme] ?? COLORS.light;
    // Remove all existing theme-color metas (incl. media-specific ones from Next.js viewport)
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = color;
    document.head.appendChild(meta);
  }, [resolvedTheme]);

  return null;
}
