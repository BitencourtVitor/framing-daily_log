"use client";

import { ThemeProvider } from "next-themes";
import { ThemeColorMeta } from "@/components/ThemeColorMeta";
import { I18nProvider } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ThemeColorMeta />
        {children}
      </ThemeProvider>
    </I18nProvider>
  );
}
