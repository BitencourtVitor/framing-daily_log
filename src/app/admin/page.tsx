"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, ClipboardList, ChevronRight, ShieldCheck, Car, Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const MENU = [
  { href: "/admin/users",    Icon: Users,         titleKey: "admin.manageUsers",    subKey: "admin.manageUsersSub" },
  { href: "/admin/logs",     Icon: ClipboardList, titleKey: "admin.dailyLogList",   subKey: "admin.dailyLogListSub" },
  { href: "/admin/vehicles", Icon: Car,           titleKey: "admin.vehicles",        subKey: "admin.vehiclesSub" },
  { href: "/admin/email",    Icon: Mail,          titleKey: "admin.emailRecipients", subKey: "admin.emailRecipientsSub" },
];

export default function AdminPage() {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.role !== "admin" && d.role !== "dev") router.replace("/dashboard");
      });
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => router.push("/dashboard")} className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <ShieldCheck size={16} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">{t("admin.title")}</p>
        </div>
        <LanguageSwitcher />
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 flex flex-col gap-3">
        {MENU.map(({ href, Icon, titleKey, subKey }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className="w-full flex items-center gap-4 bg-card border border-border/40 rounded-xl px-5 py-4 hover:border-primary/40 hover:bg-accent/30 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{t(titleKey)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t(subKey)}</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground shrink-0" />
          </button>
        ))}
      </main>
    </div>
  );
}
