"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ShieldCheck, Plus, X, Check,
  Building2, UserCog, KeyRound, ToggleLeft, ToggleRight,
} from "lucide-react";

type CompanyId = "framing" | "hvac" | "pcg";
type UserRole = "admin" | "dev" | "supervisor";

interface AppUser {
  _id: number;
  name: string;
  role: UserRole;
  companies: CompanyId[];
  active: boolean;
}

const COMPANIES: { id: CompanyId; label: string }[] = [
  { id: "framing", label: "Framing" },
  { id: "hvac",    label: "HVAC" },
  { id: "pcg",     label: "PCG" },
];

const ROLES: UserRole[] = ["admin", "dev", "supervisor"];

const ROLE_COLORS: Record<UserRole, string> = {
  admin:      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  dev:        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  supervisor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const EMPTY_FORM = { qbtId: "", name: "", role: "supervisor" as UserRole, companies: [] as CompanyId[], pin: "", active: true };

export default function ManageUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<AppUser & { pin: string }>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => {
      if (d.role !== "admin" && d.role !== "dev") router.replace("/dashboard");
    });
    loadUsers();
  }, [router]);

  async function loadUsers() {
    const data = await fetch("/api/admin/users").then((r) => r.json());
    setUsers(Array.isArray(data) ? data : []);
  }

  async function createUser() {
    setError("");
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qbtId: Number(form.qbtId), name: form.name, role: form.role, companies: form.companies, pin: form.pin, active: form.active }),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    setShowAdd(false);
    setForm(EMPTY_FORM);
    loadUsers();
  }

  async function saveEdit(id: number) {
    setError("");
    setSaving(true);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    });
    setSaving(false);
    if (!res.ok) { setError((await res.json()).error); return; }
    setEditId(null);
    setEditData({});
    loadUsers();
  }

  function toggleCompany(arr: CompanyId[], id: CompanyId): CompanyId[] {
    return arr.includes(id) ? arr.filter((c) => c !== id) : [...arr, id];
  }

  const usersByCompany = COMPANIES.map(({ id, label }) => ({
    id, label,
    users: (users ?? []).filter((u) => u.companies.includes(id)),
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => router.push("/admin")} className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Manage Users</p>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => { setShowAdd(true); setError(""); }}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={14} /> Add User
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-6">

        {/* Add form */}
        {showAdd && (
          <div className="bg-card border border-border/40 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">New User</p>
              <button onClick={() => { setShowAdd(false); setError(""); setForm(EMPTY_FORM); }} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground font-medium">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  placeholder="Full name" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">QBT ID</label>
                <input value={form.qbtId} onChange={(e) => setForm({ ...form, qbtId: e.target.value })}
                  className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  placeholder="e.g. 6947156" inputMode="numeric" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">PIN (6 digits)</label>
                <input value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })}
                  className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  placeholder="••••••" inputMode="numeric" maxLength={6} />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-medium">Role</label>
              <div className="flex gap-2 mt-1">
                {ROLES.map((r) => (
                  <button key={r} onClick={() => setForm({ ...form, role: r })}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border capitalize transition-colors ${form.role === r ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-medium">Companies</label>
              <div className="flex gap-2 mt-1">
                {COMPANIES.map(({ id, label }) => {
                  const sel = form.companies.includes(id);
                  return (
                    <button key={id} onClick={() => setForm({ ...form, companies: toggleCompany(form.companies, id) })}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button onClick={createUser} disabled={saving}
              className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? "Saving…" : "Create User"}
            </button>
          </div>
        )}

        {/* Users by company */}
        {users === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          usersByCompany.map(({ id: companyId, label, users: companyUsers }) => (
            <div key={companyId} className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Building2 size={13} className="text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
                <span className="text-xs text-muted-foreground">({companyUsers.length})</span>
              </div>

              {companyUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-1">No users</p>
              ) : (
                companyUsers.map((u) => {
                  const isEditing = editId === u._id;
                  return (
                    <div key={u._id} className="bg-card border border-border/40 rounded-xl px-4 py-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground">ID {u._id}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                          <button onClick={() => {
                            if (isEditing) { setEditId(null); setEditData({}); setError(""); }
                            else { setEditId(u._id); setEditData({ role: u.role, companies: [...u.companies], active: u.active, pin: "" }); setError(""); }
                          }} className="text-xs text-primary font-medium">
                            {isEditing ? "Cancel" : "Edit"}
                          </button>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="space-y-3 pt-1 border-t border-border/40">
                          {/* Role */}
                          <div>
                            <label className="text-xs text-muted-foreground font-medium flex items-center gap-1"><UserCog size={11} /> Role</label>
                            <div className="flex gap-2 mt-1">
                              {ROLES.map((r) => (
                                <button key={r} onClick={() => setEditData({ ...editData, role: r })}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border capitalize transition-colors ${editData.role === r ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}>
                                  {r}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Companies */}
                          <div>
                            <label className="text-xs text-muted-foreground font-medium flex items-center gap-1"><Building2 size={11} /> Companies</label>
                            <div className="flex gap-2 mt-1">
                              {COMPANIES.map(({ id, label: lbl }) => {
                                const sel = (editData.companies ?? []).includes(id);
                                return (
                                  <button key={id} onClick={() => setEditData({ ...editData, companies: toggleCompany(editData.companies ?? [], id) })}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${sel ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}>
                                    {lbl}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Active */}
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                              <ToggleLeft size={11} /> Active
                            </label>
                            <button onClick={() => setEditData({ ...editData, active: !editData.active })}
                              className={`transition-colors ${editData.active ? "text-emerald-500" : "text-muted-foreground"}`}>
                              {editData.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                            </button>
                          </div>

                          {/* PIN reset */}
                          <div>
                            <label className="text-xs text-muted-foreground font-medium flex items-center gap-1"><KeyRound size={11} /> New PIN (leave blank to keep)</label>
                            <input value={editData.pin ?? ""} onChange={(e) => setEditData({ ...editData, pin: e.target.value })}
                              className="mt-1 w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                              placeholder="••••••" inputMode="numeric" maxLength={6} />
                          </div>

                          {error && <p className="text-xs text-red-500">{error}</p>}

                          <button onClick={() => saveEdit(u._id)} disabled={saving}
                            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-2 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                            <Check size={14} /> {saving ? "Saving…" : "Save"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
