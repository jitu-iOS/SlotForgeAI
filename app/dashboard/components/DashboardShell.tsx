"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AuthUser, Role } from "@/app/types/auth";
import ProfileTab from "./ProfileTab";
import UsersTab from "./UsersTab";

type Theme = "midnight-indigo" | "slate-sapphire" | "obsidian-gold" | "forest-emerald" | "dusk-rose";
const THEMES: { value: Theme; label: string; from: string; to: string }[] = [
  { value: "midnight-indigo", label: "Midnight Indigo", from: "from-indigo-500", to: "to-purple-500" },
  { value: "slate-sapphire",  label: "Slate Sapphire",  from: "from-sky-500",    to: "to-blue-600" },
  { value: "obsidian-gold",   label: "Obsidian Gold",   from: "from-amber-500",  to: "to-amber-600" },
  { value: "forest-emerald",  label: "Forest Emerald",  from: "from-emerald-500", to: "to-teal-500" },
  { value: "dusk-rose",       label: "Dusk Rose",       from: "from-rose-500",   to: "to-pink-700" },
];
const THEME_STORAGE_KEY = "slotforge.theme";

export default function DashboardShell({ initialUser }: { initialUser: AuthUser }) {
  const router = useRouter();
  const search = useSearchParams();
  const [user, setUser] = useState<AuthUser>(initialUser);
  const isAdmin = initialUser.role === "ADMIN" || initialUser.role === "SUPER_ADMIN";
  const initialTab: "profile" | "users" = search.get("tab") === "users" && isAdmin ? "users" : "profile";
  const [tab, setTab] = useState<"profile" | "users">(initialTab);
  const [theme, setTheme] = useState<Theme>("midnight-indigo");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_STORAGE_KEY) as Theme | null) ?? "midnight-indigo";
    setTheme(stored);
    document.documentElement.dataset.theme = stored;
  }, []);

  function selectTheme(t: Theme) {
    setTheme(t);
    document.documentElement.dataset.theme = t;
    localStorage.setItem(THEME_STORAGE_KEY, t);
  }

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const initial = useMemo(() => (user.name?.[0] || user.email[0] || "?").toUpperCase(), [user]);

  return (
    <main className="min-h-screen bg-[var(--bg-page)] text-zinc-100">
      <BackgroundMesh />

      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[var(--bg-page)]/70 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-md"
              style={{ background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}
            >
              S
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">SlotForge AI</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.22em]">Internal · Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/project"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.18] transition-colors"
            >
              Open Studio →
            </a>

            <ThemeStrip theme={theme} onSelect={selectTheme} />

            <UserChip user={user} initial={initial} />

            <button
              onClick={handleLogout}
              className="text-xs text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-rose-500/40 hover:bg-rose-500/10 transition-colors"
              disabled={signingOut}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
        <div style={{ animation: "var(--animate-slide-up)" }}>
          <h1 className="text-3xl font-semibold tracking-tight">Welcome back, {user.name.split(" ")[0]}</h1>
          <p className="text-sm text-zinc-400 mt-1.5">{roleHumanLabel(user.role)} · {user.email}</p>
        </div>

        {/* Tabs */}
        <div className="mt-8 border-b border-white/[0.07]">
          <div className="flex gap-1">
            <TabButton active={tab === "profile"} onClick={() => setTab("profile")}>Profile</TabButton>
            {isAdmin && (
              <TabButton active={tab === "users"} onClick={() => setTab("users")}>
                Users <span className="text-[10px] text-zinc-500 ml-1">Admin</span>
              </TabButton>
            )}
          </div>
        </div>

        <section key={tab} className="mt-8" style={{ animation: "var(--animate-slide-up)" }}>
          {tab === "profile" && <ProfileTab user={user} onUserUpdate={setUser} />}
          {tab === "users" && isAdmin && <UsersTab currentUser={user} />}
        </section>
      </div>
    </main>
  );
}

function BackgroundMesh() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none">
      <div
        className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-40"
        style={{ background: "radial-gradient(closest-side, var(--accent-from), transparent 70%)", animation: "var(--animate-mesh-a)" }}
      />
      <div
        className="absolute -bottom-1/4 -right-1/4 w-[55vw] h-[55vw] rounded-full blur-[120px] opacity-30"
        style={{ background: "radial-gradient(closest-side, var(--accent-to), transparent 70%)", animation: "var(--animate-mesh-b)" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.45)_85%)]" />
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-5 py-3 text-sm font-medium transition-colors ${active ? "text-white" : "text-zinc-400 hover:text-zinc-200"}`}
    >
      {children}
      {active && (
        <span
          className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full"
          style={{ background: "linear-gradient(90deg, var(--accent-from), var(--accent-to))" }}
        />
      )}
    </button>
  );
}

function ThemeStrip({ theme, onSelect }: { theme: Theme; onSelect: (t: Theme) => void }) {
  return (
    <div className="hidden md:flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02]">
      {THEMES.map((t) => {
        const active = t.value === theme;
        return (
          <button
            key={t.value}
            type="button"
            title={t.label}
            aria-label={t.label}
            onClick={() => onSelect(t.value)}
            className={`w-5 h-5 rounded-full bg-gradient-to-br ${t.from} ${t.to} transition-transform hover:scale-110 ${active ? "ring-2 ring-white" : "ring-1 ring-white/15"}`}
          />
        );
      })}
    </div>
  );
}

function UserChip({ user, initial }: { user: AuthUser; initial: string }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02]">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
        style={{ background: "linear-gradient(135deg, var(--accent-from), var(--accent-to))" }}
      >
        {initial}
      </div>
      <div className="hidden sm:block leading-tight pr-1">
        <p className="text-xs font-medium">{user.name}</p>
        <p className="text-[10px] text-zinc-500">{roleHumanLabel(user.role)}</p>
      </div>
    </div>
  );
}

function roleHumanLabel(role: Role): string {
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "ADMIN") return "Admin";
  return "User";
}
