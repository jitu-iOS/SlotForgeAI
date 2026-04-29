"use client";

import { useRef, useEffect } from "react";

interface Props {
  gameName?: string;
}

// ---------------------------------------------------------------------------
// LED bar — decorative row of blinking lights across the top / bottom
// ---------------------------------------------------------------------------
function LightBar({ reversed = false }: { reversed?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[5px] px-6 py-2">
      {Array.from({ length: 26 }, (_, i) => {
        const hue = (i * 14 + (reversed ? 180 : 0)) % 360;
        return (
          <span
            key={i}
            className="flex-shrink-0 rounded-full"
            style={{
              width: 7,
              height: 7,
              background: `hsl(${hue}, 90%, 60%)`,
              boxShadow: `0 0 6px 1px hsl(${hue}, 90%, 55%)`,
              animation: `led-blink ${0.7 + (i % 5) * 0.18}s ease-in-out ${(i % 7) * 0.11}s infinite alternate`,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Side LEDs — vertical strips on left / right cabinet edges
// ---------------------------------------------------------------------------
function SideStrip({ side }: { side: "left" | "right" }) {
  return (
    <div
      className="absolute top-0 bottom-0 flex flex-col justify-around items-center py-6 z-10"
      style={{ [side]: 10, width: 14 }}
    >
      {Array.from({ length: 10 }, (_, i) => {
        const hue = (i * 36) % 360;
        return (
          <span
            key={i}
            className="rounded-full flex-shrink-0"
            style={{
              width: 8,
              height: 8,
              background: `hsl(${hue}, 90%, 60%)`,
              boxShadow: `0 0 7px 2px hsl(${hue}, 90%, 50%)`,
              animation: `led-blink ${1 + (i % 4) * 0.22}s ease-in-out ${i * 0.14}s infinite alternate`,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main video preview cabinet
// ---------------------------------------------------------------------------
export default function SlotVideoPreview({ gameName = "SlotForge" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Ensure playback starts even if the browser delays it
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => { /* autoplay blocked — user will see paused first frame */ });
  }, []);

  return (
    <div className="flex flex-col items-center py-6 px-4 select-none">
      {/* Cabinet outer shell */}
      <div
        className="relative w-full max-w-4xl rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0d0a1e 0%, #12093a 40%, #0a0818 100%)",
          boxShadow:
            "0 0 0 2px rgba(251,191,36,0.45), 0 0 60px rgba(251,191,36,0.18), 0 30px 80px rgba(0,0,0,0.9)",
          border: "2px solid rgba(251,191,36,0.35)",
        }}
      >
        {/* Side LED strips */}
        <SideStrip side="left" />
        <SideStrip side="right" />

        {/* Top LED bar */}
        <LightBar />

        {/* Game title marquee */}
        <div className="text-center pt-2 pb-4 px-16">
          <h1
            className="text-4xl sm:text-5xl font-black tracking-widest uppercase"
            style={{
              background: "linear-gradient(135deg, #fde68a, #fbbf24, #d97706, #fbbf24, #fde68a)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 16px rgba(251,191,36,0.6))",
            }}
          >
            {gameName}
          </h1>
          <p className="text-[11px] font-bold tracking-[0.5em] uppercase text-amber-400/50 mt-1">
            ✦ Premium Casino Edition ✦
          </p>
        </div>

        {/* Video frame — the main stage */}
        <div className="mx-8 mb-6">
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              border: "3px solid rgba(251,191,36,0.5)",
              boxShadow:
                "0 0 40px rgba(251,191,36,0.2), inset 0 0 60px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            {/* Video — muted + loop required for autoplay; playsInline for iOS */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              src="/animation.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full block"
              style={{
                // Let the video fill the container at its natural aspect ratio
                // objectFit: cover fills without letterboxing; use contain to show full frame
                objectFit: "cover",
                // Force a minimum height so small-ratio videos still look substantial
                minHeight: 340,
                maxHeight: 600,
                imageRendering: "auto",
              }}
            />

            {/* Top gradient fade — depth effect */}
            <div
              className="absolute top-0 left-0 right-0 h-16 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)" }}
            />
            {/* Bottom gradient fade */}
            <div
              className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)" }}
            />

            {/* LIVE badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/65 backdrop-blur-sm rounded-full px-2.5 py-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-black tracking-[0.25em] uppercase text-white/80">Live</span>
            </div>

            {/* HD badge */}
            <div className="absolute top-3 right-3 bg-black/65 backdrop-blur-sm rounded-lg px-2 py-0.5">
              <span className="text-[10px] font-black tracking-wider text-amber-300/80">HD</span>
            </div>
          </div>
        </div>

        {/* Bottom info strip */}
        <div
          className="mx-8 mb-5 rounded-2xl px-5 py-3 flex items-center justify-between gap-4"
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.4))",
            border: "1px solid rgba(251,191,36,0.15)",
          }}
        >
          <div className="flex items-center gap-6">
            <StatPill label="RTP" value="96.5%" />
            <StatPill label="VOLATILITY" value="High" />
            <StatPill label="PAYLINES" value="243" />
          </div>
          <div
            className="text-xs font-bold tracking-[0.2em] uppercase px-4 py-2 rounded-xl"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#000",
              boxShadow: "0 0 18px rgba(245,158,11,0.4)",
            }}
          >
            🎰 SlotForge AI
          </div>
        </div>

        {/* Bottom LED bar */}
        <LightBar reversed />
      </div>

      {/* Reflection / glow beneath cabinet */}
      <div
        className="w-3/4 h-4 mt-2 rounded-full blur-2xl opacity-30"
        style={{ background: "linear-gradient(to right, #f59e0b, #d97706, #f59e0b)" }}
      />
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-600">{label}</span>
      <span
        className="text-sm font-black"
        style={{
          background: "linear-gradient(135deg, #fde68a, #fbbf24)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {value}
      </span>
    </div>
  );
}
