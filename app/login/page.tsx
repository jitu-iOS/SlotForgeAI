"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Theme = "midnight-indigo" | "slate-sapphire" | "obsidian-gold" | "forest-emerald" | "dusk-rose";
const THEME_STORAGE_KEY = "slotforge.theme";

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const from = search.get("from") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "submitting" | "success">("idle");
  const [shakeKey, setShakeKey] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    document.documentElement.dataset.theme = stored ?? "midnight-indigo";
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === "submitting") return;
    setError(null);
    setPhase("submitting");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = res.status === 429 ? "Too many attempts. Wait a few minutes and try again." : data?.error || "Invalid credentials";
        setError(msg);
        setPhase("idle");
        setShakeKey((k) => k + 1);
        return;
      }
      setPhase("success");
      setTimeout(() => router.replace(from), 600);
    } catch {
      setError("Network error. Please try again.");
      setPhase("idle");
      setShakeKey((k) => k + 1);
    }
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[var(--bg-page)] text-zinc-100">
      {/* Animated gradient mesh */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute -top-1/3 -left-1/4 w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-60"
             style={{ background: "radial-gradient(closest-side, var(--accent-from), transparent 70%)", animation: "var(--animate-mesh-a)" }} />
        <div className="absolute -bottom-1/3 -right-1/4 w-[55vw] h-[55vw] rounded-full blur-[120px] opacity-50"
             style={{ background: "radial-gradient(closest-side, var(--accent-to), transparent 70%)", animation: "var(--animate-mesh-b)" }} />
        <div className="absolute top-1/4 right-1/3 w-[40vw] h-[40vw] rounded-full blur-[120px] opacity-40"
             style={{ background: "radial-gradient(closest-side, var(--accent-strong), transparent 70%)", animation: "var(--animate-mesh-c)" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_85%)]" />
      </div>

      {/* Grid overlay for premium tech feel */}
      <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.04]"
           style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />

      <div className="min-h-screen w-full flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md" style={{ animation: "var(--animate-slide-up)" }}>
          {/* Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-black/40"
                 style={{ background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}>
              <span>S</span>
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight">SlotForge AI</p>
              <p className="text-[11px] text-zinc-500 uppercase tracking-[0.22em]">Internal · Secure Sign-in</p>
            </div>
          </div>

          {/* Card */}
          <div
            ref={cardRef}
            key={shakeKey}
            className="relative rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] p-7"
            style={error ? { animation: "var(--animate-shake-x)" } : undefined}
          >
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-zinc-400 mt-1">Sign in with your work credentials.</p>

            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" autoComplete="on">
              <FloatingInput
                id="email"
                type="email"
                label="Email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                required
              />
              <FloatingInput
                id="password"
                type={showPw ? "text" : "password"}
                label="Password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                required
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                    tabIndex={-1}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                }
              />

              {error && (
                <p role="alert" className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2"
                   style={{ animation: "var(--animate-slide-up)" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={phase === "submitting" || phase === "success"}
                className="relative mt-2 h-12 rounded-2xl text-sm font-medium text-white overflow-hidden disabled:cursor-not-allowed transition-transform active:scale-[0.99]"
                style={{ background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}
              >
                <span className={`absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 -translate-x-full ${phase === "idle" ? "group-hover:translate-x-full" : ""} transition-transform duration-700`} />
                <span className="relative flex items-center justify-center gap-2">
                  {phase === "idle" && <>Sign in <span aria-hidden>→</span></>}
                  {phase === "submitting" && <SpinnerSmall />}
                  {phase === "success" && <span style={{ animation: "var(--animate-success-pop)" }}>✓ Signed in</span>}
                </span>
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/[0.06]">
              <p className="text-[12px] text-zinc-500 leading-relaxed">
                Need an account? Account creation is restricted to administrators. Contact your team admin to get access.
              </p>
            </div>
          </div>

          <p className="text-[11px] text-zinc-600 mt-6 text-center">
            Protected by HTTP-only secure cookies · Rate-limited
          </p>
        </div>
      </div>
    </main>
  );
}

function FloatingInput({
  id,
  type,
  label,
  value,
  onChange,
  autoComplete,
  required,
  trailing,
}: {
  id: string;
  type: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  trailing?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const float = focused || value.length > 0;
  return (
    <div className="relative">
      <label
        htmlFor={id}
        className={`absolute left-4 transition-all pointer-events-none ${float ? "top-1.5 text-[10px] tracking-[0.18em] uppercase text-zinc-400" : "top-3.5 text-sm text-zinc-500"}`}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        required={required}
        className="w-full h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] focus:border-[var(--accent-text)] focus:bg-white/[0.05] focus:outline-none transition-colors px-4 pt-5 pb-1.5 text-sm text-zinc-100"
      />
      {trailing && <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>}
    </div>
  );
}

function SpinnerSmall() {
  return (
    <span className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white" style={{ animation: "spin 0.8s linear infinite" }} />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
