"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ProjectFormComponent from "@/app/components/ProjectForm";
import StyleDNACard from "@/app/components/StyleDNACard";
import AssetGrid from "@/app/components/AssetGrid";
import { SkeletonStyleDNA, SkeletonGrid } from "@/app/components/SkeletonGrid";
import { downloadSelectedAssets } from "@/app/lib/downloadAssets";
import { loadProjects, saveProject, deleteProject } from "@/app/lib/projectStorage";
import SlotMachinePreview from "@/app/components/SlotMachinePreview";
import ApiKeysPanel from "@/app/components/ApiKeysPanel";
import type { ProjectForm, GenerateResponse, Asset, ImageModel, SavedProject, SlotType } from "@/app/types";
import { nanoid } from "@/app/lib/nanoid";
import { SLOT_TYPES, DEFAULT_SLOT_TYPE, getSlotConfig } from "@/app/lib/slotTypeConfig";

type Step = "home" | "form" | "loading" | "results" | "slot_preview";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOADING_STEPS = [
  { msg: "Building Style DNA…",    sub: "Analysing theme, mood & palette" },
  { msg: "Writing asset prompts…", sub: "One tailored prompt per slot" },
  { msg: "Generating images…",     sub: "Creating visuals with AI" },
  { msg: "Finishing up…",          sub: "Almost there" },
];

type ModelTier = "paid" | "free-tier";
type ProviderKey = "openai" | "replicate" | "runway" | "imagineart" | "free";
type ModelKind = "image" | "animation";

interface ModelOption {
  value: ImageModel;
  label: string;
  badge?: string;
  provider: string;
  providerKey: ProviderKey;
  billingUrl: string;
  note?: string;
  tier: ModelTier;
  pricing: string;
  kind: ModelKind;
}

const OPENAI_BILLING     = "https://platform.openai.com/account/billing";
const REPLICATE_BILLING  = "https://replicate.com/account/billing";
const RUNWAY_BILLING     = "https://app.runwayml.com/account";
const IMAGINEART_BILLING = "https://www.imagine.art/api";
const POLLINATIONS_INFO  = "https://pollinations.ai";

// 4 image + 3 animation models, curated for premium slot art and motion.
// Animation models produce short video clips usable for intros, ambient
// parallax loops, win bursts, and bonus-trigger reveals.
const MODEL_OPTIONS: ModelOption[] = [
  // ── Image generation ────────────────────────────────────────────────────
  { value: "gpt-image-1",          label: "GPT-Image-1",            badge: "Default",   provider: "OpenAI",            providerKey: "openai",    billingUrl: OPENAI_BILLING,    note: "Strongest prompt adherence + native edit support; best for UI text & icons",        tier: "paid", pricing: "~$0.19 / img (high · 1024²)", kind: "image" },
  { value: "flux-1.1-pro-ultra",   label: "FLUX 1.1 Pro Ultra",     badge: "Ultra",     provider: "Black Forest Labs", providerKey: "replicate", billingUrl: REPLICATE_BILLING, note: "Top-tier detail and texture — hero backgrounds & premium symbols",                  tier: "paid", pricing: "~$0.06 / img",                kind: "image" },
  { value: "flux-1.1-pro-ultra-imagineart", label: "FLUX 1.1 Pro Ultra (Imagine Art)", badge: "Imagine Art", provider: "Imagine Art (BFL FLUX)", providerKey: "imagineart", billingUrl: IMAGINEART_BILLING, note: "Same FLUX 1.1 Pro Ultra model, hosted by Imagine Art / Vyro AI — alternative billing channel with 1500 free starter credits", tier: "paid", pricing: "credit-based (≈$0.04–$0.08 / img)", kind: "image" },
  { value: "stable-diffusion-3.5", label: "Stable Diffusion 3.5",   badge: "SD3.5",     provider: "Stability AI",      providerKey: "replicate", billingUrl: REPLICATE_BILLING, note: "Best composition & cinematic lighting — ideal for layered backgrounds",             tier: "paid", pricing: "~$0.065 / img",               kind: "image" },
  // ── Free fallback (no key, auto-active when healthy) ───────────────────
  { value: "pollinations-flux-free", label: "Pollinations · FLUX",  badge: "Free",      provider: "Pollinations",      providerKey: "free",      billingUrl: POLLINATIONS_INFO, note: "FLUX-class image gen, no key required — auto-engages when paid models hit quota or fail", tier: "free-tier", pricing: "free · community-funded",  kind: "image" },
  // ── Animation / Video generation ────────────────────────────────────────
  { value: "runway-gen3",          label: "RunwayML Gen-3 Alpha",   badge: "Video",     provider: "Runway",            providerKey: "runway",    billingUrl: RUNWAY_BILLING,    note: "Single canonical animation provider — slot intros, jackpot reveals, parallax loops, win bursts", tier: "paid", pricing: "~$0.05 / sec  (≈ $0.50 / 10s)", kind: "animation" },
];

type ProviderStatus = Record<ProviderKey, { configured: boolean }>;
type QuotaState = Partial<Record<ProviderKey, boolean>>; // true = exhausted/limit reached
const QUOTA_STORAGE_KEY = "slotforge.quotaExhausted";
const SUBSCRIBED_STORAGE_KEY = "slotforge.subscribedModels";

// ---------------------------------------------------------------------------
// Themes — paired with CSS vars in globals.css
// ---------------------------------------------------------------------------

type Theme = "midnight-indigo" | "slate-sapphire" | "obsidian-gold" | "forest-emerald" | "dusk-rose";
const DEFAULT_THEME: Theme = "midnight-indigo";
const THEME_STORAGE_KEY = "slotforge.theme";

interface ThemeMeta {
  value: Theme;
  label: string;
  tagline: string;
  swatchFrom: string; // tailwind colour for the dot gradient
  swatchTo: string;
}

const THEMES: ThemeMeta[] = [
  { value: "midnight-indigo", label: "Midnight Indigo", tagline: "Default · tech-luxury",     swatchFrom: "from-indigo-500",  swatchTo: "to-purple-500"  },
  { value: "slate-sapphire",  label: "Slate Sapphire",  tagline: "Pro engineering dark",      swatchFrom: "from-sky-500",     swatchTo: "to-blue-600"    },
  { value: "obsidian-gold",   label: "Obsidian Gold",   tagline: "Casino premium",            swatchFrom: "from-amber-500",   swatchTo: "to-amber-600"   },
  { value: "forest-emerald",  label: "Forest Emerald",  tagline: "Sophisticated calm",        swatchFrom: "from-emerald-500", swatchTo: "to-teal-500"    },
  { value: "dusk-rose",       label: "Dusk Rose",       tagline: "Warm boutique",             swatchFrom: "from-rose-500",    swatchTo: "to-pink-700"    },
];

const FEATURE_CARDS = [
  { id: "assets",       icon: "🎨", gradient: "from-indigo-600/50 to-violet-700/50", title: "Asset Generator",        desc: "Symbols, backgrounds, UI & FX — all generated in one brief.",                 cta: true  },
  { id: "slot_preview", icon: "🎰", gradient: "from-violet-700/50 to-purple-800/50", title: "Slot Machine Preview",   desc: "Full rendered slot machine layout image with your assets.",                  cta: true  },
  { id: "style_dna",    icon: "🧬", gradient: "from-cyan-700/50 to-blue-700/50",     title: "Style DNA",              desc: "AI-powered visual consistency applied across every asset.",                  cta: true  },
  { id: "ai_assist",    icon: "✦",  gradient: "from-amber-600/50 to-orange-700/50",  title: "AI Prompt Assist",       desc: "One-click AI suggestions for every field in your brief.",                    cta: true  },
  { id: "models",       icon: "⚡", gradient: "from-emerald-700/50 to-teal-700/50",  title: "6 Premium AI Models",    desc: "GPT-Image-1, FLUX 1.1 Pro Ultra, SD 3.5, Ideogram v3, Recraft v3.",         cta: false },
  { id: "export",       icon: "📦", gradient: "from-rose-700/50 to-pink-700/50",     title: "Export & Download",      desc: "Download individual PNGs or a full ZIP bundle instantly.",                   cta: false },
];

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ProjectPage() {
  const [step, setStep]                   = useState<Step>("home");
  const [result, setResult]               = useState<GenerateResponse | null>(null);
  const [assets, setAssets]               = useState<Asset[]>([]);
  const [gameName, setGameName]           = useState<string>("");
  const [submittedForm, setSubmittedForm] = useState<ProjectForm | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [regeneratingIds, setRegenIds]    = useState<Set<string>>(new Set());
  const [regenError, setRegenError]       = useState<string | null>(null);
  const [isDownloading, setDownloading]   = useState(false);
  const [downloadDone, setDownloadDone]   = useState(false);
  const [selectedModel, setSelectedModel] = useState<ImageModel>("gpt-image-1");
  const [modelOpen, setModelOpen]         = useState(false);
  const [pendingModel, setPendingModel]   = useState<ImageModel | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [quotaState, setQuotaState]       = useState<QuotaState>({});
  const [subscribedModels, setSubscribedModels] = useState<Set<ImageModel>>(new Set());
  const [theme, setTheme]                 = useState<Theme>(DEFAULT_THEME);
  const [slotType, setSlotType]           = useState<SlotType>(DEFAULT_SLOT_TYPE);
  const [confirmBack, setConfirmBack]     = useState(false);
  // Model the user just clicked Subscribe on, awaiting their confirmation that
  // they actually completed the transaction at the provider's billing page.
  // Until they confirm, we do NOT mark Subscribed or change selectedModel.
  const [pendingSubConfirm, setPendingSubConfirm] = useState<ImageModel | null>(null);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [isSaved, setIsSaved]             = useState(false);
  const [pendingAutoSave, setPendingAutoSave] = useState(false);
  const [apiKeysOpen, setApiKeysOpen]     = useState(false);
  const [currentRole, setCurrentRole]     = useState<"SUPER_ADMIN" | "ADMIN" | "USER" | null>(null);
  const [syncTick, setSyncTick]           = useState(0);

  // AbortController for the in-flight SSE generation request
  const abortRef = useRef<AbortController | null>(null);

  // Computed: true while the SSE stream is open or per-asset regenerations are running
  const isGenerating = step === "loading" || (step === "results" && regeneratingIds.size > 0);

  // Load projects from localStorage on mount
  useEffect(() => {
    setSavedProjects(loadProjects());
  }, []);

  // Fetch provider activation status once per session
  const refreshProviderStatus = useCallback(() => {
    fetch("/api/providers/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.providers) setProviderStatus(data.providers as ProviderStatus);
        // Bump the tick counter on every successful poll so the status dots
        // re-mount and run the sync-blink animation, giving the user a live
        // visual cue that the system is checking for subscription / key updates.
        setSyncTick((t) => (t + 1) % 1_000_000);
      })
      .catch(() => { /* non-fatal */ });
  }, []);

  useEffect(() => {
    refreshProviderStatus();
  }, [refreshProviderStatus]);

  // Poll provider/subscription status every 2.5s while the tab is visible.
  // Picks up: (a) keys added via the API Keys panel from another admin's tab,
  // (b) keys added via .env.local + server restart, (c) any external change to
  // the encrypted vault on disk. Pauses when the tab is hidden to avoid wasted
  // requests, resumes immediately on visibility-change.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let inFlight = false;

    const tick = async () => {
      if (cancelled || inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try { refreshProviderStatus(); } finally { inFlight = false; }
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(tick, 2500);
    };
    const stop = () => {
      if (timer) { clearInterval(timer); timer = null; }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") { refreshProviderStatus(); start(); }
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshProviderStatus]);

  // Fetch current user role to gate the API Keys panel
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.user?.role) setCurrentRole(data.user.role); })
      .catch(() => { /* non-fatal */ });
  }, []);

  // Hydrate quotaState from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(QUOTA_STORAGE_KEY);
      if (raw) setQuotaState(JSON.parse(raw) as QuotaState);
    } catch { /* sessionStorage may be unavailable */ }
  }, []);

  // Persist on change
  useEffect(() => {
    try { sessionStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(quotaState)); }
    catch { /* ignore */ }
  }, [quotaState]);

  const markQuotaExhausted = useCallback((p: ProviderKey, exhausted: boolean) => {
    setQuotaState((prev) => ({ ...prev, [p]: exhausted }));
  }, []);

  // Hydrate subscribedModels from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SUBSCRIBED_STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as ImageModel[];
        setSubscribedModels(new Set(arr));
      }
    } catch { /* ignore */ }
  }, []);

  // Hydrate + apply theme. data-theme on <html> drives the CSS-var-based
  // surfaces. We persist to localStorage so the choice survives a reload.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (raw && THEMES.some((t) => t.value === raw)) setTheme(raw as Theme);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_STORAGE_KEY, theme); }
    catch { /* ignore */ }
  }, [theme]);

  const markSubscribed = useCallback((m: ImageModel) => {
    // Defence in depth: refuse to mark Subscribed unless the server actually
    // has the provider's API key configured. Otherwise the badge would lie.
    const opt = MODEL_OPTIONS.find((x) => x.value === m);
    if (!opt) return;
    if (providerStatus?.[opt.providerKey]?.configured !== true) {
      console.warn(
        `[markSubscribed] refused: ${opt.providerKey} key isn't configured on the server. ` +
        `Add ${providerEnvVar(opt.providerKey)} to .env.local first.`
      );
      return;
    }
    setSubscribedModels((prev) => {
      const next = new Set(prev);
      next.add(m);
      try { localStorage.setItem(SUBSCRIBED_STORAGE_KEY, JSON.stringify(Array.from(next))); }
      catch { /* ignore */ }
      return next;
    });
  }, [providerStatus]);

  const unmarkSubscribed = useCallback((m: ImageModel) => {
    setSubscribedModels((prev) => {
      const next = new Set(prev);
      next.delete(m);
      try { localStorage.setItem(SUBSCRIBED_STORAGE_KEY, JSON.stringify(Array.from(next))); }
      catch { /* ignore */ }
      return next;
    });
  }, []);

  // Subscribe-click: open billing in a new tab and ask the user (via modal)
  // whether they actually completed the transaction. We don't auto-mark
  // Subscribed or change selectedModel until they confirm — otherwise a
  // cancelled checkout would silently lie about the user's state.
  const initiateSubscribe = useCallback((m: ImageModel) => {
    const opt = MODEL_OPTIONS.find((x) => x.value === m);
    if (opt) window.open(opt.billingUrl, "_blank", "noopener,noreferrer");
    // If they're already subscribed, treat the click as "Manage subscription"
    // — open billing tab but skip the confirm modal.
    if (subscribedModels.has(m)) return;
    setPendingSubConfirm(m);
    setModelOpen(false);
  }, [subscribedModels]);

  // Sync browser tab title
  useEffect(() => {
    document.title = gameName ? `${gameName} — SlotForge AI - Internal` : "SlotForge AI - Internal";
  }, [gameName]);

  // Abort any in-flight generation when the component unmounts (e.g. page reload)
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // Auto-save: fire silently when generation fully completes after a pending save
  useEffect(() => {
    if (!pendingAutoSave) return;
    if (regeneratingIds.size > 0 || step !== "results") return;
    if (!result || !submittedForm) return;
    const project: SavedProject = {
      id: nanoid(),
      gameName,
      savedAt: new Date().toISOString(),
      imageModel: selectedModel,
      styleDNA: result.styleDNA,
      assets,
      form: submittedForm,
    };
    const updated = saveProject(project);
    setSavedProjects(updated);
    setIsSaved(true);
    setPendingAutoSave(false);
    setTimeout(() => setIsSaved(false), 3000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regeneratingIds.size, pendingAutoSave, step]);

  // (Click-outside handling lives inside Sidebar where the wrapper ref is in scope.)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(async (form: ProjectForm) => {
    // Cancel any previous in-flight generation
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setStep("loading");
    setError(null);
    setGameName(form.gameName);
    setSubmittedForm(form);
    setIsSaved(false);
    setPendingAutoSave(false);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, imageModel: selectedModel, slotType }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? `Server error ${res.status}`);
      }
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const payload = JSON.parse(part.slice(6));

          if (payload.type === "init") {
            setResult({ styleDNA: payload.styleDNA, assets: payload.assets });
            setAssets(payload.assets);
            setRegenIds(new Set<string>(payload.assets.map((a: Asset) => a.id)));
            setStep("results");
          } else if (payload.type === "asset") {
            setAssets((prev) =>
              prev.map((a) => (a.id === payload.asset.id ? payload.asset : a))
            );
            setRegenIds((prev) => {
              const next = new Set(prev);
              next.delete(payload.asset.id);
              return next;
            });
          } else if (payload.type === "error") {
            throw new Error(payload.message);
          }
        }
      }
      setRegenIds(new Set());
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return; // clean unmount/reload
      setError(err instanceof Error ? err.message : "Unknown error");
      setStep("form");
    }
  }, [selectedModel, slotType]);

  const handleToggleSelect = useCallback((id: string) => {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a)));
  }, []);

  const handleSelectAll = useCallback((ids: string[], value: boolean) => {
    const set = new Set(ids);
    setAssets((prev) => prev.map((a) => (set.has(a.id) ? { ...a, selected: value } : a)));
  }, []);

  const handleRegenerate = useCallback(async (id: string) => {
    if (!result) return;
    const asset = assets.find((a) => a.id === id);
    if (!asset) return;

    setRegenIds((prev) => new Set([...prev, id]));
    setRegenError(null);
    setIsSaved(false);

    try {
      const res = await fetch("/api/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ styleDNA: result.styleDNA, assetId: id, assetType: asset.type, assetLabel: asset.label, imageModel: selectedModel }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? "Regeneration failed");
      }
      const data: { asset: Asset } = await res.json();
      setAssets((prev) => prev.map((a) => (a.id === id ? { ...data.asset, selected: a.selected } : a)));
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegenIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  }, [assets, result, selectedModel]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setDownloadDone(false);
    try {
      await downloadSelectedAssets(assets, gameName);
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 3000);
    } finally {
      setDownloading(false);
    }
  }, [assets, gameName]);

  const handleEditAsset = useCallback(async (id: string, instruction: string) => {
    if (!result) return;
    const asset = assets.find((a) => a.id === id);
    if (!asset) return;

    setRegenIds((prev) => new Set([...prev, id]));
    setRegenError(null);
    setIsSaved(false);

    try {
      const res = await fetch("/api/edit-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: id,
          assetType: asset.type,
          assetLabel: asset.label,
          assetPrompt: asset.prompt,
          imageUrl: asset.imageUrl,
          instruction,
          styleDNA: result.styleDNA,
          imageModel: selectedModel,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? "Edit failed");
      }
      const data: { asset: Asset } = await res.json();
      setAssets((prev) =>
        prev.map((a) => (a.id === id ? { ...data.asset, selected: a.selected } : a))
      );
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : "Edit failed");
    } finally {
      setRegenIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  }, [assets, result, selectedModel]);

  const handleSave = useCallback(() => {
    if (!result || !submittedForm) return;
    // If still generating, queue the save — the auto-save useEffect will fire it when done
    if (isGenerating) {
      setPendingAutoSave(true);
      return;
    }
    const project: SavedProject = {
      id: nanoid(),
      gameName,
      savedAt: new Date().toISOString(),
      imageModel: selectedModel,
      styleDNA: result.styleDNA,
      assets,
      form: submittedForm,
    };
    const updated = saveProject(project);
    setSavedProjects(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  }, [result, submittedForm, gameName, selectedModel, assets, isGenerating]);

  const handleRestoreProject = useCallback((project: SavedProject) => {
    setResult({ styleDNA: project.styleDNA, assets: project.assets });
    setAssets(project.assets);
    setGameName(project.gameName);
    setSubmittedForm(project.form);
    setSelectedModel(project.imageModel);
    setRegenIds(new Set());
    setRegenError(null);
    setIsSaved(true); // already saved
    setTimeout(() => setIsSaved(false), 1500);
    setStep("results");
  }, []);

  const handleDeleteProject = useCallback((id: string) => {
    const updated = deleteProject(id);
    setSavedProjects(updated);
  }, []);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStep("home");
    setResult(null);
    setAssets([]);
    setGameName("");
    setSubmittedForm(null);
    setError(null);
    setRegenIds(new Set());
    setRegenError(null);
    setDownloading(false);
    setDownloadDone(false);
    setIsSaved(false);
    setPendingAutoSave(false);
  }, []);

  // Back-to-Dashboard navigation. If a generation is in flight, gate behind a
  // confirmation modal so a mistaken click doesn't silently throw away
  // progress. handleReset already aborts the in-flight request.
  const navigateHome = useCallback(() => {
    if (isGenerating) {
      setConfirmBack(true);
    } else {
      handleReset();
    }
  }, [isGenerating, handleReset]);

  return (
    <div className="h-screen overflow-hidden flex bg-[var(--bg-page)] text-white transition-colors">
      {/* Sidebar */}
      <Sidebar
        step={step}
        gameName={gameName}
        selectedModel={selectedModel}
        modelOpen={modelOpen}
        savedProjects={savedProjects}
        hasResults={result !== null}
        isGenerating={isGenerating}
        providerStatus={providerStatus}
        slotType={slotType}
        onSelectSlotType={setSlotType}
        theme={theme}
        onSelectTheme={setTheme}
        quotaState={quotaState}
        onNewProject={() => { setStep("form"); setError(null); }}
        onGoHome={() => setStep("home")}
        onSlotPreview={() => setStep("slot_preview")}
        onGoResults={() => setStep("results")}
        onPickModel={(m) => { setPendingModel(m); setModelOpen(false); }}
        onSubscribeModel={initiateSubscribe}
        subscribedModels={subscribedModels}
        onUnsubscribeModel={unmarkSubscribed}
        onModelOpen={setModelOpen}
        onRestoreProject={handleRestoreProject}
        onDeleteProject={handleDeleteProject}
        currentRole={currentRole}
        apiKeysOpen={apiKeysOpen}
        onOpenApiKeys={() => setApiKeysOpen(true)}
        syncTick={syncTick}
      />

      {/* Did-you-actually-subscribe confirmation modal — opens after the user
          clicks Subscribe and gets sent to the provider's billing tab. We wait
          for them to tell us whether they completed the transaction; only then
          do we mark Subscribed and switch the active model. */}
      {pendingSubConfirm && (
        <SubscribeConfirmModal
          model={MODEL_OPTIONS.find((m) => m.value === pendingSubConfirm)!}
          providerStatus={providerStatus}
          onYes={() => {
            markSubscribed(pendingSubConfirm);
            setSelectedModel(pendingSubConfirm);
            setPendingSubConfirm(null);
          }}
          onNo={() => setPendingSubConfirm(null)}
          onLater={() => setPendingSubConfirm(null)}
        />
      )}

      {/* Back-to-Dashboard confirm modal (only when generation is in flight) */}
      {confirmBack && (
        <BackConfirmModal
          onCancel={() => setConfirmBack(false)}
          onConfirm={() => {
            setConfirmBack(false);
            handleReset();
          }}
        />
      )}

      {/* Subscription / activation modal */}
      {pendingModel && (
        <SubscriptionModal
          model={MODEL_OPTIONS.find((m) => m.value === pendingModel)!}
          providerStatus={providerStatus}
          isCurrentlySelected={pendingModel === selectedModel}
          onConfirm={() => { setSelectedModel(pendingModel); setPendingModel(null); }}
          onCancel={() => setPendingModel(null)}
        />
      )}

      {/* API Keys panel — admin only */}
      <ApiKeysPanel
        open={apiKeysOpen}
        onClose={() => setApiKeysOpen(false)}
        onChanged={refreshProviderStatus}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumb bar */}
        {step !== "home" && (
          <div className="flex-shrink-0 flex items-center gap-2.5 px-10 py-4 border-b border-white/[0.06] bg-[var(--bg-bread)] transition-colors">
            <button
              onClick={navigateHome}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Dashboard
            </button>
            <span className="text-zinc-700">/</span>
            <span className="text-sm text-zinc-200 font-medium">
              {step === "form"
                ? "New Project"
                : step === "loading"
                ? "Generating…"
                : step === "slot_preview"
                ? "Slot Preview"
                : gameName || "Project"}
            </span>
            {/* Right-aligned back-to-dashboard CTA, present on every non-home step */}
            <button
              onClick={navigateHome}
              className="ml-auto inline-flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white border border-white/15 hover:border-white/30 rounded-lg px-4 py-2 transition-all bg-white/[0.03] hover:bg-white/[0.06]"
              title={isGenerating ? "Going back will cancel the current generation" : "Return to Dashboard"}
            >
              <span>←</span>
              <span>Back to Dashboard</span>
              {isGenerating && (
                <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-amber-300/90 rounded-full bg-amber-500/15 border border-amber-400/30 px-1.5 py-0.5">
                  Cancels gen
                </span>
              )}
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          {step === "home" && (
            <HomeView
              onCreateProject={() => setStep("form")}
              selectedModel={selectedModel}
              providerStatus={providerStatus}
              quotaState={quotaState}
              subscribedModels={subscribedModels}
              onSubscribeModel={initiateSubscribe}
              onUnsubscribeModel={unmarkSubscribed}
              syncTick={syncTick}
            />
          )}

          {step === "slot_preview" && (
            <SlotMachinePreview assets={assets} gameName={gameName || "SlotForge"} />
          )}

          {step === "form" && (
            <div className="px-10 py-10 max-w-6xl mx-auto w-full animate-fade-in">
              <div className="mb-8">
                <h1 className="text-2xl font-extrabold tracking-tight mb-1">
                  Design world&apos;s best slot machines
                </h1>
                <p className="text-zinc-400 text-sm">
                  Fill in your brief — click{" "}
                  <span className="text-indigo-400 font-medium">✦ AI</span> on any field to auto-suggest.
                </p>
                {error && (
                  <div className="mt-4 rounded-xl bg-red-900/30 border border-red-700/50 px-4 py-3 text-sm text-red-400 flex items-start gap-2">
                    <span className="mt-px">⚠</span><span>{error}</span>
                  </div>
                )}
              </div>
              <ProjectFormComponent
                onSubmit={handleSubmit}
                isLoading={false}
                slotType={slotType}
                onQuotaExhausted={() => markQuotaExhausted("openai", true)}
              />
            </div>
          )}

          {step === "loading" && (
            <div className="px-10 py-10 max-w-6xl mx-auto w-full">
              <LoadingState />
            </div>
          )}

          {step === "results" && result && (
            <div className="px-10 py-10 max-w-6xl mx-auto w-full animate-fade-in">
              <ResultsView
                result={result}
                assets={assets}
                regeneratingIds={Array.from(regeneratingIds)}
                regenError={regenError}
                isDownloading={isDownloading}
                downloadDone={downloadDone}
                isSaved={isSaved}
                isGenerating={isGenerating}
                pendingAutoSave={pendingAutoSave}
                onDismissRegenError={() => setRegenError(null)}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onRegenerate={handleRegenerate}
                onEditAsset={handleEditAsset}
                onDownload={handleDownload}
                onSave={handleSave}
                onReset={handleReset}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

interface SidebarProps {
  step: Step;
  gameName: string;
  selectedModel: ImageModel;
  modelOpen: boolean;
  savedProjects: SavedProject[];
  hasResults: boolean;
  isGenerating: boolean;
  providerStatus: ProviderStatus | null;
  quotaState: QuotaState;
  subscribedModels: Set<ImageModel>;
  slotType: SlotType;
  onSelectSlotType: (t: SlotType) => void;
  theme: Theme;
  onSelectTheme: (t: Theme) => void;
  onNewProject: () => void;
  onGoHome: () => void;
  onSlotPreview: () => void;
  onGoResults: () => void;
  onPickModel: (m: ImageModel) => void;
  onSubscribeModel: (m: ImageModel) => void;
  onUnsubscribeModel: (m: ImageModel) => void;
  onModelOpen: (v: boolean) => void;
  onRestoreProject: (p: SavedProject) => void;
  onDeleteProject: (id: string) => void;
  currentRole: "SUPER_ADMIN" | "ADMIN" | "USER" | null;
  apiKeysOpen: boolean;
  onOpenApiKeys: () => void;
  syncTick: number;
}

function Sidebar({
  step, gameName, selectedModel, modelOpen, savedProjects, hasResults, isGenerating, providerStatus, quotaState, subscribedModels, slotType, onSelectSlotType, theme, onSelectTheme,
  onNewProject, onGoHome, onSlotPreview, onGoResults, onPickModel, onSubscribeModel, onUnsubscribeModel, onModelOpen,
  onRestoreProject, onDeleteProject,
  currentRole, apiKeysOpen, onOpenApiKeys, syncTick,
}: SidebarProps) {
  const activeModel = MODEL_OPTIONS.find((m) => m.value === selectedModel)!;
  const activeStatusEnum = modelStatusOf(activeModel, providerStatus, quotaState);
  const activeIsExhausted = activeStatusEnum === "quota_exhausted";
  const activeIsConfigured = activeStatusEnum === "active";
  const activeIsSubscribed = subscribedModels.has(selectedModel);

  // Bulletproof click-outside: capture mousedown anywhere on the page; if the
  // click target is NOT inside the wrapper (which holds both trigger + panel),
  // close the dropdown. mousedown beats click here because click can race with
  // React's own event processing.
  const modelWrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!modelOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (target && modelWrapperRef.current && !modelWrapperRef.current.contains(target)) {
        onModelOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [modelOpen, onModelOpen]);

  return (
    <aside className="w-[280px] flex-shrink-0 h-screen flex flex-col bg-[var(--bg-sidebar)] border-r border-white/[0.07] transition-colors">
      {/* Logo */}
      <div className="flex-shrink-0 p-5 border-b border-white/[0.07]">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-[image:linear-gradient(135deg,var(--accent-from),var(--accent-to))] flex items-center justify-center text-xl shadow-lg shadow-black/50 flex-shrink-0">
            🎰
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base leading-tight">SlotForge AI</span>
              <span className="text-[9px] font-bold tracking-[0.12em] uppercase rounded-full bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.5 text-amber-300">
                Internal
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 tracking-[0.15em] uppercase mt-0.5">Slots Generator</div>
          </div>
        </div>
        <button
          onClick={onNewProject}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[image:linear-gradient(to_right,var(--accent-from),var(--accent-to))] hover:opacity-90 py-3 text-sm font-bold transition-all shadow-md shadow-indigo-900/40"
        >
          ✦ New Project
        </button>
      </div>

      {/* Active project badge */}
      {gameName && (
        <div className="flex-shrink-0 px-5 py-3 border-b border-white/[0.07] bg-indigo-900/10">
          <p className="text-[11px] text-zinc-600 uppercase tracking-[0.15em] mb-1">Active Project</p>
          <p className="text-sm font-semibold text-indigo-300 truncate">{gameName}</p>
        </div>
      )}

      {/* Scrollable middle */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Generation in-progress banner */}
        {isGenerating && (
          <div className="mx-2 mt-2 mb-1 rounded-xl bg-amber-900/20 border border-amber-500/20 px-3 py-2.5 animate-fade-in">
            <div className="flex items-center gap-2 text-[10px] font-bold text-amber-400 mb-1">
              <svg className="animate-spin w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
              Generation in progress
            </div>
            <p className="text-[10px] text-amber-500/70 leading-relaxed">
              Navigation paused — assets are still generating. They will complete in the background.
            </p>
          </div>
        )}

        <nav className="p-2.5 flex flex-col gap-1">
          <NavItem
            icon="🏠" label="Dashboard" active={step === "home"}
            onClick={onGoHome}
            locked={isGenerating}
            tip="Your main hub — see all available tools, view AI model options, and start new slot projects from here."
          />
          <NavItem
            icon="👤" label="My Profile" active={false}
            onClick={() => { window.location.href = "/dashboard"; }}
            tip="Change your password and view account details."
          />
          {(currentRole === "ADMIN" || currentRole === "SUPER_ADMIN") && (
            <NavItem
              icon="👥" label="Manage Users" active={false}
              onClick={() => { window.location.href = "/dashboard?tab=users"; }}
              tip="Create users, assign roles, enable/disable accounts, reset passwords. Admin only."
            />
          )}
          <NavItem
            icon="📁" label="New Project" active={step === "form"}
            onClick={onNewProject}
            locked={isGenerating}
            tip="Open the 9-section game brief form. Describe your theme, art direction, symbols, FX, and quality settings. AI can auto-fill every field."
          />
        </nav>

        <SidebarDivider label="AI Tools" />
        <div className="px-2.5 flex flex-col gap-1">
          <NavItem
            icon="🎨" label="Asset Generator" active={step === "form"}
            onClick={onNewProject}
            locked={isGenerating}
            tip="Generate a full set of slot assets — high & low symbols, background, UI elements, FX sprites, animations, and a complete slot machine preview image."
          />
          <NavItem
            icon="🎰" label="Slot Preview" active={step === "slot_preview"}
            onClick={onSlotPreview}
            locked={isGenerating}
            tip="Opens an animated, playable slot machine that uses your generated symbol assets on the reels. Spin to see how your game will look and feel."
          />
          <NavItem
            icon="🧬" label="Style DNA"
            active={step === "results" && hasResults}
            onClick={hasResults ? onGoResults : onNewProject}
            locked={isGenerating && step !== "results"}
            tip={hasResults
              ? "View the AI-generated Style DNA for your current project — the shared lighting, texture, and colour rules applied consistently across all assets."
              : "Generate a project first. Style DNA shows the visual consistency blueprint created by AI from your brief."}
            disabled={!hasResults}
          />
          <NavItem
            icon="✦" label="AI Prompt Assist"
            active={step === "form"}
            onClick={onNewProject}
            locked={isGenerating}
            tip={`Opens the project form. Every field has an "AI" button that suggests a value based on context. Use "Fill All" to auto-complete the entire brief instantly.`}
          />
          <NavItem
            icon="📦" label="Export Assets"
            active={false}
            onClick={hasResults ? onGoResults : onNewProject}
            tip={hasResults
              ? "Go to your generated assets. Select the ones you want and download them as individual PNGs or a ZIP bundle organised by asset type."
              : "Generate a project first. Once assets are ready you can select and download them here."}
            disabled={!hasResults}
          />
        </div>

        {/* History */}
        {savedProjects.length > 0 && (
          <>
            <SidebarDivider label={`History (${savedProjects.length})`} />
            <div className="px-2 pb-2 flex flex-col gap-1">
              {savedProjects.map((p) => (
                <HistoryItem
                  key={p.id}
                  project={p}
                  onRestore={() => onRestoreProject(p)}
                  onDelete={() => onDeleteProject(p.id)}
                />
              ))}
            </div>
          </>
        )}

        <SidebarDivider label="Advanced" />
        <div className="px-2.5 pb-4 flex flex-col gap-1">
          <NavItem
            icon="⚙" label="Preferences" active={false}
            onClick={() => {}} comingSoon
            tip="Customise app behaviour — default bet values, auto-spin count, reel speed, and UI theme. Coming in the next release."
          />
          {(currentRole === "ADMIN" || currentRole === "SUPER_ADMIN") && (
            <NavItem
              icon="🔑" label="API Keys" active={apiKeysOpen}
              onClick={onOpenApiKeys}
              tip="Manage OpenAI / Replicate / Runway / Imagine Art keys at runtime. Encrypted on the server; admin-only."
            />
          )}
        </div>
      </div>

      {/* Theme picker pinned at bottom (above slot type) */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-t border-white/[0.07]">
        <p className="text-[11px] text-zinc-500 uppercase tracking-[0.18em] mb-2.5 px-1 flex items-center gap-2">
          <span className="text-sm">🎨</span> Theme
        </p>
        <div className="flex items-center justify-between gap-1.5">
          {THEMES.map((t) => {
            const isActive = t.value === theme;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => onSelectTheme(t.value)}
                title={`${t.label} — ${t.tagline}`}
                aria-label={`Switch to ${t.label} theme`}
                className={`group relative w-9 h-9 rounded-full bg-gradient-to-br ${t.swatchFrom} ${t.swatchTo} transition-all hover:scale-110 ${
                  isActive
                    ? "ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-sidebar)] shadow-lg"
                    : "ring-1 ring-white/15 hover:ring-white/40"
                }`}
              >
                {isActive && (
                  <span className="absolute inset-0 flex items-center justify-center text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-zinc-600 mt-2 px-1 truncate" title={THEMES.find((t) => t.value === theme)?.tagline}>
          {THEMES.find((t) => t.value === theme)?.label}
        </p>
      </div>

      {/* Slot type picker pinned at bottom (above model selector) */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-t border-white/[0.07]">
        <p className="text-[11px] text-zinc-500 uppercase tracking-[0.18em] mb-2.5 px-1 flex items-center gap-2">
          <span className="text-sm">🎰</span> Slot Type
        </p>
        <div className="grid grid-cols-2 gap-2">
          {SLOT_TYPES.map((t) => {
            const isActive = t.value === slotType;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => onSelectSlotType(t.value)}
                title={t.tagline}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-lg px-2.5 py-2.5 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-gradient-to-br from-indigo-600/40 to-purple-600/40 border border-indigo-400/50 text-white shadow-[inset_0_0_0_1px_rgba(99,102,241,0.25)]"
                    : "bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                }`}
              >
                <span className="text-xs tracking-wide">{t.short}</span>
                {isActive && <span className="text-[9px] text-emerald-300 font-bold tracking-wider">ACTIVE ✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Model selector pinned at bottom */}
      <div className="flex-shrink-0 p-4 border-t border-white/[0.07]">
        <p className="text-[11px] text-zinc-500 uppercase tracking-[0.18em] mb-2.5 px-1">Image Model</p>
        <div ref={modelWrapperRef} className="relative">
          <button
            type="button"
            onClick={() => onModelOpen(!modelOpen)}
            className={`w-full flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
              activeIsExhausted
                ? "bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-100 shadow-[0_0_0_1px_rgba(244,63,94,0.25)]"
                : activeIsSubscribed
                ? "bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-400/40 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.3),0_0_18px_-6px_rgba(34,211,238,0.5)]"
                : "bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-zinc-300 shadow-[0_0_0_1px_rgba(99,102,241,0.15)]"
            }`}
            title={
              activeIsExhausted ? `${activeModel.label} — Quota exhausted, top up to continue`
              : activeIsSubscribed ? `${activeModel.label} — Subscribed`
              : activeIsConfigured ? `${activeModel.label} — Active`
              : `${activeModel.label} — needs API key`
            }
          >
            <span
              key={syncTick}
              style={{ animation: "var(--animate-sync-blink)" }}
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                activeIsExhausted ? "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse"
                : activeIsSubscribed ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
                : activeIsConfigured ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]"
                : "bg-amber-400"
              }`}
            />
            <span className="flex-1 text-left truncate">
              {activeModel.label}
              {activeIsExhausted && <span className="ml-1.5 text-[10px] font-bold tracking-wider">· QUOTA OUT</span>}
              {activeIsSubscribed && !activeIsExhausted && <span className="ml-1.5 text-[10px] font-bold tracking-wider text-cyan-300">· SUBSCRIBED</span>}
            </span>
            <ChevronIcon open={modelOpen} />
          </button>

          {modelOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl bg-[var(--bg-elevated)] border border-white/15 shadow-2xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
              <div className="px-3 py-2 border-b border-white/10 sticky top-0 bg-[var(--bg-elevated)]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  {MODEL_OPTIONS.length} AI Models — requires API key
                </p>
              </div>
              {MODEL_OPTIONS.map((m) => {
                const isActive = m.value === selectedModel;
                const status = modelStatusOf(m, providerStatus, quotaState);
                const exhausted = status === "quota_exhausted";
                const subscribed = subscribedModels.has(m.value);
                return (
                  <div
                    key={m.value}
                    role="button"
                    tabIndex={0}
                    onClick={() => onPickModel(m.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPickModel(m.value); } }}
                    className={`w-full flex items-start justify-between px-3 py-2.5 text-left transition-all hover:bg-white/5 gap-2 border-l-2 cursor-pointer ${
                      exhausted
                        ? "bg-rose-900/15 border-l-rose-400 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.18)]"
                        : subscribed
                        ? "bg-cyan-900/15 border-l-cyan-400 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.18)]"
                        : isActive
                        ? "bg-indigo-600/15 border-l-indigo-400 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)]"
                        : "border-l-transparent"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-medium ${exhausted ? "text-rose-200" : subscribed ? "text-cyan-100" : isActive ? "text-white" : "text-zinc-300"}`}>{m.label}</span>
                        {m.badge && (
                          <span className="text-[9px] rounded-full bg-indigo-600/20 border border-indigo-500/20 px-1.5 py-0.5 text-indigo-400 flex-shrink-0">
                            {m.badge}
                          </span>
                        )}
                        <PriceBadge tier={m.tier} />
                        <ActivationBadge status={status} />
                        <SubscribedBadge show={subscribed} onUnsubscribe={() => onUnsubscribeModel(m.value)} />
                      </div>
                      <div className="text-[9px] text-zinc-600 mt-0.5">{m.provider} · <span className="text-emerald-400/80">{m.pricing}</span></div>
                      {m.note && <div className="text-[9px] text-zinc-500 mt-0.5 leading-tight mb-1.5">{m.note}</div>}

                      {/* Inline Subscribe button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSubscribeModel(m.value);
                        }}
                        className="mt-1 inline-flex items-center gap-1 rounded-lg bg-[image:linear-gradient(to_right,var(--accent-from),var(--accent-to))] hover:opacity-90 px-2.5 py-1 text-[10px] font-bold text-white shadow-md shadow-indigo-900/30 transition-all"
                        title={`Open ${providerDisplayName(m.providerKey)} billing in new tab and select ${m.label}`}
                      >
                        {subscribeLabel(m.providerKey)} ↗
                      </button>
                    </div>
                    {isActive && (
                      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-500 flex-shrink-0 mt-0.5">
                        <CheckSmIcon />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Sidebar helpers
// ---------------------------------------------------------------------------

function NavItem({
  icon, label, tip, active, onClick, comingSoon, disabled, locked,
}: {
  icon: string;
  label: string;
  tip?: string;
  active: boolean;
  onClick: () => void;
  comingSoon?: boolean;
  disabled?: boolean;
  locked?: boolean;
}) {
  const [tipOpen, setTipOpen] = useState(false);
  const [showLockedFlash, setShowLockedFlash] = useState(false);
  const isInert = comingSoon || disabled;

  const handleClick = () => {
    if (locked) {
      setShowLockedFlash(true);
      setTimeout(() => setShowLockedFlash(false), 2200);
      return;
    }
    if (!isInert) onClick();
  };

  return (
    <div>
      <div className="flex items-center gap-1">
        {/* Main nav button */}
        <button
          type="button"
          onClick={handleClick}
          className={`flex-1 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all text-left min-w-0 ${
            active
              ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/20"
              : locked
              ? "text-zinc-600 cursor-not-allowed"
              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200 cursor-pointer"
          } ${isInert ? "opacity-50 cursor-default" : ""}`}
        >
          <span className={`text-base w-5 text-center flex-shrink-0 ${locked ? "opacity-40" : ""}`}>{icon}</span>
          <span className="flex-1 truncate">{label}</span>
          {comingSoon && (
            <span className="text-[9px] rounded bg-white/10 px-1.5 py-0.5 text-zinc-500 flex-shrink-0">Soon</span>
          )}
          {disabled && !comingSoon && !locked && (
            <span className="text-[9px] rounded bg-amber-900/30 border border-amber-500/20 px-1.5 py-0.5 text-amber-600 flex-shrink-0">
              No project
            </span>
          )}
          {locked && (
            <span className="text-[9px] rounded bg-amber-900/30 border border-amber-500/20 px-1.5 py-0.5 text-amber-600/80 flex-shrink-0">
              🔒
            </span>
          )}
        </button>

        {/* Info ⓘ button */}
        {tip && (
          <button
            type="button"
            onClick={() => setTipOpen((o) => !o)}
            className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
              tipOpen
                ? "bg-indigo-600/30 border border-indigo-500/30 text-indigo-300"
                : "bg-white/8 border border-white/10 text-zinc-600 hover:bg-indigo-600/20 hover:border-indigo-500/20 hover:text-indigo-300"
            }`}
            title={`About ${label}`}
          >
            i
          </button>
        )}
      </div>

      {/* Locked flash message */}
      {showLockedFlash && (
        <div className="mx-1 mt-1 mb-1 px-3 py-2 rounded-xl bg-amber-900/20 border border-amber-500/20 animate-fade-in">
          <p className="text-[10px] text-amber-400 leading-relaxed">
            Assets are still generating. This will be available when complete.
          </p>
        </div>
      )}

      {/* Expandable tip */}
      {tipOpen && tip && (
        <div className="mx-1 mt-1 mb-1 px-3 py-2.5 rounded-xl bg-[#1a1730] border border-indigo-500/15 animate-fade-in">
          <p className="text-[10px] font-semibold text-indigo-300/80 mb-1">{label}</p>
          <p className="text-[10px] text-zinc-400 leading-relaxed">{tip}</p>
        </div>
      )}
    </div>
  );
}

function SidebarDivider({ label }: { label: string }) {
  return (
    <div className="px-5 pt-5 pb-1.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-600">{label}</p>
    </div>
  );
}

function HistoryItem({ project, onRestore, onDelete }: {
  project: SavedProject;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const thumbnail = project.assets.find((a) => a.imageUrl)?.imageUrl;

  return (
    <div className="group flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-white/5 transition-colors">
      {/* Thumbnail */}
      <button
        onClick={onRestore}
        className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-800/80 border border-white/10 flex-shrink-0 hover:border-indigo-500/40 transition-colors"
        title={`Open ${project.gameName}`}
      >
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt={project.gameName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-base">🎰</div>
        )}
      </button>

      {/* Info */}
      <button onClick={onRestore} className="flex-1 min-w-0 text-left">
        <p className="text-xs font-medium text-zinc-300 truncate leading-tight">{project.gameName}</p>
        <p className="text-[10px] text-zinc-600 mt-0.5">{formatDate(project.savedAt)}</p>
      </button>

      {/* Delete */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-all flex-shrink-0"
        title="Delete project"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Home Dashboard
// ---------------------------------------------------------------------------

function HomeView({
  onCreateProject,
  selectedModel,
  providerStatus,
  quotaState,
  subscribedModels,
  onSubscribeModel,
  onUnsubscribeModel,
  syncTick,
}: {
  onCreateProject: () => void;
  selectedModel: ImageModel;
  providerStatus: ProviderStatus | null;
  quotaState: QuotaState;
  subscribedModels: Set<ImageModel>;
  onSubscribeModel: (m: ImageModel) => void;
  onUnsubscribeModel: (m: ImageModel) => void;
  syncTick: number;
}) {
  return (
    <div className="px-10 py-10 max-w-6xl mx-auto w-full animate-fade-in">
      <div className="flex items-start justify-between mb-10 gap-5">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Get Started</span>{" "}
            <span className="text-white">Here</span>
          </h1>
          <p className="text-zinc-400 text-base mt-3 max-w-xl leading-relaxed">
            Build production-ready 2D slot game assets — symbols, backgrounds, UI, FX, animations, and a full slot machine preview.
          </p>
        </div>
        <button
          onClick={onCreateProject}
          className="flex-shrink-0 flex items-center gap-2 rounded-xl bg-[image:linear-gradient(to_right,var(--accent-from),var(--accent-to))] hover:opacity-90 px-6 py-3.5 text-base font-bold transition-all shadow-lg shadow-indigo-900/40"
        >
          ✦ Create New Project
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {FEATURE_CARDS.map((card) => (
          <FeatureCard key={card.id} card={card} onCreateProject={onCreateProject} />
        ))}
      </div>

      <div className="border-t border-white/[0.07] pt-10 mb-10">
        <h2 className="text-xl font-extrabold mb-5 tracking-tight">
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">AI Models</span>{" "}
          <span className="text-white">Available</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {MODEL_OPTIONS.map((m) => {
            const isActive = m.value === selectedModel;
            const status = modelStatusOf(m, providerStatus, quotaState);
            const exhausted = status === "quota_exhausted";
            const subscribed = subscribedModels.has(m.value);
            return (
              <div
                key={m.value}
                className={`flex flex-col gap-2.5 rounded-xl px-4 py-3.5 transition-all ${
                  exhausted
                    ? "bg-rose-900/15 border border-rose-500/40 shadow-[0_0_0_1px_rgba(244,63,94,0.25)]"
                    : subscribed
                    ? "bg-gradient-to-br from-cyan-900/20 to-teal-900/15 border border-cyan-400/40 shadow-[0_0_0_1px_rgba(34,211,238,0.3),0_0_24px_-8px_rgba(34,211,238,0.4)]"
                    : isActive
                    ? "bg-indigo-600/15 border border-indigo-500/40 shadow-[0_0_0_1px_rgba(99,102,241,0.25)]"
                    : "bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    key={syncTick}
                    style={{ animation: "var(--animate-sync-blink)" }}
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${
                      exhausted ? "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)] animate-pulse"
                      : subscribed ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
                      : isActive ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]"
                      : "bg-indigo-400"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-sm font-semibold ${exhausted ? "text-rose-100" : subscribed ? "text-cyan-50" : "text-zinc-100"}`}>{m.label}</span>
                      {m.badge && <span className="text-[10px] rounded-full bg-indigo-600/20 border border-indigo-500/20 px-2 py-0.5 text-indigo-400">{m.badge}</span>}
                      {m.kind === "animation" && (
                        <span className="text-[10px] rounded-full bg-purple-600/20 border border-purple-500/30 px-2 py-0.5 text-purple-300 font-bold">
                          🎬 Animation
                        </span>
                      )}
                      <PriceBadge tier={m.tier} />
                      <ActivationBadge status={status} />
                      <SubscribedBadge show={subscribed} onUnsubscribe={() => onUnsubscribeModel(m.value)} />
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">{m.provider}</div>
                    <div className={`text-xs mt-1 font-semibold tabular-nums ${exhausted ? "text-rose-300/80 line-through" : "text-emerald-400/90"}`}>{m.pricing}</div>
                    {m.note && <div className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{m.note}</div>}
                  </div>
                  {isActive && (
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 flex-shrink-0">
                      <CheckSmIcon />
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onSubscribeModel(m.value)}
                  className={`w-full inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 text-xs font-bold text-white shadow-md transition-all ${
                    exhausted
                      ? "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-900/40 ring-1 ring-rose-300/40"
                      : subscribed
                      ? "bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 shadow-cyan-900/40 ring-1 ring-cyan-300/40"
                      : "bg-[image:linear-gradient(to_right,var(--accent-from),var(--accent-to))] hover:opacity-90 shadow-indigo-900/30"
                  }`}
                  title={`Open ${providerDisplayName(m.providerKey)} billing in a new tab and set ${m.label} as your default model`}
                >
                  {exhausted
                    ? `Top up — Quota exhausted · ${providerDisplayName(m.providerKey)} ↗`
                    : subscribed
                    ? `Subscribed ✓ · Manage · ${providerDisplayName(m.providerKey)} ↗`
                    : isActive
                    ? `Selected — Top up · ${providerDisplayName(m.providerKey)} ↗`
                    : `Subscribe · ${providerDisplayName(m.providerKey)} ↗`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-indigo-900/10 border border-indigo-500/15 p-6 flex items-start gap-5">
        <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-2xl flex-shrink-0">💡</div>
        <div>
          <p className="text-base font-bold text-white mb-1.5">Pro Tip — Use AI Assist</p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Only Game Title and Theme are required. Click{" "}
            <span className="text-indigo-300 font-semibold">✦ Fill All</span> to let AI complete the entire brief from just those two fields.
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ card, onCreateProject }: { card: (typeof FEATURE_CARDS)[0]; onCreateProject: () => void }) {
  return (
    <div
      onClick={card.cta ? onCreateProject : undefined}
      className={`group flex rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all ${card.cta ? "cursor-pointer" : ""}`}
    >
      <div className={`w-[128px] flex-shrink-0 bg-gradient-to-br ${card.gradient} flex items-center justify-center text-5xl p-5`}>
        <span className="drop-shadow-lg transition-transform duration-300 group-hover:scale-110">{card.icon}</span>
      </div>
      <div className="p-5 flex flex-col justify-center min-w-0">
        <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-indigo-300 transition-colors truncate">{card.title}</h3>
        <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2">{card.desc}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading State
// ---------------------------------------------------------------------------

function LoadingState() {
  const [stepIdx, setStepIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStepIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1)), 1800);
    return () => clearInterval(id);
  }, []);
  const current = LOADING_STEPS[stepIdx];
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-5 py-10">
        <svg className="animate-spin w-9 h-9 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <div className="text-center">
          <p className="text-base font-semibold">{current.msg}</p>
          <p className="text-sm text-zinc-500 mt-0.5">{current.sub}</p>
        </div>
        <div className="flex gap-2">
          {LOADING_STEPS.map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${i <= stepIdx ? "bg-indigo-500" : "bg-white/15"}`} />
          ))}
        </div>
      </div>
      <SkeletonStyleDNA />
      <SkeletonGrid />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results View
// ---------------------------------------------------------------------------

function ResultsView({
  result, assets, regeneratingIds, regenError,
  isDownloading, downloadDone, isSaved, isGenerating, pendingAutoSave,
  onDismissRegenError, onToggleSelect, onSelectAll,
  onRegenerate, onEditAsset, onDownload, onSave, onReset,
}: {
  result: GenerateResponse;
  assets: Asset[];
  regeneratingIds: string[];
  regenError: string | null;
  isDownloading: boolean;
  downloadDone: boolean;
  isSaved: boolean;
  isGenerating: boolean;
  pendingAutoSave: boolean;
  onDismissRegenError: () => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[], value: boolean) => void;
  onRegenerate: (id: string) => void;
  onEditAsset: (id: string, instruction: string) => void;
  onDownload: () => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const selectedCount = assets.filter((a) => a.selected).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{result.styleDNA.theme}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {assets.length} assets generated · {selectedCount} selected
            {regeneratingIds.length > 0 && <span className="ml-2 text-indigo-400">· regenerating {regeneratingIds.length}…</span>}
          </p>
        </div>
      </div>

      {regenError && (
        <div className="rounded-xl bg-red-900/30 border border-red-700/50 px-4 py-3 text-sm text-red-400 flex items-center justify-between gap-3">
          <span>⚠ {regenError}</span>
          <button onClick={onDismissRegenError} className="text-red-500 hover:text-red-300 text-xs">Dismiss</button>
        </div>
      )}

      <StyleDNACard dna={result.styleDNA} />
      <AssetGrid assets={assets} regeneratingIds={regeneratingIds} onToggleSelect={onToggleSelect} onSelectAll={onSelectAll} onRegenerate={onRegenerate} onEditAsset={onEditAsset} />

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-3">
        <p className="text-xs text-zinc-500 flex-1">
          {selectedCount === 0 ? "Select assets to download" : selectedCount === 1 ? "1 asset — downloads as PNG" : `${selectedCount} assets — downloads as ZIP`}
        </p>

        {/* Save Project */}
        <button
          onClick={onSave}
          title={pendingAutoSave ? "Will auto-save when generation completes" : undefined}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all border ${
            isSaved
              ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-300"
              : pendingAutoSave
              ? "bg-amber-600/15 border-amber-500/25 text-amber-400 cursor-default"
              : "bg-white/5 border-white/15 text-zinc-300 hover:bg-white/10 hover:text-white hover:border-white/25"
          }`}
        >
          {isSaved
            ? <><CheckSmIcon /> Saved!</>
            : pendingAutoSave
            ? <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg> Saving when done…</>
            : isGenerating
            ? <><BookmarkIcon /> Save when done</>
            : <><BookmarkIcon /> Save Project</>}
        </button>

        {/* Download */}
        <button
          onClick={onDownload}
          disabled={selectedCount === 0 || isDownloading}
          className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${
            downloadDone ? "bg-emerald-600 text-white"
            : selectedCount === 0 || isDownloading ? "bg-indigo-600/30 text-indigo-400/60 cursor-not-allowed"
            : "bg-[image:linear-gradient(to_right,var(--accent-from),var(--accent-to))] hover:opacity-90 text-white shadow-lg shadow-indigo-900/30"
          }`}
        >
          {isDownloading ? <><SpinnerSm /> Preparing…</> : downloadDone ? <>✓ Downloaded!</> : <><DownloadIcon /> Download{selectedCount > 0 ? ` (${selectedCount})` : ""}</>}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

// Each provider's billing model differs. OpenAI/Replicate/Imagine Art are
// pay-as-you-go (top up credits). Runway uses subscriptions + credit packs.
function providerDisplayName(p: ProviderKey): string {
  switch (p) {
    case "openai":     return "OpenAI";
    case "replicate":  return "Replicate";
    case "runway":     return "Runway";
    case "imagineart": return "Imagine Art";
    case "free":       return "Free fallback";
  }
}

type ModelStatus = "active" | "needs_key" | "quota_exhausted" | "loading";

function modelStatusOf(
  m: ModelOption,
  providerStatus: ProviderStatus | null,
  quotaState: QuotaState
): ModelStatus {
  if (quotaState[m.providerKey]) return "quota_exhausted";
  if (providerStatus === null) return "loading";
  return providerStatus[m.providerKey]?.configured ? "active" : "needs_key";
}

function providerEnvVar(p: ProviderKey): string {
  switch (p) {
    case "openai":     return "OPENAI_API_KEY";
    case "replicate":  return "REPLICATE_API_TOKEN";
    case "runway":     return "RUNWAY_API_KEY";
    case "imagineart": return "IMAGINEART_API_KEY";
    case "free":       return "—";
  }
}

function subscribeLabel(providerKey: ProviderKey): string {
  switch (providerKey) {
    case "openai":     return "Top up · OpenAI";
    case "replicate":  return "Top up · Replicate";
    case "runway":     return "Subscribe · Runway";
    case "imagineart": return "Top up · Imagine Art";
    case "free":       return "Free — no key";
  }
}

function SubscribedBadge({ show, onUnsubscribe }: { show: boolean; onUnsubscribe?: () => void }) {
  if (!show) return null;
  return (
    <span className="text-[9px] rounded-full bg-cyan-500/25 border border-cyan-300/40 pl-1.5 pr-1 py-0.5 text-cyan-200 flex-shrink-0 font-bold flex items-center gap-1 shadow-[0_0_8px_-2px_rgba(34,211,238,0.6)]">
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Subscribed
      {onUnsubscribe && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onUnsubscribe(); }}
          className="ml-0.5 w-3.5 h-3.5 rounded-full bg-cyan-300/20 hover:bg-rose-400/40 hover:text-white text-cyan-100 flex items-center justify-center text-[8px] font-black transition-colors"
          title="Remove Subscribed marker (in case I clicked Subscribe by mistake)"
          aria-label="Remove Subscribed marker"
        >
          ✕
        </button>
      )}
    </span>
  );
}

function ActivationBadge({ status }: { status: ModelStatus }) {
  if (status === "loading") return null;
  if (status === "active") {
    return (
      <span className="text-[9px] rounded-full bg-emerald-600/20 border border-emerald-500/30 px-1.5 py-0.5 text-emerald-300 flex-shrink-0">
        Active
      </span>
    );
  }
  if (status === "quota_exhausted") {
    return (
      <span className="text-[9px] rounded-full bg-rose-600/30 border border-rose-500/50 px-1.5 py-0.5 text-rose-200 flex-shrink-0 font-bold animate-pulse">
        Quota exhausted
      </span>
    );
  }
  return (
    <span className="text-[9px] rounded-full bg-amber-600/15 border border-amber-500/25 px-1.5 py-0.5 text-amber-300 flex-shrink-0">
      Needs API key
    </span>
  );
}

interface SubscriptionModalProps {
  model: ModelOption;
  providerStatus: ProviderStatus | null;
  isCurrentlySelected: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function SubscriptionModal({
  model, providerStatus, isCurrentlySelected, onConfirm, onCancel,
}: SubscriptionModalProps) {
  const configured = providerStatus?.[model.providerKey]?.configured;
  const status: "active" | "needs_key" | "loading" =
    configured === undefined ? "loading" : configured ? "active" : "needs_key";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl bg-[var(--bg-elevated)] border border-white/15 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-white/10">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/80">
              {isCurrentlySelected ? "Currently Selected" : "Activate Model"}
            </p>
            <h2 className="text-lg font-extrabold text-white mt-1 truncate">{model.label}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs text-zinc-400">{model.provider}</span>
              {model.badge && (
                <span className="text-[9px] rounded-full bg-indigo-600/20 border border-indigo-500/20 px-1.5 py-0.5 text-indigo-400">
                  {model.badge}
                </span>
              )}
              <PriceBadge tier={model.tier} />
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Status row */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              status === "active"
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                : status === "needs_key"
                ? "bg-rose-400"
                : "bg-zinc-500"
            }`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">
              {status === "active" && "Active — ready to generate"}
              {status === "needs_key" && "Activation required"}
              {status === "loading" && "Checking status…"}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
              {status === "active" &&
                `${providerEnvVar(model.providerKey)} is configured. Quota errors may still surface at generation time.`}
              {status === "needs_key" &&
                `${providerEnvVar(model.providerKey)} is missing. Add it to .env.local after topping up below.`}
              {status === "loading" && "Querying server for provider activation…"}
            </p>
          </div>
        </div>

        {/* Pricing card */}
        <div className="px-6 py-4 border-b border-white/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
            Pay-as-you-go pricing
          </p>
          <div className="rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-white tabular-nums">{model.pricing.split(" ")[0]}</span>
            <span className="text-xs text-zinc-400">{model.pricing.split(" ").slice(1).join(" ")}</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
            Billed by {providerDisplayName(model.providerKey)} per generated {model.kind === "animation" ? "clip / second" : "image"}.
            {" "}{model.providerKey === "runway" ? "Runway has plans + credit packs." : "Pay-as-you-go — no recurring subscription."}
          </p>
        </div>

        {/* CTA */}
        <div className="px-6 py-4 flex flex-col gap-2">
          <a
            href={model.billingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[image:linear-gradient(to_right,var(--accent-from),var(--accent-to))] hover:opacity-90 px-5 py-3 text-sm font-bold text-white transition-all shadow-lg shadow-indigo-900/30"
          >
            {status === "needs_key" ? "Subscribe & top up at" : "Top up at"} {providerDisplayName(model.providerKey)} ↗
          </a>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/30 px-4 py-2.5 text-xs font-bold text-emerald-200 transition-colors"
            >
              {isCurrentlySelected ? "Keep selected" : "Use this model"}
            </button>
          </div>
          <p className="text-[10px] text-zinc-600 text-center mt-1 leading-relaxed">
            Subscribing opens the provider&apos;s billing page in a new tab. Once your account has credit and
            the API key is in <code className="text-zinc-400">.env.local</code>, this model will go Active.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Back-to-Dashboard confirmation modal — only rendered while a generation is
// in flight, so a mistaken click on the breadcrumb's back button doesn't
// silently throw away the user's progress. Cancel is the default focus to
// favour the safe outcome.
// ---------------------------------------------------------------------------

function BackConfirmModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Default-focus Cancel + close on Escape
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="back-confirm-title"
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl bg-[var(--bg-elevated)] border border-amber-500/30 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with warning icon */}
        <div className="flex items-start gap-4 px-6 pt-6 pb-4 border-b border-white/10">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl flex-shrink-0">
            ⚠️
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300/80">Confirm</p>
            <h2 id="back-confirm-title" className="text-lg font-extrabold text-white mt-1">
              Generation in progress
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 border-b border-white/10">
          <p className="text-sm text-zinc-300 leading-relaxed">
            Going back to the Dashboard will{" "}
            <span className="font-semibold text-amber-300">cancel the current generation</span>.
            Any partially-generated assets will be discarded and the AI calls already in flight will be aborted.
          </p>
          <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
            If you didn&apos;t mean to navigate away, choose Cancel and the generation will continue.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 px-4 py-2.5 text-sm font-bold text-zinc-100 transition-colors"
          >
            Cancel · Continue generation
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/40 px-4 py-2.5 text-sm font-bold text-rose-200 transition-colors"
          >
            Yes, cancel & go back
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SubscribeConfirmModal — fires after the user clicks Subscribe and we open
// the provider's billing page. We can't observe what they do over there, so
// we ask them to tell us whether they completed the transaction. Until they
// do, the model stays UN-subscribed and the active selection is unchanged.
// ---------------------------------------------------------------------------

function SubscribeConfirmModal({
  model, providerStatus, onYes, onNo, onLater,
}: {
  model: ModelOption;
  providerStatus: ProviderStatus | null;
  onYes: () => void;
  onNo: () => void;
  onLater: () => void;
}) {
  const laterRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    laterRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onLater(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onLater]);

  // "Yes, I subscribed" can only be confirmed once the dev has actually added
  // the API key to .env.local — otherwise the model would be marked Subscribed
  // while still unable to make calls (contradictory state).
  const keyConfigured = providerStatus?.[model.providerKey]?.configured === true;
  const envVar = providerEnvVar(model.providerKey);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onLater}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl bg-[var(--bg-elevated)] border border-cyan-500/30 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-6 pb-4 border-b border-white/10">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-2xl flex-shrink-0">
            🔗
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300/80">Confirm subscription</p>
            <h2 className="text-lg font-extrabold text-white mt-1">
              Did you complete the subscription?
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {model.label} · {providerDisplayName(model.providerKey)}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 border-b border-white/10">
          <p className="text-sm text-zinc-300 leading-relaxed">
            We opened <span className="font-semibold text-cyan-300">{providerDisplayName(model.providerKey)}</span>{" "}
            in a new tab. Once you finish topping up or signing up, come back and let us know — we&apos;ll mark{" "}
            <span className="font-semibold">{model.label}</span> as subscribed and set it as your default model.
          </p>
          <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
            If you cancelled the transaction, choose{" "}
            <span className="font-semibold text-zinc-300">No, I cancelled</span> and nothing will change.
          </p>

          {/* API key gate — only marked Subscribed when the server has the key */}
          {!keyConfigured && (
            <div className="mt-4 rounded-xl bg-amber-900/20 border border-amber-500/30 px-4 py-3">
              <p className="text-xs font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                <span>⚠️</span> One more step before we can mark this Subscribed
              </p>
              <p className="text-xs text-amber-100/80 leading-relaxed">
                The server doesn&apos;t have <code className="text-amber-200 font-mono bg-black/30 px-1 rounded">{envVar}</code> yet.
                Add your new API key to <code className="text-amber-200 font-mono bg-black/30 px-1 rounded">.env.local</code> and restart the dev server,
                then click Subscribe again to confirm.
              </p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="px-6 py-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={keyConfigured ? onYes : undefined}
            disabled={!keyConfigured}
            title={keyConfigured ? "Mark as Subscribed and set as default" : `Add ${envVar} to .env.local first`}
            className={`w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-md transition-all ${
              keyConfigured
                ? "bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 shadow-cyan-900/30 ring-1 ring-cyan-300/30 cursor-pointer"
                : "bg-zinc-700/50 cursor-not-allowed opacity-60"
            }`}
          >
            {keyConfigured ? "✓ Yes, I subscribed" : `✓ Yes, I subscribed (waiting for ${envVar})`}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onNo}
              className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition-colors"
            >
              No, I cancelled
            </button>
            <button
              ref={laterRef}
              type="button"
              onClick={onLater}
              className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition-colors"
            >
              Decide later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceBadge({ tier }: { tier: ModelTier }) {
  if (tier === "free-tier") {
    return (
      <span className="text-[9px] rounded-full bg-emerald-600/20 border border-emerald-500/25 px-1.5 py-0.5 text-emerald-300 flex-shrink-0">
        Free tier
      </span>
    );
  }
  return (
    <span className="text-[9px] rounded-full bg-amber-600/15 border border-amber-500/20 px-1.5 py-0.5 text-amber-300/90 flex-shrink-0">
      Paid
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function CheckSmIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function SpinnerSm() {
  return (
    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}
