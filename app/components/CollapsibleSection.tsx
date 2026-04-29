"use client";

import { useEffect, useState } from "react";

const PREFIX = "slotforge.sidebar.section.";

export default function CollapsibleSection({
  id,
  title,
  icon,
  defaultOpen = false,
  badgeCount,
  children,
}: {
  id: string;             // unique key — used for localStorage persistence
  title: string;
  icon?: string;
  defaultOpen?: boolean;
  badgeCount?: number;    // optional small count chip ( e.g. number of items)
  children: React.ReactNode;
}) {
  const storageKey = `${PREFIX}${id}`;
  const [open, setOpen] = useState(defaultOpen);

  // Hydrate persisted open state on mount (avoids SSR/CSR mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "1") setOpen(true);
      else if (saved === "0") setOpen(false);
    } catch { /* ignore */ }
  }, [storageKey]);

  function toggle() {
    setOpen((cur) => {
      const next = !cur;
      try { localStorage.setItem(storageKey, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <div className="border-t border-white/[0.06]">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`section-${id}`}
        className={`w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors group ${
          open ? "bg-white/[0.03]" : "hover:bg-white/[0.025]"
        }`}
      >
        {icon && (
          <span className={`text-[13px] flex-shrink-0 transition-opacity ${open ? "opacity-100" : "opacity-60 group-hover:opacity-90"}`}>
            {icon}
          </span>
        )}
        <span className={`flex-1 text-[10.5px] uppercase tracking-[0.18em] font-bold transition-colors ${
          open ? "text-zinc-300" : "text-zinc-500 group-hover:text-zinc-400"
        }`}>
          {title}
        </span>
        {typeof badgeCount === "number" && badgeCount > 0 && (
          <span className="text-[9px] font-bold tracking-wider rounded-full bg-white/[0.08] border border-white/[0.10] px-1.5 py-0.5 text-zinc-400">
            {badgeCount}
          </span>
        )}
        <Chevron open={open} />
      </button>
      {open && (
        <div id={`section-${id}`} className="pb-3" style={{ animation: "var(--animate-slide-up)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`flex-shrink-0 transition-all duration-200 ${open ? "rotate-180 text-indigo-400" : "text-zinc-600 group-hover:text-zinc-500"}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
