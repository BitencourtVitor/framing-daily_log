"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ShieldCheck, CalendarDays, User,
  Camera, CheckCircle2, Clock, AlertCircle, RefreshCw, Layers, Building2,
} from "lucide-react";

interface LogEntry {
  _id: string;
  date: string;
  supervisorId: number;
  supervisorName: string;
  status: "draft" | "syncing" | "synced" | "failed";
  btLogId: string | null;
  activityCount: number;
  workerCount: number;
  photos: { count: number; sentToBT: number };
  createdAt: string;
}

const STATUS_META = {
  draft:   { label: "Pending",     Icon: Clock,        cls: "text-muted-foreground" },
  syncing: { label: "Syncing",     Icon: RefreshCw,    cls: "text-amber-500" },
  synced:  { label: "Synced",      Icon: CheckCircle2, cls: "text-emerald-500" },
  failed:  { label: "Failed",      Icon: AlertCircle,  cls: "text-red-500" },
};

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export default function AdminLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => {
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
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No logs yet.</p>
        ) : (
          logs.map((log) => {
            const meta = STATUS_META[log.status];
            const sentToBT = !!log.btLogId;
            return (
              <div key={log._id} className="bg-card border border-border/40 rounded-xl px-4 py-3 space-y-2">
                {/* Row 1: date + status */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <CalendarDays size={14} className="text-muted-foreground shrink-0" />
                    <p className="text-sm font-semibold text-foreground truncate">{fmtDate(log.date)}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${meta.cls}`}>
                    <meta.Icon size={12} className={log.status === "syncing" ? "animate-spin" : ""} />
                    {meta.label}
                  </div>
                </div>

                {/* Row 2: supervisor */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User size={12} className="shrink-0" />
                  <span>{log.supervisorName}</span>
                </div>

                {/* Row 3: stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {log.activityCount > 0 && (
                    <span className="flex items-center gap-1"><Layers size={11} /> {log.activityCount} {log.activityCount === 1 ? "activity" : "activities"}</span>
                  )}
                  {log.photos.count > 0 && (
                    <span className="flex items-center gap-1"><Camera size={11} /> {log.photos.count} photo{log.photos.count !== 1 ? "s" : ""}</span>
                  )}
                  {/* BT status — only framing sends to BT */}
                  <span className={`flex items-center gap-1 ${sentToBT ? "text-emerald-500" : ""}`}>
                    <Building2 size={11} />
                    {sentToBT ? `BT #${log.btLogId}` : "Not sent to BT"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
