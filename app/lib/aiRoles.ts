// The app surfaces three distinct AI roles to users. Each role has a default
// provider + a "powered by" label; failures are reported per-role so users
// can tell which capability is broken when they see a topup banner.

export type AIRole = "prompt" | "image" | "animation" | "layered" | "rigging";

export interface RoleInfo {
  role: AIRole;
  label: string;       // user-facing
  icon: string;
  description: string;
}

export const ROLE_META: Record<AIRole, RoleInfo> = {
  prompt: {
    role: "prompt",
    label: "Prompt Assistant",
    icon: "📝",
    description: "Auto-fills form fields, builds Style DNA, expands wizard answers into per-asset prompts.",
  },
  image: {
    role: "image",
    label: "Image Generator",
    icon: "🖼️",
    description: "Renders all static images: symbols, backgrounds, UI, icons, mockups.",
  },
  animation: {
    role: "animation",
    label: "Animation Generator",
    icon: "🎬",
    description: "Renders short clips for slot intros, jackpot reveals, looping FX.",
  },
  layered: {
    role: "layered",
    label: "Layered Asset Generator",
    icon: "🧱",
    description: "Multi-layer outputs: foreground / midground / background separated for parallax + FX compositing.",
  },
  rigging: {
    role: "rigging",
    label: "Rigging & Mocap",
    icon: "🦴",
    description: "Auto-rig meshes, capture motion from video, animate skeletal characters.",
  },
};

// What provider currently powers each role by default.
// (Image is selectable by the user; default reported here is the seeded one.)
export const ROLE_DEFAULT_PROVIDER: Record<AIRole, string> = {
  prompt:    "openai",      // GPT-4o-mini for /api/suggest, /api/suggest-all, prompt expansion
  image:     "openai",      // GPT-Image-1 default
  animation: "runway",
};

// Default model labels (display-only). The image picker lets the user override.
export const ROLE_DEFAULT_LABEL: Record<AIRole, string> = {
  prompt:    "GPT-4o-mini",
  image:     "GPT-Image-1",
  animation: "RunwayML Gen-3 Alpha",
};

export interface RoleHealth {
  role: AIRole;
  label: string;
  icon: string;
  provider: string;       // provider key (openai / replicate / runway / imagineart / free)
  providerLabel: string;  // user-facing
  modelLabel: string;     // user-facing
  configured: boolean;    // does the provider key resolve?
  source: "panel" | "env" | "none";
  billingUrl?: string;
}

// ── Pluggable per-role model registry ───────────────────────────────────────
// Each entry is a (role, provider, model id) tuple the user can swap to. UI
// reads this directly to render the swap menu. Backend routes pull the chosen
// model id off the request and pass it to the appropriate SDK.

export interface RoleModelOption {
  id: string;              // unique key for this option
  label: string;           // user-facing
  apiModel: string;        // model id passed to the SDK (e.g. "gpt-4o-mini")
  providerKey: "openai" | "anthropic" | "google" | "replicate" | "runway" | "imagineart" | "free";
  providerLabel: string;
  badge?: string;
  pricing: string;
  note?: string;
  status: "ready" | "preview";  // "preview" entries are listed but route to the default model
}

export const MODELS_BY_ROLE: Record<AIRole, RoleModelOption[]> = {
  prompt: [
    {
      id: "openai-gpt-4o-mini",
      label: "GPT-4o-mini",
      apiModel: "gpt-4o-mini",
      providerKey: "openai",
      providerLabel: "OpenAI",
      badge: "Default · fast · cheap",
      pricing: "~$0.15 / 1M input · ~$0.60 / 1M output",
      note: "Best price-performance for form-field suggestions and Style DNA. Great default.",
      status: "ready",
    },
    {
      id: "openai-gpt-4o",
      label: "GPT-4o",
      apiModel: "gpt-4o",
      providerKey: "openai",
      providerLabel: "OpenAI",
      badge: "Premium",
      pricing: "~$2.50 / 1M input · ~$10 / 1M output",
      note: "Stronger reasoning + creative writing — better suggestions for complex briefs at ~16× the cost.",
      status: "ready",
    },
    {
      id: "openai-gpt-4-turbo",
      label: "GPT-4 Turbo",
      apiModel: "gpt-4-turbo",
      providerKey: "openai",
      providerLabel: "OpenAI",
      badge: "Long context",
      pricing: "~$10 / 1M input · ~$30 / 1M output",
      note: "128K context — useful when reference PDFs are large.",
      status: "ready",
    },
    {
      id: "anthropic-claude-haiku",
      label: "Claude 3.5 Haiku",
      apiModel: "claude-3-5-haiku-20241022",
      providerKey: "anthropic",
      providerLabel: "Anthropic",
      badge: "Coming Phase B",
      pricing: "~$0.80 / 1M input · ~$4 / 1M output",
      note: "Fast Claude. Phase B will wire the Anthropic SDK; today this routes to gpt-4o-mini.",
      status: "preview",
    },
    {
      id: "google-gemini-flash",
      label: "Gemini 2.0 Flash",
      apiModel: "gemini-2.0-flash",
      providerKey: "google",
      providerLabel: "Google",
      badge: "Free tier",
      pricing: "free tier · paid ~$0.075 / 1M input",
      note: "Has a generous free tier — Phase B unlock. Today routes to gpt-4o-mini.",
      status: "preview",
    },
  ],
  image: [
    // The image-role registry is also represented in MODEL_OPTIONS in page.tsx
    // (which carries extra fields used by the model-card UI). The picker UI
    // continues to read MODEL_OPTIONS; this entry exists so the role selector
    // modal can mirror the same options without duplication concerns.
    { id: "openai-gpt-image-1",         label: "GPT-Image-1",                 apiModel: "gpt-image-1",                  providerKey: "openai",     providerLabel: "OpenAI",            badge: "Default",  pricing: "~$0.19 / img",   status: "ready" },
    { id: "replicate-flux-1.1-ultra",   label: "FLUX 1.1 Pro Ultra",          apiModel: "black-forest-labs/flux-1.1-pro-ultra", providerKey: "replicate",  providerLabel: "Replicate",      badge: "Ultra",    pricing: "~$0.06 / img",   status: "ready" },
    { id: "imagineart-flux-1.1-ultra",  label: "FLUX 1.1 Pro Ultra (Imagine)",apiModel: "vyro-flux-1.1-pro-ultra",      providerKey: "imagineart", providerLabel: "Imagine Art",       badge: "1500 free credits", pricing: "credit-based", status: "ready" },
    { id: "replicate-sd-3.5",           label: "Stable Diffusion 3.5",        apiModel: "stability-ai/stable-diffusion-3.5-large", providerKey: "replicate",  providerLabel: "Replicate",  badge: "SD3.5",    pricing: "~$0.065 / img",  status: "ready" },
    { id: "free-pollinations",          label: "Pollinations · FLUX (Free)",  apiModel: "pollinations-flux-free",        providerKey: "free",       providerLabel: "Pollinations",     badge: "Free",     pricing: "free",            status: "ready" },
  ],
  animation: [
    { id: "runway-gen3", label: "RunwayML Gen-3 Alpha", apiModel: "runway-gen3", providerKey: "runway", providerLabel: "Runway", badge: "Default", pricing: "~$0.05 / sec", note: "Cinematic 10–16s clips. Currently the only wired animation provider.", status: "ready" },
  ],
  layered: [
    // Layered-asset role: today no first-class native integration. Surface
    // catalogue entries via search + banner; mark all as preview/coming-soon
    // here so the RoleSelectorModal communicates honestly.
    { id: "recraft-v3-layered", label: "Recraft v3 (vector + raster)", apiModel: "recraft/recraft-v3", providerKey: "replicate", providerLabel: "Recraft (via Replicate)", badge: "Preview", pricing: "~$0.04 / img", note: "Vector + raster brand assets. Phase B will wire layered output extraction.", status: "preview" },
  ],
  rigging: [
    { id: "rigging-coming-soon", label: "Coming soon", apiModel: "rigging-coming-soon", providerKey: "replicate", providerLabel: "—", badge: "Coming soon", pricing: "TBD", note: "No leading rigging tool currently exposes a public API we can integrate. See the catalogue search for tools you can use externally.", status: "preview" },
  ],
};

export const DEFAULT_PROMPT_MODEL = "gpt-4o-mini";
export const PROMPT_MODEL_STORAGE_KEY = "slotforge.selectedPromptModel";

export function getPromptModelOption(apiModel: string): RoleModelOption | null {
  return MODELS_BY_ROLE.prompt.find((m) => m.apiModel === apiModel) ?? null;
}

// Map a user-selected api-model id to a SAFE id that we can actually route
// today (Phase A). Preview entries (Anthropic/Google) fall back to the default
// OpenAI model so the user gets a working response while seeing the UI option.
export function resolvePromptModel(apiModel: string | undefined): string {
  if (!apiModel) return DEFAULT_PROMPT_MODEL;
  const opt = getPromptModelOption(apiModel);
  if (!opt) return DEFAULT_PROMPT_MODEL;
  return opt.status === "ready" ? opt.apiModel : DEFAULT_PROMPT_MODEL;
}
