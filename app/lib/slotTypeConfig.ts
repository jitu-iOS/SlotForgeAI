import type { SlotType } from "@/app/types";

// Curated by slot-design conventions. Each entry shapes the form copy, the
// asset catalogue language, and the prompt context so generated assets match
// the format players expect for that reel layout.

export interface SlotTypeConfig {
  value: SlotType;
  label: string;
  short: string;
  tagline: string;
  paylines: string;
  highSymbolCount: string;
  lowSymbolStyle: string;
  aspectRatioHint: string;
  animationFeel: string;
  themeFit: string;
  promptContext: string; // Injected into AI prompts so generated art matches format
  // Field-level example overrides shown as placeholders + tips in the form
  fieldOverrides: Partial<Record<FieldKey, { example?: string; tip?: string }>>;
}

export type FieldKey =
  | "aspectRatio"
  | "highSymbols"
  | "wildSymbol"
  | "scatterSymbol"
  | "symbolStyle"
  | "animationStyle"
  | "winEffects"
  | "backgroundType"
  | "emotionalTone"
  | "artStyle";

export const SLOT_TYPES: SlotTypeConfig[] = [
  {
    value: "3-reel",
    label: "Classic 3-Reel",
    short: "3-Reel",
    tagline: "Retro fruit-machine, single payline",
    paylines: "1, 3, or 5 fixed paylines",
    highSymbolCount: "3 symbols (BAR, BARx2, BARx3, Lucky 7)",
    lowSymbolStyle: "Fruit symbols (cherry, lemon, orange, plum) — NO royals (9-A)",
    aspectRatioHint: "1:1 square or 4:3 — single reel set, vertical cabinet feel",
    animationFeel: "Mechanical reel-spin, subtle bounce, single line-win flash",
    themeFit: "Retro Vegas, fruit machine, neon arcade, 80s pinball",
    promptContext:
      "Designed for a CLASSIC 3-REEL slot machine. Visual language: retro Vegas / fruit-machine, simple bold icons, single payline aesthetic, no royals. Reels are vertical and the playfield is square (1:1).",
    fieldOverrides: {
      aspectRatio: {
        example: "1:1 square — classic single-window cabinet",
        tip: "3-reel slots use a square or near-square reel window. Keep symbols centred and bold; UI wraps tightly around the reels.",
      },
      highSymbols: {
        example: "BAR, double-BAR, triple-BAR, Lucky 7",
        tip: "Classic 3-reel uses traditional BAR/7 hierarchy with 3 high symbols. Avoid theme characters here — keep it iconic and chunky.",
      },
      wildSymbol: {
        example: "Wild logo or game-name plaque (often optional in classics)",
        tip: "Many classic 3-reel slots have NO wild — if you include one, make it the game-name logo or a glowing 'WILD' plaque.",
      },
      scatterSymbol: {
        example: "Often omitted — classic 3-reel rarely uses scatters",
        tip: "Classic 3-reel slots usually skip scatters. If included, keep it as a single themed icon (bell, star).",
      },
      symbolStyle: {
        example: "Bold flat icons, thick black outlines, retro chrome/neon highlights",
        tip: "Symbols in 3-reel slots read at a glance — flat colours, thick outlines, chrome/neon shading. NOT the layered 3D look used in 5-reel premium slots.",
      },
      animationStyle: {
        example: "Mechanical reel-spin, subtle bounce-in, single payline flash",
        tip: "Keep animation minimal: vertical reel-spin, brief bounce-stop, a single horizontal line flash on win. No cascades, no expanding wilds.",
      },
      winEffects: {
        example: "Single line-flash, coin chime, BAR/7 highlight glow",
        tip: "Win FX in 3-reel are restrained: one bright line across the matched row, a chime, soft golden glow on the matching symbols.",
      },
      backgroundType: {
        example: "Static — solid colour or simple gradient cabinet panel",
        tip: "Classic 3-reel uses a STATIC, simple background — often a single panel colour or subtle gradient. No parallax or animated layers.",
      },
      emotionalTone: {
        example: "Retro, nostalgic, neon, arcade",
        tip: "Aim for nostalgia and neon-arcade energy. Avoid epic / cinematic moods that suit 5+ reel slots.",
      },
      artStyle: {
        example: "Flat retro vector with neon/chrome accents",
        tip: "Use flat vector with retro chrome highlights. Skip the semi-realistic 3D rendering common in modern 5-reel premium slots.",
      },
    },
  },
  {
    value: "5-reel",
    label: "Standard 5-Reel",
    short: "5-Reel",
    tagline: "Industry standard, 9–25 paylines or 243 ways",
    paylines: "9–25 paylines, or 243 ways-to-win",
    highSymbolCount: "4 themed high symbols + Wild + Scatter",
    lowSymbolStyle: "Royal cards (9, 10, J, Q, K, A) — themed to match world",
    aspectRatioHint: "16:9 landscape or 9:16 portrait mobile — full reel set",
    animationFeel: "Juicy: bounce-stop, expanding wilds, free-spin meter, wild-on-win",
    themeFit: "Anything — Egyptian, Norse, fantasy, oceanic, sci-fi, fairy-tale",
    promptContext:
      "Designed for a STANDARD 5-REEL video slot. Modern premium look, 4 hero symbols, themed royals (9-A) styled to the world, full bonus features. The layout is widescreen.",
    fieldOverrides: {
      aspectRatio: {
        example: "16:9 landscape (desktop) or 9:16 portrait (mobile)",
        tip: "5-reel slots ship in either widescreen 16:9 (web/desktop) or vertical 9:16 (mobile). Pick the primary platform — backgrounds are composed accordingly.",
      },
    },
  },
  {
    value: "6-reel-megaways",
    label: "6-Reel Megaways",
    short: "6-Reel ⚡",
    tagline: "Cascading reels, 117,649+ ways to win",
    paylines: "117,649+ ways (Megaways) — variable 2–7 symbols per reel",
    highSymbolCount: "6 themed high symbols + Wild + Scatter + Mystery",
    lowSymbolStyle: "Royal cards (9, 10, J, Q, K, A) — themed",
    aspectRatioHint: "16:9 wide — extra-wide playfield to fit variable-height reels",
    animationFeel: "Cascade/tumble: symbols disappear on win, new ones drop in, multiplier climbs",
    themeFit: "Epic, cinematic — Norse gods, ancient civilisations, monster hunts",
    promptContext:
      "Designed for a 6-REEL MEGAWAYS slot. Variable-height reels (2-7 symbols per reel), cascading/tumbling wins, multipliers climb during cascades. Wide widescreen layout. Symbols must read at multiple scales because reels resize between spins.",
    fieldOverrides: {
      aspectRatio: {
        example: "16:9 wide — variable-height reels need horizontal space",
        tip: "Megaways reels resize per spin (2–7 symbols tall), so use a wide canvas. Backgrounds extend full-width with the playfield centered.",
      },
      highSymbols: {
        example: "6 themed icons (e.g., 6 Norse gods or 6 monster portraits)",
        tip: "Megaways slots use 6 high symbols (one per reel concept). Each must be readable at small AND large sizes since reel height varies.",
      },
      animationStyle: {
        example: "Tumble/cascade — winning symbols shatter, new symbols drop, multiplier increments",
        tip: "Megaways animation is cascade-based, not single-spin. Symbols should have a 'shatter' or 'dissolve' state for cascades and a falling-in entrance.",
      },
      winEffects: {
        example: "Cascade shatter, climbing multiplier counter, mega-win shockwave at 1000x",
        tip: "Design for cascade chains: small effect per cascade, escalating intensity as multipliers climb. Mega-win at high multipliers needs a dedicated FX.",
      },
      backgroundType: {
        example: "Layered with parallax — reactive to multiplier (gets more intense)",
        tip: "Megaways backgrounds often react to multipliers — start calm, intensify (lightning, flames, particles) as the cascade chain builds.",
      },
      emotionalTone: {
        example: "Epic, cinematic, escalating intensity",
        tip: "Megaways thrives on escalation. Tone should feel like you're climbing toward a payoff — start grand, end overwhelming.",
      },
    },
  },
  {
    value: "7-reel",
    label: "7-Reel Mega Grid",
    short: "7-Reel",
    tagline: "Modern grid slot, 16,807+ ways or cluster pays",
    paylines: "16,807+ ways or cluster-pays grid",
    highSymbolCount: "8 themed high symbols + Wild + Scatter + Mega-symbol",
    lowSymbolStyle: "Royal cards or thematic gems (cluster-pay layouts)",
    aspectRatioHint: "16:9 ultra-wide or 1:1 grid — premium cinematic playfield",
    animationFeel: "Cinematic: mega-symbol expansion, screen-shake, particle storms, grid pulse",
    themeFit: "Premium cinematic — sci-fi, dark fantasy, mythic horror, Marvel-tier IP",
    promptContext:
      "Designed for a 7-REEL MEGA GRID slot. Massive playfield (7 reels wide, often 7+ rows). Supports mega-symbols (2x2, 3x3 oversize), cluster pays, or 16,807-ways layouts. Premium cinematic visual treatment expected — every asset should feel like a film.",
    fieldOverrides: {
      aspectRatio: {
        example: "16:9 ultra-wide or 1:1 mega-grid",
        tip: "7-reel slots use either ultra-wide 16:9 widescreen or a square mega-grid. Plan for mega-symbols that span 2x2 or 3x3 cells.",
      },
      highSymbols: {
        example: "8 cinematic icons (heroes, artefacts, beasts) — each premium-rendered",
        tip: "7-reel slots use 8 high symbols, each treated like a hero portrait. Must hold up at mega-symbol size (2x2 or 3x3).",
      },
      symbolStyle: {
        example: "Cinematic 3D rendered, heavy rim-light, dramatic shadows",
        tip: "Push toward film-quality 3D rendering. Symbols should look like collectible-card-art — depth, rim lighting, environmental shadow.",
      },
      animationStyle: {
        example: "Cinematic: mega-symbol expansion, particle storms, screen-shake on big-win",
        tip: "Design for premium cinematic FX: symbols morph into mega-symbols, screen-shakes on huge wins, particle storms on bonus triggers.",
      },
      winEffects: {
        example: "Mega-symbol explosion, full-grid pulse, cinematic camera-shake",
        tip: "Win FX should feel like a film moment: full-grid energy waves, mega-symbol explosions, dramatic light bursts. Save the biggest for cluster-pay or 1000x+ wins.",
      },
      backgroundType: {
        example: "Layered cinematic with weather / atmosphere (storm, fog, light rays)",
        tip: "7-reel backgrounds are scene-quality — atmospheric weather, animated fog, god-rays, distant ambient creatures. Treat it like a film set.",
      },
      emotionalTone: {
        example: "Premium cinematic, mythic, awe-inspiring",
        tip: "Aim for IMAX-trailer energy: awe, scale, mythic stakes. The player should feel they entered a film, not a game.",
      },
      artStyle: {
        example: "Hyper-detailed 3D cinematic, AAA game-art quality",
        tip: "7-reel premium slots demand AAA-game art quality. Push toward Marvel-tier or Blizzard-cinematic-level rendering.",
      },
    },
  },
];

export const DEFAULT_SLOT_TYPE: SlotType = "5-reel";

export function getSlotConfig(t: SlotType): SlotTypeConfig {
  return SLOT_TYPES.find((s) => s.value === t) ?? SLOT_TYPES[1];
}
