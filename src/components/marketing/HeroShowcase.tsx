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
        {/* Screenshot stage — contain-fit, subtle float */}
        <div className="relative bg-card aspect-[16/10] sm:aspect-[16/10] overflow-hidden">
          <div className="absolute inset-0 hero-float">
            <img
              src={builderShot.url}
              alt="My LOXX System Builder — Grand Master, Master, Sub Master and Cylinder hierarchy"
              className="absolute inset-0 h-full w-full object-contain object-center select-none"
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
