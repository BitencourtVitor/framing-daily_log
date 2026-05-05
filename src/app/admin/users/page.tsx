"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, ShieldCheck, Plus, X, Check,
  Building2, UserCog, KeyRound, Mail, Loader2,
  Crown, Terminal, HardHat,
  ChevronDown, Link2, Link2Off, UserCheck, User, Pencil,
} from "lucide-react";

type CompanyId = "framing" | "hvac" | "pcg";
type UserRole = "admin" | "dev" | "supervisor";
type AddRole = "admin" | "supervisor";

interface AppUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  companies: CompanyId[];
  qbtIds: Partial<Record<CompanyId, number>>;
  active: boolean;
}

interface QBTWorker { id: number; name: string; email: string; }
type QBTLink = QBTWorker; // same shape, kept as alias for clarity

const COMPANIES: { id: CompanyId; label: string; logo: string }[] = [
  { id: "framing", label: "Framing", logo: "/images/sublogo_framing.png" },
  { id: "hvac",    label: "HVAC",    logo: "/images/sublogo_hvac.png" },
  { id: "pcg",     label: "PCG",     logo: "/images/sublogo_pcg.png" },
];

const ADD_ROLES: AddRole[] = ["admin", "supervisor"];

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

/* ─── PIN input ─────────────────────────────────────────────────────── */
function PinInput({ label, pin, onChange, disabled }: {
  label: string; pin: string[]; onChange: (p: string[]) => void; disabled?: boolean;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  function handleChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...pin]; next[i] = digit; onChange(next);
    if (digit && i < 5) inputs.current[i + 1]?.focus();
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
            type="text" inputMode="numeric" maxLength={2} value={digit ? "•" : ""}
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

/* ─── Main page ─────────────────────────────────────────────────────── */
export default function ManageUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [activeTab, setActiveTab] = useState<CompanyId>("framing");
  const [myId, setMyId] = useState<string | null>(null);

  /* ── Modal mode ── */
  type ModalMode = "new" | "edit" | null;
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  /* ── Form fields ── */
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<AddRole>("supervisor");
  const [formActive, setFormActive] = useState(true);

  /* ── Per-company QBT links ── */
  const [qbtLinks, setQbtLinks] = useState<Partial<Record<CompanyId, QBTLink | null>>>({});
  const [companyWorkers, setCompanyWorkers] = useState<Partial<Record<CompanyId, QBTWorker[]>>>({});
  const [companyLoading, setCompanyLoading] = useState<Partial<Record<CompanyId, boolean>>>({});
  const [companyError, setCompanyError] = useState<Partial<Record<CompanyId, string>>>({});
  const [companySearch, setCompanySearch] = useState<Partial<Record<CompanyId, string>>>({});
  const [expandedCompany, setExpandedCompany] = useState<CompanyId | null>(null);

  /* ── PIN ── */
  const [formPin, setFormPin] = useState<string[]>(EMPTY_PIN);
  const [formPinConfirm, setFormPinConfirm] = useState<string[]>(EMPTY_PIN);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");

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

  /* ── Worker loading per company ── */
  const loadCompanyWorkers = useCallback(async (c: CompanyId) => {
    setCompanyLoading((prev) => ({ ...prev, [c]: true }));
    setCompanyError((prev) => ({ ...prev, [c]: "" }));
    const res = await fetch(`/api/qbt/workers?company=${c}`);
    const data = await res.json();
    setCompanyLoading((prev) => ({ ...prev, [c]: false }));
    if (!res.ok) {
      setCompanyError((prev) => ({ ...prev, [c]: data.error ?? "Failed to load workers." }));
      return;
    }
    const workers: QBTWorker[] = Array.isArray(data) ? data : [];
    setCompanyWorkers((prev) => ({ ...prev, [c]: workers }));
    // If editing and this company had a pre-populated placeholder, resolve the name
    setQbtLinks((prev) => {
      const existing = prev[c];
      if (existing && !existing.email) {
        const found = workers.find((w) => w.id === existing.id);
        if (found) return { ...prev, [c]: found };
      }
      return prev;
    });
  }, []);

  function toggleExpand(c: CompanyId) {
    const next = expandedCompany === c ? null : c;
    setExpandedCompany(next);
    if (next && !companyWorkers[c] && !companyLoading[c]) loadCompanyWorkers(next);
  }


  /* ── Open / close modal ── */
  function openNew() {
    setEditingUser(null);
    setFormName(""); setFormEmail(""); setFormRole("supervisor"); setFormActive(true);
    setQbtLinks({}); setCompanyWorkers({}); setCompanyLoading({}); setCompanyError({});
    setCompanySearch({}); setExpandedCompany(null);
    setFormPin(EMPTY_PIN); setFormPinConfirm(EMPTY_PIN);
    setFormError(""); setModalMode("new");
  }

  function openEdit(u: AppUser) {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormRole(u.role === "dev" ? "admin" : (u.role as AddRole));
    setFormActive(u.active);
    // Pre-populate links (placeholder name until workers load)
    const links: Partial<Record<CompanyId, QBTLink | null>> = {};
    for (const c of ["framing", "hvac", "pcg"] as CompanyId[]) {
      const id = u.qbtIds[c];
      links[c] = id != null ? { id, name: `Worker #${id}`, email: "" } : null;
    }
    setQbtLinks(links);
    setCompanyWorkers({}); setCompanyLoading({}); setCompanyError({});
    setCompanySearch({}); setExpandedCompany(null);
    setFormPin(EMPTY_PIN); setFormPinConfirm(EMPTY_PIN);
    setFormError(""); setModalMode("edit");
  }

  function closeModal() { setModalMode(null); setEditingUser(null); }

  /* ── Submit ── */
  async function submitForm() {
    const pinStr = formPin.join("");
    const confirmStr = formPinConfirm.join("");

    if (!formName.trim()) { setFormError("Name required."); return; }
    if (!effectiveEmail.trim()) { setFormError("Email required."); return; }

    if (modalMode === "new") {
      if (derivedCompanies.length === 0) { setFormError("Link at least one company."); return; }
      if (pinStr.length !== 6) { setFormError("Enter a 6-digit PIN."); return; }
      if (pinStr !== confirmStr) { setFormError("PINs don't match."); return; }
    } else if (pinStr.length > 0) {
      if (pinStr.length !== 6) { setFormError("PIN must be 6 digits."); return; }
      if (pinStr !== confirmStr) { setFormError("PINs don't match."); return; }
    }

    const qbtIdsPayload: Partial<Record<CompanyId, number | null>> = {};
    for (const c of ["framing", "hvac", "pcg"] as CompanyId[]) {
      qbtIdsPayload[c] = qbtLinks[c]?.id ?? null;
    }

    const body: Record<string, unknown> = {
      name: formName.trim(),
      email: effectiveEmail.trim(),
      role: formRole,
      active: formActive,
      qbtIds: qbtIdsPayload,
      companies: derivedCompanies,
    };
    if (pinStr.length === 6) body.pin = pinStr;

    setFormError(""); setFormSaving(true);
    const url = modalMode === "edit" ? `/api/admin/users/${editingUser!._id}` : "/api/admin/users";
    const method = modalMode === "edit" ? "PATCH" : "POST";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setFormSaving(false);
    if (!res.ok) { setFormError((await res.json()).error ?? "Error."); return; }
    closeModal(); loadUsers();
  }

  /* ── Derived ── */
  const derivedCompanies = (["framing", "hvac", "pcg"] as CompanyId[]).filter(
    (c) => qbtLinks[c] != null
  );

  // First QBT email found across linked workers — authoritative, locks the email field
  const qbtEmail = (["framing", "hvac", "pcg"] as CompanyId[])
    .map((c) => qbtLinks[c]?.email)
    .find((e) => !!e) ?? null;

  const emailLocked = !!qbtEmail;
  const effectiveEmail = qbtEmail ?? formEmail;

  const pinFull = formPin.every((d) => d !== "");
  const showPinConfirm = modalMode === "edit" ? formPin.some((d) => d !== "") : pinFull;

  /* ── Per-company section — called as plain function to avoid remount on re-render ── */
  function renderCompanySection({ id, label, logo }: { id: CompanyId; label: string; logo: string }) {
    const linked = qbtLinks[id];
    const isExpanded = expandedCompany === id;
    const loading = !!companyLoading[id];
    const error = companyError[id] ?? "";
    const workers = companyWorkers[id] ?? [];
    const search = companySearch[id] ?? "";

    const existingEmails = new Set(
      (users ?? [])
        .filter((u) => modalMode !== "edit" || u._id !== editingUser?._id)
        .map((u) => u.email)
        .filter(Boolean)
    );

    const filtered = search.trim()
      ? workers.filter((w) => {
          const q = search.toLowerCase();
          return w.name.toLowerCase().includes(q) || w.email.toLowerCase().includes(q);
        })
      : workers;

    return (
      <div key={id} className="border border-border/40 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => toggleExpand(id)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-background hover:bg-accent/30 transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={label} className={`h-5 object-contain transition-all ${linked ? "" : "grayscale opacity-40"}`} />
          <span className="text-sm font-medium text-foreground flex-1 text-left">{label}</span>
          {linked ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
              <Link2 size={11} className="shrink-0" />
              ID {linked.id}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Not linked</span>
          )}
          <ChevronDown size={14} className={`text-muted-foreground transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
        </button>

        {isExpanded && (
          <div className="border-t border-border/40 px-4 py-3 space-y-3">
            {/* Current link header */}
            {linked && (
              <div className="flex items-center justify-between gap-2 py-1">
                <p className="text-xs font-semibold text-foreground">ID {linked.id}</p>
                <button
                  type="button"
                  onClick={() => setQbtLinks((prev) => ({ ...prev, [id]: null }))}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 shrink-0"
                >
                  <Link2Off size={11} /> Unlink
                </button>
              </div>
            )}

            {/* Workers list */}
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={12} className="animate-spin" /> Loading workers…
              </div>
            ) : error ? (
              <p className="text-xs text-red-500">{error}</p>
            ) : workers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No workers found.</p>
            ) : (
              <>
                <input
                  value={search}
                  onChange={(e) => setCompanySearch((prev) => ({ ...prev, [id]: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  placeholder="Search name or email…"
                />
                <div className="overflow-y-auto max-h-44 space-y-1 pr-0.5">
                  {filtered.map((w) => {
                    const isSelected = qbtLinks[id]?.id === w.id;
                    const isRegistered = !!w.email && existingEmails.has(w.email) && !isSelected;
                    if (isRegistered) {
                      return (
                        <div key={w.id} className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border/20 bg-background/40 opacity-50 cursor-default">
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate">{w.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{w.email || "—"}</p>
                          </div>
                          <span className="text-[10px] font-semibold text-muted-foreground shrink-0 ml-2 flex items-center gap-1">
                            <UserCheck size={10} /> Registered
                          </span>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          const next = isSelected ? null : w;
                          setQbtLinks((prev) => ({ ...prev, [id]: next }));
                          if (next) setExpandedCompany(null); // auto-collapse on select
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${isSelected ? "bg-primary/5 border-primary/30 text-primary" : "bg-background border-border/40 text-foreground hover:border-border"}`}
                      >
                        <div className="min-w-0 text-left">
                          <p className="truncate">{w.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{w.email || "—"}</p>
                        </div>
                        {isSelected && <Check size={14} className="shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  const tabUsers = (users ?? []).filter((u) => u.companies.includes(activeTab));

  return (
    <>
      {/* ── Modal ── */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-5 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {modalMode === "new" ? "New User" : "Edit User"}
              </p>
              <button type="button" onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            {/* 1 — Name */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <User size={11} /> Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Full name"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            {/* 2 — Role */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <UserCog size={11} /> Role
              </label>
              <div className="flex gap-2">
                {ADD_ROLES.map((r) => {
                  const Icon = ROLE_ICONS[r];
                  return (
                    <button
                      key={r} type="button"
                      onClick={() => setFormRole(r)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-semibold capitalize transition-colors flex items-center justify-center gap-1.5 ${formRole === r ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border/40 text-muted-foreground hover:border-border"}`}
                    >
                      <Icon size={12} />{r}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active toggle — edit only, not self */}
            {modalMode === "edit" && editingUser?._id !== myId && (
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground font-medium">Active</label>
                <button
                  type="button"
                  onClick={() => setFormActive((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formActive ? "bg-primary" : "bg-foreground/20"}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${formActive ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            )}

            {/* 3 — Companies / QBT links */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                <Building2 size={11} /> Companies
                {derivedCompanies.length > 0 && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    {derivedCompanies.length} linked
                  </span>
                )}
              </label>
              <div className="space-y-2">
                {COMPANIES.map((c) => renderCompanySection(c))}
              </div>
            </div>

            {/* 4 — Email (locked if QBT provides one) */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Mail size={11} /> Email
                {emailLocked && (
                  <span className="ml-auto text-[10px] text-muted-foreground/60">from QuickBooks Time</span>
                )}
              </label>
              <input
                type="email"
                value={effectiveEmail}
                onChange={(e) => !emailLocked && setFormEmail(e.target.value)}
                disabled={emailLocked}
                placeholder="worker@premiumgrpinc.com"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* 5 — PIN */}
            <PinInput
              label={modalMode === "edit" ? "Reset PIN (leave blank to keep)" : "PIN"}
              pin={formPin}
              onChange={(p) => { setFormPin(p); setFormPinConfirm(EMPTY_PIN); }}
            />
            {showPinConfirm && (
              <PinInput label="Confirm PIN" pin={formPinConfirm} onChange={setFormPinConfirm} />
            )}

            {formError && <p className="text-xs text-red-500">{formError}</p>}

            {/* Submit */}
            <button
              type="button"
              onClick={submitForm}
              disabled={formSaving}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
            >
              {formSaving
                ? <><Loader2 size={14} className="animate-spin" /> {modalMode === "edit" ? "Saving…" : "Creating…"}</>
                : modalMode === "edit" ? "Save Changes" : "Create User"}
            </button>
          </div>
        </div>
      )}

      {/* ── Page ── */}
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => router.push("/admin")} className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <ChevronRight size={18} className="rotate-180" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <ShieldCheck size={16} className="text-primary" />
            <p className="text-sm font-semibold text-foreground">Manage Users</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90"
          >
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : tabUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users in this company.</p>
          ) : (
            tabUsers.map((u) => {
              const RoleIcon = ROLE_ICONS[u.role];
              return (
                <div key={u._id} className="bg-card border border-border/40 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!u.active && (
                        <span className="text-[10px] font-semibold text-muted-foreground/60 bg-muted/40 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                      <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[u.role]}`}>
                        <RoleIcon size={10} />{u.role}
                      </span>
                      {u.role !== "dev" && (
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </main>
      </div>
    </>
  );
}
