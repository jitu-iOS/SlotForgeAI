"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthUser, Role, Status } from "@/app/types/auth";
import CreateUserModal from "./CreateUserModal";
import ConfirmModal from "./ConfirmModal";

const ROLES: Role[] = ["USER", "ADMIN", "SUPER_ADMIN"];

export default function UsersTab({ currentUser }: { currentUser: AuthUser }) {
  const [users, setUsers] = useState<AuthUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    body: string;
    danger?: boolean;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  }>(null);
  const [tempPwBanner, setTempPwBanner] = useState<{ email: string; password: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      setUsers(data.users);
    } catch {
      setError("Could not load users.");
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const sortedUsers = useMemo(() => users ?? [], [users]);

  async function patchRole(u: AuthUser, role: Role) {
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/users/${u.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not change role");
      } else {
        setUsers((cur) => cur?.map((x) => (x.id === u.id ? data.user : x)) ?? cur);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function patchStatus(u: AuthUser, status: Status) {
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/users/${u.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not change status");
      } else {
        setUsers((cur) => cur?.map((x) => (x.id === u.id ? data.user : x)) ?? cur);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(u: AuthUser) {
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/users/${u.id}/reset-password`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not reset password");
      } else {
        setUsers((cur) => cur?.map((x) => (x.id === u.id ? data.user : x)) ?? cur);
        setTempPwBanner({ email: u.email, password: data.tempPassword });
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Team</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">All users</h2>
          <p className="text-sm text-zinc-400 mt-1">Create accounts, assign roles, disable access, or reset passwords.</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="h-11 px-5 rounded-xl text-sm font-medium text-white shadow-lg shadow-black/30 hover:opacity-95 active:scale-[0.99] transition"
          style={{ background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}
        >
          + New user
        </button>
      </div>

      {tempPwBanner && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm" style={{ animation: "var(--animate-slide-up)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-amber-200">Temporary password generated</p>
              <p className="text-amber-100/80 mt-1">Share this with <span className="font-mono">{tempPwBanner.email}</span> securely. They will be required to change it on next sign-in.</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-black/40 px-3 py-2 font-mono text-base text-amber-100 border border-amber-500/20">
                {tempPwBanner.password}
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(tempPwBanner.password)}
                  className="text-[11px] text-amber-300 hover:text-amber-100 ml-2 px-2 py-0.5 rounded border border-amber-500/40 hover:border-amber-400"
                >Copy</button>
              </div>
            </div>
            <button onClick={() => setTempPwBanner(null)} className="text-amber-300 hover:text-amber-100 text-lg leading-none">×</button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-300 hover:text-rose-100 px-2">×</button>
        </div>
      )}

      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
        <div className="grid grid-cols-[1.6fr_1fr_1fr_auto] gap-4 px-6 py-3 text-[10px] uppercase tracking-[0.18em] text-zinc-500 border-b border-white/[0.07] bg-white/[0.02]">
          <div>User</div>
          <div>Role</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>

        {users === null && (
          <div className="divide-y divide-white/[0.05]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid grid-cols-[1.6fr_1fr_1fr_auto] gap-4 px-6 py-4 items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/[0.05]" style={{ animation: "var(--animate-shimmer)" }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 rounded bg-white/[0.05]" style={{ animation: "var(--animate-shimmer)" }} />
                    <div className="h-2.5 w-44 rounded bg-white/[0.04]" style={{ animation: "var(--animate-shimmer)" }} />
                  </div>
                </div>
                <div className="h-3 w-16 rounded bg-white/[0.05]" style={{ animation: "var(--animate-shimmer)" }} />
                <div className="h-3 w-16 rounded bg-white/[0.05]" style={{ animation: "var(--animate-shimmer)" }} />
                <div className="h-3 w-20 rounded bg-white/[0.05]" style={{ animation: "var(--animate-shimmer)" }} />
              </div>
            ))}
          </div>
        )}

        {users && users.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-zinc-400">
            No users yet. Click &ldquo;New user&rdquo; to add the first one.
          </div>
        )}

        {users && users.length > 0 && (
          <ul className="divide-y divide-white/[0.05]">
            {sortedUsers.map((u, idx) => {
              const isSelf = u.id === currentUser.id;
              const isProtectedSuper = u.role === "SUPER_ADMIN" && currentUser.role !== "SUPER_ADMIN";
              const allowedRoles = currentUser.role === "SUPER_ADMIN" ? ROLES : ROLES.filter((r) => r !== "SUPER_ADMIN");
              return (
                <li
                  key={u.id}
                  className="grid grid-cols-[1.6fr_1fr_1fr_auto] gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
                  style={{ animation: "var(--animate-slide-up)", animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}
                    >
                      {(u.name?.[0] || u.email[0] || "?").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {u.name}
                        {isSelf && <span className="ml-2 text-[10px] text-zinc-500 uppercase tracking-wider">you</span>}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">{u.email}</p>
                    </div>
                  </div>

                  <div>
                    <select
                      className="text-xs rounded-lg bg-white/[0.04] border border-white/[0.08] px-2.5 py-1.5 hover:border-white/[0.18] focus:outline-none focus:border-[var(--accent-text)] disabled:opacity-50 disabled:cursor-not-allowed transition"
                      value={u.role}
                      disabled={isSelf || isProtectedSuper || busyId === u.id}
                      onChange={(e) => patchRole(u, e.target.value as Role)}
                    >
                      {allowedRoles.map((r) => (
                        <option key={r} value={r}>{r.replace("_", " ")}</option>
                      ))}
                      {isProtectedSuper && <option value="SUPER_ADMIN">SUPER ADMIN</option>}
                    </select>
                  </div>

                  <div>
                    <StatusPill
                      status={u.status}
                      disabled={isSelf || (u.role === "SUPER_ADMIN" && currentUser.role !== "SUPER_ADMIN") || busyId === u.id}
                      onToggle={() => {
                        const next = u.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
                        if (next === "DISABLED") {
                          setConfirm({
                            title: "Disable user?",
                            body: `${u.name} (${u.email}) will be unable to sign in until re-enabled.`,
                            danger: true,
                            confirmLabel: "Disable",
                            onConfirm: async () => { await patchStatus(u, "DISABLED"); },
                          });
                        } else {
                          patchStatus(u, "ACTIVE");
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      disabled={isSelf || (u.role === "SUPER_ADMIN" && currentUser.role !== "SUPER_ADMIN") || busyId === u.id}
                      onClick={() =>
                        setConfirm({
                          title: "Reset password?",
                          body: `A new temporary password will be generated for ${u.email}. They must change it on next sign-in.`,
                          confirmLabel: "Reset password",
                          onConfirm: async () => { await resetPassword(u); },
                        })
                      }
                      className="text-[11px] text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.22] disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Reset
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {createOpen && (
        <CreateUserModal
          currentUser={currentUser}
          onClose={() => setCreateOpen(false)}
          onCreated={(u) => {
            setUsers((cur) => (cur ? [...cur, u] : [u]));
            setCreateOpen(false);
          }}
        />
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          body={confirm.body}
          danger={confirm.danger}
          confirmLabel={confirm.confirmLabel}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            await confirm.onConfirm();
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}

function StatusPill({ status, onToggle, disabled }: { status: Status; onToggle: () => void; disabled: boolean }) {
  const active = status === "ACTIVE";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`text-[11px] font-medium px-3 py-1.5 rounded-full border transition disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "text-emerald-200 border-emerald-500/30 bg-emerald-500/10 hover:border-emerald-400/60"
          : "text-rose-200 border-rose-500/30 bg-rose-500/10 hover:border-rose-400/60"
      }`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${active ? "bg-emerald-400" : "bg-rose-400"}`} />
      {status}
    </button>
  );
}
