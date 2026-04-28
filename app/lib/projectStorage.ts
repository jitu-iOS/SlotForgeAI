import type { SavedProject } from "@/app/types";

const STORAGE_KEY = "slotforge_projects";
const MAX_PROJECTS = 20;

export function loadProjects(): SavedProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedProject[]) : [];
  } catch {
    return [];
  }
}

export function saveProject(project: SavedProject): SavedProject[] {
  const existing = loadProjects().filter((p) => p.id !== project.id);
  const updated = [project, ...existing].slice(0, MAX_PROJECTS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    // localStorage quota exceeded — retry without imageUrls
    if (e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22)) {
      const stripped: SavedProject = {
        ...project,
        assets: project.assets.map((a) => ({ ...a, imageUrl: "" })),
      };
      const updated2 = [stripped, ...existing].slice(0, MAX_PROJECTS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated2));
      } catch {
        // give up silently
      }
      return updated2;
    }
    return updated;
  }
}

export function deleteProject(id: string): SavedProject[] {
  const updated = loadProjects().filter((p) => p.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}
