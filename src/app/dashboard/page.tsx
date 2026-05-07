"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LogOut, Sun, Moon, ClipboardList, CheckCircle2, Clock,
  CalendarDays, Layers, RefreshCw, History, ShieldCheck, Loader2,
  Download,
} from "lucide-react";

interface LogSummary {
  _id: string;
  date: string;
  status: string;
  workers: { name: string }[];
  activities: unknown[];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [name, setName]         = useState("");
  const [role, setRole]         = useState("");
  const [logs, setLogs]         = useState<LogSummary[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting]   = useState<string | null>(null);
  const today = localToday();

  useEffect(() => {
    fetch("/api/me").then((r) => r.ok ? r.json() : {} as { name?: string; role?: string }).then((d) => { setName(d.name ?? ""); setRole(d.role ?? ""); });
    fetch("/api/daily-log").then((r) => r.ok ? r.json() : []).then(setLogs);
  }, []);

  const todayLog = logs?.find((l) => l.date === today) ?? (logs === null ? undefined : null);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("loginUser");
    router.push("/login");
  }

  const exportPDF = useCallback(async (log: LogSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setExporting(log._id);
    try {
      const res = await fetch(`/api/daily-log/${log._id}/pdf`);
      if (!res.ok) { alert("Failed to generate PDF"); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `daily-log-${log.date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }, []);

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/minilogo_black.png" alt="Premium Framing" width={28} height={28} className="object-contain dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/minilogo_white.png" alt="Premium Framing" width={28} height={28} className="object-contain hidden dark:block" />
          <div>
            <p className="text-sm font-medium leading-tight text-foreground">Daily Log</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Premium Framing</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={async () => {
              setRefreshing(true);
              const res = await fetch("/api/daily-log");
              const data = res.ok ? await res.json() : [];
              setLogs(data);
              setRefreshing(false);
            }}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-5 min-h-0">
        {/* Welcome */}
        <div className="shrink-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{greeting()}</p>
          <h1 className="text-2xl font-semibold text-foreground mt-0.5">{name || " "}</h1>
        </div>

        {/* Today */}
        <div className="bg-card border border-border/40 rounded-xl p-5 space-y-4 shrink-0">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={13} className="text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Today</p>
          </div>

          {todayLog === undefined ? (
            <p className="text-sm text-muted-foreground">Checking…</p>
          ) : todayLog !== null ? (
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => router.push(`/log/${todayLog._id}`)}
            >
              <CheckCircle2 size={20} className="text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Daily log submitted</p>
                <p className="text-xs text-muted-foreground">Tap to view details</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock size={20} className="text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">No daily log submitted yet.</p>
              </div>
              <button
                onClick={() => router.push("/log/new")}
                className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <ClipboardList size={16} />
                Fill Daily Log
              </button>
            </div>
          )}
        </div>

        {/* My Logs */}
        <div className="bg-card border border-border/40 rounded-xl p-5 flex flex-col gap-3 flex-1 min-h-0">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <History size={13} className="text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">My Logs</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Tap to view details</p>
          </div>

          {logs === null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No logs yet.</p>
          ) : (
            <div className="overflow-y-auto flex-1 space-y-2 pr-0.5">
              {logs.map((log) => (
                <div
                  key={log._id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-primary/30 [background-color:var(--primary-tint)] hover:[background-color:var(--primary-tint-hover)] transition-colors cursor-pointer"
                  onClick={() => router.push(`/log/${log._id}`)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CalendarDays size={14} className="text-muted-foreground shrink-0" />
                    <p className="text-sm font-medium text-foreground truncate">
                      {log.date === today ? "Today" : fmtDate(log.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {log.activities.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Layers size={12} />
                        {log.activities.length}
                      </div>
                    )}
                    <button
                      onClick={(e) => exportPDF(log, e)}
                      disabled={exporting === log._id}
                      className="p-1 rounded text-primary transition-colors disabled:opacity-40"
                      title="Export PDF"
                    >
                      {exporting === log._id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin View */}
        {(role === "admin" || role === "dev") && (
          <button
            onClick={() => router.push("/admin")}
            className="w-full flex items-center justify-center gap-2 border border-primary/30 [background-color:var(--primary-tint)] rounded-xl py-3 text-xs font-semibold text-primary hover:[background-color:var(--primary-tint-hover)] transition-colors shrink-0"
          >
            <ShieldCheck size={14} />
            Admin View
          </button>
        )}
      </main>
    </div>
  );
}
