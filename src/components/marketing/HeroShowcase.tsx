import builderShot from "@/assets/builder-screenshot.png.asset.json";

/**
 * HeroShowcase
 * Premium marketing framing of the real My LOXX System Builder screenshot.
 * - Contain-fit so the full GMK→MK→SMK→CYL hierarchy is visible
 * - Slow ken-burns pan on the image (respects reduced-motion)
 * - Subtle overlays: soft branch glow, gentle pulse on one add button
 */
export function HeroShowcase() {
  return (
    <div className="relative">
      {/* Ambient depth */}
      <div
        aria-hidden
        className="absolute -inset-8 rounded-[32px] bg-gradient-to-tr from-primary/10 via-transparent to-primary/[0.04] blur-2xl"
      />
      <div
        aria-hidden
        className="absolute -top-10 -right-10 h-52 w-52 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-12 -left-10 h-56 w-56 rounded-full bg-primary/[0.07] blur-3xl"
      />

      {/* App frame */}
      <div className="relative rounded-2xl border border-border/80 bg-card shadow-[0_30px_80px_-30px_rgba(0,0,0,0.28)] overflow-hidden">
        {/* Top toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-[#fafafa]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-[11px] font-semibold text-foreground truncate">
              Riverside Campus
            </span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              · System Builder
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Auto-saved
          </span>
        </div>

        {/* Screenshot stage — taller frame, contain-fit, subtle float */}
        <div className="relative bg-[#fafafa] aspect-[7/6] sm:aspect-[16/13] overflow-hidden">
          <div className="absolute inset-0 hero-float">
            <img
              src={builderShot.url}
              alt="My LOXX System Builder — Grand Master, Master, Sub Master and Cylinder hierarchy"
              className="absolute inset-0 h-full w-full object-contain object-center p-4 sm:p-6 select-none"
              draggable={false}
            />
          </div>

          {/* Soft highlight around the central/left branch */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[28%] top-[52%] -translate-x-1/2 -translate-y-1/2 h-[55%] w-[32%] rounded-[45%] bg-primary/15 blur-3xl hero-glow"
          />

          {/* Subtle pulse over one orange add button (approx GMK→MK connector) */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[19%] -translate-x-1/2 h-6 w-6 rounded-full bg-primary/40 blur-md hero-pulse"
          />

          {/* Very gentle edge fades — subtle so nothing important gets hidden */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#fafafa] to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#fafafa]/60 to-transparent"
          />
        </div>

        {/* Bottom status bar */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-[#fafafa] text-[10px] text-foreground/60">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "hsl(245 60% 67%)" }}
            />
            1 Grand Master · 2 Masters · 2 Sub Masters · 4 Cylinders
          </span>
          <span className="font-medium text-foreground/70">Live preview</span>
        </div>
      </div>

      <style>{`
        @keyframes heroFloat {
          0%   { transform: scale(1.00) translate(0%, 0%); }
          50%  { transform: scale(1.02) translate(-0.6%, -0.4%); }
          100% { transform: scale(1.00) translate(0%, 0%); }
        }
        @keyframes heroGlow {
          0%,100% { opacity: 0.45; }
          50%     { opacity: 0.8; }
        }
        @keyframes heroPulse {
          0%,100% { opacity: 0.25; transform: translateX(-50%) scale(0.9); }
          50%     { opacity: 0.7;  transform: translateX(-50%) scale(1.25); }
        }
        .hero-float  { animation: heroFloat 20s ease-in-out infinite; transform-origin: 50% 45%; }
        .hero-glow   { animation: heroGlow 7s ease-in-out infinite; }
        .hero-pulse  { animation: heroPulse 3.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .hero-float, .hero-glow, .hero-pulse { animation: none; }
        }
      `}</style>
    </div>
  );
}
