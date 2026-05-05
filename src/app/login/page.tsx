"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, ChevronLeft } from "lucide-react";

interface LoginUser { id: string; name: string; }

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function LoginPage() {
  const [users, setUsers]           = useState<LoginUser[]>([]);
  const [selected, setSelected]     = useState<LoginUser | null>(null);
  const [pin, setPin]               = useState(["", "", "", "", "", ""]);
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [mounted, setMounted]       = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const router  = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    fetch("/api/auth/users").then((r) => r.json()).then(setUsers);
  }, []);

  function selectUser(u: LoginUser) {
    setSelected(u);
    setPin(["", "", "", "", "", ""]);
    setError("");
    setTimeout(() => inputs.current[0]?.focus(), 80);
  }

  function back() { setSelected(null); setPin(["", "", "", "", "", ""]); setError(""); }

  function handleChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...pin];
    next[index] = value;
    setPin(next);
    setError("");
    if (value && index < 5) inputs.current[index + 1]?.focus();
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
        setError("Wrong PIN. Try again.");
        return;
      }
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">

      {/* Theme toggle */}
      <div className="fixed top-3 right-3">
        <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          {mounted && (resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />)}
        </button>
      </div>

      <div className="w-full max-w-sm flex flex-col items-center gap-10">

        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo_black.png" alt="Premium Framing" width={200} height={54} className="object-contain dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo_white.png" alt="Premium Framing" width={200} height={54} className="object-contain hidden dark:block" />
          <span className="text-3xl font-semibold tracking-tight text-foreground">Daily Log</span>
        </div>

        {/* Card */}
        <div className="w-full bg-card border border-border/40 rounded-xl p-8 flex flex-col items-center gap-6">

          {!selected ? (
            /* ── Step 1: pick user ── */
            <>
              <div className="text-center">
                <p className="text-base font-semibold text-foreground">Who are you?</p>
                <p className="text-xs text-muted-foreground mt-1">Select your name to continue</p>
              </div>
              <div className="w-full flex flex-col gap-2">
                {users.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center">Loading…</p>
                )}
                {users.map((u) => (
                  <button key={u.id} onClick={() => selectUser(u)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-background hover:border-primary hover:bg-primary/5 transition-colors text-left">
                    <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {initials(u.name)}
                    </span>
                    <span className="text-sm font-medium text-foreground">{u.name}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* ── Step 2: PIN ── */
            <>
              <div className="w-full flex items-center gap-2">
                <button onClick={back} className="p-1 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  {initials(selected.name)}
                </span>
                <span className="text-sm font-semibold text-foreground">{selected.name}</span>
              </div>

              <div className="text-center">
                <p className="text-base font-semibold text-foreground">Enter your PIN</p>
                <p className="text-xs text-muted-foreground mt-1">6-digit access code</p>
              </div>

              <div className="flex gap-2 w-full">
                {pin.map((digit, i) => (
                  <input key={i} ref={(el) => { inputs.current[i] = el; }}
                    type="password" inputMode="numeric" maxLength={1} value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={loading}
                    className="flex-1 min-w-0 aspect-square text-center text-base font-bold rounded-md border border-foreground/25 bg-background text-foreground caret-transparent focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none disabled:opacity-50 transition-colors"
                  />
                ))}
              </div>

              {error && <p className="text-xs text-destructive text-center">{error}</p>}
              {loading && <p className="text-xs text-muted-foreground text-center">Verifying…</p>}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
