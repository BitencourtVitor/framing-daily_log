"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft, MapPin, CalendarDays, User, Loader2,
  Download, Layers, Camera, Wrench, Package, AlertTriangle,
  CalendarClock, MessageSquare, HardHat, Users, X, Pencil,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Activity {
  description: string;
  timeStart: string;
  timeEnd: string;
  workType: "normal" | "back-charge" | "extra" | "warranty";
  workerNames: string[];
}

interface Notes {
  machineEntries: { title: string; unit: string }[];
  machinesNA: boolean;
  materials: string;
  materialsNA: boolean;
  problems: string;
  problemsNA: boolean;
  nextDayPlan: string;
  nextDayPlanNA: boolean;
  supervisorNotes: string;
  supervisorNotesNA: boolean;
}

interface LogDetail {
  _id: string;
  date: string;
  supervisorName: string;
  status: string;
  locationPath?: string[];
  workers: { name: string }[];
  activities: Activity[];
  notes: Notes;
}

interface PhotoDoc {
  _id: string;
  activityIndex: number | null;
  filename: string;
  mimetype: string;
  storageKey: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WORK_TYPE_CONFIG = {
  normal:        { label: "Normal Labor", text: "text-blue-500",    bg: "bg-blue-500/10",    border: "border-blue-500/30" },
  "back-charge": { label: "Back Charge",  text: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/30" },
  extra:         { label: "Extra",        text: "text-purple-500",  bg: "bg-purple-500/10",  border: "border-purple-500/30" },
  warranty:      { label: "Warranty",     text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${(h % 12) || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function photoUrl(key: string) {
  return `/api/photo?key=${encodeURIComponent(key)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={13} className="text-muted-foreground shrink-0" />
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

function NoteRow({ label, value, na }: { label: string; value: string; na: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      {na ? (
        <p className="text-sm text-muted-foreground italic">Not applicable</p>
      ) : value ? (
        <p className="text-sm text-foreground leading-relaxed">{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">—</p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LogDetailPage() {
  const router  = useRouter();
  const params  = useParams();
  const id      = params.id as string;

  const [log,        setLog]      = useState<LogDetail | null>(null);
  const [photos,     setPhotos]   = useState<PhotoDoc[]>([]);
  const [loading,    setLoading]  = useState(true);
  const [error,      setError]    = useState("");
  const [exporting,  setExporting]= useState(false);
  const [lightbox,   setLightbox] = useState<string | null>(null);
  const [isOwner,    setIsOwner]  = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/daily-log/${id}`).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch(`/api/daily-log/${id}/photos`).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/me").then((r) => r.ok ? r.json() : {}),
    ])
      .then(([logData, photosData, me]) => {
        setLog(logData);
        setPhotos(Array.isArray(photosData) ? photosData : []);
        setIsOwner(me.userId === logData.supervisorId);
      })
      .catch(() => setError("Failed to load log."))
      .finally(() => setLoading(false));
  }, [id]);

  const exportPDF = useCallback(async () => {
    if (!log) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/daily-log/${id}/pdf`);
      if (!res.ok) { alert("Failed to generate PDF"); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `daily-log-${log.date}-${log.supervisorName.replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [id, log]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-destructive">{error || "Log not found."}</p>
        <button onClick={() => router.back()} className="text-xs text-primary hover:underline">Go back</button>
      </div>
    );
  }

  const generalPhotos   = photos.filter((p) => p.activityIndex === null || p.activityIndex === undefined);
  const activityPhotos  = (idx: number) => photos.filter((p) => p.activityIndex === idx);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <ChevronLeft size={20} />
        </button>
        <p className="text-sm font-semibold text-foreground flex-1">Daily Log</p>
        {isOwner && (
          <button
            onClick={() => router.push(`/log/${id}/edit`)}
            className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
            title="Edit log"
          >
            <Pencil size={18} />
          </button>
        )}
        <button
          onClick={exportPDF}
          disabled={exporting}
          className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
          title="Export PDF"
        >
          {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
        </button>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-5">
        {/* Meta card */}
        <div className="bg-card border border-border/40 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CalendarDays size={14} className="text-muted-foreground shrink-0" />
                <p className="text-base font-semibold text-foreground">{fmtDate(log.date)}</p>
              </div>
              <div className="flex items-center gap-2">
                <User size={13} className="text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">{log.supervisorName}</p>
              </div>
              {log.locationPath?.length ? (
                <div className="flex items-start gap-2">
                  <MapPin size={13} className="text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">{log.locationPath.join(" › ")}</p>
                </div>
              ) : null}
            </div>
          </div>

          {log.workers.length > 0 && (
            <div className="pt-2 border-t border-border/40">
              <div className="flex items-center gap-1.5 mb-2">
                <Users size={12} className="text-muted-foreground" />
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Workers on site</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {log.workers.map((w, i) => (
                  <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{w.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Activities */}
        {log.activities.length > 0 && (
          <div>
            <SectionLabel icon={Layers} label="Activities" />
            <div className="space-y-3">
              {log.activities.map((act, i) => {
                const cfg = WORK_TYPE_CONFIG[act.workType] ?? WORK_TYPE_CONFIG.normal;
                const aPhotos = activityPhotos(i);
                return (
                  <div key={i} className={`bg-card border ${cfg.border} rounded-xl overflow-hidden`}>
                    <div className={`${cfg.bg} px-4 py-2 flex items-center gap-2`}>
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${cfg.text}`}>{cfg.label}</span>
                      <span className="text-[11px] text-muted-foreground">Activity {i + 1}</span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <p className="text-sm text-foreground leading-relaxed">{act.description}</p>
                      <p className="text-xs text-muted-foreground">{fmtTime(act.timeStart)} → {fmtTime(act.timeEnd)}</p>
                      {act.workerNames.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {act.workerNames.map((w, wi) => (
                            <span key={wi} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{w}</span>
                          ))}
                        </div>
                      )}
                      {aPhotos.length > 0 && (
                        <div className="grid grid-cols-3 gap-1.5 pt-2">
                          {aPhotos.map((p) => (
                            <button key={p._id} onClick={() => setLightbox(photoUrl(p.storageKey))} className="aspect-square rounded-lg overflow-hidden bg-muted">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photoUrl(p.storageKey)} alt={p.filename} className="w-full h-full object-cover" loading="lazy" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <SectionLabel icon={MessageSquare} label="Site Notes" />
          <div className="bg-card border border-border/40 rounded-xl p-4 space-y-4">
            {/* Machines */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Wrench size={12} className="text-muted-foreground" />
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Machines & Equipment</p>
              </div>
              {log.notes.machinesNA ? (
                <p className="text-sm text-muted-foreground italic">Not applicable</p>
              ) : log.notes.machineEntries?.length > 0 ? (
                <div className="space-y-1.5">
                  {log.notes.machineEntries.map((m, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                      <p className="text-sm text-foreground font-medium">{m.title}</p>
                      {m.unit && <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">{m.unit}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">—</p>
              )}
            </div>

            <div className="border-t border-border/40 pt-4 space-y-4">
              <NoteRow label="Materials Delivered"  value={log.notes.materials}       na={log.notes.materialsNA} />
              <NoteRow label="Problems / Delays"    value={log.notes.problems}        na={log.notes.problemsNA} />
              <NoteRow label="Plan for Next Day"    value={log.notes.nextDayPlan}     na={log.notes.nextDayPlanNA} />
              <NoteRow label="Notes for Supervisor" value={log.notes.supervisorNotes} na={log.notes.supervisorNotesNA} />
            </div>
          </div>
        </div>

        {/* General Photos */}
        {generalPhotos.length > 0 && (
          <div>
            <SectionLabel icon={Camera} label={`General Photos (${generalPhotos.length})`} />
            <div className="grid grid-cols-3 gap-2">
              {generalPhotos.map((p) => (
                <button key={p._id} onClick={() => setLightbox(photoUrl(p.storageKey))} className="aspect-square rounded-xl overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl(p.storageKey)} alt={p.filename} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <header className="h-14 flex items-center justify-between px-4 shrink-0">
            <button
              onClick={() => setLightbox(null)}
              className="p-2 -ml-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
            <a
              href={lightbox}
              download
              className="p-2 -mr-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Download size={20} />
            </a>
          </header>
          <div className="flex-1 flex items-center justify-center px-2 pb-6 min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox}
              alt="Photo"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
