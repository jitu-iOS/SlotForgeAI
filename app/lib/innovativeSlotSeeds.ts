// Curated trending / innovative slot directions for 2026.
//
// Why this exists: GPT-4o-mini at default temperature collapses to the same
// brief on every empty-form Fill All — usually some flavour of "Pharaoh's
// Eternal Gold" or generic luxury jewels. That's boring and erodes the user's
// trust that AI is offering anything new. We inject one of these seeds into
// the system prompt so each Fill All starts from a different creative anchor.
//
// Each seed is one sentence: a directional brief, not a finished theme. The
// LLM still does the work of expanding it into specifics — but it can't
// converge on Egypt every time.

export interface SlotSeed {
  pitch: string;
  audience: string;
  vibe: string;
}

export const INNOVATIVE_SEEDS: SlotSeed[] = [
  // ── 2026 emerging cultural mash-ups ──────────────────────────────────────
  { pitch: "Cosmic Yakuza — neon-tattooed crime syndicates running a casino on a derelict orbital station",         audience: "young Asian-market premium players",     vibe: "cyberpunk, ornate, dangerous" },
  { pitch: "Bio-Neon Coral Reef — bioluminescent sea creatures gambling under crushing ocean pressure",             audience: "EU casual + premium, mobile-first",      vibe: "luminous, fluid, otherworldly" },
  { pitch: "Quantum Mariachi — string-theory musicians spinning the universe into existence with brass and bone",   audience: "LATAM + US Hispanic markets",            vibe: "vibrant, rhythmic, cosmic" },
  { pitch: "Nordic AI — sentient runestones evaluating the worth of mortals in a frozen data centre",               audience: "Nordic + Tier-1 EU premium",             vibe: "minimalist, icy, calculating" },
  { pitch: "Aerocapella Ballroom — winged jazz musicians holding a high-stakes recital atop a floating palazzo",    audience: "high-spend EU + US",                     vibe: "elegant, art-deco, golden" },
  { pitch: "Steampunk Sherpa — mechanised yetis trading enchanted oxygen at impossible Himalayan altitudes",        audience: "Tier-1 global premium",                  vibe: "brass, mountain, mystical" },
  { pitch: "Noir Apothecary — 1940s detective tracing a curse through an art-deco potion shop",                     audience: "older premium narrative players",        vibe: "moody, smoky, golden-shadowed" },
  { pitch: "Solar-Punk Bazaar — rooftop markets in a post-collapse city where sunlight is currency",                audience: "Gen-Z premium + EU casual",              vibe: "bright, hopeful, organic-tech" },
  { pitch: "Afrofuturist Pharaoh — Wakandan-inspired royal court of holographic deities",                           audience: "US + African-market premium",            vibe: "regal, electric, golden-violet" },
  { pitch: "Cyber-Geisha Tea House — AR-augmented kabuki performers in neon Kyoto",                                 audience: "Japan + APAC premium",                   vibe: "elegant, neon, ritualistic" },
  { pitch: "Robo-Vampire Speakeasy — clockwork blood-sippers running a 1920s Prohibition club",                     audience: "US + EU narrative-driven players",       vibe: "dark, gilded, conspiratorial" },
  { pitch: "Neo-Mayan Stargate — pyramid-sized wormholes spinning ancient prophecies into modern jackpots",         audience: "LATAM premium + global crossover",       vibe: "stone, jade, starlit" },
  { pitch: "K-Pop Idol Tournament — rival idol groups battling on an arena reel for fan votes and crystals",        audience: "Gen-Z APAC + US",                        vibe: "bright, glittery, hyper-saturated" },
  { pitch: "Bollywood Heist — Mumbai jewel thieves dancing through a vault of mythological treasures",              audience: "India + South Asian diaspora premium",   vibe: "saturated, ornate, kinetic" },
  { pitch: "Voodoo Drive-In — 1950s Americana ghosts haunting a swamp drive-in cinema",                             audience: "US + EU horror-curious",                 vibe: "retro, eerie, neon" },
  { pitch: "Polar Cathedral — auroras converging on a frozen monastery hiding a quantum relic",                     audience: "EU premium + Nordic",                    vibe: "cold, sacred, ethereal" },
  { pitch: "Desert Punk Caravan — sand-motorcycle nomads racing across glass-fused dunes for fuel and faith",       audience: "MENA + global premium",                  vibe: "burnt orange, kinetic, raw" },
  { pitch: "Neon Samurai of Kyoto-2099 — last-generation cyber-samurai duelling for the soul of a corrupted AI",     audience: "Japan + global cyber-narrative players", vibe: "rain-slick, cyan, melancholic" },
  { pitch: "Crystal Cartographer — explorer of impossible geometries through living crystal mazes",                 audience: "puzzle-leaning premium",                 vibe: "iridescent, prism, calm" },
  { pitch: "Forbidden Botanica — Victorian botanist cataloguing carnivorous plants in a glass-domed terrarium",     audience: "EU premium narrative",                   vibe: "verdant, ornate, slightly menacing" },

  // ── Mythological / folkloric remixes ─────────────────────────────────────
  { pitch: "Sphinx vs. Kraken — Greek-Egyptian crossover where ancient guardians battle for sunken treasure",       audience: "global premium Greek/Egypt-curious",     vibe: "stormy, golden, monumental" },
  { pitch: "Slavic Forest Spirits — Baba Yaga's chicken-legged hut hosting a forest-coven jackpot ritual",          audience: "EU + Slavic markets",                    vibe: "deep green, mossy, mystical" },
  { pitch: "Aztec Sky Forge — feathered serpents hammering thunder into golden coins above a cloud city",           audience: "LATAM premium + US Hispanic",            vibe: "thunderous, gold, jade" },
  { pitch: "Korean Dokkaebi Festival — playful goblin spirits gambling for human secrets at a lantern-lit market",  audience: "Korea + APAC casual+premium",            vibe: "festive, mischievous, lantern-warm" },
  { pitch: "Maori Star-Navigator — outrigger canoes sailing constellations to harvest sky-pearls",                  audience: "Pacific + global premium",               vibe: "deep blue, oceanic, ancestral" },
  { pitch: "Persian Djinn Architect — lamp-bound wishmaker re-designing a desert palace one spin at a time",        audience: "MENA + global premium narrative",        vibe: "saffron, lapis, opulent" },
  { pitch: "Celtic Druid Eclipse — standing stones channeling lunar magic at the moment of a total eclipse",        audience: "EU + UK premium",                        vibe: "stormy, silver, ancient" },
  { pitch: "Inuit Aurora Hunt — polar nomads stalking spirit-prey beneath a singing sky",                           audience: "Canada + Nordic crossover",              vibe: "icy, violet-green, breathing" },
  { pitch: "Brazilian Carnaval Ascension — samba performers transcending into mythological birds mid-parade",       audience: "Brazil + LATAM premium",                 vibe: "explosive colour, kinetic, festive" },
  { pitch: "Filipino Aswang Cantina — shapeshifter cryptids running a roadside cantina on a moonlit jungle road",   audience: "SEA + diaspora premium",                 vibe: "warm-dark, mysterious, neon-tropical" },

  // ── Unexpected genre fusions ─────────────────────────────────────────────
  { pitch: "Wild West Witch Trial — gunslinger witches defending a saloon from a salt-iron sheriff",                audience: "US premium narrative",                   vibe: "dust, ember, gothic-western" },
  { pitch: "Disco Dragon Lair — 70s funk dragons hoarding holographic gold under a mirrored ball cave",             audience: "global crossover, Gen-X / Gen-Z",        vibe: "groove, gold, glittered" },
  { pitch: "Renaissance Mecha — Da Vinci-designed war machines duelling on a chequered battlefield",                audience: "EU + global premium",                    vibe: "gold-leaf, brass, tactical" },
  { pitch: "Cottagecore Necromancer — cosy bone-witch baking pies that resurrect garden gnomes",                    audience: "Gen-Z casual + EU premium",              vibe: "warm, soft, whimsically dark" },
  { pitch: "Submarine Speakeasy — 1940s underwater jazz club hosted by deep-sea jazz cephalopods",                  audience: "EU + US narrative players",              vibe: "amber, smoky, deep-blue" },
  { pitch: "Astro-Cowboy Rodeo — interstellar bull-riders lassoing comets in a starlit arena",                      audience: "US + LATAM premium",                     vibe: "stardust, denim, bright" },
  { pitch: "Pirate Astronomers — buccaneers charting treasure across galaxies with brass telescopes",               audience: "US + EU premium narrative",              vibe: "deep navy, brass, starlit" },
  { pitch: "Dieselpunk Tarot Reader — oil-stained mystics divining fortunes from punch-card decks",                 audience: "EU + niche US premium",                  vibe: "amber, grease, gothic" },
  { pitch: "Holographic Carnival — augmented-reality sideshow acts performing for cryptocoin tokens",               audience: "Gen-Z + crypto-curious",                 vibe: "neon, glitch, vibrant" },
  { pitch: "Time-Travelling Postman — 19th-century postal worker delivering letters across centuries on a brass scooter", audience: "EU + Asia narrative players",       vibe: "brass, sepia, whimsical" },

  // ── Premium luxe with a twist ────────────────────────────────────────────
  { pitch: "Liquid Diamond Atelier — high-fashion designers crafting wearable starlight in a Paris penthouse",      audience: "Tier-1 global premium",                  vibe: "couture, white-platinum, refined" },
  { pitch: "Monaco Yacht Heist — international jewel thieves cracking a yacht-vault during a fireworks display",    audience: "Tier-1 EU + Asia premium",               vibe: "glamour, navy, fireworks" },
  { pitch: "Tokyo Sky Lounge — penthouse cocktail bar where every drink shifts the city's neon palette",            audience: "Japan + Tier-1 premium",                 vibe: "neon, smoke, smooth" },
  { pitch: "Caspian Caviar Heist — Russian oligarch chase across a frozen lake hiding a fortune in pearls",         audience: "EU + Eastern European premium",          vibe: "icy, gilded, tense" },
  { pitch: "Marrakesh Spice Vault — souk merchants protecting an alchemical spice with ancient riddles",            audience: "MENA + EU narrative",                    vibe: "saffron, cobalt, ornate" },

  // ── E-sports / digital culture ───────────────────────────────────────────
  { pitch: "Glitch Esports Arena — pro gamers competing inside a corrupted MMO where bugs become loot",             audience: "Gen-Z global esports",                   vibe: "RGB, glitch, kinetic" },
  { pitch: "Streamer's Treasure Vault — 24/7 livestream of an endless dungeon crawl funded by viewer chat",         audience: "Gen-Z + millennial streamer-fan crossover", vibe: "neon, chat-bubbles, kinetic" },
  { pitch: "AI Pet Shelter — adopt-a-bot dystopia where abandoned AI companions earn freedom credits",              audience: "global narrative + casual",              vibe: "soft tech, warm, melancholic" },
  { pitch: "Speedrun Dungeon — frame-perfect adventurers exploiting a glitched fantasy world for points",           audience: "Gen-Z + millennial gaming-native",       vibe: "pixel-modern, fast, bright" },
  { pitch: "Crypto Tomb Raiders — hackers hunting NFT relics inside a decaying blockchain ruin",                    audience: "crypto-curious + Gen-Z",                 vibe: "neon-rust, kinetic, dystopian" },

  // ── Wild card oddities (the ones that go viral) ──────────────────────────
  { pitch: "Cat Mafia of Naples — feline crime family running a fish-cartel from a sun-bleached Italian port",      audience: "Italian + global meme-aware",            vibe: "warm sunlight, ochre, cheeky" },
  { pitch: "Therapeutic Demon Counsellor — friendly underworld therapists helping mortals through soul reviews",    audience: "Gen-Z + millennial cult crossover",      vibe: "warm-dark, plush, kind" },
  { pitch: "Sentient Vending Machine Rebellion — vending machines unionising on a moonbase",                        audience: "global meme + Gen-Z",                    vibe: "fluorescent, cheeky, retro-tech" },
  { pitch: "Library of Lost Memories — librarians cataloguing forgotten dreams in a cathedral of bookshelves",      audience: "EU + introspective premium",             vibe: "warm wood, candlelit, gentle" },
];

// Lightweight pseudo-random pick that varies on every call. We deliberately
// avoid a date-based seed because that would still produce identical seeds
// for two requests in the same minute.
export function pickInnovativeSeed(): SlotSeed {
  const idx = Math.floor(Math.random() * INNOVATIVE_SEEDS.length);
  return INNOVATIVE_SEEDS[idx];
}

// A short anti-cliché guard appended to system prompts when the user has
// given little/no context. The model otherwise gravitates to the same
// "Pharaoh's Eternal Gold" template every single Fill All.
export const ANTI_CLICHE_GUARD =
  "Avoid these defaults unless the user explicitly typed them: Egyptian gods, Pharaoh, treasure chest, generic 'mystical jewels', vague 'fortune', generic dragons, generic vampires, generic vikings. Lean into the provided creative seed and produce a brief that feels distinctly current and specific to it.";
