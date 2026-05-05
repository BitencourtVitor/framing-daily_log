"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Camera,
  ImageIcon,
  Check,
  Pencil,
  Clock,
  Users,
  Hammer,
  Receipt,
  Zap,
  ShieldCheck,
  Search,
  CalendarDays,
  HardHat as HardHatIcon,
  AlignLeft,
  Tag,
  Building2,
  Wrench,
  Package,
  AlertTriangle,
  CalendarClock,
  MessageSquare,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Worker {
  id: number;
  name: string;
}

interface Activity {
  workerNames: string[];
  description: string;
  timeStart: string;
  timeEnd: string;
  workType: "normal" | "back-charge" | "extra" | "garantia";
}

interface SubEntry {
  company: string;
  workerNames: string[];
  description: string;
}

interface FormNotes {
  machines: string;
  materials: string;
  problems: string;
  nextDayPlan: string;
  supervisorNotes: string;
}

interface FormState {
  date: string;
  activities: Activity[];
  subcontractors: SubEntry[];
  notes: FormNotes;
  photos: File[];
}

interface SavedSub {
  _id: string;
  company: string;
  workers: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WORK_TYPE_CONFIG = {
  normal: {
    label: "Normal Labor",
    Icon: Hammer,
    text: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  "back-charge": {
    label: "Back Charge",
    Icon: Receipt,
    text: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  extra: {
    label: "Extra",
    Icon: Zap,
    text: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
  garantia: {
    label: "Warranty",
    Icon: ShieldCheck,
    text: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
} as const;

type WorkTypeKey = keyof typeof WORK_TYPE_CONFIG;

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const TODAY = localDateStr();

const EMPTY_ACTIVITY: Activity = {
  workerNames: [],
  description: "",
  timeStart: "07:00",
  timeEnd: "17:00",
  workType: "normal",
};

const EMPTY_SUB: SubEntry = { company: "", workerNames: [], description: "" };

const EMPTY_NOTES: FormNotes = {
  machines: "",
  materials: "",
  problems: "",
  nextDayPlan: "",
  supervisorNotes: "",
};

const NOTE_FIELDS: { key: keyof FormNotes; label: string; placeholder: string; rows: number; Icon: React.ElementType }[] = [
  { key: "machines",      Icon: Wrench,         label: "Machines & Equipment on Site (with TAG)", placeholder: "e.g. Boom Lift 80k – F12345\nFork Extensions – F14", rows: 3 },
  { key: "materials",     Icon: Package,        label: "Materials Delivered",   placeholder: "List materials delivered today…", rows: 2 },
  { key: "problems",      Icon: AlertTriangle,  label: "Problems / Delays",     placeholder: "Any issues or delays?", rows: 2 },
  { key: "nextDayPlan",   Icon: CalendarClock,  label: "Plan for Next Day",     placeholder: "What's the plan for tomorrow?", rows: 2 },
  { key: "supervisorNotes", Icon: MessageSquare, label: "Notes for Supervisor", placeholder: "Any observations for the supervisor…", rows: 2 },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewLogPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [form, setForm] = useState<FormState>({
    date: TODAY,
    activities: [],
    subcontractors: [],
    notes: { ...EMPTY_NOTES },
    photos: [],
  });

  const [submittedDates, setSubmittedDates] = useState<string[]>([]);
  const [allWorkers, setAllWorkers] = useState<Worker[]>([]);
  const [savedSubs, setSavedSubs] = useState<SavedSub[]>([]);

  // Activity sheet
  const [actSheet, setActSheet] = useState(false);
  const [editActIdx, setEditActIdx] = useState<number | null>(null);
  const [draftAct, setDraftAct] = useState<Activity>({ ...EMPTY_ACTIVITY });

  // Subcontractor sheet
  const [subSheet, setSubSheet] = useState(false);
  const [editSubIdx, setEditSubIdx] = useState<number | null>(null);
  const [draftSub, setDraftSub] = useState<SubEntry>({ ...EMPTY_SUB });

  useEffect(() => {
    const from = new Date();
    from.setDate(from.getDate() - 90);
    fetch(`/api/logs/status?from=${localDateStr(from)}&to=${TODAY}`)
      .then((r) => r.json())
      .then((logs: { date: string }[]) => setSubmittedDates(logs.map((l) => l.date)));

    fetch("/api/qbt/workers")
      .then((r) => r.json())
      .then((w) => setAllWorkers(w));

    fetch("/api/subcontractors")
      .then((r) => r.json())
      .then((s) => setSavedSubs(s));
  }, []);

  // ── Activity handlers ───────────────────────────────────────────────────────

  function openAddActivity() {
    setDraftAct({ ...EMPTY_ACTIVITY });
    setEditActIdx(null);
    setActSheet(true);
  }

  function openEditActivity(i: number) {
    setDraftAct({ ...form.activities[i] });
    setEditActIdx(i);
    setActSheet(true);
  }

  function confirmActivity() {
    setForm((f) => {
      const activities = [...f.activities];
      if (editActIdx !== null) activities[editActIdx] = draftAct;
      else activities.push(draftAct);
      return { ...f, activities };
    });
    setActSheet(false);
  }

  function removeActivity(i: number) {
    setForm((f) => ({ ...f, activities: f.activities.filter((_, idx) => idx !== i) }));
  }

  // ── Subcontractor handlers ──────────────────────────────────────────────────

  function openAddSub() {
    setDraftSub({ ...EMPTY_SUB });
    setEditSubIdx(null);
    setSubSheet(true);
  }

  function openEditSub(i: number) {
    setDraftSub({ ...form.subcontractors[i] });
    setEditSubIdx(i);
    setSubSheet(true);
  }

  function confirmSub() {
    setForm((f) => {
      const subs = [...f.subcontractors];
      if (editSubIdx !== null) subs[editSubIdx] = draftSub;
      else subs.push(draftSub);
      return { ...f, subcontractors: subs };
    });
    setSubSheet(false);
  }

  function removeSub(i: number) {
    setForm((f) => ({ ...f, subcontractors: f.subcontractors.filter((_, idx) => idx !== i) }));
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!form.date) return "Select a date before submitting.";
    if (dateBlocked) return "A log already exists for this date.";
    if (form.activities.length === 0) return "Add at least one activity before submitting.";
    return null;
  }

  async function handleSubmit() {
    const err = validate();
    if (err) { setSubmitError(err); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      for (const sub of form.subcontractors) {
        if (sub.company.trim()) {
          await fetch("/api/subcontractors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ company: sub.company, workers: sub.workerNames }),
          });
        }
      }

      const res = await fetch("/api/daily-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          workers: [...new Set(form.activities.flatMap((a) => a.workerNames))].map((name) => {
            const w = allWorkers.find((w) => w.name === name);
            return { qbtUserId: w?.id ?? 0, name };
          }),
          activities: form.activities,
          subcontractors: form.subcontractors.filter((s) => s.company.trim()),
          notes: form.notes,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setSubmitError(json.error ?? "Submit failed");
        return;
      }

      const { id } = await res.json();

      for (const photo of form.photos) {
        const fd = new FormData();
        fd.append("file", photo);
        await fetch(`/api/daily-log/${id}/photos`, { method: "POST", body: fd });
      }

      router.push("/dashboard");
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const dateBlocked = submittedDates.includes(form.date);
  const canSubmit = !!form.date && !dateBlocked && !submitting;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="sticky top-0 z-10 h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <p className="text-sm font-semibold text-foreground flex-1">New Daily Log</p>
        </header>

        {/* Content */}
        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 pb-28 space-y-6">

          {/* Date */}
          <PageSection title="Date" icon={CalendarDays}>
            <DateInput
              value={form.date}
              max={TODAY}
              onChange={(v) => setForm((f) => ({ ...f, date: v }))}
            />
            {dateBlocked && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                A log already exists for this date.
              </p>
            )}
          </PageSection>

          {/* Premium Framing Activities */}
          <PageSection title="Premium Framing" icon={HardHatIcon}>
            <div className="space-y-2">
              {form.activities.map((act, i) => (
                <ActivityCard
                  key={i}
                  activity={act}
                  index={i}
                  onEdit={() => openEditActivity(i)}
                  onRemove={() => removeActivity(i)}
                />
              ))}
              <AddItemButton onClick={openAddActivity} label="Add Activity" />
            </div>
          </PageSection>

          {/* Subcontractors */}
          <PageSection title="Subcontractors" icon={Building2}>
            <div className="space-y-2">
              {form.subcontractors.map((sub, i) => (
                <SubCard
                  key={i}
                  sub={sub}
                  index={i}
                  onEdit={() => openEditSub(i)}
                  onRemove={() => removeSub(i)}
                />
              ))}
              <AddItemButton onClick={openAddSub} label="Add Subcontractor" />
            </div>
          </PageSection>

          <hr className="border-border/40 -mx-4" />

          {/* Notes */}
          <div className="space-y-4">
            {NOTE_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <f.Icon size={12} />
                  {f.label}
                </label>
                <textarea
                  value={form.notes[f.key]}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: { ...prev.notes, [f.key]: e.target.value } }))
                  }
                  rows={f.rows}
                  placeholder={f.placeholder}
                  className="w-full bg-background border border-foreground/25 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors resize-none"
                />
              </div>
            ))}
          </div>

          {/* Photos */}
          <PageSection title="Photos" icon={Camera}>
            <PhotoSection
              photos={form.photos}
              onAdd={(files) =>
                setForm((f) => ({
                  ...f,
                  photos: [...f.photos, ...Array.from(files ?? []).filter((file) => file.type.startsWith("image/"))],
                }))
              }
              onRemove={(i) => setForm((f) => ({ ...f, photos: f.photos.filter((_, idx) => idx !== i) }))}
            />
          </PageSection>

          {submitError && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{submitError}</p>
            </div>
          )}
        </main>

        {/* Sticky submit */}
        <div className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-sm border-t border-border px-4 py-3">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full max-w-lg mx-auto block bg-primary text-primary-foreground font-semibold py-3 rounded-lg text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {submitting ? "Submitting…" : "Submit Daily Log"}
          </button>
        </div>
      </div>

      {/* Activity sheet */}
      <ActivitySheet
        open={actSheet}
        workers={allWorkers}
        draft={draftAct}
        onChange={setDraftAct}
        onClose={() => setActSheet(false)}
        onConfirm={confirmActivity}
      />

      {/* Subcontractor sheet */}
      <SubSheet
        open={subSheet}
        saved={savedSubs}
        draft={draftSub}
        onChange={setDraftSub}
        onClose={() => setSubSheet(false)}
        onConfirm={confirmSub}
      />
    </>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function PageSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <Icon size={13} className="text-muted-foreground shrink-0" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{title}</p>
      </div>
      {children}
    </div>
  );
}

function AddItemButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full border-2 border-dashed border-border rounded-xl py-3.5 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
    >
      <Plus size={15} />
      {label}
    </button>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function ActivityCard({
  activity,
  index,
  onEdit,
  onRemove,
}: {
  activity: Activity;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    return `${(h % 12) || 12}:${m.toString().padStart(2, "0")} ${suffix}`;
  };

  const cfg = WORK_TYPE_CONFIG[activity.workType as WorkTypeKey];

  return (
    <div className={`bg-card border border-border/40 rounded-xl px-4 py-3 space-y-2.5 border-l-[3px] ${cfg.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
            <cfg.Icon size={14} className={cfg.text} />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Activity {index + 1}</p>
            <p className={`text-[10px] font-medium ${cfg.text}`}>{cfg.label}</p>
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0">
          <button onClick={onEdit} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={onRemove} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>

      {activity.description && (
        <p className="text-sm text-foreground line-clamp-2">{activity.description}</p>
      )}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock size={12} />
        <span>{fmt(activity.timeStart)} → {fmt(activity.timeEnd)}</span>
      </div>

      {activity.workerNames.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users size={12} />
          <span>{activity.workerNames.join(", ")}</span>
        </div>
      )}
    </div>
  );
}

function SubCard({
  sub,
  index,
  onEdit,
  onRemove,
}: {
  sub: SubEntry;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-card border border-border/40 rounded-xl px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{sub.company || `Subcontractor ${index + 1}`}</p>
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={onRemove} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {sub.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{sub.description}</p>
      )}

      {sub.workerNames.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users size={12} />
          <span>{sub.workerNames.join(", ")}</span>
        </div>
      )}
    </div>
  );
}

// ─── Photo section ────────────────────────────────────────────────────────────

function PhotoSection({
  photos,
  onAdd,
  onRemove,
}: {
  photos: File[];
  onAdd: (files: FileList | null) => void;
  onRemove: (i: number) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl py-6 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Camera size={20} />
          Camera
        </button>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl py-6 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <ImageIcon size={20} />
          Gallery
        </button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onAdd(e.target.files)} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onAdd(e.target.files)} />
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <div key={i} className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(p)} alt={p.name} className="w-full h-full object-cover rounded-lg" />
              <button
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Date Input ───────────────────────────────────────────────────────────────

function DateInput({ value, max, onChange }: { value: string; max: string; onChange: (v: string) => void }) {
  const [y, m, d] = value.split("-").map(Number);
  const display = `${String(m).padStart(2, "0")} / ${String(d).padStart(2, "0")} / ${y}`;

  return (
    <div className="relative flex items-center justify-center gap-2 bg-background border border-foreground/25 rounded-lg px-3 py-3">
      <CalendarDays size={16} className="text-muted-foreground shrink-0 pointer-events-none" />
      <span className="text-sm text-foreground pointer-events-none">{display}</span>
      <input
        type="date"
        value={value}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="date-overlay absolute inset-0 w-full h-full"
      />
    </div>
  );
}

// ─── Time Input ───────────────────────────────────────────────────────────────

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hRaw, mRaw] = value.split(":").map(Number);
  const isPM = hRaw >= 12;
  const hour12 = (hRaw % 12) || 12;

  function emit(h12: number, min: number, pm: boolean) {
    const h24 = (h12 % 12) + (pm ? 12 : 0);
    onChange(`${String(h24).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }

  const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div className="flex items-center bg-card border border-foreground/25 rounded-lg px-3 py-2.5 gap-1">
      <select
        value={hour12}
        onChange={(e) => emit(Number(e.target.value), mRaw, isPM)}
        className="bg-transparent text-sm text-foreground focus:outline-none appearance-none text-center w-6"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-sm text-muted-foreground">:</span>
      <select
        value={MINUTES.includes(mRaw) ? mRaw : 0}
        onChange={(e) => emit(hour12, Number(e.target.value), isPM)}
        className="bg-transparent text-sm text-foreground focus:outline-none appearance-none text-center w-7"
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => emit(hour12, mRaw, !isPM)}
        className="ml-1 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 transition-colors"
      >
        {isPM ? "PM" : "AM"}
      </button>
    </div>
  );
}

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────

function BottomSheet({
  open,
  onClose,
  title,
  step,
  totalSteps,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  step?: number;
  totalSteps?: number;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] bg-background rounded-t-2xl flex flex-col transition-transform duration-300 ease-out ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Sheet header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {step && totalSteps && (
              <p className="text-[10px] text-muted-foreground">Step {step} of {totalSteps}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step && totalSteps && (
              <div className="flex gap-1">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i + 1 <= step ? "bg-primary" : "bg-border"}`} />
                ))}
              </div>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">
          {children}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-border flex gap-3">
          {footer}
        </div>
      </div>
    </>
  );
}

// ─── Activity Sheet ───────────────────────────────────────────────────────────

function useSheetStep(open: boolean) {
  const [displayed, setDisplayed] = useState<1 | 2>(1);
  const [anim, setAnim] = useState<"idle" | "exit" | "enter">("idle");
  const [dir, setDir] = useState<"forward" | "back">("forward");

  useEffect(() => {
    if (open) { setDisplayed(1); setAnim("idle"); }
  }, [open]);

  function goTo(next: 1 | 2) {
    setDir(next > displayed ? "forward" : "back");
    setAnim("exit");
    setTimeout(() => {
      setDisplayed(next);
      setAnim("enter");
      requestAnimationFrame(() => requestAnimationFrame(() => setAnim("idle")));
    }, 180);
  }

  const cls = [
    "transition-all duration-200 ease-in-out",
    anim === "idle" ? "opacity-100 translate-x-0"
      : anim === "exit" ? (dir === "forward" ? "opacity-0 -translate-x-6" : "opacity-0 translate-x-6")
      : (dir === "forward" ? "opacity-0 translate-x-6" : "opacity-0 -translate-x-6"),
  ].join(" ");

  return { displayed, goTo, cls };
}

function ActivitySheet({
  open,
  workers,
  draft,
  onChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  workers: Worker[];
  draft: Activity;
  onChange: (a: Activity) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { displayed, goTo, cls } = useSheetStep(open);
  const [search, setSearch] = useState("");

  useEffect(() => { if (open) setSearch(""); }, [open]);

  const canNext = draft.description.trim().length > 0;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={displayed === 1 ? "Activity — What" : "Activity — Who"}
      step={displayed}
      totalSteps={2}
      footer={
        displayed === 1 ? (
          <>
            <button onClick={onClose} className="flex-1 border border-border rounded-lg py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors">
              Cancel
            </button>
            <button
              onClick={() => goTo(2)}
              disabled={!canNext}
              className="flex-1 bg-primary text-primary-foreground rounded-lg py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            >
              Next <ChevronRight size={16} />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => goTo(1)} className="flex-1 border border-border rounded-lg py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors">
              Back
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 bg-primary text-primary-foreground rounded-lg py-3 text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Check size={16} /> Confirm
            </button>
          </>
        )
      }
    >
      <div className={cls}>
      {displayed === 1 ? (
        <div className="space-y-4 py-2">
          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><AlignLeft size={12} />Description</label>
            <textarea
              value={draft.description}
              onChange={(e) => onChange({ ...draft, description: e.target.value })}
              rows={4}
              placeholder="Describe the work performed…"
              autoFocus
              className="w-full bg-card border border-foreground/25 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors resize-none"
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Clock size={12} />Start</label>
              <TimeInput value={draft.timeStart} onChange={(v) => onChange({ ...draft, timeStart: v })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Clock size={12} />End</label>
              <TimeInput value={draft.timeEnd} onChange={(v) => onChange({ ...draft, timeEnd: v })} />
            </div>
          </div>

          {/* Work type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Tag size={12} />Work Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(WORK_TYPE_CONFIG) as [WorkTypeKey, typeof WORK_TYPE_CONFIG[WorkTypeKey]][]).map(([key, cfg]) => {
                const sel = draft.workType === key;
                return (
                  <button key={key} onClick={() => onChange({ ...draft, workType: key })}
                    className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-colors flex items-center gap-2 ${sel ? `${cfg.bg} ${cfg.border} ${cfg.text}` : "bg-background border-border/40 text-muted-foreground hover:border-border"}`}>
                    <cfg.Icon size={13} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 py-2">
          {draft.workerNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {draft.workerNames.map((name) => (
                <span key={name} className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {name}
                  <button onClick={() => onChange({ ...draft, workerNames: draft.workerNames.filter((n) => n !== name) })}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search crew…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-foreground/25 rounded-lg pl-9 pr-8 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-60 space-y-1.5 pr-0.5">
            {workers
              .filter((w) => w.name.toLowerCase().includes(search.toLowerCase()))
              .map((w) => {
                const sel = draft.workerNames.includes(w.name);
                return (
                  <button key={w.id} onClick={() => {
                    const names = sel ? draft.workerNames.filter((n) => n !== w.name) : [...draft.workerNames, w.name];
                    onChange({ ...draft, workerNames: names });
                  }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${sel ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border/40 text-foreground hover:bg-accent"}`}>
                    {w.name}
                    {sel && <Check size={16} />}
                  </button>
                );
              })}
          </div>
        </div>
      )}
      </div>
    </BottomSheet>
  );
}

// ─── Subcontractor Sheet ──────────────────────────────────────────────────────

function SubSheet({
  open,
  saved,
  draft,
  onChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  saved: SavedSub[];
  draft: SubEntry;
  onChange: (s: SubEntry) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { displayed, goTo, cls } = useSheetStep(open);
  const newWorkerRef = useRef<HTMLInputElement>(null);

  const savedSub = saved.find((s) => s.company === draft.company);
  const knownWorkers = savedSub?.workers ?? [];
  const canNext = draft.company.trim().length > 0;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={displayed === 1 ? "Subcontractor — Who & What" : "Subcontractor — Workers"}
      step={displayed}
      totalSteps={2}
      footer={
        displayed === 1 ? (
          <>
            <button onClick={onClose} className="flex-1 border border-border rounded-lg py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors">
              Cancel
            </button>
            <button onClick={() => goTo(2)} disabled={!canNext}
              className="flex-1 bg-primary text-primary-foreground rounded-lg py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2">
              Next <ChevronRight size={16} />
            </button>
          </>
        ) : (
          <>
            <button onClick={() => goTo(1)} className="flex-1 border border-border rounded-lg py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors">
              Back
            </button>
            <button onClick={onConfirm}
              className="flex-1 bg-primary text-primary-foreground rounded-lg py-3 text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              <Check size={16} /> Confirm
            </button>
          </>
        )
      }
    >
      <div className={cls}>
      {displayed === 1 ? (
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Building2 size={12} />Company</label>
            <input type="text" value={draft.company} onChange={(e) => onChange({ ...draft, company: e.target.value })}
              placeholder="Company name…" autoFocus
              className="w-full bg-card border border-foreground/25 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><AlignLeft size={12} />Work Description</label>
            <textarea value={draft.description} onChange={(e) => onChange({ ...draft, description: e.target.value })}
              rows={4} placeholder="What did they do?"
              className="w-full bg-card border border-foreground/25 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors resize-none" />
          </div>
        </div>
      ) : (
        <div className="space-y-3 py-2">
          {/* Known workers from DB */}
          {knownWorkers.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Known workers</p>
              <div className="flex flex-wrap gap-1.5">
                {knownWorkers.map((name) => {
                  const sel = draft.workerNames.includes(name);
                  return (
                    <button key={name} onClick={() => {
                      const names = sel ? draft.workerNames.filter((n) => n !== name) : [...draft.workerNames, name];
                      onChange({ ...draft, workerNames: names });
                    }}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${sel ? "bg-primary/10 border-primary/30 text-primary" : "bg-background border-border/40 text-muted-foreground hover:border-primary/30"}`}>
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add new worker */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Add worker</p>
            <input ref={newWorkerRef} type="text" placeholder="Name and press Enter…"
              className="w-full bg-card border border-foreground/25 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val && !draft.workerNames.includes(val)) {
                    onChange({ ...draft, workerNames: [...draft.workerNames, val] });
                    (e.target as HTMLInputElement).value = "";
                  }
                  e.preventDefault();
                }
              }} />
          </div>

          {/* Selected workers */}
          {draft.workerNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {draft.workerNames.map((name) => (
                <span key={name} className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {name}
                  <button onClick={() => onChange({ ...draft, workerNames: draft.workerNames.filter((n) => n !== name) })}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </BottomSheet>
  );
}
