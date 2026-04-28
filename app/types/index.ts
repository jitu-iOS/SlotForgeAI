export type AssetType = "symbol_low" | "symbol_high" | "background" | "ui" | "fx";

export type SlotType = "3-reel" | "5-reel" | "6-reel-megaways" | "7-reel";

export type ImageModel =
  // Image generation
  | "gpt-image-1"
  | "flux-1.1-pro-ultra"
  | "flux-1.1-pro-ultra-imagineart"
  | "stable-diffusion-3.5"
  // Free / no-key fallbacks (auto-detected, shown as Active when healthy)
  | "pollinations-flux-free"
  // Animation / video generation
  | "runway-gen3";

export interface ProjectForm {
  // 1. Game Identity
  gameName: string;
  theme: string;
  targetAudience: string;
  emotionalTone: string;
  // 2. Art Direction
  artStyle: string;
  lightingStyle: string;
  colorPalette: string;
  // 3. Layout & Resolution
  resolution: string;
  aspectRatio: string;
  safeArea: string;
  // 4. Background
  backgroundType: string;
  environment: string;
  motionElements: string;
  // 5. Symbols
  symbolStyle: string;
  highSymbols: string;
  wildSymbol: string;
  scatterSymbol: string;
  // 6. FX & Animation
  animationStyle: string;
  winEffects: string;
  particles: string;
  // 7. Export Settings
  fileFormat: string;
  atlasReady: string;
  // 8. Quality Control
  sharpness: string;
  consistency: string;
  negativePrompt: string;
  // Asset generation selection
  assetTypes: AssetType[];
}

export interface StyleDNA {
  artStyle: string;
  colorPalette: string[];
  mood: string;
  theme: string;
  lightingHints: string;
  textureHints: string;
}

export interface Asset {
  id: string;
  type: AssetType;
  label: string;
  prompt: string;
  imageUrl: string;
  selected: boolean;
  /** Set when the primary provider failed and a free fallback rendered the image. */
  usedFallback?: string;
}

export interface GenerateResponse {
  styleDNA: StyleDNA;
  assets: Asset[];
}

export interface SavedProject {
  id: string;
  gameName: string;
  savedAt: string; // ISO string
  imageModel: ImageModel;
  styleDNA: StyleDNA;
  assets: Asset[];
  form: ProjectForm;
}
