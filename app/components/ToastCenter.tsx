"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type ToastKind = "info" | "success" | "warn" | "error";

export interface ToastAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  body?: string;
  action?: ToastAction;
  // when true, the toast stays until explicitly dismissed (used for topup alerts)
  sticky?: boolean;
  // dedupe key: replacing toast with same `key` collapses them so we don't stack 5 of the same
  key?: string;
}

interface ToastCtx {
  push: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
  // convenience helpers
  poweredBy: (role: string, modelLabel: string, providerLabel: string) => void;
  apiAlert: (a: { role: string; provider: string; reason: string; billingUrl?: string }) => void;
  clearByKey: (key: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

const AUTO_DISMISS_MS = 4500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
    const t = timersRef.current.get(id);
    if (t) { clearTimeout(t); timersRef.current.delete(id); }
  }, []);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((cur) => {
      const filtered = t.key ? cur.filter((x) => x.key !== t.key) : cur;
      return [...filtered, { ...t, id }];
    });
    if (!t.sticky) {
      const tm = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timersRef.current.set(id, tm);
    }
    return id;
  }, [dismiss]);

  const clearByKey = useCallback((key: string) => {
    setToasts((cur) => {
      cur.filter((t) => t.key === key).forEach((t) => {
        const tm = timersRef.current.get(t.id);
        if (tm) { clearTimeout(tm); timersRef.current.delete(t.id); }
      });
      return cur.filter((t) => t.key !== key);
    });
  }, []);

  const poweredBy = useCallback((role: string, modelLabel: string, providerLabel: string) => {
    push({
      kind: "info",
      key: `powered:${role}`,
      title: `${role} powered by ${modelLabel}`,
      body:  `Provider: ${providerLabel}. Estimated time depends on the request size.`,
    });
  }, [push]);

  const apiAlert = useCallback((a: { role: string; provider: string; reason: string; billingUrl?: string }) => {
    push({
      kind: "error",
      sticky: true,
      key: `alert:${a.role}:${a.provider}`,
      title: `${a.role} unavailable`,
      body:  `${a.provider} reports: ${a.reason}`,
      action: a.billingUrl ? { label: "Top up", href: a.billingUrl } : undefined,
    });
  }, [push]);

  const value = useMemo<ToastCtx>(() => ({ push, dismiss, poweredBy, apiAlert, clearByKey }), [push, dismiss, poweredBy, apiAlert, clearByKey]);

  // Cleanup pending timers on unmount
  useEffect(() => () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
  }, []);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-auto pointer-events-none">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToasts(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToasts must be used inside <ToastProvider>");
  return ctx;
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const styleByKind: Record<ToastKind, string> = {
    info:    "bg-indigo-900/85 border-indigo-400/40",
    success: "bg-emerald-900/85 border-emerald-400/40",
    warn:    "bg-amber-900/85 border-amber-400/40",
    error:   "bg-rose-900/90 border-rose-400/50",
  };
  const dotByKind: Record<ToastKind, string> = {
    info:    "bg-indigo-300",
    success: "bg-emerald-300",
    warn:    "bg-amber-300",
    error:   "bg-rose-300",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto rounded-2xl border ${styleByKind[toast.kind]} backdrop-blur-xl shadow-2xl px-4 py-3 text-sm text-white`}
      style={{ animation: "var(--animate-slide-up)" }}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${dotByKind[toast.kind]}`} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold tracking-tight">{toast.title}</p>
          {toast.body && <p className="text-xs text-white/80 mt-1 leading-relaxed">{toast.body}</p>}
          {toast.action && (
            toast.action.href ? (
              <a
                href={toast.action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg border border-white/20"
              >
                {toast.action.label} ↗
              </a>
            ) : (
              <button
                type="button"
                onClick={() => { toast.action?.onClick?.(); onDismiss(); }}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg border border-white/20"
              >
                {toast.action.label}
              </button>
            )
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-white/60 hover:text-white text-lg leading-none px-1"
        >
          ×
        </button>
      </div>
    </div>
  );
}
