"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, CalendarDays, Users, Minus, Plus, MapPin,
  Layers, Wrench, MessageSquare, Package, Car, KeyRound,
  ShieldCheck, Camera, AlertTriangle, X, Check,
} from "lucide-react";

const STAGES = [
  "Rough-in",
  "Trim-out",
  "Service Call",
  "Final",
  "Other",
];

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const TODAY = localDateStr();

function DateInput({ value, max, onChange }: { value: string; max: string; onChange: (v: string) => void }) {
  const [y, m, d] = value.split("-").map(Number);
  const display = `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}/${y}`;
  return (
    <div className="relative flex items-center justify-center gap-2 bg-background border border-foreground/25 rounded-lg px-3 py-3">
      <CalendarDays size={16} className="text-muted-foreground shrink-0 pointer-events-none" />
      <span className="text-sm text-foreground pointer-events-none">{display}</span>
      <input type="date" value={value} max={max} onChange={(e) => e.target.value && onChange(e.target.value)}
        className="date-overlay absolute inset-0 w-full h-full" />
    </div>
  );
}

interface FormState {
  date: string;
  places: number;
  locations: string;
  stage: string;
  teamMembers: string[];
  performedService: string;
  observations: string;
  materialControl: string;
  vehicle: boolean;
  licensePlates: string[];
  driver: string;
  warrantyService: boolean;
}

const INIT: FormState = {
  date: TODAY,
  places: 1,
  locations: "",
  stage: "",
  teamMembers: [],
  performedService: "",
  observations: "",
  materialControl: "",
  vehicle: false,
  licensePlates: [],
  driver: "",
  warrantyService: false,
};

export default function HVACLogNewPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INIT);
  const [workers, setWorkers] = useState<{ id: number; name: string }[]>([]);
  const [workerSearch, setWorkerSearch] = useState("");
  const [newPlate, setNewPlate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [dateBlocked, setDateBlocked] = useState(false);

  const upd = useCallback((patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch })), []);

  useEffect(() => {
    fetch("/api/qbt/workers?company=hvac").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setWorkers(d);
    });
  }, []);

  useEffect(() => {
    fetch("/api/hvac-log").then((r) => r.json()).then((logs) => {
      if (Array.isArray(logs)) setDateBlocked(logs.some((l) => l.date === form.date));
    });
  }, [form.date]);

  function toggleMember(name: string) {
    upd({ teamMembers: form.teamMembers.includes(name) ? form.teamMembers.filter((n) => n !== name) : [...form.teamMembers, name] });
  }

  function addPlate() {
    const p = newPlate.trim().toUpperCase();
    if (!p || form.licensePlates.includes(p)) return;
    upd({ licensePlates: [...form.licensePlates, p] });
    setNewPlate("");
  }

  function validate(): string | null {
    if (!form.date) return "Select a date.";
    if (dateBlocked) return "A log already exists for this date.";
    if (!form.stage) return "Select a stage.";
    if (!form.performedService.trim()) return "Describe the performed service.";
    if (form.vehicle && form.licensePlates.length === 0) return "Add at least one license plate.";
    return null;
  }

  async function submit() {
    const err = validate();
    if (err) { setSubmitError(err); return; }
    setSubmitting(true); setSubmitError("");
    const res = await fetch("/api/hvac-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (!res.ok) { setSubmitError((await res.json()).error ?? "Submission failed."); return; }
    router.push("/dashboard");
  }

  const filteredWorkers = workerSearch.trim()
    ? workers.filter((w) => w.name.toLowerCase().includes(workerSearch.toLowerCase()))
    : workers;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <p className="text-sm font-semibold text-foreground">HVAC Daily Log</p>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 flex flex-col gap-8">

        {/* Date */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={13} className="text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Date</p>
          </div>
          <DateInput value={form.date} max={TODAY} onChange={(d) => upd({ date: d })} />
          {dateBlocked && <p className="text-xs text-amber-500">A log already exists for this date.</p>}
        </div>

        {/* How many places */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">How many places did you work?</p>
          </div>
          <div className="flex items-center bg-card border border-foreground/25 rounded-lg px-4 py-3 gap-4">
            <button onClick={() => upd({ places: Math.max(1, form.places - 1) })}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors">
              <Minus size={16} />
            </button>
            <span className="flex-1 text-center text-lg font-semibold text-foreground">{form.places}</span>
            <button onClick={() => upd({ places: form.places + 1 })}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Locations / Times */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Which locations? / What times?</p>
          </div>
          <textarea value={form.locations} onChange={(e) => upd({ locations: e.target.value })} rows={3}
            className="w-full bg-background border border-foreground/25 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary resize-none"
            placeholder="e.g. 123 Main St 8am–12pm, 456 Oak Ave 1pm–5pm" />
        </div>

        {/* Stage */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Layers size={13} className="text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Stage</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <button key={s} onClick={() => upd({ stage: s })}
                className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${form.stage === s ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border/40 text-muted-foreground hover:border-border"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Team Members */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Users size={13} className="text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Team Members</p>
          </div>
          {form.teamMembers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.teamMembers.map((n) => (
                <span key={n} className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-full">
                  {n}
                  <button onClick={() => upd({ teamMembers: form.teamMembers.filter((x) => x !== n) })}><X size={10} /></button>
                </span>
              ))}
            </div>
          )}
          <input value={workerSearch} onChange={(e) => setWorkerSearch(e.target.value)}
            className="w-full bg-background border border-foreground/25 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
            placeholder="Search workers…" />
          <div className="overflow-y-auto max-h-48 space-y-1 pr-0.5">
            {filteredWorkers.map((w) => {
              const sel = form.teamMembers.includes(w.name);
              return (
                <button key={w.id} onClick={() => toggleMember(w.name)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${sel ? "bg-primary/5 border-primary/30 text-primary" : "bg-background border-border/40 text-foreground hover:border-border"}`}>
                  <span>{w.name}</span>
                  {sel && <Check size={14} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Performed Service */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Wrench size={13} className="text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Performed Service</p>
          </div>
          <textarea value={form.performedService} onChange={(e) => upd({ performedService: e.target.value })} rows={3}
            className="w-full bg-background border border-foreground/25 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary resize-none"
            placeholder="Describe the service performed…" />
        </div>

        {/* Observations */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <MessageSquare size={13} className="text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Observations <span className="normal-case font-normal">(optional)</span></p>
          </div>
          <textarea value={form.observations} onChange={(e) => upd({ observations: e.target.value })} rows={2}
            className="w-full bg-background border border-foreground/25 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary resize-none"
            placeholder="Any additional observations…" />
        </div>

        {/* Material Control */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Package size={13} className="text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Material Control</p>
          </div>
          <textarea value={form.materialControl} onChange={(e) => upd({ materialControl: e.target.value })} rows={2}
            className="w-full bg-background border border-foreground/25 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary resize-none"
            placeholder="Materials used or received…" />
        </div>

        {/* Vehicle */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Car size={13} className="text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Vehicle</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([false, true] as const).map((v) => (
              <button key={String(v)} onClick={() => upd({ vehicle: v, licensePlates: v ? form.licensePlates : [], driver: v ? form.driver : "" })}
                className={`py-2.5 rounded-lg border text-sm font-semibold transition-colors ${form.vehicle === v ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border/40 text-muted-foreground"}`}>
                {v ? "Yes" : "No"}
              </button>
            ))}
          </div>

          {form.vehicle && (
            <div className="space-y-3 pl-1">
              {/* License plates */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium flex items-center gap-1"><KeyRound size={11} /> License Plates</label>
                {form.licensePlates.map((p) => (
                  <div key={p} className="flex items-center justify-between px-3 py-2 bg-background border border-border/40 rounded-lg">
                    <span className="text-sm font-mono text-foreground">{p}</span>
                    <button onClick={() => upd({ licensePlates: form.licensePlates.filter((x) => x !== p) })} className="text-muted-foreground hover:text-destructive">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input value={newPlate} onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && addPlate()}
                    className="flex-1 bg-background border border-foreground/25 rounded-lg px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary uppercase"
                    placeholder="Plate number" />
                  <button onClick={addPlate} className="px-4 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent font-semibold text-sm">
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Driver */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Users size={11} /> Driver</label>
                <input value={form.driver} onChange={(e) => upd({ driver: e.target.value })}
                  className="w-full bg-background border border-foreground/25 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                  placeholder="Driver name" />
              </div>
            </div>
          )}
        </div>

        {/* Warranty service */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Did you do any warranty service?</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([false, true] as const).map((v) => (
              <button key={String(v)} onClick={() => upd({ warrantyService: v })}
                className={`py-2.5 rounded-lg border text-sm font-semibold transition-colors ${form.warrantyService === v ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border/40 text-muted-foreground"}`}>
                {v ? "Yes" : "No"}
              </button>
            ))}
          </div>
        </div>

        {/* Photos placeholder */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Camera size={13} className="text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Photos</p>
          </div>
          <p className="text-xs text-muted-foreground">Photos can be added after submitting the log.</p>
        </div>

        {/* Error */}
        {submitError && (
          <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{submitError}</p>
          </div>
        )}

        {/* Submit */}
        <button onClick={submit} disabled={submitting || dateBlocked}
          className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
          {submitting ? "Submitting…" : "Submit Log"}
        </button>
      </main>
    </div>
  );
}

