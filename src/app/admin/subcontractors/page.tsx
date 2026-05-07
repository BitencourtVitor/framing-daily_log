"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ShieldCheck, Building2, Plus, X, Check,
  UserPlus, ToggleLeft, ToggleRight, Pencil, Loader2,
} from "lucide-react";

interface Sub {
  _id: string;
  company: string;
  workers: string[];
  active: boolean;
}

export default function AdminSubcontractorsPage() {
  const router = useRouter();
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [newCompany, setNewCompany] = useState("");
  const [addingCompany, setAddingCompany] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editWorkers, setEditWorkers] = useState<string[]>([]);
  const [editCompany, setEditCompany] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [newWorker, setNewWorker] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/me").then((r) => r.ok ? r.json() : {} as { role?: string }).then((d) => {
      if (d.role !== "admin" && d.role !== "dev") router.replace("/dashboard");
    });
    load();
  }, [router]);

  async function load() {
    const data = await fetch("/api/admin/subcontractors").then((r) => r.json());
    setSubs(Array.isArray(data) ? data : []);
  }

  async function createCompany() {
    if (!newCompany.trim()) return;
    setSaving(true); setError("");
    const res = await fetch("/api/admin/subcontractors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: newCompany.trim() }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    setNewCompany(""); setAddingCompany(false);
    load();
  }

  function startEdit(sub: Sub) {
    setEditId(sub._id);
    setEditCompany(sub.company);
    setEditWorkers([...sub.workers]);
    setEditActive(sub.active);
    setNewWorker("");
    setError("");
  }

  async function saveEdit(id: string) {
    setSaving(true); setError("");
    const res = await fetch(`/api/admin/subcontractors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: editCompany, workers: editWorkers, active: editActive }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    setEditId(null);
    load();
  }

  function addWorker() {
    const w = newWorker.trim();
    if (!w || editWorkers.includes(w)) return;
    setEditWorkers([...editWorkers, w]);
    setNewWorker("");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => router.push("/admin")} className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <ShieldCheck size={16} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Subcontractors</p>
        </div>
        <button
          onClick={() => { setAddingCompany(true); setError(""); }}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus size={14} /> Add
        </button>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-3">
        {/* Add company form */}
        {addingCompany && (
          <div className="bg-card border border-border/40 rounded-xl p-4 flex gap-2 items-center">
            <input
              autoFocus value={newCompany} onChange={(e) => setNewCompany(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createCompany()}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              placeholder="Company name"
            />
            <button onClick={createCompany} disabled={saving} className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50">
              <Check size={16} />
            </button>
            <button onClick={() => { setAddingCompany(false); setNewCompany(""); setError(""); }} className="p-2 text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>
        )}
        {error && <p className="text-xs text-red-500 px-1">{error}</p>}

        {subs === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        ) : (
          subs.map((sub) => {
            const isEditing = editId === sub._id;
            return (
              <div key={sub._id} className={`bg-card border rounded-xl px-4 py-3 space-y-2 ${sub.active ? "border-border/40" : "border-border/20 opacity-60"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 size={14} className="text-muted-foreground shrink-0" />
                    <p className="text-sm font-semibold text-foreground truncate">{sub.company}</p>
                    {!sub.active && <span className="text-[10px] text-muted-foreground">(inactive)</span>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">{sub.workers.length} workers</span>
                    <button onClick={() => isEditing ? setEditId(null) : startEdit(sub)} className="text-primary">
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>

                {/* Workers list (view mode) */}
                {!isEditing && sub.workers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {sub.workers.map((w) => (
                      <span key={w} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{w}</span>
                    ))}
                  </div>
                )}

                {/* Edit mode */}
                {isEditing && (
                  <div className="space-y-3 pt-2 border-t border-border/40">
                    {/* Company name */}
                    <div>
                      <label className="text-xs text-muted-foreground font-medium">Company name</label>
                      <input value={editCompany} onChange={(e) => setEditCompany(e.target.value)}
                        className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary" />
                    </div>

                    {/* Workers */}
                    <div>
                      <label className="text-xs text-muted-foreground font-medium flex items-center gap-1"><UserPlus size={11} /> Workers</label>
                      <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
                        {editWorkers.map((w) => (
                          <span key={w} className="flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                            {w}
                            <button onClick={() => setEditWorkers(editWorkers.filter((x) => x !== w))} className="text-muted-foreground hover:text-destructive ml-0.5">
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input value={newWorker} onChange={(e) => setNewWorker(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addWorker()}
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                          placeholder="Worker name" />
                        <button onClick={addWorker} className="p-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent">
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground font-medium">Active</label>
                      <button onClick={() => setEditActive(!editActive)} className={editActive ? "text-emerald-500" : "text-muted-foreground"}>
                        {editActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      </button>
                    </div>

                    <button onClick={() => saveEdit(sub._id)} disabled={saving}
                      className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
