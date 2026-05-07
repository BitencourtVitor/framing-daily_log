"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ShieldCheck, CalendarDays, User,
  Camera, Layers, Loader2, RefreshCw,
  Download, MapPin,
} from "lucide-react";

interface LogEntry {
  _id: string;
  date: string;
  supervisorId: string;
  supervisorName: string;
  status: "draft" | "submitted";
  activityCount: number;
  workerCount: number;
  photoCount: number;
  locationPath?: string[];
  createdAt: string;
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export default function AdminLogsPage() {
  const router = useRouter();
  const [logs, setLogs]         = useState<LogEntry[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me").then((r) => r.ok ? r.json() : {} as { role?: string }).then((d) => {
      if (d.role !== "admin" && d.role !== "dev") router.replace("/dashboard");
    });
    load();
  }, [router]);

  async function load() {
    setRefreshing(true);
    const data = await fetch("/api/admin/logs").then((r) => r.json());
    setLogs(Array.isArray(data) ? data : []);
    setRefreshing(false);
  }

  const exportPDF = useCallback(async (log: LogEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setExporting(log._id);
    try {
      const res = await fetch(`/api/daily-log/${log._id}/pdf`);
      if (!res.ok) { alert("Failed to generate PDF"); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `daily-log-${log.date}-${log.supervisorName.replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => router.push("/admin")} className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <ShieldCheck size={16} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Daily Log List</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
        </button>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-3">
        {logs === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />Loading…
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No logs yet.</p>
        ) : (
          logs.map((log) => {
            const isExporting = exporting === log._id;
            return (
              <div
                key={log._id}
                onClick={() => router.push(`/log/${log._id}`)}
                className="bg-card border border-border/40 rounded-xl px-4 py-3 space-y-2 hover:border-primary/30 hover:bg-accent/20 transition-colors cursor-pointer"
              >
                {/* Row 1: date + PDF */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <CalendarDays size={14} className="text-muted-foreground shrink-0" />
                    <p className="text-sm font-semibold text-foreground truncate">{fmtDate(log.date)}</p>
                  </div>
                  <button
                    onClick={(e) => exportPDF(log, e)}
                    disabled={isExporting}
                    className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 shrink-0"
                    title="Export PDF"
                  >
                    {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  </button>
                </div>

                {/* Row 2: supervisor */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User size={12} className="shrink-0" />
                  <span>{log.supervisorName}</span>
                </div>

                {/* Row 3: location */}
                {log.locationPath && log.locationPath.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin size={12} className="shrink-0 text-primary" />
                    <span className="truncate">{log.locationPath.join(" › ")}</span>
                  </div>
                )}

                {/* Row 4: stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {log.activityCount > 0 && (
                    <span className="flex items-center gap-1"><Layers size={11} />{log.activityCount} {log.activityCount === 1 ? "activity" : "activities"}</span>
                  )}
                  {log.photoCount > 0 && (
                    <span className="flex items-center gap-1"><Camera size={11} />{log.photoCount} photo{log.photoCount !== 1 ? "s" : ""}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
