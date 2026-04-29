"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import ProjectFormComponent from "@/app/components/ProjectForm";
import StyleDNACard from "@/app/components/StyleDNACard";
import AssetGrid from "@/app/components/AssetGrid";
import { SkeletonStyleDNA, SkeletonGrid } from "@/app/components/SkeletonGrid";
import { downloadSelectedAssets } from "@/app/lib/downloadAssets";
import { loadProjects, saveProject, deleteProject } from "@/app/lib/projectStorage";
import { assetCacheUrl } from "@/app/lib/assetCache";
import SlotMachinePreview from "@/app/components/SlotMachinePreview";
import SlotVideoPreview from "@/app/components/SlotVideoPreview";
import ApiKeysPanel from "@/app/components/ApiKeysPanel";
import RoleStatusStrip from "@/app/components/RoleStatusStrip";
import RoleSelectorModal from "@/app/components/RoleSelectorModal";
import CollapsibleSection from "@/app/components/CollapsibleSection";
import ModelSearch from "@/app/components/ModelSearch";
import ModelCompatibilityModal from "@/app/components/ModelCompatibilityModal";
import TrendingAIBanner from "@/app/components/TrendingAIBanner";
import { useToasts } from "@/app/components/ToastCenter";
import { useModelHealth } from "@/app/components/useModelHealth";
import UsagePanel from "@/app/components/UsagePanel";
import { type ModelHealth } from "@/app/lib/modelHealth";
import type { AIRole } from "@/app/lib/aiRoles";
import type { CatalogueEntry } from "@/app/lib/aiCatalogue";
import { AI_CATALOGUE } from "@/app/lib/aiCatalogue";
import {
  addModel as addUserModel,
  getAddedIds,
  removeModel as removeUserModel,
  getRemovedBuiltInIds,
  markBuiltInRemoved,
  unmarkBuiltInRemoved,
} from "@/app/lib/userModels";
import RemoveModelConfirmModal from "@/app/components/RemoveModelConfirmModal";
import GenerationAlertModal, { type GenerationAlertCode } from "@/app/components/GenerationAlertModal";
import type { ProjectForm, GenerateResponse, Asset, ImageModel, SavedProject, SlotType, StyleDNA } from "@/app/types";
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

// ── Verified billing destinations (researched 2026-04-29) ──────────────────
// Each URL was checked to confirm it lands on the *exact* page where a
// superadmin can pay AND get an API key — never a marketing or consumer page.
// If any of these stops working, update the BILLING_DESTINATIONS map below
// so the verification metadata stays in sync.
const OPENAI_BILLING     = "https://platform.openai.com/settings/organization/billing/overview";
const REPLICATE_BILLING  = "https://replicate.com/account/billing";
const RUNWAY_BILLING     = "https://dev.runwayml.com/";
const IMAGINEART_BILLING = "https://platform.imagine.art/";
const POLLINATIONS_INFO  = "https://pollinations.ai";

// Per-provider destination metadata used by the Subscribe-confirm preview.
// description = one-line preview shown to the user BEFORE the tab opens, so
// they know what they'll see (avoids the runwayml.com → dev.runwayml.com
// confusion the superadmin hit on 2026-04-28).
const BILLING_DESTINATIONS: Record<ProviderKey, { url: string; description: string; verifiedAt: string }> = {
  openai: {
    url: OPENAI_BILLING,
    description: "OpenAI billing overview — log in, add a payment method or top up credits, then create an API key from /api-keys.",
    verifiedAt: "2026-04-29",
  },
  replicate: {
    url: REPLICATE_BILLING,
    description: "Replicate billing — pay-as-you-go credits. After adding a card, copy the API token from /account/api-tokens.",
    verifiedAt: "2026-04-29",
  },
  runway: {
    url: RUNWAY_BILLING,
    description: "Runway DEVELOPER portal (dev.runwayml.com) — sign up for API access, buy credits, generate API key. NOT the consumer Gen-3 web app.",
    verifiedAt: "2026-04-29",
  },
  imagineart: {
    url: IMAGINEART_BILLING,
    description: "Imagine Art / Vyro AI developer platform — log in, get 1500 free credits on signup, then upgrade for paid tier and get your vk- API key.",
    verifiedAt: "2026-04-29",
  },
  free: {
    url: POLLINATIONS_INFO,
    description: "Pollinations is community-funded and free — no payment or API key required. Donate at pollinations.ai if you want to support them.",
    verifiedAt: "2026-04-29",
  },
};

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
type RoleHealthMap = Record<"prompt" | "image" | "animation", import("@/app/lib/aiRoles").RoleHealth>;
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
// Helpers — surface server error reasons to the user with friendly phrasing
// ---------------------------------------------------------------------------

function classifyMessage(msg: string): GenerationAlertCode {
  const m = (msg || "").toLowerCase();
  if (m.includes("insufficient_quota") || m.includes("quota") || m.includes("billing")) return "quota_exhausted";
  if (m.includes("401") || m.includes("403") || (m.includes("invalid") && m.includes("api"))) return "auth_failed";
  if (m.includes("429") || m.includes("rate")) return "rate_limited";
  if (m.includes("fetch") || m.includes("network") || m.includes("timeout")) return "network_error";
  return "other_failure";
}

function shortReason(msg: string, code: string): string {
  if (code === "quota_exhausted") return "Out of credits — top up to continue.";
  if (code === "auth_failed")     return "API key rejected — check your key.";
  if (code === "rate_limited")    return "Rate-limited — provider is throttling us.";
  if (code === "network_error")   return "Network error reaching the provider.";
  return (msg || "Image failed").replace(/^.*?: /, "").slice(0, 120);
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ProjectPage() {
  const toasts = useToasts();
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
  // Three role selections — prompt assistant (text), image generation, and
  // animation generation. Each persists to localStorage.
  const [selectedModel, setSelectedModelRaw]                   = useState<ImageModel>("gpt-image-1");
  const [selectedAnimationModel, setSelectedAnimationModelRaw] = useState<ImageModel>("runway-gen3");
  const [selectedPromptModel, setSelectedPromptModelRaw]       = useState<string>("gpt-4o-mini");
  const [modelOpen, setModelOpen]         = useState(false);
  const [pendingModel, setPendingModel]   = useState<ImageModel | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [roleHealth, setRoleHealth]         = useState<RoleHealthMap | null>(null);
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
  const [swapRole, setSwapRole]           = useState<AIRole | null>(null);
  const [pickedCatalogueEntry, setPickedCatalogueEntry] = useState<CatalogueEntry | null>(null);
  const [userAddedIds, setUserAddedIds]               = useState<string[]>([]);
  const [removedBuiltInIds, setRemovedBuiltInIds]     = useState<string[]>([]);
  const [showHiddenBuiltIns, setShowHiddenBuiltIns]   = useState(false);
  const [pendingRemove, setPendingRemove]             = useState<ModelOption | null>(null);
  const [usageOpen, setUsageOpen]                     = useState(false);
  const [genAlert, setGenAlert]                       = useState<null | {
    code: GenerationAlertCode;
    reason: string;
    completed: number;
    failed: number;
    total: number;
    formAtFailure: ProjectForm;
    modelAtFailure: string;
  }>(null);
  const retriedOnceRef = useRef(false);
  const stallTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fillAllToastIdRef = useRef<string | null>(null);

  // Hydrate user-added + removed-built-in ids on mount
  useEffect(() => {
    setUserAddedIds(getAddedIds());
    setRemovedBuiltInIds(getRemovedBuiltInIds());
  }, []);

  // Adapter: turn a catalogue entry into the ModelOption shape the picker
  // expects. Used to merge user-added catalogue entries into the effective
  // model list rendered in the home dashboard cards + sidebar dropdown.
  const catalogueToModelOption = useCallback((id: string): ModelOption | null => {
    const entry = AI_CATALOGUE.find((e) => e.id === id);
    if (!entry) return null;
    return {
      value: entry.id as ImageModel,           // string id; not in the typed ImageModel union
      label: entry.label,
      badge: entry.badge,
      provider: entry.provider,
      providerKey: (entry.providerKey === "anthropic" || entry.providerKey === "google" || entry.providerKey === "deepseek" || entry.providerKey === "mistral" || entry.providerKey === "midjourney" || entry.providerKey === "adobe" || entry.providerKey === "luma" || entry.providerKey === "pika" || entry.providerKey === "stability")
        ? "openai"                              // unknown providerKey → coerce to "openai" so existing UI rendering paths don't break (status reads use it for display only; preview entries don't actually generate)
        : (entry.providerKey ?? "openai") as ProviderKey,
      billingUrl: entry.billingUrl,
      note: entry.description,
      tier: entry.pricing.toLowerCase().includes("free") ? "free-tier" : "paid",
      pricing: entry.pricing,
      kind: entry.role === "animation" ? "animation" : "image",
    };
  }, []);

  // Raw merged list (built-ins minus hidden + user-added) — no health sorting yet.
  // This feeds the health hook; sorting happens in effectiveModelOptions below.
  const rawModelOptions = useMemo<ModelOption[]>(() => {
    const removed   = new Set(removedBuiltInIds);
    const builtInsVisible = MODEL_OPTIONS.filter((m) => showHiddenBuiltIns || !removed.has(m.value));
    const adds = userAddedIds
      .map((id) => catalogueToModelOption(id))
      .filter((m): m is ModelOption => m !== null);
    const builtInValues = new Set(MODEL_OPTIONS.map((m) => m.value));
    return [...builtInsVisible, ...adds.filter((m) => !builtInValues.has(m.value))];
  }, [userAddedIds, removedBuiltInIds, showHiddenBuiltIns, catalogueToModelOption]);

  // ── 30-second AI watchdog ──────────────────────────────────────────────────
  // Polls /api/usage every 30s and computes per-model health, fires toasts on
  // transitions to quota-out or stale so the user knows without watching logs.
  const modelHealthInputs = useMemo(
    () => rawModelOptions.map((m) => ({ value: m.value, providerKey: m.providerKey, kind: m.kind })),
    [rawModelOptions]
  );

  const { modelHealthMap, lastCheckedAt } = useModelHealth({
    models: modelHealthInputs,
    selectedImageModel: selectedModel,
    selectedAnimationModel,
    subscribedModels,
    providerStatus,
    catalogue: AI_CATALOGUE,
    enabled: true,
    onTransition: (modelId, _from, to) => {
      const opt = rawModelOptions.find((m) => m.value === modelId);
      if (to.status === "quota-out") {
        toasts.push({
          kind: "error",
          key: `health:quota:${modelId}`,
          title: `${opt?.label ?? modelId} — Quota out`,
          body: to.reason,
          action: opt?.billingUrl ? { label: "Top up ↗", href: opt.billingUrl } : undefined,
        });
      } else if (to.status === "stale") {
        toasts.push({
          kind: "info",
          key: `health:stale:${modelId}`,
          title: `${opt?.label ?? modelId} — Suggested for removal`,
          body: to.reason,
        });
      }
    },
  });

  // Sorted effective model list — healthy models appear first (lower priority value).
  const effectiveModelOptions = useMemo<ModelOption[]>(
    () => [...rawModelOptions].sort((a, b) => (modelHealthMap[a.value]?.priority ?? 50) - (modelHealthMap[b.value]?.priority ?? 50)),
    [rawModelOptions, modelHealthMap]
  );

  // Helper: is a given model.value a user-added catalogue entry (×-removable)?
  const isUserAddedModel = useCallback((value: ImageModel) => userAddedIds.includes(value as string), [userAddedIds]);

  // Helper: is this model currently hidden (built-in marked removed)?
  const isHiddenBuiltIn   = useCallback((value: ImageModel) => removedBuiltInIds.includes(value as string), [removedBuiltInIds]);

  // Open the confirm modal for ANY model (built-in or user-added).
  const handleRequestRemoveModel = useCallback((m: ModelOption) => {
    setPendingRemove(m);
  }, []);

  // Confirm modal callback: actually perform removal.
  const handleConfirmRemove = useCallback(async (m: ModelOption, alsoRemoveKey: boolean) => {
    const isBuiltIn = MODEL_OPTIONS.some((b) => b.value === m.value);
    if (isBuiltIn) {
      setRemovedBuiltInIds(markBuiltInRemoved(m.value as string));
    } else {
      setUserAddedIds(removeUserModel(m.value as string));
    }
    if (alsoRemoveKey && m.providerKey !== "free") {
      try {
        await fetch(`/api/api-keys/${m.providerKey}`, { method: "DELETE" });
      } catch (err) {
        console.warn("[remove-model] DELETE api-keys failed:", err);
      }
      // Refresh provider status (resolved at call time, not hook creation,
      // to avoid the TDZ — refreshProviderStatus is declared further below).
      // We dispatch to a ref so we don't have to list it in deps.
      refreshStatusRef.current?.();
    }
    toasts.push({
      kind: "info",
      key: `removed:${m.value}`,
      title: isBuiltIn ? `${m.label} hidden` : `${m.label} removed`,
      body: isBuiltIn
        ? `Toggle "Show hidden" to bring it back.${alsoRemoveKey ? " API key also cleared." : ""}`
        : `Search to re-add anytime.${alsoRemoveKey ? " API key also cleared." : ""}`,
    });
    setPendingRemove(null);
  }, [toasts]);

  // Un-hide a built-in that was previously marked removed (used by Show-hidden toggle).
  const handleUnhideBuiltIn = useCallback((value: ImageModel) => {
    setRemovedBuiltInIds(unmarkBuiltInRemoved(value as string));
  }, []);

  // Kind-aware model setter: picks the right slot (image vs animation) by
  // looking at the model's `kind` in MODEL_OPTIONS. Existing call sites that
  // invoke `setSelectedModel(value)` continue to work — they just route to
  // the correct slot now. Persists both selections to localStorage.
  const setSelectedModel = useCallback((value: ImageModel) => {
    const opt = MODEL_OPTIONS.find((m) => m.value === value);
    if (!opt) return;
    if (opt.kind === "animation") {
      setSelectedAnimationModelRaw(value);
      try { localStorage.setItem("slotforge.selectedAnimationModel", value); } catch {}
    } else {
      setSelectedModelRaw(value);
      try { localStorage.setItem("slotforge.selectedImageModel", value); } catch {}
    }
  }, []);

  // Hydrate persisted selections on mount
  useEffect(() => {
    try {
      const im = localStorage.getItem("slotforge.selectedImageModel") as ImageModel | null;
      const am = localStorage.getItem("slotforge.selectedAnimationModel") as ImageModel | null;
      const pm = localStorage.getItem("slotforge.selectedPromptModel");
      if (im && MODEL_OPTIONS.some((m) => m.value === im && m.kind !== "animation")) {
        setSelectedModelRaw(im);
      }
      if (am && MODEL_OPTIONS.some((m) => m.value === am && m.kind === "animation")) {
        setSelectedAnimationModelRaw(am);
      }
      if (pm) setSelectedPromptModelRaw(pm);
    } catch { /* ignore */ }
  }, []);

  // Setter for the prompt model — wraps localStorage persist + toast
  const setSelectedPromptModel = useCallback((apiModel: string) => {
    setSelectedPromptModelRaw(apiModel);
    try { localStorage.setItem("slotforge.selectedPromptModel", apiModel); } catch {}
  }, []);

  // AbortController for the in-flight SSE generation request
  const abortRef = useRef<AbortController | null>(null);

  // Stable id used for the auto-save record during streaming. Set in
  // handleSubmit when generation starts; reused for every incremental save
  // so we always overwrite the same project entry instead of creating Ns.
  const inFlightProjectIdRef = useRef<string | null>(null);

  // Forward-ref to refreshProviderStatus so callbacks defined earlier in
  // the component body can call it without triggering a TDZ.
  const refreshStatusRef = useRef<() => void>(() => {});

  // Computed: true while the SSE stream is open or per-asset regenerations are running
  const isGenerating = step === "loading" || (step === "results" && regeneratingIds.size > 0);

  // Load projects from IndexedDB (async) on mount
  useEffect(() => {
    let cancelled = false;
    void loadProjects().then((projects) => {
      if (!cancelled) setSavedProjects(projects);
    });
    return () => { cancelled = true; };
  }, []);

  // Fetch provider activation status once per session
  const refreshProviderStatus = useCallback(() => {
    fetch("/api/providers/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.providers) setProviderStatus(data.providers as ProviderStatus);
        if (data?.roles)     setRoleHealth(data.roles as RoleHealthMap);
        // Bump the tick counter on every successful poll so the status dots
        // re-mount and run the sync-blink animation, giving the user a live
        // visual cue that the system is checking for subscription / key updates.
        setSyncTick((t) => (t + 1) % 1_000_000);
      })
      .catch(() => { /* non-fatal */ });
  }, []);

  useEffect(() => {
    refreshStatusRef.current = refreshProviderStatus;
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
    // Map provider → billing URL → topup-style sticky toast so the user sees
    // exactly which API failed and where to recharge.
    if (exhausted) {
      const provider = MODEL_OPTIONS.find((m) => m.providerKey === p);
      const role     = p === "openai" ? "Prompt assistant + image generation" : p === "runway" ? "Animation generation" : "Image generation";
      toasts.apiAlert({
        role,
        provider: provider?.provider ?? p,
        reason: "Quota exhausted — top up to continue.",
        billingUrl: provider?.billingUrl,
      });
    } else {
      toasts.clearByKey(`alert:${p}`);
    }
  }, [toasts]);

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
    if (!opt) return;
    const dest = BILLING_DESTINATIONS[opt.providerKey];
    // Transparent disclosure BEFORE opening — toast shows the verified URL +
    // a one-line description so the user doesn't get blindsided by an
    // unexpected page (the dev.runwayml.com vs app.runwayml.com problem).
    toasts.push({
      kind: "info",
      key: `sub-preview:${opt.providerKey}`,
      title: `Opening ${opt.provider} billing…`,
      body: `${dest?.description ?? `Destination: ${opt.billingUrl}`} (verified ${dest?.verifiedAt ?? "n/a"})`,
      action: { label: "Open in new tab", href: opt.billingUrl },
    });
    // Pop a small payment window (popup-style) instead of a full new-tab —
    // gives users the focused "pay then come back" flow they asked for.
    // Most browsers allow popups when triggered by a click handler like this.
    const popup = window.open(opt.billingUrl, `subscribe-${opt.providerKey}`, "noopener,noreferrer,width=1100,height=820,menubar=no,toolbar=no,location=yes,status=no");
    // Some browsers block popups even on click — fall back to plain new tab.
    if (!popup) window.open(opt.billingUrl, "_blank", "noopener,noreferrer");

    if (subscribedModels.has(m)) return;
    setPendingSubConfirm(m);
    setModelOpen(false);
  }, [subscribedModels, toasts]);

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
    void saveProject(project).then((updated) => {
      setSavedProjects(updated);
      setIsSaved(true);
      setPendingAutoSave(false);
      setTimeout(() => setIsSaved(false), 3000);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regeneratingIds.size, pendingAutoSave, step]);

  // (Click-outside handling lives inside Sidebar where the wrapper ref is in scope.)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(async (form: ProjectForm, failoverModel?: string) => {
    // Cancel any previous in-flight generation
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // failoverModel is set by the auto-failover path so the retry uses the
    // new model immediately without waiting for the next render cycle.
    const activeModel = failoverModel ?? selectedModel;
    const imageOpt  = MODEL_OPTIONS.find((m) => m.value === activeModel);
    const animOpt   = MODEL_OPTIONS.find((m) => m.value === selectedAnimationModel);
    toasts.push({
      kind: "info",
      key: "generating-active",
      title: "Generating your slot assets…",
      body: [
        imageOpt  ? `Graphics: ${imageOpt.label} (${imageOpt.provider})`      : null,
        animOpt   ? `Animation: ${animOpt.label} (${animOpt.provider})`        : null,
      ].filter(Boolean).join("  ·  "),
      sticky: true,
    });

    setStep("loading");
    setError(null);
    setGameName(form.gameName);
    setSubmittedForm(form);
    setIsSaved(false);
    setPendingAutoSave(false);

    // Mint a stable id NOW so every incremental auto-save during streaming
    // overwrites the same record instead of creating duplicates.
    inFlightProjectIdRef.current = nanoid();

    // Stall watchdog: every SSE event resets a 75s timer. If silence exceeds
    // that, abort the request and surface a "stalled" alert so the user is
    // never staring at frozen skeletons without explanation.
    const armStall = () => {
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
      stallTimerRef.current = setTimeout(() => {
        abortRef.current?.abort();
        setGenAlert({
          code: "stalled",
          reason: "No progress signal from the provider for 75 seconds.",
          completed: 0, failed: 0, total: 0,
          formAtFailure: form,
          modelAtFailure: activeModel,
        });
      }, 75_000);
    };
    const disarmStall = () => {
      if (stallTimerRef.current) { clearTimeout(stallTimerRef.current); stallTimerRef.current = null; }
    };

    try {
      armStall();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, imageModel: activeModel, slotType, promptModel: selectedPromptModel }),
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

      // Capture styleDNA from the init event so we can include it in every
      // incremental auto-save during streaming.
      let streamStyleDNA: StyleDNA | null = null;

      // Track running counts so we can pass them into the fatal alert
      let counts = { completed: 0, failed: 0, total: 0 };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        armStall(); // any byte resets the watchdog
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const payload = JSON.parse(part.slice(6));

          if (payload.type === "init") {
            streamStyleDNA = payload.styleDNA;
            const initAssets = (payload.assets as Asset[]).map((a) => ({ ...a, transparentBg: a.transparentBg ?? true }));
            counts = { completed: 0, failed: 0, total: initAssets.length };
            setResult({ styleDNA: payload.styleDNA, assets: initAssets });
            setAssets(initAssets);
            setRegenIds(new Set<string>(payload.assets.map((a: Asset) => a.id)));
            setStep("results");
          } else if (payload.type === "asset") {
            counts = { ...counts, completed: counts.completed + 1 };
            setAssets((prev) => {
              const incoming = payload.asset as Asset;
              const existing = prev.find((a) => a.id === incoming.id);
              const merged = { ...incoming, transparentBg: existing?.transparentBg ?? incoming.transparentBg ?? true };
              const updated = prev.map((a) => (a.id === merged.id ? merged : a));
              const pid = inFlightProjectIdRef.current;
              if (pid && streamStyleDNA) {
                const project: SavedProject = {
                  id: pid,
                  gameName: form.gameName,
                  savedAt: new Date().toISOString(),
                  imageModel: selectedModel,
                  styleDNA: streamStyleDNA,
                  assets: updated,
                  form,
                };
                void saveProject(project).then(setSavedProjects);
              }
              return updated;
            });
            setRegenIds((prev) => {
              const next = new Set(prev);
              next.delete(payload.asset.id);
              return next;
            });
          } else if (payload.type === "asset_error") {
            // One asset failed, stream continues. Attach error to the stub so
            // the AssetGrid can render an inline retry.
            counts = { ...counts, failed: counts.failed + 1 };
            const failedId    = payload.id    as string;
            const failedLabel = payload.label as string;
            const message     = payload.message as string;
            const code        = payload.code    as string;
            setAssets((prev) => prev.map((a) =>
              a.id === failedId ? { ...a, error: { message, code } } : a
            ));
            setRegenIds((prev) => {
              const next = new Set(prev);
              next.delete(failedId);
              return next;
            });
            toasts.push({
              kind: "error",
              key: `asset-error-${failedId}`,
              title: `${failedLabel} failed`,
              body: shortReason(message, code),
            });
          } else if (payload.type === "fatal") {
            // Server is bailing — surface the prominent alert. Counts come from
            // server so we trust them over the local running tally.
            counts = {
              completed: payload.completed ?? counts.completed,
              failed:    payload.failed    ?? counts.failed,
              total:     payload.total     ?? counts.total,
            };
            setGenAlert({
              code: payload.code as GenerationAlertCode,
              reason: payload.reason as string,
              completed: counts.completed,
              failed: counts.failed,
              total: counts.total,
              formAtFailure: form,
              modelAtFailure: activeModel,
            });
            // Don't throw — let the stream close naturally so finally cleans up.
          } else if (payload.type === "done") {
            counts = {
              completed: payload.completed ?? counts.completed,
              failed:    payload.failed    ?? counts.failed,
              total:     payload.total     ?? counts.total,
            };
          } else if (payload.type === "error") {
            throw new Error(payload.message);
          }
        }
      }
      retriedOnceRef.current = false;
      toasts.clearByKey("generating-active");
    } catch (err) {
      toasts.clearByKey("generating-active");
      if (err instanceof Error && err.name === "AbortError") {
        // Stall watchdog already opened the alert; nothing else to do.
        return;
      }

      const msg = err instanceof Error ? err.message : "";
      const isQuota = msg.includes("quota") || msg.includes("429") || msg.includes("rate");

      if (isQuota && !retriedOnceRef.current) {
        const nextModel = effectiveModelOptions.find(
          (m) => m.kind === "image" && m.value !== selectedModel && (modelHealthMap[m.value]?.status === "healthy" || m.providerKey === "free")
        );
        if (nextModel) {
          retriedOnceRef.current = true;
          const fromLabel = MODEL_OPTIONS.find((m) => m.value === selectedModel)?.label ?? selectedModel;
          toasts.push({
            kind: "info",
            key: "auto-failover",
            title: `${fromLabel} hit quota — retrying with ${nextModel.label}`,
            body: "Auto-failover: switching to next available model. One moment.",
          });
          setSelectedModelRaw(nextModel.value);
          void handleSubmit(form, nextModel.value);
          return;
        }
      }
      retriedOnceRef.current = false;
      // Show prominent alert on the results page (stay there) instead of
      // silently bouncing back to the form.
      setGenAlert({
        code: classifyMessage(msg),
        reason: msg || "Unknown error",
        completed: 0, failed: 0, total: 0,
        formAtFailure: form,
        modelAtFailure: activeModel,
      });
    } finally {
      disarmStall();
      // Defensive: any stub still in regenIds at this point will never receive
      // an asset event — clear so its skeleton doesn't spin forever.
      setRegenIds(new Set());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel, slotType, effectiveModelOptions, modelHealthMap]);

  // Retry handlers wired into GenerationAlertModal CTAs
  const handleAlertRetrySame = useCallback(() => {
    const ctx = genAlert;
    if (!ctx) return;
    setGenAlert(null);
    void handleSubmit(ctx.formAtFailure, ctx.modelAtFailure);
  }, [genAlert, handleSubmit]);

  const handleAlertRetryFailover = useCallback(() => {
    const ctx = genAlert;
    if (!ctx) return;
    const nextModel = effectiveModelOptions.find(
      (m) => m.kind === "image" && m.value !== ctx.modelAtFailure && (modelHealthMap[m.value]?.status === "healthy" || m.providerKey === "free")
    );
    if (!nextModel) return;
    setGenAlert(null);
    setSelectedModelRaw(nextModel.value);
    void handleSubmit(ctx.formAtFailure, nextModel.value);
  }, [genAlert, effectiveModelOptions, modelHealthMap, handleSubmit]);

  const handleToggleSelect = useCallback((id: string) => {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a)));
  }, []);

  const handleToggleTransparentBg = useCallback((id: string, value: boolean) => {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, transparentBg: value } : a)));
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
    void saveProject(project).then((updated) => {
      setSavedProjects(updated);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    });
  }, [result, submittedForm, gameName, selectedModel, assets, isGenerating]);

  const handleRestoreProject = useCallback((project: SavedProject) => {
    // For any asset whose imageUrl is missing or empty, fall back to the
    // server-cache URL — the <img> tag will fetch the bytes from disk via
    // /api/assets/<projectId>/<assetId>. If neither is present (legacy
    // pre-IndexedDB project), the asset stays empty and the regenerate
    // banner offers re-generation as a last resort.
    const restored = project.assets.map((a) =>
      a.imageUrl
        ? a
        : { ...a, imageUrl: assetCacheUrl(project.id, a.id) }
    );
    setResult({ styleDNA: project.styleDNA, assets: restored });
    setAssets(restored);
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
    void deleteProject(id).then(setSavedProjects);
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
        selectedAnimationModel={selectedAnimationModel}
        roleHealth={roleHealth}
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
        onNewProject={() => { handleReset(); setStep("form"); }}
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
        onSwapRole={setSwapRole}
        userAddedIds={userAddedIds}
        onPickFromSearch={setPickedCatalogueEntry}
        effectiveModelOptions={effectiveModelOptions}
        isUserAdded={isUserAddedModel}
        onRequestRemoveModel={handleRequestRemoveModel}
        modelHealthMap={modelHealthMap}
        onOpenUsage={() => setUsageOpen(true)}
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

      {/* AI Usage Monitor panel — admin only */}
      <UsagePanel open={usageOpen} onClose={() => setUsageOpen(false)} />

      {/* Prominent alert when generation hits a fatal/stalled state */}
      {genAlert && (() => {
        const opt = MODEL_OPTIONS.find((m) => m.value === genAlert.modelAtFailure);
        const failover = effectiveModelOptions.find(
          (m) => m.kind === "image" && m.value !== genAlert.modelAtFailure && (modelHealthMap[m.value]?.status === "healthy" || m.providerKey === "free")
        );
        const billingUrl = opt?.billingUrl;
        return (
          <GenerationAlertModal
            open
            modelLabel={opt?.label ?? genAlert.modelAtFailure}
            providerLabel={opt?.provider ?? "AI provider"}
            code={genAlert.code}
            reason={genAlert.reason}
            completed={genAlert.completed}
            failed={genAlert.failed}
            total={genAlert.total}
            failoverLabel={failover?.label}
            billingUrl={billingUrl}
            onClose={() => setGenAlert(null)}
            onRetrySame={handleAlertRetrySame}
            onRetryFailover={failover ? handleAlertRetryFailover : undefined}
          />
        );
      })()}

      {/* Remove-model confirm modal — fired from any × button (built-in or user-added). */}
      {pendingRemove && (
        <RemoveModelConfirmModal
          modelLabel={pendingRemove.label}
          providerKey={pendingRemove.providerKey}
          providerLabel={pendingRemove.provider}
          isBuiltIn={MODEL_OPTIONS.some((b) => b.value === pendingRemove.value)}
          affectedSiblings={effectiveModelOptions
            .filter((x) => x.providerKey === pendingRemove.providerKey && x.value !== pendingRemove.value)
            .map((x) => x.label)}
          canCleanupKey={pendingRemove.providerKey !== "free"}
          onClose={() => setPendingRemove(null)}
          onConfirm={(alsoKey) => handleConfirmRemove(pendingRemove, alsoKey)}
        />
      )}

      {/* Catalogue compatibility modal — opens when the user picks a model
          from the search dropdown. Shows yes/no/why + add-to-platform CTA. */}
      {pickedCatalogueEntry && (
        <ModelCompatibilityModal
          entry={pickedCatalogueEntry}
          onClose={() => setPickedCatalogueEntry(null)}
          onConfirmAdd={(entry) => {
            const next = addUserModel(entry.id);
            setUserAddedIds(next);
            toasts.push({
              kind: "success",
              title: `${entry.label} added`,
              body: `${entry.provider} · ${entry.role} role. Open the API Keys panel to paste your token, then it'll go live.`,
              action: { label: "Open API Keys", onClick: () => setApiKeysOpen(true) },
            });
          }}
        />
      )}

      {/* Role-swap modal — opens when the user clicks an AI Roles row */}
      {swapRole && (
        <RoleSelectorModal
          role={swapRole}
          activeApiModel={
            swapRole === "prompt"    ? selectedPromptModel
          : swapRole === "image"     ? selectedModel
          :                            selectedAnimationModel
          }
          onClose={() => setSwapRole(null)}
          onPick={(opt) => {
            if (swapRole === "prompt") {
              setSelectedPromptModel(opt.apiModel);
              toasts.poweredBy("Prompt assistant", opt.label, opt.providerLabel);
            } else if (swapRole === "image") {
              setSelectedModel(opt.apiModel as ImageModel);
              toasts.poweredBy("Image generation", opt.label, opt.providerLabel);
            } else {
              setSelectedModel(opt.apiModel as ImageModel);
              toasts.poweredBy("Animation generation", opt.label, opt.providerLabel);
            }
          }}
        />
      )}

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
              onCreateProject={() => { handleReset(); setStep("form"); }}
              selectedModel={selectedModel}
              providerStatus={providerStatus}
              quotaState={quotaState}
              subscribedModels={subscribedModels}
              onSubscribeModel={initiateSubscribe}
              onUnsubscribeModel={unmarkSubscribed}
              syncTick={syncTick}
              userAddedIds={userAddedIds}
              onPickFromSearch={setPickedCatalogueEntry}
              effectiveModelOptions={effectiveModelOptions}
              isUserAdded={isUserAddedModel}
              onRequestRemoveModel={handleRequestRemoveModel}
              showHiddenBuiltIns={showHiddenBuiltIns}
              onToggleShowHidden={() => setShowHiddenBuiltIns((v) => !v)}
              hasHidden={removedBuiltInIds.length > 0}
              modelHealthMap={modelHealthMap}
              lastCheckedAt={lastCheckedAt}
            />
          )}

          {step === "slot_preview" && (
            <SlotVideoPreview gameName={gameName || "SlotForge"} />
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

              {/* Pro Tip moved to TOP of the form (was previously at bottom of HomeView) */}
              <div className="mb-6 rounded-2xl bg-indigo-900/15 border border-indigo-500/25 p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-indigo-600/25 border border-indigo-500/30 flex items-center justify-center text-2xl flex-shrink-0">💡</div>
                <div>
                  <p className="text-sm font-bold text-white mb-1">Pro Tip — Use AI Assist</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Only Game Title and Theme are required. Click{" "}
                    <span className="text-indigo-300 font-semibold">✦ Fill All</span>{" "}
                    once you&apos;ve filled them and AI will complete every other field.
                  </p>
                </div>
              </div>

              <ProjectFormComponent
                onSubmit={handleSubmit}
                isLoading={false}
                slotType={slotType}
                onQuotaExhausted={() => markQuotaExhausted("openai", true)}
                onPoweredBy={toasts.poweredBy}
                onFillAllStart={() => {
                  const id = toasts.push({
                    kind: "info",
                    key: "fill-all-active",
                    title: "AI filling all fields…",
                    body: "Prompt assistant: GPT-4o-mini · OpenAI. Generating suggestions for every empty field.",
                    sticky: true,
                  });
                  fillAllToastIdRef.current = id;
                }}
                onFillAllEnd={() => {
                  if (fillAllToastIdRef.current) {
                    toasts.dismiss(fillAllToastIdRef.current);
                    fillAllToastIdRef.current = null;
                  }
                }}
                promptModel={selectedPromptModel}
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
              {assets.length > 0 && assets.every((a) => !a.imageUrl) && submittedForm && (
                <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-amber-200">
                      Images couldn&apos;t be restored from history
                    </p>
                    <p className="text-xs text-amber-100/80 mt-1 leading-relaxed">
                      This project was saved when storage was on localStorage and the images exceeded the 5MB browser quota — only the form metadata survived. Storage has now been upgraded to IndexedDB so this won&apos;t happen again. Click below to re-generate the images from the saved brief.
                    </p>
                  </div>
                  <button
                    onClick={() => handleSubmit(submittedForm)}
                    className="flex-shrink-0 h-10 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-95 active:scale-[0.99] transition"
                  >
                    Regenerate
                  </button>
                </div>
              )}
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
                onToggleTransparentBg={handleToggleTransparentBg}
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
  selectedAnimationModel: ImageModel;
  roleHealth: RoleHealthMap | null;
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
  onSwapRole: (role: AIRole) => void;
  userAddedIds: string[];
  onPickFromSearch: (entry: CatalogueEntry) => void;
  effectiveModelOptions: ModelOption[];
  isUserAdded: (m: ImageModel) => boolean;
  onRequestRemoveModel: (m: ModelOption) => void;
  modelHealthMap: Record<string, ModelHealth>;
  onOpenUsage: () => void;
}

function Sidebar({
  step, gameName, selectedModel, selectedAnimationModel, roleHealth, modelOpen, savedProjects, hasResults, isGenerating, providerStatus, quotaState, subscribedModels, slotType, onSelectSlotType, theme, onSelectTheme,
  onNewProject, onGoHome, onSlotPreview, onGoResults, onPickModel, onSubscribeModel, onUnsubscribeModel, onModelOpen,
  onRestoreProject, onDeleteProject,
  currentRole, apiKeysOpen, onOpenApiKeys, syncTick, onSwapRole, userAddedIds, onPickFromSearch, effectiveModelOptions, isUserAdded, onRequestRemoveModel, modelHealthMap: _modelHealthMap, onOpenUsage,
}: SidebarProps) {
  const activeImageModel     = MODEL_OPTIONS.find((m) => m.value === selectedModel)!;
  const activeAnimationModel = MODEL_OPTIONS.find((m) => m.value === selectedAnimationModel)!;

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
        <div className="px-2.5 pb-2 flex flex-col gap-1">
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
          {(currentRole === "ADMIN" || currentRole === "SUPER_ADMIN") && (
            <NavItem
              icon="📊" label="AI Usage Monitor" active={false}
              onClick={onOpenUsage}
              tip="Per-provider call outcome stats — success/failure counts, last event timestamps, traffic-light health. Admin only."
            />
          )}
        </div>

        {/* ── Collapsible settings panels ───────────────────────────────────
            Inside the scrollable region so they're always reachable regardless
            of screen height. Sections fold by default; state persists in localStorage. */}
        <div className="mt-2">
          <CollapsibleSection id="ai-roles" title="AI Roles" icon="🧭" badgeCount={3}>
            <div className="px-4 pt-1">
              <RoleStatusStrip roles={roleHealth} syncTick={syncTick} onOpenApiKeys={onOpenApiKeys} onSwapRole={onSwapRole} />
            </div>
          </CollapsibleSection>

          <CollapsibleSection id="active-models" title="Active AI Models" icon="🤖" badgeCount={2}>
            <div className="px-4 pt-1 space-y-2">
              <ModelSearch addedIds={userAddedIds} onPick={onPickFromSearch} />
              <div ref={modelWrapperRef} className="relative space-y-2">
                <ActiveModelChip
                  role="image"
                  roleLabel="Image"
                  roleIcon="🖼️"
                  model={activeImageModel}
                  providerStatus={providerStatus}
                  quotaState={quotaState}
                  isSubscribed={subscribedModels.has(selectedModel)}
                  onClick={() => onModelOpen(!modelOpen)}
                  syncTick={syncTick}
                />
                <ActiveModelChip
                  role="animation"
                  roleLabel="Animation"
                  roleIcon="🎬"
                  model={activeAnimationModel}
                  providerStatus={providerStatus}
                  quotaState={quotaState}
                  isSubscribed={subscribedModels.has(selectedAnimationModel)}
                  onClick={() => onModelOpen(!modelOpen)}
                  syncTick={syncTick}
                />

                {modelOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl bg-[var(--bg-elevated)] border border-white/15 shadow-2xl overflow-hidden z-50 max-h-[55vh] overflow-y-auto">
                    <div className="px-3 py-2 border-b border-white/10 sticky top-0 bg-[var(--bg-elevated)] z-10">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Pick a model — applies to its role</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">Image picks update the image slot. Animation picks update the animation slot.</p>
                    </div>
                    <ModelGroup label="Image generation" icon="🖼️">
                      {effectiveModelOptions.filter((m) => m.kind === "image").map((m) => (
                        <ModelDropdownRow key={m.value} model={m} isActive={m.value === selectedModel} activeRoleLabel="Active for image" providerStatus={providerStatus} quotaState={quotaState} isSubscribed={subscribedModels.has(m.value)} onPick={onPickModel} onSubscribe={onSubscribeModel} onUnsubscribe={onUnsubscribeModel} removable={true} onRemove={() => onRequestRemoveModel(m)} />
                      ))}
                    </ModelGroup>
                    <ModelGroup label="Animation generation" icon="🎬">
                      {effectiveModelOptions.filter((m) => m.kind === "animation").map((m) => (
                        <ModelDropdownRow key={m.value} model={m} isActive={m.value === selectedAnimationModel} activeRoleLabel="Active for animation" providerStatus={providerStatus} quotaState={quotaState} isSubscribed={subscribedModels.has(m.value)} onPick={onPickModel} onSubscribe={onSubscribeModel} onUnsubscribe={onUnsubscribeModel} removable={true} onRemove={() => onRequestRemoveModel(m)} />
                      ))}
                    </ModelGroup>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection id="2d-assets" title="2D Assets" icon="📦" badgeCount={2}>
            <div className="px-4 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <a href="/build/utility-app" className="flex flex-col items-center justify-center gap-0.5 rounded-lg px-2.5 py-2.5 text-xs font-bold transition-all bg-white/5 border border-white/10 text-zinc-300 hover:bg-indigo-600/20 hover:border-indigo-500/40 hover:text-white" title="Build a utility app asset pack — guided 24-question wizard">
                  <span className="text-base leading-none">🛠️</span>
                  <span className="text-[11px] tracking-wide mt-0.5">Utility App</span>
                </a>
                <a href="/build/board-game" className="flex flex-col items-center justify-center gap-0.5 rounded-lg px-2.5 py-2.5 text-xs font-bold transition-all bg-white/5 border border-white/10 text-zinc-300 hover:bg-indigo-600/20 hover:border-indigo-500/40 hover:text-white" title="Build a board game asset pack — guided 25-question wizard">
                  <span className="text-base leading-none">🎲</span>
                  <span className="text-[11px] tracking-wide mt-0.5">Board Game</span>
                </a>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection id="slot-type" title="Slot Type" icon="🎰" badgeCount={SLOT_TYPES.length}>
            <div className="px-4 pt-1">
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
          </CollapsibleSection>

          <CollapsibleSection id="theme" title="Theme" icon="🎨" badgeCount={THEMES.length}>
            <div className="px-4 pt-1">
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
          </CollapsibleSection>

          {/* Bottom breathing room */}
          <div className="h-4" />
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Sidebar helpers
// ---------------------------------------------------------------------------

// One of the two compact "active" rows pinned in the sidebar (image + animation).
function ActiveModelChip({
  roleLabel, roleIcon, model, providerStatus, quotaState, isSubscribed, onClick, syncTick,
}: {
  role: "image" | "animation";
  roleLabel: string;
  roleIcon: string;
  model: ModelOption;
  providerStatus: ProviderStatus | null;
  quotaState: QuotaState;
  isSubscribed: boolean;
  onClick: () => void;
  syncTick: number;
}) {
  const status = modelStatusOf(model, providerStatus, quotaState);
  const exhausted = status === "quota_exhausted";
  const configured = status === "active";

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Change ${roleLabel.toLowerCase()} model — currently ${model.label}`}
      className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all border ${
        exhausted     ? "bg-rose-600/15 border-rose-500/40 hover:bg-rose-600/25 text-rose-100"
        : isSubscribed ? "bg-cyan-600/15 border-cyan-400/40 hover:bg-cyan-600/25 text-cyan-100"
        : configured  ? "bg-indigo-600/12 border-indigo-500/25 hover:bg-indigo-600/20 text-zinc-200"
                      : "bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300"
      }`}
    >
      <span className="text-base flex-shrink-0">{roleIcon}</span>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500 leading-tight">{roleLabel}</p>
        <p className="text-xs font-semibold truncate leading-tight mt-0.5">{model.label}</p>
      </div>
      <span
        key={syncTick}
        style={{ animation: "var(--animate-sync-blink)" }}
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          exhausted     ? "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse"
          : isSubscribed ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
          : configured  ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]"
                        : "bg-amber-400"
        }`}
      />
    </button>
  );
}

function ModelGroup({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-white/[0.05] last:border-b-0">
      <div className="px-3 py-1.5 bg-white/[0.02] flex items-center gap-2">
        <span className="text-[11px]">{icon}</span>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</p>
      </div>
      {children}
    </div>
  );
}

function ModelDropdownRow({
  model, isActive, activeRoleLabel, providerStatus, quotaState, isSubscribed, onPick, onSubscribe, onUnsubscribe, removable, onRemove,
}: {
  model: ModelOption;
  isActive: boolean;
  activeRoleLabel: string;
  providerStatus: ProviderStatus | null;
  quotaState: QuotaState;
  isSubscribed: boolean;
  onPick: (m: ImageModel) => void;
  onSubscribe: (m: ImageModel) => void;
  onUnsubscribe: (m: ImageModel) => void;
  removable?: boolean;
  onRemove?: () => void;
}) {
  const status = modelStatusOf(model, providerStatus, quotaState);
  const exhausted = status === "quota_exhausted";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onPick(model.value)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(model.value); } }}
      className={`relative w-full flex items-start justify-between px-3 py-2.5 text-left transition-all hover:bg-white/5 gap-2 border-l-2 cursor-pointer ${
        exhausted     ? "bg-rose-900/15 border-l-rose-400 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.18)]"
        : isSubscribed ? "bg-cyan-900/15 border-l-cyan-400 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.18)]"
        : isActive    ? "bg-indigo-600/15 border-l-indigo-400 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)]"
                      : "border-l-transparent"
      }`}
    >
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label={`Remove ${model.label}`}
          title="Remove from your platform"
          className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-rose-600/30 hover:bg-rose-500/60 border border-rose-400/40 hover:border-rose-300 text-rose-100 hover:text-white text-[10px] font-bold flex items-center justify-center transition"
        >
          ×
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-xs font-medium ${exhausted ? "text-rose-200" : isSubscribed ? "text-cyan-100" : isActive ? "text-white" : "text-zinc-300"}`}>{model.label}</span>
          {model.badge && (
            <span className="text-[9px] rounded-full bg-indigo-600/20 border border-indigo-500/20 px-1.5 py-0.5 text-indigo-400 flex-shrink-0">{model.badge}</span>
          )}
          <PriceBadge tier={model.tier} />
          <ActivationBadge status={status} />
          <SubscribedBadge show={isSubscribed} onUnsubscribe={() => onUnsubscribe(model.value)} />
          {isActive && (
            <span className="text-[9px] font-bold uppercase tracking-wider rounded-full bg-emerald-600/25 border border-emerald-400/40 px-1.5 py-0.5 text-emerald-200 flex-shrink-0">
              ✓ {activeRoleLabel}
            </span>
          )}
        </div>
        <div className="text-[9px] text-zinc-600 mt-0.5">{model.provider} · <span className="text-emerald-400/80">{model.pricing}</span></div>
        {model.note && <div className="text-[9px] text-zinc-500 mt-0.5 leading-tight mb-1.5">{model.note}</div>}

        {model.providerKey !== "free" && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSubscribe(model.value); }}
            className="mt-1 inline-flex items-center gap-1 rounded-lg bg-[image:linear-gradient(to_right,var(--accent-from),var(--accent-to))] hover:opacity-90 px-2.5 py-1 text-[10px] font-bold text-white shadow-md shadow-indigo-900/30 transition-all"
            title={`Open ${providerDisplayName(model.providerKey)} billing in new tab and select ${model.label}`}
          >
            {subscribeLabel(model.providerKey)} ↗
          </button>
        )}
      </div>
      {isActive && (
        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-500 flex-shrink-0 mt-0.5">
          <CheckSmIcon />
        </span>
      )}
    </div>
  );
}

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
    <div className="px-4 pt-5 pb-1.5 flex items-center gap-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.20em] text-zinc-600 flex-shrink-0">{label}</p>
      <div className="flex-1 h-px bg-white/[0.05]" />
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
  userAddedIds,
  onPickFromSearch,
  effectiveModelOptions,
  isUserAdded,
  onRequestRemoveModel,
  showHiddenBuiltIns,
  onToggleShowHidden,
  hasHidden,
  modelHealthMap,
  lastCheckedAt,
}: {
  onCreateProject: () => void;
  selectedModel: ImageModel;
  providerStatus: ProviderStatus | null;
  quotaState: QuotaState;
  subscribedModels: Set<ImageModel>;
  onSubscribeModel: (m: ImageModel) => void;
  onUnsubscribeModel: (m: ImageModel) => void;
  syncTick: number;
  userAddedIds: string[];
  onPickFromSearch: (entry: CatalogueEntry) => void;
  effectiveModelOptions: ModelOption[];
  isUserAdded: (m: ImageModel) => boolean;
  onRequestRemoveModel: (m: ModelOption) => void;
  showHiddenBuiltIns: boolean;
  onToggleShowHidden: () => void;
  hasHidden: boolean;
  modelHealthMap: Record<string, ModelHealth>;
  lastCheckedAt: number | null;
}) {
  return (
    <div className="px-10 py-10 max-w-6xl mx-auto w-full animate-fade-in">
      <div className="flex items-start justify-between mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Get Started</span>{" "}
            <span className="text-white">Here</span>
          </h1>
          <p className="text-zinc-400 text-base mt-3 max-w-xl leading-relaxed">
            Build production-ready 2D slot game assets — symbols, backgrounds, UI, FX, animations, and a full slot machine preview.
          </p>
        </div>

        {/* Casino preview video — top-right corner, small looping window */}
        <CasinoVideoWidget />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {FEATURE_CARDS.map((card) => (
          <FeatureCard key={card.id} card={card} onCreateProject={onCreateProject} />
        ))}
      </div>

      <div className="border-t border-white/[0.07] pt-10 mb-10">
        <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">AI Models</span>{" "}
              <span className="text-white">Available</span>
            </h2>
            <p className="text-[11px] text-zinc-500 mt-1">
              {effectiveModelOptions.length} model{effectiveModelOptions.length === 1 ? "" : "s"} ·
              click any × to remove · search to add more
            </p>
            <ModelHealthStatusLine
              lastCheckedAt={lastCheckedAt}
              healthMap={modelHealthMap}
              modelIds={effectiveModelOptions.map((m) => m.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {hasHidden && (
              <button
                type="button"
                onClick={onToggleShowHidden}
                className={`text-[11px] px-3 py-2 rounded-lg border transition ${
                  showHiddenBuiltIns
                    ? "bg-amber-500/15 border-amber-400/40 text-amber-200"
                    : "bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:border-white/[0.22]"
                }`}
                title="Toggle visibility of models you've previously hidden"
              >
                {showHiddenBuiltIns ? "Hiding shown ✓" : "Show hidden"}
              </button>
            )}
            <div className="w-full sm:w-[300px]">
              <ModelSearch addedIds={userAddedIds} onPick={onPickFromSearch} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {effectiveModelOptions.map((m) => {
            const isActive = m.value === selectedModel;
            const status = modelStatusOf(m, providerStatus, quotaState);
            const exhausted = status === "quota_exhausted";
            const subscribed = subscribedModels.has(m.value);
            const health = modelHealthMap[m.value];
            const isSuggestedForRemoval = health?.suggestForRemoval ?? false;
            // Every card gets an × — built-ins prompt confirmation (with key-cleanup
            // option), user-added entries also confirm. The handler routes both via
            // the shared confirm modal in ProjectPage.
            const removable = true;
            return (
              <div
                key={m.value}
                className={`relative flex flex-col gap-2.5 rounded-xl px-4 py-3.5 transition-all ${
                  isSuggestedForRemoval
                    ? "bg-rose-950/20 border border-rose-700/30"
                    : exhausted
                    ? "bg-rose-900/15 border border-rose-500/40 shadow-[0_0_0_1px_rgba(244,63,94,0.25)]"
                    : subscribed
                    ? "bg-gradient-to-br from-cyan-900/20 to-teal-900/15 border border-cyan-400/40 shadow-[0_0_0_1px_rgba(34,211,238,0.3),0_0_24px_-8px_rgba(34,211,238,0.4)]"
                    : isActive
                    ? "bg-indigo-600/15 border border-indigo-500/40 shadow-[0_0_0_1px_rgba(99,102,241,0.25)]"
                    : "bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07]"
                }`}
              >
                {removable && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRequestRemoveModel(m); }}
                    aria-label={`Remove ${m.label}`}
                    title={isUserAdded(m.value) ? "Remove from your platform" : "Hide this built-in model"}
                    className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-rose-600/30 hover:bg-rose-500/60 border border-rose-400/40 hover:border-rose-300 text-rose-100 hover:text-white text-xs font-bold flex items-center justify-center transition"
                  >
                    ×
                  </button>
                )}
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
                      {health && <HealthBadge health={health} />}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">{m.provider}</div>
                    <div className={`text-xs mt-1 font-semibold tabular-nums ${exhausted ? "text-rose-300/80 line-through" : "text-emerald-400/90"}`}>{m.pricing}</div>
                    {m.note && <div className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{m.note}</div>}
                    {isSuggestedForRemoval && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-rose-300/80 font-semibold">
                        <span>⚠</span>
                        <span>Suggested for removal</span>
                        <span className="text-rose-400/50">—</span>
                        <span className="text-rose-300/60 font-normal">{health?.reason}</span>
                      </div>
                    )}
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

      {/* Trending AI Models — auto-scrolling carousel of latest models per role.
          Replaces the old Pro Tip card here (Pro Tip moved to top of form view). */}
      <TrendingAIBanner onPick={onPickFromSearch} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Casino Video Widget
// ---------------------------------------------------------------------------

function CasinoVideoWidget() {
  return (
    <div className="flex-shrink-0 relative group" style={{ width: 192, height: 108 }}>
      {/* Animated amber/gold border glow */}
      <div
        className="absolute -inset-[2px] rounded-2xl z-0"
        style={{
          background: "linear-gradient(135deg, #f59e0b, #d97706, #b45309, #f59e0b)",
          backgroundSize: "300% 300%",
          animation: "casino-border-spin 3s linear infinite",
          opacity: 0.85,
        }}
      />
      {/* Inner frame */}
      <div className="relative z-10 w-full h-full rounded-[14px] overflow-hidden bg-black shadow-[0_0_28px_rgba(245,158,11,0.55)]">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src="/animation.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {/* Subtle vignette overlay for depth */}
        <div className="absolute inset-0 pointer-events-none rounded-[14px]"
          style={{ boxShadow: "inset 0 0 18px rgba(0,0,0,0.55)" }} />
        {/* LIVE badge */}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-1.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[8px] font-bold tracking-widest text-white/80 uppercase">Live</span>
        </div>
        {/* 🎰 label */}
        <div className="absolute bottom-1.5 right-1.5 text-[10px] opacity-60 select-none">🎰</div>
      </div>
      {/* Reflection/glow beneath */}
      <div
        className="absolute left-2 right-2 bottom-[-10px] h-3 rounded-full blur-md opacity-50 z-0"
        style={{ background: "linear-gradient(to right, #f59e0b, #d97706)" }}
      />
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
  onRegenerate, onEditAsset, onToggleTransparentBg, onDownload, onSave, onReset,
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
  onToggleTransparentBg: (id: string, value: boolean) => void;
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
      <AssetGrid assets={assets} regeneratingIds={regeneratingIds} onToggleSelect={onToggleSelect} onSelectAll={onSelectAll} onRegenerate={onRegenerate} onEditAsset={onEditAsset} onToggleTransparentBg={onToggleTransparentBg} />

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

// Health status pill — rendered on model cards from the 30s watchdog data.
// Only shows statuses that add information not already in ActivationBadge.
// Live status line under "AI Models Available" — driven by the same 30s
// watchdog poll that powers the per-model health pills. Re-renders every
// second so the "Xs ago" counter stays fresh between polls.
function ModelHealthStatusLine({
  lastCheckedAt, healthMap, modelIds,
}: {
  lastCheckedAt: number | null;
  healthMap: Record<string, ModelHealth>;
  modelIds: string[];
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);
  void tick;

  // Aggregate health across the rendered models
  let healthy = 0, attention = 0, dead = 0;
  for (const id of modelIds) {
    const s = healthMap[id]?.status;
    if (s === "healthy" || s === "active") healthy++;
    else if (s === "quota-out" || s === "stale" || s === "not-relevant") dead++;
    else attention++;
  }

  const ageSec = lastCheckedAt ? Math.max(0, Math.round((Date.now() - lastCheckedAt) / 1000)) : null;
  const ageLabel =
    ageSec === null         ? "syncing…" :
    ageSec < 5              ? "just now" :
    ageSec < 60             ? `${ageSec}s ago` :
    ageSec < 3600           ? `${Math.round(ageSec / 60)}m ago` :
                              `${Math.round(ageSec / 3600)}h ago`;

  // Traffic-light dot. If we have any dead models → amber/red, else green.
  // Stale (no check yet, or check older than 90s) → gray.
  const dotState =
    ageSec === null || ageSec > 90 ? "stale" :
    dead > 0                       ? "red"   :
    attention > 0                  ? "amber" :
                                     "green";
  const dotCls =
    dotState === "green" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" :
    dotState === "amber" ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]"  :
    dotState === "red"   ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" :
                           "bg-zinc-600";
  const labelCls =
    dotState === "green" ? "text-emerald-300" :
    dotState === "amber" ? "text-amber-300"   :
    dotState === "red"   ? "text-rose-300"    :
                           "text-zinc-500";
  const summary =
    dotState === "stale" ? "Awaiting first check" :
    dotState === "green" ? "All systems healthy"  :
    dotState === "amber" ? `${attention} need attention` :
                           `${dead} ${dead === 1 ? "model" : "models"} down`;

  return (
    <div className="flex items-center gap-2 mt-2 text-[10px] tabular-nums" title="Auto-refreshes every 30s via /api/usage">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotCls}`} />
      <span className={`font-bold uppercase tracking-[0.14em] ${labelCls}`}>
        {summary}
      </span>
      <span className="text-zinc-600">·</span>
      <span className="text-zinc-500">
        {healthy} healthy · {attention} pending · {dead} down
      </span>
      <span className="text-zinc-600">·</span>
      <span className="text-zinc-500">
        last health check <span className="text-zinc-400">{ageLabel}</span>
      </span>
    </div>
  );
}

function HealthBadge({ health }: { health: ModelHealth }) {
  if (health.status === "healthy") {
    return (
      <span className="text-[9px] rounded-full bg-emerald-600/15 border border-emerald-500/20 px-1.5 py-0.5 text-emerald-400 flex-shrink-0">
        Healthy
      </span>
    );
  }
  if (health.status === "quota-out") {
    return (
      <span className="text-[9px] rounded-full bg-rose-600/30 border border-rose-500/50 px-1.5 py-0.5 text-rose-200 flex-shrink-0 font-bold animate-pulse">
        Quota out
      </span>
    );
  }
  if (health.status === "stale") {
    return (
      <span className="text-[9px] rounded-full bg-rose-900/30 border border-rose-700/40 px-1.5 py-0.5 text-rose-400/80 flex-shrink-0">
        Stale
      </span>
    );
  }
  if (health.status === "not-relevant") {
    return (
      <span className="text-[9px] rounded-full bg-zinc-700/40 border border-zinc-600/30 px-1.5 py-0.5 text-zinc-500 flex-shrink-0">
        No API
      </span>
    );
  }
  if (health.status === "preview-only") {
    return (
      <span className="text-[9px] rounded-full bg-indigo-700/20 border border-indigo-500/25 px-1.5 py-0.5 text-indigo-400 flex-shrink-0">
        Preview
      </span>
    );
  }
  return null;
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
