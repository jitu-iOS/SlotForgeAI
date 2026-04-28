// Skeleton loader shown while /api/generate is running.
// Mirrors the real grid layout so the page height doesn't jump on load.

export function SkeletonStyleDNA() {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/10 animate-shimmer" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-20 rounded bg-white/10 animate-shimmer" />
          <div className="h-2.5 w-40 rounded bg-white/[0.06] animate-shimmer" />
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {[60, 72, 80].map((w, i) => (
          <div key={i} className="h-6 rounded-full bg-white/8 animate-shimmer" style={{ width: w }} />
        ))}
      </div>

      {/* Palette row */}
      <div className="flex flex-col gap-2">
        <div className="h-2.5 w-24 rounded bg-white/[0.06] animate-shimmer" />
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-7 w-16 rounded-lg bg-white/8 animate-shimmer" />
          ))}
        </div>
      </div>

      {/* Hint blocks */}
      <div className="grid sm:grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl bg-white/[0.03] border border-white/10 p-4 flex flex-col gap-2">
            <div className="h-2.5 w-16 rounded bg-white/[0.06] animate-shimmer" />
            <div className="h-2.5 w-full rounded bg-white/8 animate-shimmer" />
            <div className="h-2.5 w-3/4 rounded bg-white/8 animate-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface SkeletonSection {
  count: number;
  cols: string;
}

const SKELETON_SECTIONS: SkeletonSection[] = [
  { count: 5, cols: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" },  // high symbols
  { count: 6, cols: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" },  // low symbols
];

export function SkeletonGrid() {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Grid header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-20 rounded bg-white/10 animate-shimmer" />
          <div className="h-2.5 w-32 rounded bg-white/[0.06] animate-shimmer" />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-6 py-3 border-b border-white/10 overflow-x-auto">
        {[52, 44, 96, 82, 80, 76].map((w, i) => (
          <div
            key={i}
            className="flex-shrink-0 h-7 rounded-xl bg-white/8 animate-shimmer"
            style={{ width: w }}
          />
        ))}
      </div>

      {/* Sections */}
      <div className="px-6 py-6 flex flex-col gap-10">
        {SKELETON_SECTIONS.map((section, sIdx) => (
          <div key={sIdx}>
            {/* Section header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded bg-white/10 animate-shimmer" />
                <div className="h-3 w-24 rounded bg-white/10 animate-shimmer" />
                <div className="h-4 w-6 rounded-full bg-white/[0.06] animate-shimmer" />
              </div>
              <div className="h-3 w-14 rounded bg-white/[0.06] animate-shimmer" />
            </div>

            {/* Card grid */}
            <div className={`grid gap-3 ${section.cols}`}>
              {Array.from({ length: section.count }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden border border-white/10">
                  <div className="aspect-square bg-white/[0.06] animate-shimmer" />
                  <div className="px-2.5 py-2 bg-black/30">
                    <div
                      className="h-2.5 rounded bg-white/10 animate-shimmer"
                      style={{ width: `${50 + ((i * 19) % 38)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
