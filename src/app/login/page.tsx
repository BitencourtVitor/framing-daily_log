"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export default function LoginPage() {
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

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
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: code }),
      });
      if (!res.ok) {
        setPin(["", "", "", "", "", ""]);
        setTimeout(() => inputs.current[0]?.focus(), 50);
        setError("Invalid PIN. Try again.");
        return;
      }
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">

      {/* Theme toggle — top right */}
      <div className="fixed top-3 right-3">
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="w-full max-w-sm flex flex-col items-center gap-10">

        {/* Logo + Title */}
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo_black.png" alt="Premium Framing" width={200} height={54} className="object-contain dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo_white.png" alt="Premium Framing" width={200} height={54} className="object-contain hidden dark:block" />
          <span className="text-3xl font-semibold tracking-tight text-foreground">
            Daily Log
          </span>
        </div>

        {/* Card */}
        <div className="w-full bg-card border border-border/40 rounded-xl p-8 flex flex-col items-center gap-7">
          <div className="text-center">
            <p className="text-base font-semibold text-foreground">Access</p>
            <p className="text-xs text-muted-foreground mt-1">Enter your 6-digit PIN</p>
          </div>

          {/* PIN inputs */}
          <div className="flex gap-2 w-full">
            {pin.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                className="flex-1 min-w-0 aspect-square text-center text-base font-bold rounded-md border border-foreground/25 bg-background text-foreground caret-transparent focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none disabled:opacity-50 transition-colors"
              />
            ))}
          </div>

          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}

          {loading && (
            <p className="text-xs text-muted-foreground text-center">Verifying...</p>
          )}
        </div>

      </div>
    </div>
  );
}
