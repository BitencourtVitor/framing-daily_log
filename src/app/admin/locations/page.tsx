"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ShieldCheck, Loader2, ChevronDown, MapPin,
} from "lucide-react";

interface QBTJobcode {
  id: number;
  name: string;
  has_children: boolean;
  parent_id: number;
  children?: QBTJobcode[];
  expanded?: boolean;
  loading?: boolean;
}

const DEPTH_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "Customer",      color: "text-purple-500" },
  1: { label: "Client",        color: "text-blue-500" },
  2: { label: "Jobsite",       color: "text-emerald-500" },
  3: { label: "Lot/Building",  color: "text-amber-500" },
};

export default function AdminLocationsPage() {
  const router = useRouter();
  const [roots, setRoots]   = useState<QBTJobcode[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    fetch("/api/me").then((r) => r.ok ? r.json() : {} as { role?: string }).then((d) => {
      if (d.role !== "admin" && d.role !== "dev") router.replace("/dashboard");
    });
    loadRoots();
  }, [router]);

  async function loadRoots() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/qbt/jobcodes?parentId=0").catch(() => null);
    if (!res || !res.ok) {
      setError("Failed to load jobcodes from QuickBooks Time. Check the QBT token configuration.");
      setLoading(false);
      return;
    }
    const data: QBTJobcode[] = await res.json();
    setRoots(data);
    setLoading(false);
  }

  async function toggleExpand(node: QBTJobcode, list: QBTJobcode[], setList: (l: QBTJobcode[]) => void) {
    if (node.expanded) {
      setList(list.map((n) => n.id === node.id ? { ...n, expanded: false } : n));
      return;
    }
    if (!node.has_children) return;

    setList(list.map((n) => n.id === node.id ? { ...n, loading: true, expanded: true } : n));
    const res = await fetch(`/api/qbt/jobcodes?parentId=${node.id}`).catch(() => null);
    const children: QBTJobcode[] = res?.ok ? await res.json() : [];
    setList(list.map((n) => n.id === node.id ? { ...n, loading: false, expanded: true, children } : n));
  }

  function renderNode(node: QBTJobcode, list: QBTJobcode[], setList: (l: QBTJobcode[]) => void, depth = 0) {
    const meta = DEPTH_LABELS[depth] ?? { label: `Level ${depth}`, color: "text-muted-foreground" };

    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-accent/40 group transition-colors rounded-lg"
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          {node.has_children ? (
            <button onClick={() => toggleExpand(node, list, setList)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
              {node.loading
                ? <Loader2 size={14} className="animate-spin" />
                : <ChevronDown size={14} className={`transition-transform ${node.expanded ? "" : "-rotate-90"}`} />
              }
            </button>
          ) : (
            <span className="w-[14px] shrink-0" />
          )}

          <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 w-20 ${meta.color}`}>
            {meta.label}
          </span>

          <span className="text-sm text-foreground font-medium truncate flex-1">{node.name}</span>
          <span className="text-[10px] text-muted-foreground font-mono opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            #{node.id}
          </span>
        </div>

        {node.expanded && node.children && (
          <>
            {node.children.length === 0 ? (
              <p
                className="text-xs text-muted-foreground italic py-1"
                style={{ paddingLeft: `${12 + (depth + 1) * 20 + 14 + 80 + 8}px` }}
              >
                No children
              </p>
            ) : (
              node.children.map((child) =>
                renderNode(child, node.children!, (newChildren) => {
                  setList(list.map((n) => n.id === node.id ? { ...n, children: newChildren } : n));
                }, depth + 1)
              )
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => router.push("/admin")} className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <ShieldCheck size={16} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Jobsite Locations</p>
        </div>
        <button onClick={loadRoots} disabled={loading} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40">
          <Loader2 size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-4">
        {/* Source info */}
        <div className="bg-card border border-border/40 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <MapPin size={12} />Source — QuickBooks Time Jobcodes
          </p>
          <p className="text-xs text-muted-foreground">
            The hierarchy below mirrors the jobcode structure in QBT. To add or edit jobsites, use QuickBooks Time directly. This view is read-only and refreshes every 15 minutes.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {Object.entries(DEPTH_LABELS).map(([d, { label, color }]) => (
              <span key={d} className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold uppercase ${color}`}>L{d}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Tree */}
        <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
              <Loader2 size={14} className="animate-spin" />Loading from QBT…
            </div>
          ) : error ? (
            <div className="p-4 space-y-2">
              <p className="text-sm text-destructive font-medium">{error}</p>
              <button onClick={loadRoots} className="text-xs text-primary hover:underline">Retry</button>
            </div>
          ) : roots && roots.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No jobcodes found in QBT.</p>
          ) : (
            <div className="py-2 space-y-0.5">
              {roots?.map((node) =>
                renderNode(node, roots, (newList) => setRoots(newList))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
