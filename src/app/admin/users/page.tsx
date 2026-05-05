"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ShieldCheck, Plus, X, Check,
  Building2, UserCog, KeyRound, Pencil, Search,
  Crown, Terminal, HardHat,
} from "lucide-react";

type CompanyId = "framing" | "hvac" | "pcg";
type UserRole = "admin" | "dev" | "supervisor";

interface AppUser {
  _id: string; // email
  name: string;
  role: UserRole;
  companies: CompanyId[];
  qbtIds: Partial<Record<CompanyId, number>>;
  active: boolean;
}

interface QBTWorker { id: number; name: string; email: string; registered?: boolean; }

const COMPANIES: { id: CompanyId; label: string; logo: string }[] = [
  { id: "framing", label: "Framing", logo: "/images/sublogo_framing.png" },
  { id: "hvac",    label: "HVAC",    logo: "/images/sublogo_hvac.png" },
  { id: "pcg",     label: "PCG",     logo: "/images/sublogo_pcg.png" },
];

const ROLES: UserRole[] = ["admin", "dev", "supervisor"];
const ADD_ROLES: UserRole[] = ["admin", "supervisor"];

const ROLE_COLORS: Record<UserRole, string> = {
  admin:      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  dev:        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  supervisor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  admin:      Crown,
  dev:        Terminal,
  supervisor: HardHat,
};

function PinInput({ label, pin, onChange, disabled }: {
  label: string; pin: string[]; onChange: (p: string[]) => void; disabled?: boolean;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  function handleChange(i: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...pin]; next[i] = value; onChange(next);
    if (value && i < 5) inputs.current[i + 1]?.focus();
  }
  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !pin[i] && i > 0) inputs.current[i - 1]?.focus();
  }
  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
        <KeyRound size={11} /> {label}
      </label>
      <div className="flex gap-2">
        {pin.map((digit, i) => (
          <input key={i} ref={(el) => { inputs.current[i] = el; }}
            type="password" inputMode="numeric" maxLength={1} value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={disabled}
            className="flex-1 min-w-0 aspect-square text-center text-base font-bold rounded-md border border-foreground/25 bg-background text-foreground caret-transparent focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none disabled:opacity-50 transition-colors" />
        ))}
      </div>
    </div>
  );
}

const EMPTY_PIN = ["", "", "", "", "", ""];

export default function ManageUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [activeTab, setActiveTab] = useState<CompanyId>("framing");
  const [myId, setMyId] = useState<string | null>(null);

  /* ── Modal state ── */
  const [showModal, setShowModal] = useState(false);
  const [modalCompany, setModalCompany] = useState<CompanyId | null>(null);
  const [qbtWorkers, setQbtWorkers] = useState<QBTWorker[]>([]);
  const [totalQbtWorkers, setTotalQbtWorkers] = useState(0);
  const [workersError, setWorkersError] = useState("");
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [workerSearch, setWorkerSearch] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<QBTWorker | null>(null);
  const [role, setRole] = useState<UserRole>("supervisor");
  const [companies, setCompanies] = useState<CompanyId[]>([]);
  const [pin, setPin] = useState<string[]>(EMPTY_PIN);
  const [pinConfirm, setPinConfirm] = useState<string[]>(EMPTY_PIN);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* ── Edit state ── */
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<AppUser>>({});
  const [editPin, setEditPin] = useState<string[]>(EMPTY_PIN);
  const [editPinConfirm, setEditPinConfirm] = useState<string[]>(EMPTY_PIN);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => {
      if (d.role !== "admin" && d.role !== "dev") router.replace("/dashboard");
      else setMyId(d.userId);
    });
    loadUsers();
  }, [router]);

  async function loadUsers() {
    const data = await fetch("/api/admin/users").then((r) => r.json());
    setUsers(Array.isArray(data) ? data : []);
  }

  const loadWorkers = useCallback(async (c: CompanyId, existingUsers: AppUser[]) => {
    setLoadingWorkers(true); setQbtWorkers([]); setTotalQbtWorkers(0); setWorkersError(""); setSelectedWorker(null); setWorkerSearch("");
    const res = await fetch(`/api/qbt/workers?company=${c}`);
    const data = await res.json();
    if (!res.ok) { setWorkersError(data.error ?? "Failed to load workers."); setLoadingWorkers(false); return; }
    const raw: QBTWorker[] = Array.isArray(data) ? data : [];
    const existingEmails = new Set(existingUsers.map((u) => u._id).filter(Boolean));
    const marked = raw.map((w) => ({ ...w, registered: !!w.email && existingEmails.has(w.email) }));
    setTotalQbtWorkers(raw.length); setQbtWorkers(marked); setLoadingWorkers(false);
  }, []);

  function openModal() {
    setShowModal(true); setModalCompany(null); setQbtWorkers([]); setTotalQbtWorkers(0); setWorkersError(""); setSelectedWorker(null);
    setWorkerSearch(""); setRole("supervisor"); setCompanies([]); setPin(EMPTY_PIN); setPinConfirm(EMPTY_PIN); setError("");
  }

  function closeModal() { setShowModal(false); }

  function pickCompany(c: CompanyId) {
    setModalCompany(c); setCompanies([c]); setSelectedWorker(null);
    if (users) loadWorkers(c, users);
  }

  function toggleCompany(arr: CompanyId[], id: CompanyId): CompanyId[] {
    return arr.includes(id) ? arr.filter((c) => c !== id) : [...arr, id];
  }

  async function createUser() {
    const pinStr = pin.join(""); const confirmStr = pinConfirm.join("");
    if (pinStr.length !== 6) { setError("Enter a 6-digit PIN."); return; }
    if (pinStr !== confirmStr) { setError("PINs don't match."); return; }
    if (!selectedWorker) { setError("Select a worker."); return; }
    setError(""); setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qbtId: selectedWorker.id, name: selectedWorker.name, email: selectedWorker.email, role, companies, pin: pinStr }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    closeModal(); loadUsers();
  }

  async function saveEdit(id: string) {
    setEditError(""); setEditSaving(true);
    const pinStr = editPin.join("");
    const payload: Partial<AppUser & { pin: string }> = { ...editData };
    if (pinStr.length === 6) {
      if (pinStr !== editPinConfirm.join("")) { setEditError("PINs don't match."); setEditSaving(false); return; }
      payload.pin = pinStr;
    } else if (pinStr.length > 0) {
      setEditError("PIN must be 6 digits."); setEditSaving(false); return;
    }
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setEditSaving(false);
    if (!res.ok) { setEditError((await res.json()).error); return; }
    setEditId(null); setEditData({}); loadUsers();
  }

  const filteredWorkers = workerSearch.trim()
    ? qbtWorkers.filter((w) => {
        const q = workerSearch.toLowerCase();
        return w.name.toLowerCase().includes(q) || w.email.toLowerCase().includes(q);
      })
    : qbtWorkers;

  const pinFull = pin.every((d) => d !== "");
  const tabUsers = (users ?? []).filter((u) => u.companies.includes(activeTab));

  return (
    <>
      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={closeModal} />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-5 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">New User</p>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>

            {/* Company */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Building2 size={11} /> Company
              </label>
              <div className="flex gap-2">
                {COMPANIES.map(({ id, label, logo }) => (
                  <button key={id} onClick={() => pickCompany(id)}
                    className={`flex-1 py-2.5 rounded-lg border text-xs font-semibold transition-colors flex flex-col items-center gap-1 ${modalCompany === id ? "bg-primary/5 border-primary text-primary" : "bg-background border-border/40 text-muted-foreground hover:border-border"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo} alt={label} className={`h-5 object-contain ${modalCompany === id ? "" : "grayscale opacity-50"}`} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Worker list */}
            {modalCompany && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Search size={11} /> Select Worker
                  {selectedWorker && <span className="ml-auto text-primary font-semibold truncate max-w-32">{selectedWorker.name}</span>}
                </label>
                {loadingWorkers ? (
                  <p className="text-xs text-muted-foreground">Loading…</p>
                ) : workersError ? (
                  <p className="text-xs text-red-500">{workersError}</p>
                ) : qbtWorkers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No workers found for this company.</p>
                ) : (
                  <>
                    <input value={workerSearch} onChange={(e) => setWorkerSearch(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                      placeholder="Search name or email…" />
                    <div className="overflow-y-auto max-h-48 space-y-1 pr-0.5">
                      {filteredWorkers.map((w) => {
                        const sel = selectedWorker?.id === w.id;
                        if (w.registered) {
                          return (
                            <div key={w.id} className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border/20 bg-background/40 opacity-50 cursor-default">
                              <div className="min-w-0">
                                <p className="text-sm text-foreground truncate">{w.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{w.email || "—"}</p>
                              </div>
                              <span className="text-[10px] font-semibold text-muted-foreground shrink-0 ml-2">Registered</span>
                            </div>
                          );
                        }
                        return (
                          <button key={w.id} onClick={() => setSelectedWorker(sel ? null : w)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${sel ? "bg-primary/5 border-primary/30 text-primary" : "bg-background border-border/40 text-foreground hover:border-border"}`}>
                            <div className="min-w-0 text-left">
                              <p className="truncate">{w.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{w.email || "—"}</p>
                            </div>
                            {sel && <Check size={14} className="shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Role + Companies + PIN */}
            {selectedWorker && (
              <>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-medium flex items-center gap-1"><UserCog size={11} /> Role</label>
                  <div className="flex gap-2">
                    {ADD_ROLES.map((r) => {
                      const Icon = ROLE_ICONS[r];
                      return (
                        <button key={r} onClick={() => setRole(r)}
                          className={`flex-1 py-2 rounded-lg border text-xs font-semibold capitalize transition-colors flex items-center justify-center gap-1.5 ${role === r ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border/40 text-muted-foreground hover:border-border"}`}>
                          <Icon size={12} />{r}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Building2 size={11} /> Also in</label>
                  <div className="flex gap-2">
                    {COMPANIES.map(({ id, label }) => {
                      const sel = companies.includes(id);
                      return (
                        <button key={id} onClick={() => setCompanies(toggleCompany(companies, id))}
                          className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border/40 text-muted-foreground"}`}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <PinInput label="PIN" pin={pin} onChange={setPin} />
                {pinFull && <PinInput label="Confirm PIN" pin={pinConfirm} onChange={setPinConfirm} />}
              </>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            {selectedWorker && pinFull && (
              <button onClick={createUser} disabled={saving}
                className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
                {saving ? "Creating…" : "Create User"}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => router.push("/admin")} className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <ChevronRight size={18} className="rotate-180" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <ShieldCheck size={16} className="text-primary" />
            <p className="text-sm font-semibold text-foreground">Manage Users</p>
          </div>
          <button onClick={openModal}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90">
            <Plus size={14} /> Add User
          </button>
        </header>

        {/* Company tabs */}
        <div className="sticky top-14 z-10 bg-card/80 backdrop-blur-sm border-b border-border px-4 flex gap-1 shrink-0">
          {COMPANIES.map(({ id, label, logo }) => {
            const active = activeTab === id;
            return (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 border-b-2 transition-all ${active ? "border-primary" : "border-transparent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt={label} className={`h-5 object-contain transition-all ${active ? "" : "grayscale opacity-40"}`} />
                <span className={`text-[10px] font-semibold uppercase tracking-wide transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
              </button>
            );
          })}
        </div>

        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5 flex flex-col gap-3">
          {users === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : tabUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users in this company.</p>
          ) : (
            tabUsers.map((u) => {
              const isEditing = editId === u._id;
              return (
                <div key={u._id} className="bg-card border border-border/40 rounded-xl px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u._id}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(() => { const Icon = ROLE_ICONS[u.role]; return (
                        <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[u.role]}`}>
                          <Icon size={10} />{u.role}
                        </span>
                      ); })()}
                      {u.role !== "dev" && (
                        <button onClick={() => {
                          if (isEditing) { setEditId(null); setEditData({}); setEditPin(EMPTY_PIN); setEditPinConfirm(EMPTY_PIN); setEditError(""); }
                          else { setEditId(u._id); setEditData({ role: u.role, active: u.active }); setEditPin(EMPTY_PIN); setEditPinConfirm(EMPTY_PIN); setEditError(""); }
                        }} className="text-primary"><Pencil size={14} /></button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="space-y-3 pt-1 border-t border-border/40">
                      {u._id !== myId && (
                        <div>
                          <label className="text-xs text-muted-foreground font-medium flex items-center gap-1"><UserCog size={11} /> Role</label>
                          <div className="flex gap-2 mt-1">
                            {ADD_ROLES.map((r) => {
                              const Icon = ROLE_ICONS[r];
                              return (
                                <button key={r} onClick={() => setEditData({ ...editData, role: r })}
                                  className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-colors flex items-center justify-center gap-1 ${editData.role === r ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border/40 text-muted-foreground"}`}>
                                  <Icon size={11} />{r}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {u._id !== myId && (
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-muted-foreground font-medium">Active</label>
                          <button onClick={() => setEditData({ ...editData, active: !editData.active })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editData.active ? "bg-primary" : "bg-foreground/20"}`}>
                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${editData.active ? "translate-x-6" : "translate-x-1"}`} />
                          </button>
                        </div>
                      )}

                      <PinInput label="Reset PIN (leave blank to keep)" pin={editPin} onChange={(p) => { setEditPin(p); setEditPinConfirm(EMPTY_PIN); }} />
                      {editPin.every((d) => d !== "") && (
                        <PinInput label="Confirm PIN" pin={editPinConfirm} onChange={setEditPinConfirm} />
                      )}

                      {editError && <p className="text-xs text-red-500">{editError}</p>}

                      <button onClick={() => saveEdit(u._id)} disabled={editSaving}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50">
                        <Check size={14} /> {editSaving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </main>
      </div>
    </>
  );
}
