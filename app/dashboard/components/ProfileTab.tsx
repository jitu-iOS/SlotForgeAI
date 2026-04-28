"use client";

import { useState } from "react";
import type { AuthUser } from "@/app/types/auth";

export default function ProfileTab({ user, onUserUpdate: _onUserUpdate }: { user: AuthUser; onUserUpdate: (u: AuthUser) => void }) {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [phase, setPhase] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === "submitting") return;
    setError(null);
    if (newPw !== confirmPw) {
      setError("New passwords do not match");
      return;
    }
    setPhase("submitting");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Could not change password");
        setPhase("idle");
        return;
      }
      setPhase("success");
      setOldPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => setPhase("idle"), 1800);
    } catch {
      setError("Network error. Please try again.");
      setPhase("idle");
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-xl">
        <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Account</p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">{user.name}</h2>
        <p className="text-sm text-zinc-400 mt-1 break-all">{user.email}</p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Role</p>
            <p className="mt-1 font-medium">{user.role.replace("_", " ")}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Status</p>
            <p className={`mt-1 font-medium ${user.status === "ACTIVE" ? "text-emerald-300" : "text-rose-300"}`}>{user.status}</p>
          </div>
        </div>
      </div>

      <div className="md:col-span-2 rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-xl">
        <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Security</p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">Change password</h2>
        <p className="text-sm text-zinc-400 mt-1">Enter your current password, then choose a new one (min 8 chars · letter · digit).</p>

        <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-4 max-w-md">
          <PwField label="Current password" value={oldPw} onChange={setOldPw} autoComplete="current-password" />
          <PwField label="New password" value={newPw} onChange={setNewPw} autoComplete="new-password" />
          <PwField label="Confirm new password" value={confirmPw} onChange={setConfirmPw} autoComplete="new-password" />

          {error && (
            <p role="alert" className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={phase === "submitting" || phase === "success" || !oldPw || !newPw}
            className="h-11 rounded-xl text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-[0.99]"
            style={{ background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}
          >
            {phase === "idle" && "Update password"}
            {phase === "submitting" && <span className="inline-flex items-center gap-2"><Spin /> Updating…</span>}
            {phase === "success" && <span style={{ animation: "var(--animate-success-pop)" }}>✓ Updated</span>}
          </button>
        </form>
      </div>
    </div>
  );
}

function PwField({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="h-11 rounded-xl bg-white/[0.03] border border-white/[0.08] focus:border-[var(--accent-text)] focus:bg-white/[0.05] focus:outline-none px-3.5 text-sm"
      />
    </label>
  );
}

function Spin() {
  return <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white" style={{ animation: "spin 0.8s linear infinite" }} />;
}
