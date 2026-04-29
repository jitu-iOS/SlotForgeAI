"use client";

import type { AIRole, RoleHealth } from "@/app/lib/aiRoles";

export default function RoleStatusStrip({ roles, syncTick, onOpenApiKeys, onSwapRole }: {
  roles: Record<string, RoleHealth> | null;
  syncTick: number;
  onOpenApiKeys?: () => void;
  onSwapRole?: (role: AIRole) => void;
}) {
  return (
    <div className="space-y-1.5">
      <RoleRow roleKey="prompt"    role={roles?.prompt}    syncTick={syncTick} onOpenApiKeys={onOpenApiKeys} onSwap={onSwapRole} />
      <RoleRow roleKey="image"     role={roles?.image}     syncTick={syncTick} onOpenApiKeys={onOpenApiKeys} onSwap={onSwapRole} />
      <RoleRow roleKey="animation" role={roles?.animation} syncTick={syncTick} onOpenApiKeys={onOpenApiKeys} onSwap={onSwapRole} />
    </div>
  );
}

function RoleRow({ roleKey, role, syncTick, onOpenApiKeys, onSwap }: {
  roleKey: AIRole;
  role: RoleHealth | undefined;
  syncTick: number;
  onOpenApiKeys?: () => void;
  onSwap?: (role: AIRole) => void;
}) {
  if (!role) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 bg-white/[0.03] border border-white/[0.06] animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-white/15" />
        <span className="text-[11px] text-zinc-500">Loading…</span>
      </div>
    );
  }

  const ok = role.configured;
  return (
    <div className={`w-full rounded-lg border transition ${ok ? "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05]" : "bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15"}`}>
      <button
        type="button"
        onClick={() => (ok ? onSwap?.(roleKey) : onOpenApiKeys?.())}
        title={`${role.label}: ${role.modelLabel} (${role.providerLabel}) — ${ok ? "click to switch model" : "click to set API key"}`}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left"
      >
        <span className="text-base flex-shrink-0">{role.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 leading-tight">{role.label}</p>
          <p className="text-[11px] font-medium truncate leading-tight mt-0.5">
            {role.modelLabel}
            <span className="text-zinc-600"> · {role.providerLabel}</span>
          </p>
        </div>
        <span
          key={syncTick}
          style={{ animation: "var(--animate-sync-blink)" }}
          className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" : "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)] animate-pulse"}`}
        />
        {ok && (
          <span className="text-[9px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300">Swap →</span>
        )}
      </button>
    </div>
  );
}
