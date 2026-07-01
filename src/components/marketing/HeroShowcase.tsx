import { Plus, KeyRound } from "lucide-react";

/**
 * HeroShowcase
 * A polished, cropped marketing rendering of the real My LOXX System Builder.
 * Mirrors CanvasNode styling: type label, coloured left border, subtle tint,
 * centred content, footer stats — plus real connectors, orange add buttons,
 * a dotted canvas background, and a details panel matching the real one.
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

      {/* App frame */}
      <div className="relative rounded-2xl border border-border/80 bg-card shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] overflow-hidden">
        {/* Top toolbar — modelled on real builder header */}
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
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Auto-saved
            </span>
          </div>
        </div>

        {/* Body: canvas + right details panel */}
        <div className="grid grid-cols-[1fr_190px]">
          {/* Canvas */}
          <div
            className="relative bg-white"
            style={{
              backgroundImage:
                "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          >
            <div className="relative aspect-[5/4] sm:aspect-[16/11]">
              {/* Connectors */}
              <svg
                viewBox="0 0 500 400"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
                aria-hidden
              >
                {/* GMK (250,60) → MK1 (140,150) */}
                <path
                  d="M 250 78 V 115 H 140 V 150"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="1.5"
                  className="hero-draw hero-draw-1"
                />
                {/* GMK → MK2 (360,150) */}
                <path
                  d="M 250 78 V 115 H 360 V 150"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="1.5"
                  className="hero-draw hero-draw-1"
                />

                {/* MK1 (140,180) → SMK1 (80,260) */}
                <path
                  d="M 140 180 V 220 H 80 V 260"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="1.5"
                  className="hero-draw hero-draw-2"
                />
                {/* MK1 → SMK2 (210,260) — highlighted branch */}
                <path
                  d="M 140 180 V 220 H 210 V 260"
                  fill="none"
                  stroke="hsl(var(--node-smk))"
                  strokeWidth="2"
                  className="hero-draw hero-draw-2"
                />

                {/* SMK2 (210,290) → CYLs */}
                <path
                  d="M 210 290 V 325 H 140 V 350"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="1.5"
                  className="hero-draw hero-draw-3"
                />
                <path
                  d="M 210 290 V 325 H 210 V 350"
                  fill="none"
                  stroke="hsl(var(--node-cyl))"
                  strokeWidth="2"
                  className="hero-draw hero-draw-3"
                />
                <path
                  d="M 210 290 V 325 H 280 V 350"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="1.5"
                  className="hero-draw hero-draw-3"
                />
              </svg>

              {/* Nodes — positioned in % to match viewBox proportions */}
              {/* GMK */}
              <NodeCard
                className="left-1/2 top-[6%] -translate-x-1/2 hero-pop hero-pop-1"
                tintVar="--node-gmk"
                type="GRAND MASTER KEY"
                label="Site Grand Master"
                footer="2 buildings · 3 keys"
              />

              {/* Orange add button between GMK and MK row */}
              <AddDot className="left-1/2 top-[26%] -translate-x-1/2 hero-pop hero-pop-1" />

              {/* MK 1 (highlighted / focused branch) */}
              <NodeCard
                className="left-[16%] top-[36%] hero-pop hero-pop-2"
                tintVar="--node-mk"
                type="MASTER KEY"
                label="Building A · Admin"
                sub="MA"
                footer="2 zones · 6 keys"
                highlight
              />
              {/* MK 2 */}
              <NodeCard
                className="right-[16%] top-[36%] hero-pop hero-pop-2"
                tintVar="--node-mk"
                type="MASTER KEY"
                label="Building B · Teaching"
                sub="MB"
                footer="3 zones · 8 keys"
              />

              {/* Add dot under MK1 */}
              <AddDot className="left-[27%] top-[56%] hero-pop hero-pop-2" />

              {/* SMK 1 */}
              <NodeCard
                className="left-[6%] top-[62%] hero-pop hero-pop-3"
                tintVar="--node-smk"
                type="SUB MASTER KEY"
                label="Ground Floor"
                sub="MA.1"
                footer="4 cylinders"
              />
              {/* SMK 2 highlighted */}
              <NodeCard
                className="left-[32%] top-[62%] hero-pop hero-pop-3"
                tintVar="--node-smk"
                type="SUB MASTER KEY"
                label="First Floor"
                sub="MA.2"
                footer="3 cylinders"
                highlight
              />

              {/* Add dot under SMK 2 */}
              <AddDot className="left-[42%] top-[81%] hero-pop hero-pop-3" />

              {/* Cylinders */}
              <CylCard
                className="left-[19%] top-[86%] hero-pop hero-pop-4"
                label="Office 101"
                differ="D021"
              />
              <CylCard
                className="left-[36%] top-[86%] hero-pop hero-pop-4"
                label="Office 102"
                differ="D022"
                selected
              />
              <CylCard
                className="left-[53%] top-[86%] hero-pop hero-pop-4"
                label="Office 103"
                differ="D023"
              />
            </div>
          </div>

          {/* Right details panel — mirrors the real details panel */}
          <aside className="border-l border-border bg-[#fafafa] p-4 flex flex-col gap-4 hero-panel">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Details
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: "hsl(var(--node-cyl))" }}
                />
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "hsl(var(--node-cyl))" }}
                >
                  Cylinder
                </span>
              </div>
              <div className="mt-1.5 text-sm font-semibold text-foreground leading-tight">
                Office 102
              </div>
              <div className="text-[11px] text-muted-foreground">
                Building A · First Floor
              </div>
            </div>

            <div className="rounded-md border border-border bg-card p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Differ
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono font-semibold text-[11px] px-1.5 py-0.5 rounded"
                  style={{
                    background: "hsl(36 94% 95%)",
                    color: "hsl(var(--node-cyl))",
                  }}
                >
                  D022
                </span>
                <span className="text-[11px] text-muted-foreground">30 / 30</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Access
              </div>
              <div className="space-y-1">
                <AccessRow tintVar="--node-gmk" label="Site Grand Master" />
                <AccessRow tintVar="--node-mk" label="MA · Admin" />
                <AccessRow tintVar="--node-smk" label="MA.2 · First Floor" />
              </div>
            </div>

            <div className="mt-auto rounded-md bg-primary/10 p-2.5 flex items-center gap-2">
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-medium text-foreground">
                4 keys issued
              </span>
            </div>
          </aside>
        </div>

        {/* Bottom status bar */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-[#fafafa] text-[10px] text-foreground/60">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "hsl(var(--node-gmk))" }}
            />
            1 Grand Master · 2 Masters · 2 Sub Masters · 7 Cylinders
          </span>
          <span className="font-medium text-foreground/70">Live preview</span>
        </div>
      </div>

      <style>{`
        @keyframes heroDraw {
          from { stroke-dasharray: 400; stroke-dashoffset: 400; opacity: 0; }
          to   { stroke-dasharray: 400; stroke-dashoffset: 0;   opacity: 1; }
        }
        @keyframes heroPop {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes heroPanel {
          from { opacity: 0; transform: translateX(8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .hero-draw { opacity: 0; animation: heroDraw 1.3s ease-out forwards; }
        .hero-draw-1 { animation-delay: 0.15s; }
        .hero-draw-2 { animation-delay: 0.75s; }
        .hero-draw-3 { animation-delay: 1.35s; }

        .hero-pop { opacity: 0; animation: heroPop 0.7s ease-out forwards; }
        .hero-pop-1 { animation-delay: 0.05s; }
        .hero-pop-2 { animation-delay: 0.65s; }
        .hero-pop-3 { animation-delay: 1.25s; }
        .hero-pop-4 { animation-delay: 1.75s; }

        .hero-panel { opacity: 0; animation: heroPanel 0.8s ease-out 2.1s forwards; }
      `}</style>
    </div>
  );
}

/** Node card matching the real CanvasNode style (compact hero variant). */
function NodeCard({
  className = "",
  tintVar,
  type,
  label,
  sub,
  footer,
  highlight,
}: {
  className?: string;
  tintVar: string;
  type: string;
  label: string;
  sub?: string;
  footer?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`absolute w-[150px] rounded-lg bg-card text-center px-2.5 py-1.5 transition-shadow ${className}`}
      style={{
        borderLeft: `3px solid hsl(var(${tintVar}))`,
        boxShadow: highlight
          ? `0 4px 14px hsl(var(${tintVar}) / 0.25), 0 0 0 2px hsl(var(${tintVar}) / 0.35)`
          : "0 1px 2px rgba(0,0,0,0.05), 0 0 0 1px hsl(var(--border))",
        background: highlight ? `hsl(var(${tintVar}) / 0.10)` : undefined,
      }}
    >
      <div
        className="uppercase font-sans"
        style={{
          fontSize: 9,
          letterSpacing: "0.08em",
          color: `hsl(var(${tintVar}))`,
          marginBottom: 2,
        }}
      >
        {type}
      </div>
      <div
        className="font-semibold leading-tight truncate text-foreground"
        style={{ fontSize: 12 }}
      >
        {label}
      </div>
      {sub && (
        <div
          className="font-sans truncate"
          style={{
            fontSize: 9,
            color: "hsl(var(--node-cyl))",
            marginTop: 1,
          }}
        >
          {sub}
        </div>
      )}
      {footer && (
        <div className="text-muted-foreground" style={{ fontSize: 9, marginTop: 2 }}>
          {footer}
        </div>
      )}
    </div>
  );
}

/** Cylinder card — compact hero variant of the real CYL node. */
function CylCard({
  className = "",
  label,
  differ,
  selected,
}: {
  className?: string;
  label: string;
  differ: string;
  selected?: boolean;
}) {
  return (
    <div
      className={`absolute w-[130px] rounded-lg bg-card text-center px-2 py-1.5 ${className}`}
      style={{
        borderLeft: `3px solid hsl(var(--node-cyl))`,
        boxShadow: selected
          ? `0 6px 18px hsl(var(--node-cyl) / 0.30), 0 0 0 2px hsl(var(--node-cyl))`
          : "0 1px 2px rgba(0,0,0,0.05), 0 0 0 1px hsl(var(--border))",
        background: selected ? "hsl(var(--node-cyl) / 0.10)" : undefined,
      }}
    >
      <div
        className="uppercase font-sans"
        style={{
          fontSize: 9,
          letterSpacing: "0.08em",
          color: "hsl(var(--node-cyl))",
          marginBottom: 2,
        }}
      >
        CYLINDER
      </div>
      <div
        className="font-semibold leading-tight truncate text-foreground"
        style={{ fontSize: 11 }}
      >
        {label}
      </div>
      <div className="flex items-center justify-center gap-1 mt-1">
        <span
          className="font-sans font-semibold px-1.5 py-0.5 rounded"
          style={{
            fontSize: 9,
            background: "hsl(36 94% 95%)",
            color: "hsl(var(--node-cyl))",
          }}
        >
          {differ}
        </span>
      </div>
    </div>
  );
}

/** Orange circular add button rendered on connectors, matching builder style. */
function AddDot({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-5 w-5 rounded-full shadow-md ${className}`}
      style={{
        background: "hsl(var(--node-cyl))",
        color: "white",
      }}
    >
      <Plus className="h-3 w-3" strokeWidth={3} />
    </span>
  );
}

function AccessRow({ tintVar, label }: { tintVar: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: `hsl(var(${tintVar}))` }}
      />
      <span className="text-[11px] text-foreground truncate">{label}</span>
    </div>
  );
}
