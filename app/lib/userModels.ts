// localStorage CRUD for user-added catalogue models. Persisted client-side
// because additions are per-superadmin browser session — the canonical
// catalogue is the static aiCatalogue.ts list; this just stores which extra
// entries the user has flagged "added to platform".

const STORAGE_KEY = "slotforge.userAddedModels";
const REMOVED_KEY = "slotforge.removedBuiltInModels";

export function getAddedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

export function isAdded(id: string): boolean {
  return getAddedIds().includes(id);
}

export function addModel(id: string): string[] {
  const cur = getAddedIds();
  if (cur.includes(id)) return cur;
  const next = [...cur, id];
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

export function removeModel(id: string): string[] {
  const next = getAddedIds().filter((x) => x !== id);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

// ─── Removed built-in models ────────────────────────────────────────────────
// Built-in models are baked into MODEL_OPTIONS but the user can hide ones
// they don't want. We track the hidden set here; the picker filters them out.
// "Show hidden" toggle un-hides; clicking the search result re-adds (unmarks).

export function getRemovedBuiltInIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REMOVED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

export function isBuiltInRemoved(id: string): boolean {
  return getRemovedBuiltInIds().includes(id);
}

export function markBuiltInRemoved(id: string): string[] {
  const cur = getRemovedBuiltInIds();
  if (cur.includes(id)) return cur;
  const next = [...cur, id];
  try { localStorage.setItem(REMOVED_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

export function unmarkBuiltInRemoved(id: string): string[] {
  const next = getRemovedBuiltInIds().filter((x) => x !== id);
  try { localStorage.setItem(REMOVED_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}
