"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, ChevronLeft, Loader2, Crown, Terminal, HardHat, Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type UserRole = "admin" | "dev" | "supervisor";
interface LoginUser { id: string; name: string; email: string; role: UserRole; }

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  admin:      Crown,
  dev:        Terminal,
  supervisor: HardHat,
};
const ROLE_ORDER: Record<UserRole, number> = { supervisor: 0, admin: 1, dev: 2 };

const ROLE_COLORS: Record<UserRole, string> = {
  admin:      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  dev:        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  supervisor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const LS_KEY = "loginUser";

export default function LoginPage() {
  const [users, setUsers]       = useState<LoginUser[]>([]);
  const [selected, setSelected] = useState<LoginUser | null>(null);
  const [search, setSearch]     = useState("");
  const [pin, setPin]           = useState(["", "", "", "", "", ""]);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [mounted, setMounted]   = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const router  = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();

  useEffect(() => {
    setMounted(true);
    fetch("/api/auth/users")
      .then((r) => r.json())
      .then((data: LoginUser[]) => {
        setUsers(data);
        try {
          const saved = localStorage.getItem(LS_KEY);
          if (saved) {
            const parsed: LoginUser = JSON.parse(saved);
            const match = data.find((u) => u.id === parsed.id);
            if (match) { setSelected(match); setTimeout(() => inputs.current[0]?.focus(), 80); }
          }
        } catch { /* ignore */ }
      });
  }, []);

  function selectUser(u: LoginUser) {
    setSelected(u);
    setPin(["", "", "", "", "", ""]);
    setError("");
    localStorage.setItem(LS_KEY, JSON.stringify(u));
    setTimeout(() => inputs.current[0]?.focus(), 80);
  }

  function back() {
    setSelected(null);
    setPin(["", "", "", "", "", ""]);
    setError("");
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...pin];
    next[index] = digit;
    setPin(next);
    setError("");
    if (digit && index < 5) inputs.current[index + 1]?.focus();
    if (next.every((d) => d !== "") && index === 5) submit(next.join(""));
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function submit(code: string) {
    if (!selected) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected.id, pin: code }),
      });
      if (!res.ok) {
        setPin(["", "", "", "", "", ""]);
        setTimeout(() => inputs.current[0]?.focus(), 50);
        setError(t("login.wrongPin"));
        return;
      }
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">

      {/* Theme toggle + language switcher */}
      <div className="fixed top-3 right-3 flex items-center gap-1">
        <LanguageSwitcher />
        <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          {mounted && (resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />)}
        </button>
      </div>

      <div className="w-full max-w-sm flex flex-col items-center gap-10">

        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/framing.png" alt="Premium Framing" width={160} height={44} className="object-contain" />
          <span className="text-3xl font-semibold tracking-tight text-foreground">Daily Log</span>
        </div>

        {/* Card */}
        <div className="w-full bg-card border border-border/40 rounded-xl p-8 flex flex-col items-center gap-6">

          {!selected ? (
            <>
              <div className="text-center">
                <p className="text-base font-semibold text-foreground">{t("login.whoAreYou")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("login.selectName")}</p>
              </div>
              {users.length > 0 && (
                <div className="relative w-full">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("common.search")}
                    className="w-full bg-background border border-border rounded-lg pl-8 pr-8 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              )}
              <div className="w-full flex flex-col gap-2 max-h-60 overflow-y-auto pr-0.5">
                {users.length === 0 && (
                  <div className="flex justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-muted-foreground" />
                  </div>
                )}
                {(() => {
                  const filtered = [...users]
                    .sort((a, b) => {
                      const rd = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
                      return rd !== 0 ? rd : a.name.localeCompare(b.name);
                    })
                    .filter((u) => !search.trim() || u.name.toLowerCase().includes(search.toLowerCase()));

                  if (users.length > 0 && filtered.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t("login.noMatch", { search })}
                      </p>
                    );
                  }

                  return filtered.map((u) => {
                    const Icon = ROLE_ICONS[u.role];
                    return (
                      <button key={u.id} onClick={() => selectUser(u)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-background hover:border-primary hover:bg-primary/5 transition-colors text-left">
                        <span className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${ROLE_COLORS[u.role]}`}>
                          <Icon size={14} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                          {u.email && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </>
          ) : (
            <>
              <div className="w-full flex items-center gap-2">
                <button onClick={back} className="p-1 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <ChevronLeft size={16} />
                </button>
                {(() => { const Icon = ROLE_ICONS[selected.role]; return (
                  <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${ROLE_COLORS[selected.role]}`}>
                    <Icon size={12} />
                  </span>
                ); })()}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{selected.name}</p>
                  {selected.email && <p className="text-xs text-muted-foreground truncate">{selected.email}</p>}
                </div>
              </div>

              <div className="text-center">
                <p className="text-base font-semibold text-foreground">{t("login.enterPin")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("login.sixDigit")}</p>
              </div>

              <div className="flex gap-2 w-full">
                {pin.map((digit, i) => (
                  <input key={i} ref={(el) => { inputs.current[i] = el; }}
                    type="text" inputMode="numeric" maxLength={2} value={digit ? "•" : ""}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={loading}
                    className="flex-1 min-w-0 aspect-square text-center text-base font-bold rounded-md border border-foreground/25 bg-background text-foreground caret-transparent focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none disabled:opacity-50 transition-colors"
                  />
                ))}
              </div>

              {error && <p className="text-xs text-destructive text-center">{error}</p>}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" /> {t("login.verifying")}
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
