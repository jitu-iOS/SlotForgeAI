"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Asset } from "@/app/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SlotSymbol {
  id: string;
  label: string;
  emoji: string;
  color: string;
  mult: number;
  imageUrl?: string;
  isWild?: boolean;
}

type GameState = "idle" | "spinning" | "win" | "bigwin";
type WinTier = "win" | "bigwin" | "megawin";

interface Props {
  assets?: Asset[];
  gameName?: string;
}

// ---------------------------------------------------------------------------
// Defaults (shown when no project assets exist)
// ---------------------------------------------------------------------------

const DEFAULT_SYMBOLS: SlotSymbol[] = [
  { id: "s7",      emoji: "7",   color: "#ef4444", label: "Seven",   mult: 25 },
  { id: "diamond", emoji: "💎",  color: "#06b6d4", label: "Diamond", mult: 20 },
  { id: "bar",     emoji: "BAR", color: "#6366f1", label: "BAR",     mult: 12 },
  { id: "bell",    emoji: "🔔",  color: "#f59e0b", label: "Bell",    mult: 8  },
  { id: "star",    emoji: "⭐",  color: "#eab308", label: "Star",    mult: 6  },
  { id: "plum",    emoji: "🫐",  color: "#8b5cf6", label: "Plum",    mult: 4  },
  { id: "orange",  emoji: "🍊",  color: "#f97316", label: "Orange",  mult: 3  },
  { id: "lemon",   emoji: "🍋",  color: "#ca8a04", label: "Lemon",   mult: 2  },
  { id: "cherry",  emoji: "🍒",  color: "#dc2626", label: "Cherry",  mult: 2  },
  { id: "wild",    emoji: "★",   color: "#a855f7", label: "Wild",    mult: 0, isWild: true },
];

const COLORS = ["#ef4444","#eab308","#8b5cf6","#06b6d4","#10b981","#f97316","#6366f1","#f59e0b","#a855f7","#dc2626"];

const STRIP_LEN = 30;
const CELL_HEIGHT = 110;

// Reel stop delays (ms from spin start) — staggered for natural cascade.
// Turbo halves these.
const REEL_STOP_DELAYS = [900, 1150, 1400, 1650, 1900];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSymbols(assets: Asset[]): { symbols: SlotSymbol[]; usingAssets: boolean } {
  const highAssets = assets.filter((a) => a.type === "symbol_high" && a.imageUrl);
  const lowAssets  = assets.filter((a) => a.type === "symbol_low"  && a.imageUrl);
  const all        = [...highAssets, ...lowAssets];

  if (all.length < 3) return { symbols: DEFAULT_SYMBOLS, usingAssets: false };

  const highMults = [25, 18, 12, 8, 5];
  const lowMults  = [4, 4, 3, 3, 2, 2];

  const symbols: SlotSymbol[] = [
    ...highAssets.map((a, i) => ({
      id: a.id, label: a.label, emoji: "★",
      color: COLORS[i % COLORS.length],
      mult: highMults[i] ?? 5,
      imageUrl: a.imageUrl,
      isWild: a.label.toLowerCase().includes("wild"),
    })),
    ...lowAssets.map((a, i) => ({
      id: a.id, label: a.label,
      emoji: ["9","10","J","Q","K","A"][i] ?? "?",
      color: COLORS[(i + 5) % COLORS.length],
      mult: lowMults[i] ?? 2,
      imageUrl: a.imageUrl,
    })),
  ];

  if (!symbols.some((s) => s.isWild)) {
    symbols.push({ id: "wild", label: "Wild", emoji: "★", color: "#a855f7", mult: 0, isWild: true });
  }

  return { symbols, usingAssets: true };
}

function randomRow(len: number): number[] {
  return Array.from({ length: 3 }, () => Math.floor(Math.random() * len));
}

function randomStrip(len: number): number[] {
  return Array.from({ length: STRIP_LEN }, () => Math.floor(Math.random() * len));
}

function checkWin(midRow: number[], symbols: SlotSymbol[]): { winning: number[]; multiplier: number } {
  const nonWild  = midRow.filter((i) => !symbols[i]?.isWild);
  const counts   = new Map<number, number>();
  nonWild.forEach((i) => counts.set(i, (counts.get(i) ?? 0) + 1));

  let bestIdx = -1, bestCount = 0;
  counts.forEach((cnt, idx) => { if (cnt > bestCount) { bestCount = cnt; bestIdx = idx; } });

  if (bestCount < 3 && nonWild.length < 3) return { winning: [], multiplier: 0 };

  const winning = midRow
    .map((symIdx, reelIdx) => ({ reelIdx, match: symIdx === bestIdx || (symbols[symIdx]?.isWild ?? false) }))
    .filter((r) => r.match)
    .map((r) => r.reelIdx);

  if (winning.length < 3) return { winning: [], multiplier: 0 };

  const mult = symbols[bestIdx]?.mult ?? 5;
  return { winning, multiplier: mult };
}

function tierFor(amount: number, bet: number): WinTier {
  const ratio = amount / Math.max(1, bet);
  if (ratio >= 25) return "megawin";
  if (ratio >= 10) return "bigwin";
  return "win";
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SlotMachinePreview({ assets = [], gameName = "SlotForge" }: Props) {
  const { symbols, usingAssets } = buildSymbols(assets);

  const [balance,       setBalance]       = useState(1000);
  const [bet,           setBet]           = useState(10);
  const [lastWin,       setLastWin]       = useState(0);
  const [displayedWin,  setDisplayedWin]  = useState(0);
  const [gameState,     setGameState]     = useState<GameState>("idle");
  const [winTier,       setWinTier]       = useState<WinTier>("win");
  const [grid,          setGrid]          = useState<number[][]>(() => Array.from({ length: 5 }, () => randomRow(symbols.length)));
  const [spinning,      setSpinning]      = useState<boolean[]>(Array(5).fill(false));
  const [winReels,      setWinReels]      = useState<number[]>([]);
  const [showCoinRain,  setShowCoinRain]  = useState(false);
  const [showFlash,     setShowFlash]     = useState(false);
  const [strips,        setStrips]        = useState<number[][]>(() => Array.from({ length: 5 }, () => randomStrip(symbols.length)));
  const [totalSpins,    setTotalSpins]    = useState(0);
  const [turbo,         setTurbo]         = useState(false);
  const [autoSpin,      setAutoSpin]      = useState(false);

  const timeoutsRef    = useRef<ReturnType<typeof setTimeout>[]>([]);
  const winCountRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSpinTRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAll = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    if (winCountRef.current) { clearInterval(winCountRef.current); winCountRef.current = null; }
    if (autoSpinTRef.current) { clearTimeout(autoSpinTRef.current); autoSpinTRef.current = null; }
  }, []);

  // Animate the win counter from 0 up to `target` over ~700ms
  const countUpWin = useCallback((target: number) => {
    if (winCountRef.current) clearInterval(winCountRef.current);
    setDisplayedWin(0);
    const start = performance.now();
    const dur = 700;
    winCountRef.current = setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / dur);
      const eased = 1 - Math.pow(1 - t, 2.2);
      setDisplayedWin(Math.round(target * eased));
      if (t >= 1 && winCountRef.current) { clearInterval(winCountRef.current); winCountRef.current = null; }
    }, 24);
  }, []);

  const spin = useCallback(() => {
    if (gameState !== "idle" || balance < bet) return;

    clearAll();
    setBalance((b) => b - bet);
    setLastWin(0);
    setDisplayedWin(0);
    setWinReels([]);
    setShowCoinRain(false);
    setGameState("spinning");
    setTotalSpins((n) => n + 1);

    // Fresh random strips for each reel — used for the spinning visual
    setStrips(Array.from({ length: 5 }, () => randomStrip(symbols.length)));
    setSpinning(Array(5).fill(true));

    // Pre-compute final outcomes
    const outcomes = Array.from({ length: 5 }, () => randomRow(symbols.length));
    const speed = turbo ? 0.5 : 1;

    REEL_STOP_DELAYS.forEach((rawDelay, ri) => {
      const delay = rawDelay * speed;
      const t = setTimeout(() => {
        setGrid((prev) => { const next = [...prev]; next[ri] = outcomes[ri]; return next; });
        setSpinning((prev) => { const next = [...prev]; next[ri] = false; return next; });

        if (ri === 4) {
          const evalT = setTimeout(() => {
            const midRow = outcomes.map((reel) => reel[1]);
            const result = checkWin(midRow, symbols);

            if (result.winning.length >= 3) {
              const amount = bet * result.multiplier;
              setBalance((b) => b + amount);
              setLastWin(amount);
              countUpWin(amount);

              const tier = tierFor(amount, bet);
              setWinTier(tier);
              setWinReels(result.winning);
              setGameState(tier === "win" ? "win" : "bigwin");
              setShowCoinRain(tier !== "win");
              setShowFlash(true);
              const flashT = setTimeout(() => setShowFlash(false), 480);
              timeoutsRef.current.push(flashT);

              const clearT = setTimeout(() => {
                setWinReels([]);
                setShowCoinRain(false);
                setGameState("idle");
              }, tier === "megawin" ? 4200 : tier === "bigwin" ? 3400 : 2400);
              timeoutsRef.current.push(clearT);
            } else {
              setGameState("idle");
            }
          }, 200);
          timeoutsRef.current.push(evalT);
        }
      }, delay);
      timeoutsRef.current.push(t);
    });
  }, [gameState, balance, bet, symbols, clearAll, countUpWin, turbo]);

  // Auto-spin loop
  useEffect(() => {
    if (!autoSpin) return;
    if (gameState === "idle" && balance >= bet) {
      autoSpinTRef.current = setTimeout(() => spin(), 600);
    }
    return () => { if (autoSpinTRef.current) clearTimeout(autoSpinTRef.current); };
  }, [autoSpin, gameState, balance, bet, spin]);

  useEffect(() => () => clearAll(), [clearAll]);

  const canSpin = gameState === "idle" && balance >= bet;

  return (
    <div className="flex flex-col items-center justify-start min-h-full py-8 px-4 overflow-y-auto">
      {/* Asset mode badge */}
      <div className="mb-4 flex items-center gap-2 text-xs">
        {usingAssets ? (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-900/30 border border-emerald-500/30 px-3 py-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Using your generated assets — {gameName}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-zinc-500">
            Demo mode — generate a project to see your own symbols on the reels
          </span>
        )}
      </div>

      {/* ── Casino Cabinet ── */}
      <div
        className="w-full max-w-[680px] rounded-3xl overflow-hidden relative"
        style={{
          background: "linear-gradient(180deg,#1b0545 0%,#0d0b20 30%,#0b091c 100%)",
          border: "2px solid rgba(251,191,36,0.45)",
          boxShadow:
            "0 0 80px -10px rgba(139,92,246,0.5), inset 0 0 0 1px rgba(255,255,255,0.04), 0 30px 60px -20px rgba(0,0,0,0.7)",
          animation: "cabinet-glow 3s ease-in-out infinite",
        }}
      >
        {/* Side LED columns */}
        <SideLEDs side="left" />
        <SideLEDs side="right" />

        {/* Top LED bar (marquee) */}
        <LightRow />

        {/* Header / marquee */}
        <div className="text-center pt-4 pb-3 px-12 relative">
          <div
            className="text-3xl sm:text-4xl font-black tracking-widest uppercase"
            style={{
              background: "linear-gradient(135deg,#fde68a,#fbbf24,#d97706,#fbbf24,#fde68a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 14px rgba(251,191,36,0.5))",
            }}
          >
            {gameName}
          </div>
          <div className="text-[10px] font-bold tracking-[0.4em] uppercase text-amber-400/55 mt-1">
            ✦ Premium Casino Edition ✦
          </div>
        </div>

        {/* Reel window */}
        <div className="mx-8 mb-4 relative">
          {/* Glass frame with chrome bezel */}
          <div
            className="rounded-2xl overflow-hidden relative"
            style={{
              border: "3px solid rgba(251,191,36,0.55)",
              boxShadow:
                "0 0 30px rgba(251,191,36,0.15), inset 0 0 50px rgba(0,0,0,0.85), inset 0 0 0 1px rgba(255,255,255,0.05)",
              background: "linear-gradient(180deg,#000 0%,#0a0612 50%,#000 100%)",
            }}
          >
            {/* Win line indicator */}
            <div
              className="absolute left-0 right-0 z-10 pointer-events-none"
              style={{ top: "33.33%", height: "33.35%" }}
            >
              <div className="absolute left-1 top-1/2 -translate-y-1/2 text-amber-400/70 text-xs font-bold">▶</div>
              <div className="absolute right-1 top-1/2 -translate-y-1/2 text-amber-400/70 text-xs font-bold">◀</div>
              <div className="absolute top-0 left-0 right-0 h-px bg-amber-400/25" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-amber-400/25" />
            </div>

            {/* Top + bottom gradient fade for depth */}
            <div className="absolute top-0 left-0 right-0 h-14 pointer-events-none z-10"
              style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)" }} />
            <div className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none z-10"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }} />

            {/* Reels grid */}
            <div className="grid grid-cols-5 relative" style={{ height: CELL_HEIGHT * 3 }}>
              {Array.from({ length: 5 }, (_, ri) => (
                <SingleReel
                  key={ri}
                  symbols={symbols}
                  displayRow={grid[ri]}
                  strip={strips[ri]}
                  isSpinning={spinning[ri]}
                  isWin={winReels.includes(ri)}
                  isLast={ri === 4}
                  turbo={turbo}
                />
              ))}
            </div>

            {/* Payline overlay (drawn on win) */}
            {winReels.length >= 3 && (
              <PaylineOverlay reels={winReels} />
            )}

            {/* Screen flash on win land */}
            {showFlash && (
              <div
                className="absolute inset-0 pointer-events-none z-20"
                style={{
                  background: "radial-gradient(ellipse at center, rgba(251,191,36,0.6) 0%, transparent 70%)",
                  animation: "var(--animate-screen-flash)",
                }}
              />
            )}
          </div>
        </div>

        {/* Control panel */}
        <div
          className="mx-8 mb-6 rounded-2xl px-5 py-4"
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.45))",
            border: "1px solid rgba(251,191,36,0.18)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Info row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Display label="BALANCE"   value={`$${balance.toLocaleString()}`} />
            <Display label="WIN"       value={lastWin > 0 ? `$${displayedWin.toLocaleString()}` : "—"} highlight={lastWin > 0} />
            <Display label="BET"       value={`$${bet}`} />
          </div>

          {/* Bet + spin row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1.5 flex-wrap">
              {[5, 10, 25, 50, 100].map((b) => (
                <button
                  key={b}
                  onClick={() => gameState === "idle" && setBet(b)}
                  disabled={gameState !== "idle"}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                    bet === b
                      ? "bg-amber-500 text-black shadow-md shadow-amber-900/50 scale-105"
                      : "bg-white/10 text-zinc-400 hover:bg-white/20 hover:text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  ${b}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <ToggleChip label="Turbo" active={turbo} onClick={() => setTurbo((v) => !v)} disabled={gameState !== "idle"} />
              <ToggleChip label="Auto" active={autoSpin} onClick={() => setAutoSpin((v) => !v)} disabled={!canSpin && !autoSpin} />
              <SpinButton onClick={spin} disabled={!canSpin} state={gameState} />
            </div>
          </div>

          {/* Low balance warning */}
          {balance < bet && gameState === "idle" && (
            <button
              onClick={() => setBalance(1000)}
              className="mt-3 w-full rounded-xl bg-amber-500/10 border border-amber-500/20 py-2 text-xs text-amber-400 hover:bg-amber-500/20 transition-colors font-medium"
            >
              Add Credits — Click to top up ($1,000)
            </button>
          )}
        </div>

        {/* Win overlay (tiered) */}
        {(gameState === "win" || gameState === "bigwin") && (
          <WinOverlay tier={winTier} amount={displayedWin} />
        )}

        {/* Coin rain (big-win + mega-win only) */}
        {showCoinRain && <CoinRain heavy={winTier === "megawin"} />}

        {/* Bottom LED bar */}
        <LightRow reversed />
      </div>

      {/* Footer stats */}
      {totalSpins > 0 && (
        <p className="mt-4 text-xs text-zinc-600">
          Total spins: {totalSpins}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reel (with continuous-scroll strip during spin + landed display when stopped)
// ---------------------------------------------------------------------------

function SingleReel({
  symbols, displayRow, strip, isSpinning, isWin, isLast, turbo,
}: {
  symbols: SlotSymbol[];
  displayRow: number[];
  strip: number[];
  isSpinning: boolean;
  isWin: boolean;
  isLast: boolean;
  turbo: boolean;
}) {
  const [showThud, setShowThud] = useState(false);
  const prevSpinning = useRef(isSpinning);

  useEffect(() => {
    if (prevSpinning.current && !isSpinning) {
      setShowThud(true);
      const t = setTimeout(() => setShowThud(false), 360);
      prevSpinning.current = isSpinning;
      return () => clearTimeout(t);
    }
    prevSpinning.current = isSpinning;
  }, [isSpinning]);

  // Doubled strip for seamless wrap (animation translates by exactly the original-strip height)
  const fullStrip = useMemo(() => [...strip, ...strip], [strip]);

  return (
    <div
      style={{
        borderRight: isLast ? "none" : "1px solid rgba(255,255,255,0.07)",
        height: CELL_HEIGHT * 3,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Spinning strip overlay (only rendered while spinning) */}
      {isSpinning ? (
        <div
          className="absolute left-0 right-0"
          style={{
            top: 0,
            animation: `${turbo ? "reel-spin-fast 0.6s" : "reel-spin-medium 0.85s"} linear infinite`,
            filter: "blur(1.4px) brightness(1.18)",
            willChange: "transform",
          }}
        >
          {fullStrip.map((symIdx, i) => (
            <SymbolCell key={i} symbol={symbols[symIdx] ?? symbols[0]} isMiddle={false} isWin={false} isSpinning />
          ))}
        </div>
      ) : (
        <div
          style={{
            animation: showThud ? "var(--animate-reel-stop-thud)" : "none",
          }}
        >
          {displayRow.map((symIdx, rowIdx) => (
            <SymbolCell
              key={rowIdx}
              symbol={symbols[symIdx] ?? symbols[0]}
              isMiddle={rowIdx === 1}
              isWin={isWin && rowIdx === 1}
              isSpinning={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Symbol cell
// ---------------------------------------------------------------------------

function SymbolCell({
  symbol, isMiddle, isWin, isSpinning,
}: {
  symbol: SlotSymbol;
  isMiddle: boolean;
  isWin: boolean;
  isSpinning: boolean;
}) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        height: CELL_HEIGHT,
        animation: isWin ? "win-cell-pulse 0.8s ease-in-out infinite" : undefined,
        borderTop: isMiddle ? "none" : undefined,
      }}
    >
      {symbol.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={symbol.imageUrl}
          alt={symbol.label}
          draggable={false}
          className="object-contain select-none"
          style={{
            width: 80, height: 80,
            filter: isWin
              ? "drop-shadow(0 0 14px rgba(251,191,36,0.95)) brightness(1.25)"
              : isSpinning
              ? "brightness(1.4)"
              : "drop-shadow(0 2px 6px rgba(0,0,0,0.6))",
            transition: "filter 0.18s",
          }}
        />
      ) : (
        <div className="flex flex-col items-center gap-0.5">
          <span
            className="select-none leading-none"
            style={{
              fontSize: symbol.emoji.length <= 2 ? 44 : 20,
              fontWeight: 900,
              color: symbol.emoji.length > 2 ? symbol.color : undefined,
              filter: isWin
                ? `drop-shadow(0 0 12px ${symbol.color})`
                : `drop-shadow(0 2px 4px rgba(0,0,0,0.8))`,
              transition: "filter 0.18s",
            }}
          >
            {symbol.emoji}
          </span>
          {symbol.emoji.length > 2 && (
            <span className="text-[8px] font-black text-white/50">{symbol.label}</span>
          )}
        </div>
      )}

      {isWin && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 50%, ${symbol.color}40 0%, transparent 70%)` }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payline overlay — draws a zigzag/curved gold line through the win reels
// ---------------------------------------------------------------------------

function PaylineOverlay({ reels }: { reels: number[] }) {
  // Reel center x: each reel is 1/5 of width; center of reel ri at (ri+0.5)/5
  // Y at middle row = 50% of total height
  const points = Array.from({ length: 5 }, (_, ri) => ({
    x: ((ri + 0.5) / 5) * 100,
    y: 50,
  }));

  // Build SVG path through all reels (slight wave for visual interest)
  const path = points
    .map((p, i) => {
      const offY = (i % 2 === 0 ? -1 : 1) * 1.5;
      return `${i === 0 ? "M" : "L"} ${p.x} ${p.y + offY}`;
    })
    .join(" ");

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <linearGradient id="paylineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#fde68a" />
          <stop offset="50%"  stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="paylineGlow">
          <feGaussianBlur stdDeviation="0.6" result="b" />
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path
        d={path}
        stroke="url(#paylineGrad)"
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#paylineGlow)"
        style={{
          strokeDasharray: 200,
          strokeDashoffset: 200,
          animation: "var(--animate-payline-draw)",
        }}
      />
      {reels.map((ri) => (
        <circle
          key={ri}
          cx={((ri + 0.5) / 5) * 100}
          cy={50}
          r={2.2}
          fill="#fde68a"
          opacity={0.95}
          style={{ filter: "drop-shadow(0 0 4px #fbbf24)" }}
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Spin button
// ---------------------------------------------------------------------------

function SpinButton({
  onClick, disabled, state,
}: {
  onClick: () => void;
  disabled: boolean;
  state: GameState;
}) {
  const isSpinning = state === "spinning";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative rounded-full font-black uppercase tracking-widest transition-all active:scale-95 select-none"
      style={{
        padding: "14px 36px",
        fontSize: 15,
        background: disabled ? "rgba(100,100,100,0.3)" : "linear-gradient(135deg,#dc2626,#b91c1c)",
        color: disabled ? "#555" : "#fff",
        border: disabled ? "2px solid rgba(100,100,100,0.2)" : "2px solid rgba(239,68,68,0.55)",
        animation: !disabled && !isSpinning ? "spin-btn-idle 1.8s ease-in-out infinite" : "none",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {isSpinning ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Spinning…
        </span>
      ) : (
        "▶  SPIN"
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Compact toggle chip (Turbo / Auto)
// ---------------------------------------------------------------------------

function ToggleChip({ label, active, onClick, disabled }: { label: string; active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-[11px] font-bold uppercase tracking-wider rounded-full px-3 py-1.5 transition-all ${
        active
          ? "bg-amber-400 text-black shadow-md shadow-amber-900/40"
          : "bg-white/10 text-zinc-400 hover:bg-white/20 hover:text-white"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
      title={`${label} ${active ? "on" : "off"}`}
    >
      {label}{active && " ✓"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Display panel
// ---------------------------------------------------------------------------

function Display({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-center"
      style={{
        background: "rgba(0,0,0,0.55)",
        border: `1px solid ${highlight ? "rgba(251,191,36,0.45)" : "rgba(255,255,255,0.08)"}`,
      }}
    >
      <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-0.5">{label}</p>
      <p
        className="text-base font-black tabular-nums"
        style={{
          color: highlight ? "#fbbf24" : "#e5e7eb",
          textShadow: highlight ? "0 0 12px rgba(251,191,36,0.6)" : "none",
        }}
      >
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top / bottom LED row
// ---------------------------------------------------------------------------

function LightRow({ reversed }: { reversed?: boolean }) {
  const colors = ["#fbbf24", "#ef4444", "#8b5cf6", "#10b981", "#06b6d4"];
  return (
    <div className={`flex justify-around items-center px-12 py-2 ${reversed ? "flex-row-reverse" : ""}`}>
      {Array.from({ length: 18 }, (_, i) => {
        const c = colors[i % colors.length];
        return (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: 10, height: 10,
              background: c,
              boxShadow: `0 0 6px ${c}, 0 0 14px ${c}55`,
              animation: `light-blink 1.2s ease-in-out ${(i * 0.07).toFixed(2)}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Side LED columns (left + right of cabinet)
// ---------------------------------------------------------------------------

function SideLEDs({ side }: { side: "left" | "right" }) {
  const colors = ["#fbbf24", "#a855f7", "#10b981", "#06b6d4", "#f59e0b", "#ef4444"];
  return (
    <div
      className="absolute top-12 bottom-12 w-2 z-10 pointer-events-none flex flex-col justify-around"
      style={{ [side]: 10 } as React.CSSProperties}
    >
      {Array.from({ length: 14 }, (_, i) => {
        const c = colors[i % colors.length];
        return (
          <div
            key={i}
            className="rounded-full mx-auto"
            style={{
              width: 6, height: 6,
              background: c,
              color: c,
              animation: `side-led 1.3s ease-in-out ${(i * 0.09).toFixed(2)}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Win overlay — tiered (WIN / BIG WIN / MEGA WIN)
// ---------------------------------------------------------------------------

function WinOverlay({ tier, amount }: { tier: WinTier; amount: number }) {
  const isMega = tier === "megawin";
  const isBig  = tier === "bigwin" || isMega;

  const title = isMega ? "MEGA WIN!" : isBig ? "BIG WIN!" : "WIN!";
  const titleColor = isMega
    ? "linear-gradient(135deg,#fde68a,#fbbf24,#dc2626,#fbbf24,#fde68a)"
    : isBig
    ? "linear-gradient(135deg,#fde68a,#fbbf24,#d97706)"
    : "linear-gradient(135deg,#fde68a,#fbbf24)";

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
      {/* Rotating starburst rays for big/mega wins */}
      {isBig && (
        <div
          className="absolute"
          style={{
            width: 460, height: 460,
            background:
              "conic-gradient(from 0deg, rgba(251,191,36,0.0), rgba(251,191,36,0.32), rgba(251,191,36,0.0) 30deg, rgba(251,191,36,0.0) 30deg, rgba(251,191,36,0.32) 60deg, rgba(251,191,36,0.0) 90deg, rgba(251,191,36,0.0) 90deg, rgba(251,191,36,0.32) 120deg, rgba(251,191,36,0.0) 150deg, rgba(251,191,36,0.0) 150deg, rgba(251,191,36,0.32) 180deg, rgba(251,191,36,0.0) 210deg, rgba(251,191,36,0.0) 210deg, rgba(251,191,36,0.32) 240deg, rgba(251,191,36,0.0) 270deg, rgba(251,191,36,0.0) 270deg, rgba(251,191,36,0.32) 300deg, rgba(251,191,36,0.0) 330deg)",
            animation: "var(--animate-mega-rays)",
            filter: "blur(2px)",
            opacity: 0.85,
          }}
        />
      )}

      <div
        className="text-center px-10 py-7 rounded-2xl relative"
        style={{
          background: "rgba(0,0,0,0.78)",
          border: `2px solid ${isMega ? "rgba(220,38,38,0.55)" : "rgba(251,191,36,0.5)"}`,
          backdropFilter: "blur(6px)",
          animation: "var(--animate-mega-text)",
          boxShadow: isMega
            ? "0 0 50px rgba(220,38,38,0.5), 0 0 100px rgba(251,191,36,0.4)"
            : "0 0 36px rgba(251,191,36,0.4)",
        }}
      >
        <p
          className="font-black uppercase tracking-widest"
          style={{
            fontSize: isMega ? 30 : isBig ? 22 : 16,
            background: titleColor,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: isMega ? "drop-shadow(0 0 20px rgba(251,191,36,0.7))" : "drop-shadow(0 0 12px rgba(251,191,36,0.55))",
            letterSpacing: "0.18em",
          }}
        >
          {title}
        </p>
        <p
          className="font-black tabular-nums mt-1"
          style={{
            fontSize: isMega ? 64 : isBig ? 52 : 44,
            background: "linear-gradient(135deg,#fde68a,#fbbf24,#d97706)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 18px rgba(251,191,36,0.65))",
          }}
        >
          +${amount.toLocaleString()}
        </p>
        {isMega && <p className="text-xs text-amber-400/70 mt-2 uppercase tracking-[0.4em]">★ Jackpot ★</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coin rain — gravity-affected falling coins
// ---------------------------------------------------------------------------

function CoinRain({ heavy }: { heavy: boolean }) {
  const count = heavy ? 60 : 30;
  const coins = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      cx: Math.random() * 100,            // %
      drift: (Math.random() - 0.5) * 80,  // px
      cr: 360 + Math.random() * 720,      // deg
      delay: Math.random() * 0.9,         // s
      duration: 1.8 + Math.random() * 1.4, // s
      size: 14 + Math.random() * 12,
      color: ["#fbbf24", "#fde68a", "#d97706", "#f59e0b"][i % 4],
    })),
  [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-30">
      {coins.map((c) => (
        <div
          key={c.id}
          className="absolute"
          style={{
            left: `${c.cx}%`,
            top: 0,
            width: c.size,
            height: c.size,
            borderRadius: "50%",
            background: `radial-gradient(circle at 30% 30%, #fff7d6 0%, ${c.color} 40%, #92400e 100%)`,
            boxShadow: `0 0 10px ${c.color}, 0 0 18px ${c.color}66`,
            "--cx": "0px",
            "--drift": `${c.drift}px`,
            "--cr": `${c.cr}deg`,
            animation: `coin-fall ${c.duration}s linear ${c.delay}s forwards`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
