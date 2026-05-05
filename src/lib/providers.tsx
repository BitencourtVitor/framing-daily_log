"use client";

import { ThemeProvider } from "next-themes";
import { ThemeColorMeta } from "@/components/ThemeColorMeta";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ThemeColorMeta />
      {children}
    </ThemeProvider>
  );
}
