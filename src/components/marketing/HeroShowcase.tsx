import builderShot from "@/assets/builder-screenshot.png.asset.json";

/**
 * HeroShowcase
 * Premium marketing framing of the real My LOXX System Builder screenshot.
 * No fake UI — the screenshot itself is the visual.
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

        {/* Screenshot stage */}
        <div className="relative bg-[#fafafa] aspect-[16/11] overflow-hidden">
          {/* Slow, subtle pan/zoom on the real screenshot */}
          <img
            src={builderShot.url}
            alt="My LOXX System Builder — Grand Master, Master, Sub Master and Cylinder hierarchy"
            className="absolute inset-0 h-full w-full object-cover object-center hero-kenburns select-none"
            draggable={false}
          />

          {/* Soft highlight on the central branch */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[70%] w-[38%] rounded-[40%] bg-primary/10 blur-3xl hero-glow"
          />

          {/* Gentle edge fades so the crop sits naturally in the frame */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#fafafa] to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#fafafa] to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#fafafa] to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#fafafa]/70 to-transparent"
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
        @keyframes heroKenburns {
          0%   { transform: scale(1.06) translate(0%, 0%); }
          50%  { transform: scale(1.10) translate(-1.2%, -0.8%); }
          100% { transform: scale(1.06) translate(0%, 0%); }
        }
        @keyframes heroGlow {
          0%,100% { opacity: 0.55; }
          50%     { opacity: 0.85; }
        }
        .hero-kenburns {
          transform-origin: 50% 45%;
          animation: heroKenburns 18s ease-in-out infinite;
        }
        .hero-glow {
          animation: heroGlow 6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-kenburns, .hero-glow { animation: none; }
        }
      `}</style>
    </div>
  );
}
