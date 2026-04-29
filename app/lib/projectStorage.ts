import type { SavedProject } from "@/app/types";
import { uploadProjectAssets } from "./assetCache";

// ---------------------------------------------------------------------------
// IndexedDB-backed project store with localStorage fallback + auto-migration.
//
// Why: localStorage has a per-origin quota of ~5MB. A single saved project
// with 10–20 base64 PNG assets can easily exceed that, which previously
// triggered a silent "strip imageUrls" fallback — losing all images.
// IndexedDB has a much higher quota (often ~50% of disk, GB-scale) and
// stores binary-friendly content well.
// ---------------------------------------------------------------------------

const DB_NAME      = "slotforge";
const STORE        = "projects";
const DB_VERSION   = 1;
const LEGACY_KEY   = "slotforge_projects";   // old localStorage key
const MAX_PROJECTS = 20;

let dbPromise: Promise<IDBDatabase | null> | null = null;
let migrated = false;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDB(): Promise<IDBDatabase | null> {
  if (!isBrowser()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => resolve(null);     // private mode / disabled IDB → null
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

async function idbGetAll(): Promise<SavedProject[]> {
  const db = await openDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const req = tx(db, "readonly").getAll();
      req.onsuccess = () => resolve((req.result as SavedProject[] | undefined) ?? []);
      req.onerror   = () => resolve([]);
    } catch { resolve([]); }
  });
}

async function idbPut(project: SavedProject): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const req = tx(db, "readwrite").put(project);
      req.onsuccess = () => resolve(true);
      req.onerror   = () => resolve(false);
    } catch { resolve(false); }
  });
}

async function idbDelete(id: string): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const req = tx(db, "readwrite").delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror   = () => resolve(false);
    } catch { resolve(false); }
  });
}

async function idbClear(): Promise<void> {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const req = tx(db, "readwrite").clear();
      req.onsuccess = () => resolve();
      req.onerror   = () => resolve();
    } catch { resolve(); }
  });
}

// ---------------------------------------------------------------------------
// Legacy localStorage helpers (read-only fallback path)
// ---------------------------------------------------------------------------

function lsGetAll(): SavedProject[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    return raw ? (JSON.parse(raw) as SavedProject[]) : [];
  } catch { return []; }
}

// One-time migration: copy any localStorage data into IndexedDB so existing
// users keep their saved projects. We don't delete the localStorage entry
// (it's a safety net) — but new writes only go to IndexedDB.
async function migrateOnce(): Promise<void> {
  if (migrated || !isBrowser()) { migrated = true; return; }
  migrated = true;
  const legacy = lsGetAll();
  if (legacy.length === 0) return;
  const existing = await idbGetAll();
  if (existing.length > 0) return; // already migrated previously
  for (const p of legacy) {
    await idbPut(p);
  }
}

// ---------------------------------------------------------------------------
// Public API (async)
// ---------------------------------------------------------------------------

export async function loadProjects(): Promise<SavedProject[]> {
  if (!isBrowser()) return [];
  await migrateOnce();
  const all = await idbGetAll();
  if (all.length > 0) {
    return all
      .slice()
      .sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""))
      .slice(0, MAX_PROJECTS);
  }
  // IndexedDB unavailable / empty — fall back to localStorage read
  return lsGetAll();
}

export async function saveProject(project: SavedProject): Promise<SavedProject[]> {
  if (!isBrowser()) return [project];
  await migrateOnce();

  const ok = await idbPut(project);

  // Fire-and-forget: also push asset bytes to the server cache so they survive
  // browser data clears + cross-machine moves. Never blocks the local save.
  void uploadProjectAssets(project.id, project.assets);

  if (!ok) {
    // IndexedDB unavailable — fall back to localStorage with the legacy
    // strip-images-on-quota-exceeded behavior so something gets persisted.
    const existing = lsGetAll().filter((p) => p.id !== project.id);
    const updated  = [project, ...existing].slice(0, MAX_PROJECTS);
    try {
      localStorage.setItem(LEGACY_KEY, JSON.stringify(updated));
    } catch (e) {
      if (e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22)) {
        const stripped: SavedProject = {
          ...project,
          assets: project.assets.map((a) => ({ ...a, imageUrl: "" })),
        };
        try {
          localStorage.setItem(LEGACY_KEY, JSON.stringify([stripped, ...existing].slice(0, MAX_PROJECTS)));
        } catch { /* give up */ }
      }
    }
    return loadProjects();
  }

  // Trim to MAX_PROJECTS — drop the oldest if needed
  const all = await idbGetAll();
  if (all.length > MAX_PROJECTS) {
    const sorted  = all.slice().sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
    const toRemove = sorted.slice(MAX_PROJECTS).map((p) => p.id);
    for (const id of toRemove) await idbDelete(id);
  }

  return loadProjects();
}

export async function deleteProject(id: string): Promise<SavedProject[]> {
  if (!isBrowser()) return [];
  await idbDelete(id);
  return loadProjects();
}

export async function clearAllProjects(): Promise<void> {
  if (!isBrowser()) return;
  await idbClear();
  try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
}
