"use client";

import { useCallback, useEffect, useState } from "react";

type ProviderName = "openai" | "replicate" | "runway" | "imagineart";
type Source = "panel" | "env" | "none";

interface ProviderRow {
  provider: ProviderName;
  source: Source;
  lastFour: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

interface VaultStatus {
  vaultEnabled: boolean;
  providers: ProviderRow[];
}

const PROVIDER_LABELS: Record<ProviderName, { name: string; envVar: string; placeholder: string; tagline: string }> = {
  openai:     { name: "OpenAI",     envVar: "OPENAI_API_KEY",       placeholder: "sk-…",   tagline: "GPT-Image-1, suggestions, prompt building" },
  replicate:  { name: "Replicate",  envVar: "REPLICATE_API_TOKEN",  placeholder: "r8_…",   tagline: "FLUX 1.1 Pro Ultra, Stable Diffusion 3.5" },
  runway:     { name: "Runway",     envVar: "RUNWAY_API_KEY",       placeholder: "key_…",  tagline: "Gen-3 Alpha — single canonical animation provider" },
  imagineart: { name: "Imagine Art", envVar: "IMAGINEART_API_KEY",  placeholder: "vk-…",   tagline: "Alternative host for FLUX 1.1 Pro Ultra (Vyro AI)" },
};

export default function ApiKeysPanel({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged?: () => void }) {
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProviderName | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/api-keys");
      if (r.status === 401 || r.status === 403) {
        setError(r.status === 401 ? "Sign in to manage keys." : "Admin only.");
        setStatus(null);
        return;
      }
      const data = await r.json();
      setStatus(data);
      setError(null);
    } catch {
      setError("Could not load key status.");
    }
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="API Keys"
        className="relative ml-auto h-full w-full max-w-md flex flex-col bg-[var(--bg-elevated)] border-l border-white/[0.08] shadow-[0_0_60px_-10px_rgba(0,0,0,0.7)]"
        style={{ animation: "var(--animate-side-sheet)" }}
      >
        <header className="flex-shrink-0 px-6 py-5 border-b border-white/[0.07]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Admin</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">API Keys</h2>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                Stored encrypted on the server. Never sent to your browser.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-zinc-400 hover:text-white text-2xl leading-none -mt-1"
            >×</button>
          </div>

          {status && (
            <div className={`mt-4 inline-flex items-center gap-2 text-[11px] px-2.5 py-1 rounded-full border ${
              status.vaultEnabled
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/30 bg-rose-500/10 text-rose-200"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.vaultEnabled ? "bg-emerald-400" : "bg-rose-400"}`} />
              {status.vaultEnabled ? "Encryption enabled" : "KEY_VAULT_SECRET not set"}
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
          )}

          {!status && !error && (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-white/[0.03] border border-white/[0.06]" style={{ animation: "var(--animate-shimmer)" }} />
              ))}
            </div>
          )}

          {status && status.providers.map((row, idx) => (
            <ProviderCard
              key={row.provider}
              row={row}
              index={idx}
              vaultEnabled={status.vaultEnabled}
              isEditing={editing === row.provider}
              onEdit={() => setEditing(row.provider)}
              onCancelEdit={() => setEditing(null)}
              onSaved={async () => { setEditing(null); await refresh(); onChanged?.(); }}
              onRemoved={async () => { await refresh(); onChanged?.(); }}
            />
          ))}

          {status && !status.vaultEnabled && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-100 leading-relaxed">
              <p className="font-medium text-amber-200">Encryption not enabled</p>
              <p className="mt-1">Add <code className="font-mono">KEY_VAULT_SECRET</code> to <code className="font-mono">.env.local</code> and restart the dev server. Generate one with:</p>
              <code className="block mt-2 font-mono bg-black/40 px-2 py-1.5 rounded select-all">openssl rand -base64 32</code>
            </div>
          )}
        </div>

        <footer className="flex-shrink-0 px-6 py-4 border-t border-white/[0.07] text-[11px] text-zinc-500 leading-relaxed space-y-2">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-emerald-200/90">
            <p className="font-semibold text-emerald-200">✓ Primary source of API keys</p>
            <p className="mt-1 text-[11px] text-emerald-100/70">
              Every AI route (generation, suggestions, prompt expansion) reads keys from this panel <span className="font-semibold">first</span>, then falls back to <span className="font-mono">.env.local</span> only if no panel value exists. Each model card&apos;s <span className="font-semibold">Source: Panel / Env / Not set</span> chip shows where the active key is coming from in real time.
            </p>
          </div>
          <p>USER role can run the app with these keys but cannot view or edit them.</p>
        </footer>
      </aside>
    </div>
  );
}

function ProviderCard({
  row,
  index,
  vaultEnabled,
  isEditing,
  onEdit,
  onCancelEdit,
  onSaved,
  onRemoved,
}: {
  row: ProviderRow;
  index: number;
  vaultEnabled: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => void | Promise<void>;
  onRemoved: () => void | Promise<void>;
}) {
  const meta = PROVIDER_LABELS[row.provider];
  const [keyInput, setKeyInput] = useState("");
  const [phase, setPhase] = useState<"idle" | "testing" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  async function onSave() {
    if (!keyInput.trim()) { setErrorMessage("Enter a key to save."); return; }
    setErrorMessage(null);
    setTestMsg(null);
    setPhase("saving");
    try {
      const r = await fetch(`/api/api-keys/${row.provider}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyInput.trim() }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErrorMessage(data?.error || "Could not save key");
        setPhase("error");
        return;
      }
      setPhase("saved");
      setTestMsg(data?.test?.message || null);
      setTimeout(async () => {
        setKeyInput("");
        setPhase("idle");
        await onSaved();
      }, 900);
    } catch {
      setErrorMessage("Network error.");
      setPhase("error");
    }
  }

  async function onTest() {
    if (!keyInput.trim()) { setErrorMessage("Enter a key to test."); return; }
    setErrorMessage(null);
    setTestMsg(null);
    setPhase("testing");
    try {
      const r = await fetch(`/api/api-keys/${row.provider}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyInput.trim() }),
      });
      const data = await r.json();
      setTestMsg(data?.message || (data?.ok ? "OK" : "Test failed"));
      setPhase(data?.ok ? "idle" : "error");
      if (!data?.ok) setErrorMessage(data?.message || "Provider rejected the key.");
    } catch {
      setErrorMessage("Network error during test.");
      setPhase("error");
    }
  }

  async function onRemove() {
    if (!confirm(`Remove panel key for ${meta.name}? The app will fall back to the env var if set.`)) return;
    await fetch(`/api/api-keys/${row.provider}`, { method: "DELETE" });
    await onRemoved();
  }

  return (
    <div
      className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 hover:border-white/[0.15] transition-colors"
      style={{ animation: "var(--animate-slide-up)", animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold tracking-tight">{meta.name}</h3>
            <SourceBadge source={row.source} />
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">{meta.tagline}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Last 4</p>
          <p className="text-sm font-mono mt-0.5">{row.lastFour ?? "—"}</p>
        </div>
      </div>

      {row.updatedAt && (
        <p className="text-[11px] text-zinc-500 mt-2">
          Updated {new Date(row.updatedAt).toLocaleString()}{row.updatedBy ? ` · ${row.updatedBy}` : ""}
        </p>
      )}

      {!isEditing && (
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            disabled={!vaultEnabled}
            onClick={onEdit}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.22] text-zinc-200 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {row.source === "panel" ? "Replace" : "Set key"}
          </button>
          {row.source === "panel" && (
            <button
              type="button"
              onClick={onRemove}
              className="text-[11px] px-3 py-1.5 rounded-lg border border-rose-500/30 hover:border-rose-400/60 text-rose-300 hover:text-rose-100 hover:bg-rose-500/10 transition"
            >
              Remove
            </button>
          )}
        </div>
      )}

      {isEditing && (
        <div className="mt-3 space-y-2">
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder={meta.placeholder}
            autoFocus
            className="w-full h-10 rounded-lg bg-black/30 border border-white/[0.08] focus:border-[var(--accent-text)] focus:outline-none px-3 text-sm font-mono"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={phase === "saving" || phase === "testing" || !keyInput}
              onClick={onSave}
              className="text-xs h-9 px-3 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-[0.99]"
              style={{ background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}
            >
              {phase === "saving" && "Saving…"}
              {phase === "saved" && <span style={{ animation: "var(--animate-success-pop)" }}>✓ Saved</span>}
              {phase !== "saving" && phase !== "saved" && "Test & save"}
            </button>
            <button
              type="button"
              disabled={phase === "saving" || phase === "testing" || !keyInput}
              onClick={onTest}
              className="text-xs h-9 px-3 rounded-lg border border-white/[0.08] hover:border-white/[0.22] text-zinc-200 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {phase === "testing" ? "Testing…" : "Test only"}
            </button>
            <button
              type="button"
              onClick={() => { setKeyInput(""); setErrorMessage(null); setTestMsg(null); setPhase("idle"); onCancelEdit(); }}
              className="text-xs h-9 px-3 rounded-lg text-zinc-400 hover:text-zinc-200 transition"
            >
              Cancel
            </button>
          </div>
          {testMsg && phase !== "error" && (
            <p className="text-[11px] text-emerald-300">{testMsg}</p>
          )}
          {errorMessage && (
            <p role="alert" className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-2.5 py-1.5">{errorMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}

function SourceBadge({ source }: { source: Source }) {
  const styles: Record<Source, string> = {
    panel: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    env:   "border-sky-500/30 bg-sky-500/10 text-sky-200",
    none:  "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  };
  const label: Record<Source, string> = { panel: "Panel", env: "Env", none: "Not set" };
  const tooltip: Record<Source, string> = {
    panel: "Active key is from this panel (encrypted at rest). The app reads here first.",
    env:   "Active key is from .env.local. To override at runtime, set a key in the panel above.",
    none:  "No key configured — generation will fall through to the free Pollinations fallback.",
  };
  return (
    <span title={tooltip[source]} className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border cursor-help ${styles[source]}`}>
      {label[source]}
    </span>
  );
}
