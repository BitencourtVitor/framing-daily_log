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
    // Remove media-specific metas (Next.js viewport generates these), keep or create one clean meta
    document.querySelectorAll('meta[name="theme-color"][media]').forEach((m) => m.remove());
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    // setAttribute triggers MutationObserver — iOS Safari picks up the change
    meta.setAttribute("content", color);
  }, [resolvedTheme]);

  return null;
}
