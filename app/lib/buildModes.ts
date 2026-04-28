import type { BuildMode, UtilityForm, Game2DForm } from "@/app/types/buildMode";

export interface BuildModeMeta {
  value: BuildMode;
  label: string;
  short: string;
  icon: string;
  tagline: string;
  hero: string;
  heroSub: string;
}

export const BUILD_MODES: BuildModeMeta[] = [
  {
    value: "slot",
    label: "Slot Game",
    short: "Slot",
    icon: "🎰",
    tagline: "Classic & video slots, megaways, jackpots",
    hero: "Forge a slot game",
    heroSub: "Generate symbols, backgrounds, FX and full machine previews from a single brief.",
  },
  {
    value: "utility",
    label: "Utility App",
    short: "Utility",
    icon: "🛠️",
    tagline: "Productivity, dashboards, internal tooling",
    hero: "Forge a utility app",
    heroSub: "Generate app icons, login screens, dashboards and data views from a brand brief.",
  },
  {
    value: "game-2d",
    label: "2D Game",
    short: "2D Game",
    icon: "🎮",
    tagline: "Platformers, puzzles, runners, RPGs",
    hero: "Forge a 2D game",
    heroSub: "Generate player sprites, enemies, environments, tilesets and HUD frames.",
  },
];

export const DEFAULT_BUILD_MODE: BuildMode = "slot";

export function getBuildMode(mode: BuildMode): BuildModeMeta {
  return BUILD_MODES.find((m) => m.value === mode) ?? BUILD_MODES[0];
}

export const DEFAULT_UTILITY_FORM: UtilityForm = {
  appName: "",
  industry: "",
  persona: "",
  coreFunction: "",
  visualStyle: "Minimal",
  colorPalette: "",
  layoutDensity: "Comfortable",
  brandKeywords: "",
};

export const DEFAULT_GAME_2D_FORM: Game2DForm = {
  gameTitle: "",
  genre: "",
  theme: "",
  artStyle: "",
  colorPalette: "",
  playerCharacter: "",
  enemies: "",
  environment: "",
  hudStyle: "Minimal",
  endTone: "",
};
