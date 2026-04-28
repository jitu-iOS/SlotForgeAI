"use client";

import { useEffect, useState } from "react";
import type { AuthUser, Role } from "@/app/types/auth";

const ALLOWED_ROLES_FOR_NON_SUPER: Role[] = ["USER", "ADMIN"];
const ALLOWED_ROLES_FOR_SUPER: Role[] = ["USER", "ADMIN", "SUPER_ADMIN"];

export default function CreateUserModal({
  currentUser,
  onClose,
  onCreated,
}: {
  currentUser: AuthUser;
  onClose: () => void;
  onCreated: (u: AuthUser) => void;
}) {
  const allowedRoles = currentUser.role === "SUPER_ADMIN" ? ALLOWED_ROLES_FOR_SUPER : ALLOWED_ROLES_FOR_NON_SUPER;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [phase, setPhase] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function generatePassword() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const buf = new Uint8Array(14);
    crypto.getRandomValues(buf);
    let pw = "";
    for (let i = 0; i < buf.length; i++) pw += alphabet[buf[i] % alphabet.length];
    setPassword(pw);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === "submitting") return;
    setError(null);
    setPhase("submitting");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not create user");
        setPhase("idle");
        return;
      }
      onCreated(data.user);
    } catch {
      setError("Network error. Please try again.");
      setPhase("idle");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-3xl border border-white/[0.08] bg-[var(--bg-elevated)] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]"
        style={{ animation: "var(--animate-slide-up)" }}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Admin</p>
            <h3 className="mt-1.5 text-lg font-semibold tracking-tight">Create new user</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Full name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              className="h-11 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-[var(--accent-text)] focus:bg-white/[0.05] focus:outline-none px-3.5 text-sm w-full"
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
              className="h-11 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-[var(--accent-text)] focus:bg-white/[0.05] focus:outline-none px-3.5 text-sm w-full"
            />
          </Field>

          <Field label="Initial password" hint="Min 8 chars · letter · digit. Share securely.">
            <div className="flex gap-2">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="flex-1 h-11 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-[var(--accent-text)] focus:bg-white/[0.05] focus:outline-none px-3.5 text-sm font-mono"
              />
              <button
                type="button"
                onClick={generatePassword}
                className="text-xs px-3 rounded-xl border border-white/[0.08] hover:border-white/[0.22] text-zinc-300 hover:text-white transition"
              >
                Generate
              </button>
            </div>
          </Field>

          <Field label="Role">
            <div className="flex gap-2 flex-wrap">
              {allowedRoles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                    role === r
                      ? "text-white border-[var(--accent-text)] bg-[var(--accent-text)]/10"
                      : "text-zinc-300 border-white/[0.08] hover:border-white/[0.22]"
                  }`}
                >
                  {r.replace("_", " ")}
                </button>
              ))}
            </div>
          </Field>

          {error && (
            <p role="alert" className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-xl text-sm text-zinc-300 hover:text-white border border-white/[0.08] hover:border-white/[0.22] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={phase === "submitting" || !name || !email || !password}
              className="h-11 px-5 rounded-xl text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-[0.99]"
              style={{ background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}
            >
              {phase === "submitting" ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-zinc-500">{hint}</span>}
    </label>
  );
}
