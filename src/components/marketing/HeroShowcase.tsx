import { Crown, KeyRound, Lock, CircleDot, Building2 } from "lucide-react";

/**
 * HeroShowcase
 * A staged, cinematic product showcase inspired by the My LOXX System Builder.
 * - Hierarchy nodes (Grand Master → Masters → Cylinders)
 * - Soft SVG branching lines that draw in
 * - One highlighted branch + one selected cylinder
 * - A subtle details panel updates alongside the selection
 *
 * This is a marketing visual only. It does not touch the real Builder.
 */
export function HeroShowcase() {
  return (
    <div className="relative">
      {/* Ambient depth glow */}
      <div
        aria-hidden
        className="absolute -inset-8 rounded-[32px] bg-gradient-to-tr from-primary/10 via-transparent to-primary/[0.04] blur-2xl"
      />
      <div
        aria-hidden
        className="absolute -top-10 -right-10 h-52 w-52 rounded-full bg-primary/10 blur-3xl"
      />

      {/* App frame — minimal, no browser chrome */}
      <div className="relative rounded-2xl border border-border/80 bg-card shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] overflow-hidden">
        {/* Slim top status bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/70 bg-[#fafafa]">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center h-6 w-6 rounded-md bg-primary/10">
              <Building2 className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-semibold text-foreground tracking-tight">
                Riverside Campus · Master Key System
              </span>
              <span className="text-[10px] text-muted-foreground">System Builder</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Auto-saved
            </span>
          </div>
        </div>

        {/* Stage */}
        <div className="relative bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.05),transparent_55%),radial-gradient(circle_at_80%_90%,hsl(var(--primary)/0.04),transparent_50%)]">
          {/* Faint grid backdrop */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
          />

          <div className="relative aspect-[5/4] sm:aspect-[16/11] p-6 sm:p-8">
            {/* Connecting lines */}
            <svg
              viewBox="0 0 500 340"
              className="absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
              aria-hidden
            >
              <defs>
                <linearGradient id="hero-line" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--border))" />
                  <stop offset="100%" stopColor="hsl(var(--border))" />
                </linearGradient>
                <linearGradient id="hero-line-active" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                </linearGradient>
              </defs>

              {/* GM → M1 (highlighted branch) */}
              <path
                d="M 250 55 C 250 95, 140 95, 140 140"
                fill="none"
                stroke="url(#hero-line-active)"
                strokeWidth="2"
                strokeLinecap="round"
                className="hero-draw hero-draw-1"
              />
              {/* GM → M2 */}
              <path
                d="M 250 55 C 250 95, 360 95, 360 140"
                fill="none"
                stroke="url(#hero-line)"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="hero-draw hero-draw-1"
              />

              {/* M1 → SM (highlighted) */}
              <path
                d="M 140 190 C 140 220, 140 220, 140 245"
                fill="none"
                stroke="url(#hero-line-active)"
                strokeWidth="2"
                strokeLinecap="round"
                className="hero-draw hero-draw-2"
              />

              {/* SM → Cyl A, B, C */}
              <path
                d="M 140 285 C 140 305, 60 305, 60 320"
                fill="none"
                stroke="url(#hero-line)"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="hero-draw hero-draw-3"
              />
              <path
                d="M 140 285 C 140 305, 140 305, 140 320"
                fill="none"
                stroke="url(#hero-line-active)"
                strokeWidth="2"
                strokeLinecap="round"
                className="hero-draw hero-draw-3"
              />
              <path
                d="M 140 285 C 140 305, 220 305, 220 320"
                fill="none"
                stroke="url(#hero-line)"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="hero-draw hero-draw-3"
              />

              {/* M2 → Cyl D, E */}
              <path
                d="M 360 190 C 360 230, 320 230, 320 260"
                fill="none"
                stroke="url(#hero-line)"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="hero-draw hero-draw-2"
              />
              <path
                d="M 360 190 C 360 230, 400 230, 400 260"
                fill="none"
                stroke="url(#hero-line)"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="hero-draw hero-draw-2"
              />
            </svg>

            {/* Nodes (absolute positioned as % to match viewBox proportions) */}
            {/* Grand Master */}
            <Node
              className="left-1/2 top-[3%] -translate-x-1/2 hero-pop hero-pop-1"
              tone="gm"
              icon={<Crown className="h-3.5 w-3.5" />}
              label="Grand Master"
              code="GM-01"
              subtitle="Opens everything"
            />

            {/* Master 1 (highlighted) */}
            <Node
              className="left-[16%] top-[38%] hero-pop hero-pop-2"
              tone="master"
              highlighted
              icon={<KeyRound className="h-3.5 w-3.5" />}
              label="Master · Building A"
              code="MA"
              subtitle="Admin block"
            />
            {/* Master 2 */}
            <Node
              className="right-[16%] top-[38%] hero-pop hero-pop-2"
              tone="master"
              icon={<KeyRound className="h-3.5 w-3.5" />}
              label="Master · Building B"
              code="MB"
              subtitle="Teaching block"
            />

            {/* Sub Master */}
            <Node
              className="left-[16%] top-[70%] hero-pop hero-pop-3"
              tone="sub"
              highlighted
              icon={<KeyRound className="h-3.5 w-3.5" />}
              label="Sub Master · Floor 2"
              code="MA.2"
              subtitle="3 doors"
            />

            {/* Cylinders row */}
            <CylinderDot className="left-[6%] top-[92%] hero-pop hero-pop-4" code="204" />
            <CylinderDot
              className="left-[24%] top-[92%] hero-pop hero-pop-4"
              code="205"
              selected
            />
            <CylinderDot className="left-[42%] top-[92%] hero-pop hero-pop-4" code="206" />
            <CylinderDot className="right-[35%] top-[76%] hero-pop hero-pop-3" code="112" />
            <CylinderDot className="right-[18%] top-[76%] hero-pop hero-pop-3" code="113" />
          </div>

          {/* Floating details panel */}
          <div className="absolute right-4 sm:right-6 top-24 sm:top-28 w-[210px] rounded-xl border border-border/80 bg-card/95 backdrop-blur-sm shadow-lg shadow-black/[0.06] p-4 hero-panel">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
                Selected
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <CircleDot className="h-3 w-3 text-primary" /> Cylinder
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2.5">
              <span className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
                <Lock className="h-4 w-4 text-primary" strokeWidth={2} />
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-foreground">Room 205</div>
                <div className="text-[11px] text-muted-foreground">Building A · Floor 2</div>
              </div>
            </div>
            <div className="mt-4 space-y-1.5 text-[11px]">
              <Row label="Cylinder" value="30/30" />
              <Row label="Keyed to" value="MA.2" highlight />
              <Row label="Keys issued" value="4" />
            </div>
          </div>
        </div>

        {/* Slim bottom bar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-border/70 bg-[#fafafa] text-[11px] text-foreground/60">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            1 Grand Master · 2 Masters · 1 Sub Master · 5 Cylinders
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
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes heroPanel {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-draw { opacity: 0; animation: heroDraw 1.4s ease-out forwards; }
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

function Node({
  className = "",
  tone,
  highlighted,
  icon,
  label,
  code,
  subtitle,
}: {
  className?: string;
  tone: "gm" | "master" | "sub";
  highlighted?: boolean;
  icon: React.ReactNode;
  label: string;
  code: string;
  subtitle?: string;
}) {
  const toneChip =
    tone === "gm"
      ? "bg-primary text-primary-foreground"
      : tone === "master"
      ? "bg-primary/15 text-primary"
      : "bg-foreground/10 text-foreground/70";

  return (
    <div
      className={`absolute ${className} ${
        highlighted
          ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-card shadow-lg shadow-primary/15"
          : "shadow-md shadow-black/[0.05]"
      } rounded-xl border border-border bg-card px-3 py-2 flex items-center gap-2.5 min-w-[150px]`}
    >
      <span
        className={`flex items-center justify-center h-7 w-7 rounded-md ${toneChip}`}
      >
        {icon}
      </span>
      <div className="leading-tight">
        <div className="text-[11px] font-semibold text-foreground">{label}</div>
        {subtitle && (
          <div className="text-[10px] text-muted-foreground">{subtitle}</div>
        )}
      </div>
      <span className="ml-auto text-[9px] font-mono font-medium text-foreground/50 pl-1">
        {code}
      </span>
    </div>
  );
}

function CylinderDot({
  className = "",
  code,
  selected,
}: {
  className?: string;
  code: string;
  selected?: boolean;
}) {
  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 ${className} ${
        selected
          ? "ring-2 ring-primary ring-offset-2 ring-offset-card bg-primary text-primary-foreground shadow-lg shadow-primary/25"
          : "bg-card text-foreground/70 border border-border shadow-sm"
      } rounded-lg px-2.5 py-1.5 flex items-center gap-1.5`}
    >
      <Lock className="h-3 w-3" strokeWidth={2} />
      <span className="text-[10px] font-semibold font-mono tracking-tight">{code}</span>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-medium ${
          highlight ? "text-primary font-mono" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
