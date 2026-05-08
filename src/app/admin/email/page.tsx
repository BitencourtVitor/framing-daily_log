"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ShieldCheck, Mail, Plus, X, Loader2, Check } from "lucide-react";

interface Config {
  dlRecipients: string[];
  bcRecipients: string[];
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function RecipientList({
  title,
  subtitle,
  emails,
  onAdd,
  onRemove,
}: {
  title: string;
  subtitle: string;
  emails: string[];
  onAdd: (email: string) => void;
  onRemove: (email: string) => void;
}) {
  const [input, setInput] = useState("");
  const [err, setErr] = useState("");

  function add() {
    const v = input.trim();
    if (!isValidEmail(v)) { setErr("Invalid email"); return; }
    if (emails.includes(v)) { setErr("Already in list"); return; }
    onAdd(v);
    setInput("");
    setErr("");
  }

  return (
    <div className="bg-card border border-border/40 rounded-xl p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>

      <div className="space-y-1.5">
        {emails.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-1">No recipients yet</p>
        )}
        {emails.map((email) => (
          <div key={email} className="flex items-center gap-2 bg-accent/40 border border-border/30 rounded-lg px-3 py-2">
            <Mail size={13} className="text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground flex-1 min-w-0 truncate">{email}</span>
            <button onClick={() => onRemove(email)} className="text-muted-foreground hover:text-destructive transition-colors p-0.5">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="flex gap-2">
          <input
            type="email"
            value={input}
            onChange={(e) => { setInput(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="name@company.com"
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={add}
            className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90 shrink-0"
          >
            <Plus size={14} /> Add
          </button>
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
      </div>
    </div>
  );
}

export default function AdminEmailPage() {
  const router = useRouter();
  const [config, setConfig] = useState<Config>({ dlRecipients: [], bcRecipients: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/me").then((r) => r.ok ? r.json() : {}).then((d: { role?: string }) => {
      if (d.role !== "admin" && d.role !== "dev") router.replace("/dashboard");
    });
    fetch("/api/admin/email-config")
      .then((r) => r.json())
      .then((d) => setConfig({ dlRecipients: d.dlRecipients ?? [], bcRecipients: d.bcRecipients ?? [] }))
      .finally(() => setLoading(false));
  }, [router]);

  async function save() {
    setSaving(true); setSaved(false);
    await fetch("/api/admin/email-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function addDL(email: string) { setConfig((c) => ({ ...c, dlRecipients: [...c.dlRecipients, email] })); }
  function removeDL(email: string) { setConfig((c) => ({ ...c, dlRecipients: c.dlRecipients.filter((e) => e !== email) })); }
  function addBC(email: string) { setConfig((c) => ({ ...c, bcRecipients: [...c.bcRecipients, email] })); }
  function removeBC(email: string) { setConfig((c) => ({ ...c, bcRecipients: c.bcRecipients.filter((e) => e !== email) })); }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 h-14 bg-card/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3 shrink-0">
        <button onClick={() => router.push("/admin")} className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <ShieldCheck size={16} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Email Recipients</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
          {saved ? "Saved" : "Save"}
        </button>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <RecipientList
              title="Daily Log Recipients"
              subtitle="Receive an email for every submitted Daily Log"
              emails={config.dlRecipients}
              onAdd={addDL}
              onRemove={removeDL}
            />
            <RecipientList
              title="Back Charge Recipients"
              subtitle="Receive a separate alert for each Back Charge activity"
              emails={config.bcRecipients}
              onAdd={addBC}
              onRemove={removeBC}
            />
          </>
        )}
      </main>
    </div>
  );
}
