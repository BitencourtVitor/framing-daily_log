"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Plus, X, Camera, ImageIcon, Check,
  Pencil, Clock, Users, Hammer, Receipt, Zap, ShieldCheck, Search,
  CalendarDays, HardHat as HardHatIcon, AlignLeft, Tag, Wrench,
  Package, AlertTriangle, CalendarClock, MessageSquare, MapPin,
  Loader2, Ban, Building2, Download,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Worker { id: number; name: string }
interface MachineEntry { title: string; unit: string }
interface Activity {
  workerNames: string[];
  description: string;
  timeStart: string;
  timeEnd: string;
  workType: "normal" | "back-charge" | "extra" | "warranty";
  chargeableSub?: string;
  photos: File[];
}
interface SubEntry {
  company: string;
  workerNames: string[];
  description: string;
}
interface FormNotes {
  machineEntries: MachineEntry[];
  machinesNA: boolean;
  materials: string;  materialsNA: boolean;
  problems: string;   problemsNA: boolean;
  nextDayPlan: string; nextDayPlanNA: boolean;
  supervisorNotes: string; supervisorNotesNA: boolean;
}
interface FormState {
  locationText: string;
  activities: Activity[];
  subcontractors: SubEntry[];
  notes: FormNotes;
  newGeneralPhotos: File[];
}
interface ExistingPhoto {
  _id: string;
  activityIndex: number | null;
  filename: string;
  storageKey: string;
  mimetype: string;
}
// ─── Constants ────────────────────────────────────────────────────────────────

const WORK_TYPE_CONFIG = {
  normal:        { labelKey: "workType.normal",     Icon: Hammer,      text: "text-blue-500",    bg: "bg-blue-500/10",    border: "border-blue-500/30" },
  "back-charge": { labelKey: "workType.backCharge", Icon: Receipt,     text: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/30" },
  extra:         { labelKey: "workType.extra",      Icon: Zap,         text: "text-purple-500",  bg: "bg-purple-500/10",  border: "border-purple-500/30" },
  warranty:      { labelKey: "workType.warranty",   Icon: ShieldCheck, text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
} as const;
type WorkTypeKey = keyof typeof WORK_TYPE_CONFIG;

const EMPTY_ACTIVITY: Activity = {
  workerNames: [], description: "", timeStart: "07:00", timeEnd: "17:00", workType: "normal", chargeableSub: "", photos: [],
};
const EMPTY_NOTES: FormNotes = {
  machineEntries: [], machinesNA: false, materials: "", materialsNA: false,
  problems: "", problemsNA: false, nextDayPlan: "", nextDayPlanNA: false,
  supervisorNotes: "", supervisorNotesNA: false,
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EditLogPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { t } = useI18n();

  const [loading,   setLoading]  = useState(true);
  const [saving,    setSaving]   = useState(false);
  const [saveError, setSaveError] = useState("");
  const [logDate,   setLogDate]  = useState("");
  const [isAdmin,   setIsAdmin]  = useState(false);

  const [form, setForm] = useState<FormState>({
    locationText: "", activities: [], subcontractors: [], notes: { ...EMPTY_NOTES }, newGeneralPhotos: [],
  });

  const [existingGeneralPhotos, setExistingGeneralPhotos] = useState<ExistingPhoto[]>([]);
  const [existingActivityPhotoCounts, setExistingActivityPhotoCounts] = useState<Record<number, number>>({});
  const [allWorkers, setAllWorkers] = useState<Worker[]>([]);

  const [actSheet,    setActSheet]    = useState(false);
  const [editActIdx,  setEditActIdx]  = useState<number | null>(null);
  const [draftAct,    setDraftAct]    = useState<Activity>({ ...EMPTY_ACTIVITY });

  const [actConfirmModal, setActConfirmModal]               = useState(false);
  const [confirmedActivityCount, setConfirmedActivityCount] = useState(0);

  const [saveModal, setSaveModal]                         = useState(false);
  const [saveModalCloseEnabled, setSaveModalCloseEnabled] = useState(false);

  useEffect(() => {
    const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
    Promise.all([
      fetch(`/api/daily-log/${id}`).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch(`/api/daily-log/${id}/photos`).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/qbt/workers").then((r) => r.json()).catch(() => []),
      fetch("/api/me").then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([log, photos, workers, me]) => {
      const admin = me?.role === "admin" || me?.role === "dev";
      setIsAdmin(admin);
      if (!admin && log.date !== todayStr) { router.replace(`/log/${id}`); return; }
      setLogDate(log.date);
      setForm({
        locationText:   (log.locationPath ?? [])[0] ?? log.locationId ?? "",
        activities:     (log.activities ?? []).map((a: Omit<Activity, "photos">) => ({ ...a, chargeableSub: a.chargeableSub ?? "", photos: [] })),
        subcontractors: (log.subcontractors ?? []).map((s: SubEntry) => ({ company: s.company, workerNames: s.workerNames ?? [], description: s.description ?? "" })),
        notes:          log.notes ?? { ...EMPTY_NOTES },
        newGeneralPhotos: [],
      });
      const allPhotos: ExistingPhoto[] = Array.isArray(photos) ? photos : [];
      setExistingGeneralPhotos(allPhotos.filter((p) => p.activityIndex === null || p.activityIndex === undefined));
      const counts: Record<number, number> = {};
      allPhotos.forEach((p) => {
        if (p.activityIndex !== null && p.activityIndex !== undefined) {
          counts[p.activityIndex] = (counts[p.activityIndex] ?? 0) + 1;
        }
      });
      setExistingActivityPhotoCounts(counts);
      setAllWorkers(Array.isArray(workers) ? workers : []);
    }).catch(() => router.back()).finally(() => setLoading(false));
  }, [id, router]);

  function openAddActivity()  { setDraftAct({ ...EMPTY_ACTIVITY }); setEditActIdx(null); setActSheet(true); }
  function openEditActivity(i: number) { setDraftAct({ ...form.activities[i] }); setEditActIdx(i); setActSheet(true); }

  function confirmActivity() {
    const isEdit = editActIdx !== null;
    const newCount = isEdit ? form.activities.length : form.activities.length + 1;
    setForm((f) => {
      const acts = [...f.activities];
      if (editActIdx !== null) acts[editActIdx] = draftAct;
      else acts.push(draftAct);
      return { ...f, activities: acts };
    });
    setActSheet(false);
    if (!isEdit) { setConfirmedActivityCount(newCount); setActConfirmModal(true); }
  }

  function removeActivity(i: number) {
    setForm((f) => ({ ...f, activities: f.activities.filter((_, idx) => idx !== i) }));
  }

  async function deleteExistingPhoto(photo: ExistingPhoto) {
    await fetch(`/api/daily-log/${id}/photos?photoId=${photo._id}`, { method: "DELETE" });
    setExistingGeneralPhotos((prev) => prev.filter((p) => p._id !== photo._id));
  }

  async function handleSave() {
    if (!form.locationText.trim()) { setSaveError(t("logForm.selectJobsiteSave")); return; }
    if (form.activities.length === 0) { setSaveError(t("logForm.addActivityFirstSave")); return; }
    const bcIdx = form.activities.findIndex((act, i) =>
      act.workType === "back-charge" && (existingActivityPhotoCounts[i] ?? 0) + act.photos.length < 2
    );
    if (bcIdx !== -1) { setSaveError(t("logForm.bcPhotosRequired", { n: bcIdx + 1 })); return; }
    setSaving(true); setSaveError("");
    try {
      const workers = [...new Set(form.activities.flatMap((a) => a.workerNames))].map((name) => {
        const w = allWorkers.find((w) => w.name === name);
        return { qbtUserId: w?.id ?? 0, name };
      });

      const res = await fetch(`/api/daily-log/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId:   null,
          locationPath: form.locationText.trim() ? [form.locationText.trim()] : [],
          workers,
          activities: form.activities.map((a) => ({
            workerNames: a.workerNames, description: a.description,
            timeStart: a.timeStart, timeEnd: a.timeEnd, workType: a.workType,
            chargeableSub: a.chargeableSub || undefined,
          })),
          subcontractors: form.subcontractors.map((s) => ({
            company: s.company, workerNames: s.workerNames, description: s.description,
          })),
          notes: form.notes,
        }),
      });

      if (!res.ok) { let msg = "Save failed"; try { const j = await res.json(); msg = j.error ?? msg; } catch {} setSaveError(msg); return; }

      async function uploadFile(file: File, extra?: Record<string, string>) {
        const buffer = await file.arrayBuffer();
        const blob   = new Blob([buffer], { type: file.type });
        const fd     = new FormData();
        fd.append("file", blob, file.name);
        if (extra) Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
        const r = await fetch(`/api/daily-log/${id}/photos`, { method: "POST", body: fd });
        if (!r.ok) throw new Error(`Photo upload failed (${r.status}): ${file.name}`);
      }

      for (let i = 0; i < form.activities.length; i++) {
        for (const photo of form.activities[i].photos) {
          await uploadFile(photo, { activityIndex: String(i) });
        }
      }
      for (const photo of form.newGeneralPhotos) {
        await uploadFile(photo);
      }

      setSaveModalCloseEnabled(false);
      setSaveModal(true);
      setTimeout(() => setSaveModalCloseEnabled(true), 20000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-10 h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => router.back()} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <ChevronLeft size={20} />
          </button>
          <p className="text-sm font-semibold text-foreground flex-1">{t("logForm.editTitle")}</p>
          <LanguageSwitcher />
        </header>

        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 pb-28 space-y-6">

          <PageSection title={t("logForm.date")} icon={CalendarDays}>
            <div className="flex items-center gap-2 bg-muted/40 border border-border/40 rounded-lg px-3 py-3">
              <CalendarDays size={16} className="text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">{fmtDate(logDate)}</span>
            </div>
          </PageSection>

          <PageSection title={t("logForm.jobsite")} icon={MapPin}>
            <div className="flex items-center gap-2 bg-card border border-foreground/25 rounded-xl px-4 py-3">
              <MapPin size={14} className="text-primary shrink-0" />
              <input
                type="text"
                value={form.locationText}
                onChange={(e) => setForm((f) => ({ ...f, locationText: e.target.value }))}
                placeholder={t("logForm.selectJobsiteLabel")}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </PageSection>

          <PageSection title={t("logForm.premiumFraming")} icon={HardHatIcon}>
            <div className="space-y-2">
              {form.activities.map((act, i) => (
                <ActivityCard
                  key={i} activity={act} index={i}
                  existingPhotoCount={existingActivityPhotoCounts[i] ?? 0}
                  onEdit={() => openEditActivity(i)}
                  onRemove={() => removeActivity(i)}
                />
              ))}
              <AddItemButton onClick={openAddActivity} label={t("logForm.addActivity")} />
            </div>
          </PageSection>

          <PageSection title={t("logForm.subcontractors")} icon={Building2}>
            <SubcontractorSection
              subcontractors={form.subcontractors}
              onChange={(subs) => setForm((f) => ({ ...f, subcontractors: subs }))}
            />
          </PageSection>

          <hr className="border-border/40 -mx-4" />

          <div className="space-y-4">
            <MachinesSection notes={form.notes} onChange={(n) => setForm((f) => ({ ...f, notes: n }))} />
            {([
              { key: "materials"       as const, naKey: "materialsNA"       as const, Icon: Package,       labelKey: "logForm.materials",      placeholderKey: "logForm.listMaterials",  rows: 2 },
              { key: "problems"        as const, naKey: "problemsNA"        as const, Icon: AlertTriangle, labelKey: "logForm.problems",       placeholderKey: "logForm.anyIssues",      rows: 2 },
              { key: "nextDayPlan"     as const, naKey: "nextDayPlanNA"     as const, Icon: CalendarClock, labelKey: "logForm.nextDay",        placeholderKey: "logForm.tomorrowPlan",   rows: 2 },
              { key: "supervisorNotes" as const, naKey: "supervisorNotesNA" as const, Icon: MessageSquare, labelKey: "logForm.supervisorNotes", placeholderKey: "logForm.supervisorObs", rows: 2 },
            ] as const).map((f) => (
              <NoteFieldWithNA
                key={f.key} label={t(f.labelKey)} placeholder={t(f.placeholderKey)} rows={f.rows} Icon={f.Icon}
                value={form.notes[f.key]} isNA={form.notes[f.naKey]}
                onValueChange={(v) => setForm((s) => ({ ...s, notes: { ...s.notes, [f.key]: v } }))}
                onNAChange={(na) => setForm((s) => ({ ...s, notes: { ...s.notes, [f.naKey]: na, ...(na ? { [f.key]: "" } : {}) } }))}
              />
            ))}
          </div>

          <PageSection title={t("logForm.generalPhotos")} icon={Camera}>
            <div className="space-y-3">
              {(existingGeneralPhotos.length + form.newGeneralPhotos.length) < 5 && (
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-lg px-3 py-2">
                  <AlertTriangle size={12} className="shrink-0" />
                  {t("logForm.generalPhotosWarningEdit", { n: existingGeneralPhotos.length + form.newGeneralPhotos.length })}
                </div>
              )}
              {existingGeneralPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {existingGeneralPhotos.map((p) => (
                    <div key={p._id} className="relative aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/photo?key=${encodeURIComponent(p.storageKey)}`} alt={p.filename} className="w-full h-full object-cover rounded-lg" />
                      <button
                        onClick={() => deleteExistingPhoto(p)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <PhotoSection
                photos={form.newGeneralPhotos}
                onAdd={(files) => setForm((f) => ({ ...f, newGeneralPhotos: [...f.newGeneralPhotos, ...files] }))}
                onRemove={(i) => setForm((f) => ({ ...f, newGeneralPhotos: f.newGeneralPhotos.filter((_, idx) => idx !== i) }))}
              />
            </div>
          </PageSection>

          {saveError && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{saveError}</p>
            </div>
          )}
        </main>

        <div className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-sm border-t border-border px-4 py-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full max-w-lg mx-auto block bg-primary text-primary-foreground font-semibold py-3 rounded-lg text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {saving ? t("logForm.saving") : t("logForm.save")}
          </button>
        </div>
      </div>

      <ActivityConfirmModal
        open={actConfirmModal}
        activityNumber={confirmedActivityCount}
        onAddAnother={() => { setActConfirmModal(false); openAddActivity(); }}
        onContinue={() => setActConfirmModal(false)}
      />

      <SaveModal
        open={saveModal}
        logId={id}
        closeEnabled={saveModalCloseEnabled}
        onClose={() => { setSaveModal(false); router.push(`/log/${id}`); }}
      />

      <ActivitySheet
        open={actSheet} workers={allWorkers} draft={draftAct}
        existingPhotoCount={editActIdx !== null ? (existingActivityPhotoCounts[editActIdx] ?? 0) : 0}
        onChange={setDraftAct} onClose={() => setActSheet(false)} onConfirm={confirmActivity}
      />
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
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
    <button onClick={onClick} className="w-full border-2 border-dashed border-border rounded-xl py-3.5 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
      <Plus size={15} />{label}
    </button>
  );
}

function NoteFieldWithNA({ label, placeholder, rows, Icon, value, isNA, onValueChange, onNAChange }: {
  label: string; placeholder: string; rows: number; Icon: React.ElementType;
  value: string; isNA: boolean; onValueChange: (v: string) => void; onNAChange: (na: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Icon size={12} />{label}
        </label>
        <button
          type="button"
          onClick={() => onNAChange(!isNA)}
          className={`flex items-center gap-1.5 text-[10px] font-semibold rounded-full px-2.5 py-1 border transition-colors shrink-0 ${
            isNA ? "bg-muted/60 text-muted-foreground border-border" : "bg-background text-muted-foreground/60 border-border/40 hover:border-border"
          }`}
        >
          <Ban size={10} className={isNA ? "text-primary" : "text-muted-foreground/40"} />{t("common.na")}
        </button>
      </div>
      {isNA ? (
        <div className="text-xs text-muted-foreground italic bg-muted/30 border border-border/30 rounded-lg px-3 py-2.5">{t("common.notApplicable")}</div>
      ) : (
        <textarea
          value={value} onChange={(e) => onValueChange(e.target.value)} rows={rows} placeholder={placeholder}
          className="w-full bg-background border border-foreground/25 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors resize-none"
        />
      )}
    </div>
  );
}

function MachinesSection({ notes, onChange }: { notes: FormNotes; onChange: (n: FormNotes) => void }) {
  const { t } = useI18n();
  const [adding, setAdding]         = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftUnit, setDraftUnit]   = useState("");

  function addMachine() {
    if (!draftTitle.trim()) return;
    onChange({ ...notes, machineEntries: [...notes.machineEntries, { title: draftTitle.trim(), unit: draftUnit.trim() }] });
    setDraftTitle(""); setDraftUnit(""); setAdding(false);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Wrench size={12} />{t("logForm.machines")}
        </label>
        <button
          type="button"
          onClick={() => onChange({ ...notes, machinesNA: !notes.machinesNA, machineEntries: notes.machinesNA ? notes.machineEntries : [] })}
          className={`flex items-center gap-1.5 text-[10px] font-semibold rounded-full px-2.5 py-1 border transition-colors shrink-0 ${
            notes.machinesNA ? "bg-muted/60 text-muted-foreground border-border" : "bg-background text-muted-foreground/60 border-border/40 hover:border-border"
          }`}
        >
          <Ban size={10} className={notes.machinesNA ? "text-primary" : "text-muted-foreground/40"} />{t("common.na")}
        </button>
      </div>
      {notes.machinesNA ? (
        <div className="text-xs text-muted-foreground italic bg-muted/30 border border-border/30 rounded-lg px-3 py-2.5">{t("common.notApplicable")}</div>
      ) : (
        <div className="space-y-2">
          {notes.machineEntries.map((m, i) => (
            <div key={i} className="flex items-center gap-2 bg-card border border-border/40 rounded-lg px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                {m.unit && <p className="text-xs text-primary font-mono mt-0.5">{t("common.unit")} {m.unit}</p>}
              </div>
              <button onClick={() => onChange({ ...notes, machineEntries: notes.machineEntries.filter((_, idx) => idx !== i) })} className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <X size={13} />
              </button>
            </div>
          ))}
          {adding ? (
            <div className="bg-background border border-primary/20 rounded-xl p-3 space-y-2">
              <input autoFocus value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder={t("logForm.machineName")}
                className="w-full bg-card border border-foreground/25 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors"
                onKeyDown={(e) => e.key === "Enter" && document.getElementById("editUnitInput")?.focus()}
              />
              <input id="editUnitInput" value={draftUnit} onChange={(e) => setDraftUnit(e.target.value)} placeholder={t("logForm.machineUnit")}
                className="w-full bg-card border border-foreground/25 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors"
                onKeyDown={(e) => { if (e.key === "Enter") addMachine(); }}
              />
              <div className="flex gap-2">
                <button onClick={() => { setAdding(false); setDraftTitle(""); setDraftUnit(""); }} className="flex-1 border border-border rounded-lg py-2 text-sm text-muted-foreground hover:bg-accent transition-colors">{t("common.cancel")}</button>
                <button onClick={addMachine} disabled={!draftTitle.trim()} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-semibold disabled:opacity-40 transition-opacity">{t("common.add")}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="w-full border-2 border-dashed border-border rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <Plus size={14} />{t("logForm.addMachine")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ActivityCard({ activity, index, existingPhotoCount, onEdit, onRemove }: {
  activity: Activity; index: number; existingPhotoCount: number; onEdit: () => void; onRemove: () => void;
}) {
  const { t } = useI18n();
  const fmt = (time: string) => { const [h, m] = time.split(":").map(Number); return `${(h % 12) || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
  const cfg = WORK_TYPE_CONFIG[activity.workType];
  const totalPhotos = existingPhotoCount + activity.photos.length;
  const needsPhotos = activity.workType === "back-charge" && totalPhotos < 2;

  return (
    <div className={`bg-card border rounded-xl px-4 py-3 space-y-2.5 border-l-[3px] ${cfg.border} ${needsPhotos ? "border-amber-400/60" : "border-border/40"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
            <cfg.Icon size={14} className={cfg.text} />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">{t("logForm.activity", { n: index + 1 })}</p>
            <p className={`text-[10px] font-medium ${cfg.text}`}>{t(cfg.labelKey)}</p>
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0">
          <button onClick={onEdit} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"><Pencil size={13} /></button>
          <button onClick={onRemove} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"><X size={13} /></button>
        </div>
      </div>
      {activity.description && <p className="text-sm text-foreground line-clamp-2">{activity.description}</p>}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock size={12} /><span>{fmt(activity.timeStart)} → {fmt(activity.timeEnd)}</span>
        </div>
        {totalPhotos > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Camera size={12} /><span>{totalPhotos} photo{totalPhotos !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>
      {activity.workerNames.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users size={12} /><span>{activity.workerNames.join(", ")}</span>
        </div>
      )}
      {needsPhotos && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
          <AlertTriangle size={10} />{t("activitySheet.bcRequireLabel")}
        </p>
      )}
    </div>
  );
}

function PhotoSection({ photos, onAdd, onRemove }: {
  photos: File[]; onAdd: (files: File[]) => void; onRemove: (i: number) => void;
}) {
  const { t } = useI18n();
  const cameraRef  = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function processAndAdd(fileList: FileList | null, input: HTMLInputElement | null) {
    if (!fileList || fileList.length === 0) return;
    const result: File[] = [];
    for (const f of Array.from(fileList)) {
      if (!f.type.startsWith("image/")) continue;
      const ab   = await f.arrayBuffer();
      const blob = new Blob([ab], { type: f.type });
      result.push(new File([blob], f.name, { type: f.type }));
    }
    onAdd(result);
    if (input) input.value = "";
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => cameraRef.current?.click()} className="border-2 border-dashed border-border rounded-xl py-5 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
          <Camera size={18} />{t("common.camera")}
        </button>
        <button type="button" onClick={() => galleryRef.current?.click()} className="border-2 border-dashed border-border rounded-xl py-5 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
          <ImageIcon size={18} />{t("common.gallery")}
        </button>
      </div>
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => processAndAdd(e.target.files, cameraRef.current)} />
      <input ref={galleryRef} type="file" accept="image/*" multiple            className="hidden" onChange={(e) => processAndAdd(e.target.files, galleryRef.current)} />
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <div key={i} className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(p)} alt={p.name} className="w-full h-full object-cover rounded-lg" />
              <button onClick={() => onRemove(i)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hRaw, mRaw] = value.split(":").map(Number);
  const isPM   = hRaw >= 12;
  const hour12 = (hRaw % 12) || 12;
  const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  function emit(h12: number, min: number, pm: boolean) {
    const h24 = (h12 % 12) + (pm ? 12 : 0);
    onChange(`${String(h24).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }

  return (
    <div className="flex items-center bg-card border border-foreground/25 rounded-lg px-3 py-2.5 gap-1">
      <select value={hour12} onChange={(e) => emit(Number(e.target.value), mRaw, isPM)} className="bg-transparent text-sm text-foreground focus:outline-none appearance-none text-center w-6">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-sm text-muted-foreground">:</span>
      <select value={MINUTES.includes(mRaw) ? mRaw : 0} onChange={(e) => emit(hour12, Number(e.target.value), isPM)} className="bg-transparent text-sm text-foreground focus:outline-none appearance-none text-center w-7">
        {MINUTES.map((m) => <option key={m} value={m}>{String(m).padStart(2, "0")}</option>)}
      </select>
      <button type="button" onClick={() => emit(hour12, mRaw, !isPM)} className="ml-1 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 transition-colors">
        {isPM ? "PM" : "AM"}
      </button>
    </div>
  );
}

function BottomSheet({ open, onClose, title, step, totalSteps, children, footer }: {
  open: boolean; onClose: () => void; title: string;
  step?: number; totalSteps?: number;
  children: React.ReactNode; footer: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} onClick={onClose} />
      <div className={`fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] bg-background rounded-t-2xl flex flex-col transition-transform duration-300 ease-out ${open ? "translate-y-0" : "translate-y-full"}`}>
        <div className="flex justify-center pt-3 shrink-0"><div className="w-10 h-1 bg-border rounded-full" /></div>
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {step && totalSteps && <p className="text-[10px] text-muted-foreground">{t("common.step", { current: step, total: totalSteps })}</p>}
          </div>
          <div className="flex items-center gap-2">
            {step && totalSteps && (
              <div className="flex gap-1">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i + 1 <= step ? "bg-primary" : "bg-border"}`} />
                ))}
              </div>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-2">{children}</div>
        <div className="shrink-0 px-5 py-4 border-t border-border flex gap-3">{footer}</div>
      </div>
    </>
  );
}

function useSheetStep(open: boolean) {
  const [displayed, setDisplayed] = useState<1 | 2>(1);
  const [anim, setAnim]           = useState<"idle" | "exit" | "enter">("idle");
  const [dir, setDir]             = useState<"forward" | "back">("forward");

  useEffect(() => { if (open) { setDisplayed(1); setAnim("idle"); } }, [open]);

  function goTo(next: 1 | 2) {
    setDir(next > displayed ? "forward" : "back");
    setAnim("exit");
    setTimeout(() => {
      setDisplayed(next); setAnim("enter");
      requestAnimationFrame(() => requestAnimationFrame(() => setAnim("idle")));
    }, 180);
  }

  const cls = ["transition-all duration-200 ease-in-out",
    anim === "idle" ? "opacity-100 translate-x-0"
      : anim === "exit"  ? (dir === "forward" ? "opacity-0 -translate-x-6" : "opacity-0 translate-x-6")
      : (dir === "forward" ? "opacity-0 translate-x-6" : "opacity-0 -translate-x-6"),
  ].join(" ");

  return { displayed, goTo, cls };
}

function ActivitySheet({ open, workers, draft, existingPhotoCount, onChange, onClose, onConfirm }: {
  open: boolean; workers: Worker[]; draft: Activity; existingPhotoCount: number;
  onChange: (a: Activity) => void; onClose: () => void; onConfirm: () => void;
}) {
  const { t } = useI18n();
  const { displayed, goTo, cls } = useSheetStep(open);
  const [search, setSearch] = useState("");
  useEffect(() => { if (open) setSearch(""); }, [open]);

  const isBC       = draft.workType === "back-charge";
  const canNext    = draft.description.trim().length > 0;
  const canConfirm = !isBC || (existingPhotoCount + draft.photos.length) >= 2;

  return (
    <BottomSheet open={open} onClose={onClose} title={displayed === 1 ? t("activitySheet.whatTitle") : t("activitySheet.whoTitle")} step={displayed} totalSteps={2}
      footer={displayed === 1 ? (
        <>
          <button onClick={onClose} className="flex-1 border border-border rounded-lg py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors">{t("common.cancel")}</button>
          <button onClick={() => goTo(2)} disabled={!canNext} className="flex-1 bg-primary text-primary-foreground rounded-lg py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2">
            {t("common.next")} <ChevronRight size={16} />
          </button>
        </>
      ) : (
        <>
          <button onClick={() => goTo(1)} className="flex-1 border border-border rounded-lg py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors">{t("common.back")}</button>
          <button onClick={onConfirm} disabled={!canConfirm} className="flex-1 bg-primary text-primary-foreground rounded-lg py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2">
            <Check size={16} />{t("common.confirm")}
          </button>
        </>
      )}
    >
      <div className={cls}>
        {displayed === 1 ? (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><AlignLeft size={12} />{t("activitySheet.description")}</label>
              <textarea value={draft.description} onChange={(e) => onChange({ ...draft, description: e.target.value })} rows={4} placeholder={t("activitySheet.descPlaceholder")} autoFocus
                className="w-full bg-card border border-foreground/25 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Clock size={12} />{t("activitySheet.start")}</label>
                <TimeInput value={draft.timeStart} onChange={(v) => onChange({ ...draft, timeStart: v })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Clock size={12} />{t("activitySheet.end")}</label>
                <TimeInput value={draft.timeEnd} onChange={(v) => onChange({ ...draft, timeEnd: v })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Tag size={12} />{t("activitySheet.workType")}</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(WORK_TYPE_CONFIG) as [WorkTypeKey, typeof WORK_TYPE_CONFIG[WorkTypeKey]][]).map(([key, cfg]) => {
                  const sel = draft.workType === key;
                  return (
                    <button key={key} onClick={() => onChange({ ...draft, workType: key })}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-colors flex items-center gap-2 ${sel ? `${cfg.bg} ${cfg.border} ${cfg.text}` : "bg-background border-border/40 text-muted-foreground hover:border-border"}`}>
                      <cfg.Icon size={13} />{t(cfg.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
            {isBC && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Building2 size={12} />{t("activitySheet.chargeableSub")}</label>
                <input
                  value={draft.chargeableSub ?? ""}
                  onChange={(e) => onChange({ ...draft, chargeableSub: e.target.value })}
                  placeholder={t("activitySheet.chargeablePlaceholder")}
                  className="w-full bg-card border border-foreground/25 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Camera size={12} />{t("activitySheet.addPhotos")}</label>
              <PhotoSection
                photos={draft.photos}
                onAdd={(files) => onChange({ ...draft, photos: [...draft.photos, ...files] })}
                onRemove={(i) => onChange({ ...draft, photos: draft.photos.filter((_, idx) => idx !== i) })}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {!canConfirm && (
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-lg px-3 py-2">
                <AlertTriangle size={12} />{t("activitySheet.bcPhotosWarning")}
              </div>
            )}
            {draft.workerNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {draft.workerNames.map((name) => (
                  <span key={name} className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
                    {name}
                    <button onClick={() => onChange({ ...draft, workerNames: draft.workerNames.filter((n) => n !== name) })}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input type="text" placeholder={t("activitySheet.searchCrew")} value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-card border border-foreground/25 rounded-lg pl-9 pr-8 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors" />
              {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"><X size={14} /></button>}
            </div>
            <div className="overflow-y-auto max-h-60 space-y-1.5 pr-0.5">
              {workers.filter((w) => w.name.toLowerCase().includes(search.toLowerCase())).map((w) => {
                const sel = draft.workerNames.includes(w.name);
                return (
                  <button key={w.id} onClick={() => {
                    const names = sel ? draft.workerNames.filter((n) => n !== w.name) : [...draft.workerNames, w.name];
                    onChange({ ...draft, workerNames: names });
                  }} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${sel ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border/40 text-foreground hover:bg-accent"}`}>
                    {w.name}{sel && <Check size={16} />}
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

// ─── Subcontractor section ────────────────────────────────────────────────────

function SubcontractorSection({ subcontractors, onChange }: {
  subcontractors: SubEntry[];
  onChange: (subs: SubEntry[]) => void;
}) {
  const { t } = useI18n();
  const [adding, setAdding]             = useState(false);
  const [draftCompany, setDraftCompany] = useState("");
  const [draftWorkers, setDraftWorkers] = useState("");
  const [draftDesc, setDraftDesc]       = useState("");

  function addSub() {
    if (!draftCompany.trim()) return;
    const workerNames = draftWorkers.split(",").map((w) => w.trim()).filter(Boolean);
    onChange([...subcontractors, { company: draftCompany.trim(), workerNames, description: draftDesc.trim() }]);
    setDraftCompany(""); setDraftWorkers(""); setDraftDesc(""); setAdding(false);
  }

  return (
    <div className="space-y-2">
      {subcontractors.map((s, i) => (
        <div key={i} className="bg-card border border-border/40 rounded-xl px-4 py-3 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 size={13} className="text-primary shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-foreground">{s.company}</p>
            </div>
            <button onClick={() => onChange(subcontractors.filter((_, idx) => idx !== i))} className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0">
              <X size={13} />
            </button>
          </div>
          {s.workerNames.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-5">
              <Users size={11} /><span>{s.workerNames.join(", ")}</span>
            </div>
          )}
          {s.description && (
            <p className="text-xs text-muted-foreground pl-5 line-clamp-2">{s.description}</p>
          )}
        </div>
      ))}

      {adding ? (
        <div className="bg-background border border-primary/20 rounded-xl p-3 space-y-2">
          <input
            autoFocus value={draftCompany} onChange={(e) => setDraftCompany(e.target.value)}
            placeholder={t("logForm.companyName")}
            className="w-full bg-card border border-foreground/25 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors"
          />
          <input
            value={draftWorkers} onChange={(e) => setDraftWorkers(e.target.value)}
            placeholder={t("logForm.workers")}
            className="w-full bg-card border border-foreground/25 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors"
          />
          <textarea
            value={draftDesc} onChange={(e) => setDraftDesc(e.target.value)} rows={2}
            placeholder={t("logForm.whatDone")}
            className="w-full bg-card border border-foreground/25 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary transition-colors resize-none"
          />
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setDraftCompany(""); setDraftWorkers(""); setDraftDesc(""); }} className="flex-1 border border-border rounded-lg py-2 text-sm text-muted-foreground hover:bg-accent transition-colors">
              {t("common.cancel")}
            </button>
            <button onClick={addSub} disabled={!draftCompany.trim()} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-semibold disabled:opacity-40 transition-opacity">
              {t("common.add")}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="w-full border-2 border-dashed border-border rounded-xl py-3.5 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
          <Plus size={15} />{t("logForm.addSubcontractor")}
        </button>
      )}
    </div>
  );
}

// ─── Activity Confirm Modal ───────────────────────────────────────────────────

function ActivityConfirmModal({ open, activityNumber, onAddAnother, onContinue }: {
  open: boolean; activityNumber: number; onAddAnother: () => void; onContinue: () => void;
}) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/50" onClick={onContinue} />
      <div className="relative bg-background rounded-2xl p-6 w-full max-w-sm shadow-xl flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Check size={28} className="text-emerald-500" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-foreground">{t("activityConfirm.title", { n: activityNumber })}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("activityConfirm.subtitle")}</p>
        </div>
        <div className="flex flex-col gap-2 w-full">
          <button onClick={onAddAnother} className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            <Plus size={16} />{t("activityConfirm.addAnother")}
          </button>
          <button onClick={onContinue} className="w-full border border-border text-foreground font-medium py-3 rounded-lg text-sm hover:bg-accent transition-colors">
            {t("activityConfirm.continue")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Save Success Modal ───────────────────────────────────────────────────────

function SaveModal({ open, logId, closeEnabled, onClose }: {
  open: boolean; logId: string; closeEnabled: boolean; onClose: () => void;
}) {
  const { t } = useI18n();
  if (!open) return null;

  function downloadPdf() {
    window.open(`/api/daily-log/${logId}/pdf`, "_blank");
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-background rounded-2xl p-6 w-full max-w-sm shadow-xl flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Check size={20} className="text-emerald-500" />
          </div>
          <button
            onClick={onClose}
            disabled={!closeEnabled}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <p className="text-base font-semibold text-foreground">{t("submitModal.updated")}</p>
          <div className="space-y-2">
            <div className="flex gap-2.5">
              <span className="text-xs font-bold text-primary shrink-0 mt-0.5">1.</span>
              <p className="text-sm text-muted-foreground">
                {t("submitModal.subtitleBefore")}<span className="font-semibold text-foreground">Buildertrend</span>{t("submitModal.subtitleAfter")}
              </p>
            </div>
            <div className="flex gap-2.5">
              <span className="text-xs font-bold text-primary shrink-0 mt-0.5">2.</span>
              <p className="text-sm text-muted-foreground">{t("submitModal.photoInstruction")}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={downloadPdf}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Download size={16} />{t("submitModal.download")}
          </button>
        </div>
        {!closeEnabled && (
          <p className="text-xs text-muted-foreground text-center">{t("submitModal.closing")}</p>
        )}
      </div>
    </div>
  );
}
