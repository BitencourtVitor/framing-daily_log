"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ShieldCheck, Car, Plus, X, Check, Pencil, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";

interface Vehicle {
  _id: string;
  plate: string;
  description: string;
  active: boolean;
}

export default function AdminVehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newPlate, setNewPlate] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editPlate, setEditPlate] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/me").then((r) => r.ok ? r.json() : {} as { role?: string }).then((d) => {
      if (d.role !== "admin" && d.role !== "dev") router.replace("/dashboard");
    });
    load();
  }, [router]);

  async function load() {
    const data = await fetch("/api/admin/vehicles").then((r) => r.json());
    setVehicles(Array.isArray(data) ? data : []);
  }

  async function create() {
    if (!newPlate.trim()) return;
    setSaving(true); setError("");
    const res = await fetch("/api/admin/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plate: newPlate.trim(), description: newDesc.trim() }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    setShowAdd(false); setNewPlate(""); setNewDesc("");
    load();
  }

  async function saveEdit(id: string) {
    setSaving(true); setError("");
    const res = await fetch(`/api/admin/vehicles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plate: editPlate, description: editDesc, active: editActive }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    setEditId(null);
    load();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => router.push("/admin")} className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <ShieldCheck size={16} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Vehicles</p>
        </div>
        <button onClick={() => { setShowAdd(true); setError(""); }}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90">
          <Plus size={14} /> Add
        </button>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-3">
        {showAdd && (
          <div className="bg-card border border-border/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">New Vehicle</p>
              <button onClick={() => { setShowAdd(false); setError(""); }} className="text-muted-foreground"><X size={16} /></button>
            </div>
            <input value={newPlate} onChange={(e) => setNewPlate(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary uppercase"
              placeholder="License plate" />
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              placeholder="Description (optional — e.g. Ford F-150 White)" />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button onClick={create} disabled={saving}
              className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Add Vehicle"}
            </button>
          </div>
        )}

        {vehicles === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        ) : vehicles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vehicles yet.</p>
        ) : (
          vehicles.map((v) => {
            const isEditing = editId === v._id;
            return (
              <div key={v._id} className={`bg-card border rounded-xl px-4 py-3 space-y-2 ${v.active ? "border-border/40" : "border-border/20 opacity-60"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Car size={14} className="text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{v.plate}</p>
                      {v.description && <p className="text-xs text-muted-foreground truncate">{v.description}</p>}
                    </div>
                    {!v.active && <span className="text-[10px] text-muted-foreground">(inactive)</span>}
                  </div>
                  <button onClick={() => {
                    if (isEditing) setEditId(null);
                    else { setEditId(v._id); setEditPlate(v.plate); setEditDesc(v.description); setEditActive(v.active); setError(""); }
                  }} className="text-primary shrink-0">
                    <Pencil size={14} />
                  </button>
                </div>

                {isEditing && (
                  <div className="space-y-3 pt-2 border-t border-border/40">
                    <input value={editPlate} onChange={(e) => setEditPlate(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary uppercase"
                      placeholder="License plate" />
                    <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                      placeholder="Description" />
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground font-medium">Active</label>
                      <button onClick={() => setEditActive(!editActive)} className={editActive ? "text-emerald-500" : "text-muted-foreground"}>
                        {editActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      </button>
                    </div>
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <button onClick={() => saveEdit(v._id)} disabled={saving}
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
