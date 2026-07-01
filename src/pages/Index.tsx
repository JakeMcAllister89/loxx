import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoxxLogo } from "@/components/LoxxLogo";
import {
  ArrowRight, Check, ChevronDown, Layers, ClipboardList, ShoppingCart,
  LayoutDashboard, ShieldCheck, GitBranch, GraduationCap, HeartPulse,
  Building2, Landmark, Home, Factory, Cloud, History, Users, Wallet,
  FileSpreadsheet, FileText, Mail, StickyNote, Brain,
  KeyRound, Boxes, Receipt,
} from "lucide-react";
import { HeroCanvasDemo } from "@/components/marketing/HeroCanvasDemo";
import { HeroShowcase } from "@/components/marketing/HeroShowcase";

const workflow = [
  {
    icon: Layers,
    step: "01",
    title: "Design",
    headline: "Create your hierarchy visually.",
    copy: "Build master key systems around buildings, floors, doors, keys and cylinders.",
  },
  {
    icon: ClipboardList,
    step: "02",
    title: "Manage",
    headline: "Keep every record organised.",
    copy: "See who has access, what each key opens and how your system changes over time.",
  },
  {
    icon: ShoppingCart,
    step: "03",
    title: "Order",
    headline: "Order what you need, when you need it.",
    copy: "Request replacement keys, additional cylinders and system expansions without emails or guesswork.",
  },
];

const features = [
  {
    icon: GitBranch,
    label: "System Builder",
    headline: "Build your system visually.",
    copy: "Create clear master key hierarchies so everyone understands how buildings, keys and cylinders connect.",
  },
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    headline: "See the whole system at a glance.",
    copy: "Track buildings, doors, cylinders, keys, orders and recent activity from one organised workspace.",
  },
  {
    icon: ShoppingCart,
    label: "Ordering",
    headline: "Order without the back-and-forth.",
    copy: "Create orders for keys, cylinders and expansions directly from your system record.",
  },
  {
    icon: ShieldCheck,
    label: "Audit & Permissions",
    headline: "Control who can see and change your system.",
    copy: "Give the right people the right access and keep a clear history of important changes.",
  },
];

const sectors = [
  { icon: GraduationCap, t: "Education", s: "Schools, colleges and universities managing keyed access across many buildings and departments." },
  { icon: HeartPulse, t: "Healthcare", s: "Hospitals and care sites where controlled access matters every day." },
  { icon: Building2, t: "Commercial buildings", s: "Offices and mixed-use sites with tenants, contractors and shared spaces." },
  { icon: Landmark, t: "Local government", s: "Council estates and civic buildings that need clear records and audit history." },
  { icon: Home, t: "Property management", s: "Managing agents keeping keys, cylinders and access consistent across a portfolio." },
  { icon: Factory, t: "Industrial sites", s: "Warehouses and plants where zoned access needs to be reliable and enforceable." },
];

const trustPoints = [
  { icon: Cloud, t: "Secure cloud platform" },
  { icon: History, t: "Complete audit history" },
  { icon: Users, t: "Organisation-based access control" },
  { icon: Building2, t: "Designed for facilities and estates teams" },
  { icon: KeyRound, t: "Built around real master key system workflows" },
  { icon: Wallet, t: "No software subscription" },
];

const faqs = [
  {
    q: "Can I manage an existing master key system in My LOXX?",
    a: "Yes. You can bring an existing system into My LOXX and keep managing it from there, alongside any new systems you design.",
  },
  {
    q: "Can multiple users access the same organisation?",
    a: "Yes. Invite your team and give each person the right level of access — from full control to view-only.",
  },
  {
    q: "Can I manage more than one building?",
    a: "Yes. Manage a single site or an entire estate from one account, with each building organised separately.",
  },
  {
    q: "Can I order replacement keys and cylinders?",
    a: "Yes. Order replacement keys, additional cylinders and system expansions directly from your system record.",
  },
  {
    q: "Does My LOXX replace my locksmith?",
    a: "No. My LOXX is the digital home for your master key system — the record, the workflow and the ordering channel behind it.",
  },
  {
    q: "Is there a software subscription?",
    a: "No. There is no software subscription. You pay only when you order hardware.",
  },
];

const oldWay = [
  { icon: FileSpreadsheet, t: "Spreadsheets" },
  { icon: FileText, t: "PDFs" },
  { icon: Mail, t: "Emails" },
  { icon: StickyNote, t: "Locksmith notes" },
  { icon: Brain, t: "Individual memory" },
];

const newWay = [
  { icon: Building2, t: "Buildings" },
  { icon: KeyRound, t: "Keys" },
  { icon: Boxes, t: "Cylinders" },
  { icon: Receipt, t: "Orders" },
  { icon: History, t: "Audit history" },
  { icon: Users, t: "Team access" },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-base font-semibold text-foreground">{q}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="pb-5 pr-8 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="bg-[#fafafa] text-foreground border-b border-border/60">
        <div className="container flex items-center justify-between py-4">
          <LoxxLogo />
          <nav className="flex items-center gap-2">
            <Link to="/auth" className="text-sm px-3 py-2 text-foreground/70 hover:text-foreground">Sign in</Link>
            <Button asChild className="bg-primary hover:bg-primary/90"><Link to="/auth?mode=signup">Get started</Link></Button>
          </nav>
        </div>
      </header>

      {/* SECTION 1 — HERO */}
      <section className="bg-[#fafafa] relative overflow-hidden">
        <div className="container relative py-16 md:py-24 grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              The digital home for your master key system
            </span>

            <h1 className="mt-5 font-extrabold text-4xl md:text-[3.4rem] leading-[1.05] tracking-tight text-foreground">
              One place for every key, every cylinder and every door.
            </h1>

            <p className="mt-6 text-lg text-foreground/65 max-w-xl leading-relaxed">
              My LOXX brings your entire master key system together in one secure platform. Design systems, manage changes, order replacements and keep a permanent digital record your team can trust.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                <Link to="/auth?mode=signup">Get Started <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-border bg-transparent text-foreground hover:bg-black/[0.03]">
                <a href="#book-a-demo">Book a Demo</a>
              </Button>
            </div>
          </div>

          <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
            <HeroShowcase />
          </div>

        </div>
      </section>

      {/* SECTION 2 — WHY MY LOXX EXISTS */}
      <section className="border-t border-border">
        <div className="container py-20 md:py-28 grid md:grid-cols-[1fr_1.1fr] gap-14 items-start">
          <div className="md:sticky md:top-16">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Why My LOXX</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
              Master key systems evolve. Their records rarely do.
            </h2>
            <div className="mt-6 space-y-4 text-[15px] text-muted-foreground leading-relaxed max-w-md">
              <p>Buildings change. Departments move. Keys are issued. Doors are added. People leave.</p>
              <p>Yet many organisations still rely on spreadsheets, PDFs, emails and individual knowledge to manage systems that may exist for decades.</p>
              <p className="text-foreground font-medium">My LOXX brings everything together into one permanent digital record your team can trust.</p>
            </div>
          </div>

          <div className="relative">
            {/* BEFORE — scattered records */}
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Before My LOXX
              </div>
              <p className="mt-1 text-xs text-muted-foreground/80">Information is scattered.</p>

              <div className="relative mt-5 h-[220px]">
                {oldWay.map((o, i) => {
                  const pos = [
                    "left-0 top-2 -rotate-3",
                    "left-[30%] top-0 rotate-2",
                    "right-2 top-6 -rotate-2",
                    "left-[12%] bottom-2 rotate-1",
                    "right-[18%] bottom-0 -rotate-1",
                  ][i];
                  return (
                    <span
                      key={o.t}
                      style={{ animationDelay: `${i * 0.35}s` }}
                      className={`scatter-item absolute ${pos} inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm`}
                    >
                      <o.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {o.t}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Transition — hierarchy line + dot into container */}
            <div aria-hidden className="relative mx-auto my-4 h-10 w-px">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/60 to-primary" />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]" />
            </div>

            {/* AFTER — single organised system container */}
            <div className="relative rounded-2xl border border-border border-l-[3px] border-l-primary bg-card p-6 shadow-sm overflow-hidden after-highlight">
              <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
                    With My LOXX
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Everything has a permanent digital home.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-foreground/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  System record
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {newWay.map((n) => (
                  <span
                    key={n.t}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-foreground"
                  >
                    <n.icon className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                    {n.t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <style>{`
            @keyframes scatterSettle {
              0%   { transform: translate(var(--sx,0), var(--sy,-6px)) rotate(var(--sr,0deg)); opacity: 0.55; }
              60%  { opacity: 1; }
              100% { transform: translate(0,0) rotate(var(--r,0deg)); opacity: 1; }
            }
            .scatter-item { animation: scatterSettle 1.4s ease-out both; }
            @keyframes afterGlow {
              0%,100% { box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
              50%     { box-shadow: 0 10px 40px -20px hsl(var(--primary) / 0.35); }
            }
            .after-highlight { animation: afterGlow 6s ease-in-out infinite; }
            @media (prefers-reduced-motion: reduce) {
              .scatter-item, .after-highlight { animation: none; }
            }
          `}</style>
        </div>
      </section>

      {/* SECTION 3 — DESIGN / MANAGE / ORDER */}
      <section className="border-t border-border bg-card">
        <div className="container py-20 md:py-28">
          <div className="max-w-2xl">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">The workflow</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">Design. Manage. Order.</h2>
            <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
              Everything your master key system needs, from first design to future expansion.
            </p>
          </div>

          <div className="mt-16 relative">
            {/* Desktop journey path */}
            <div className="hidden md:block absolute top-[56px] left-[12%] right-[12%] h-[2px] bg-border" aria-hidden="true" />

            {/* Mobile journey path */}
            <div className="md:hidden absolute left-[27px] top-[52px] bottom-[52px] w-[2px] bg-border" aria-hidden="true" />

            <div className="grid md:grid-cols-3 gap-12 md:gap-6">
              {/* DESIGN — starting point */}
              <div className="relative">
                {/* Numbered stop */}
                <div className="hidden md:flex absolute top-[48px] left-1/2 -translate-x-1/2 z-10">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background border-2 shadow-sm" style={{ borderColor: 'hsl(var(--node-gmk))' }}>
                    <span className="text-[9px] font-bold" style={{ color: 'hsl(var(--node-gmk))' }}>01</span>
                  </span>
                </div>
                <div className="md:hidden absolute left-[17px] top-[44px] z-10">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 shadow-sm" style={{ borderColor: 'hsl(var(--node-gmk))' }}>
                    <span className="text-[9px] font-bold" style={{ color: 'hsl(var(--node-gmk))' }}>01</span>
                  </span>
                </div>

                <div className="bg-background rounded-xl border border-border p-6 shadow-sm relative overflow-hidden" style={{ borderTopWidth: 3, borderTopColor: 'hsl(var(--node-gmk))' }}>
                  <div className="flex flex-col items-center">
                    {/* Real builder-style hierarchy */}
                    <div className="w-full max-w-[160px] flex flex-col items-center gap-1">
                      <div className="w-full rounded-md border border-border bg-card shadow-sm overflow-hidden">
                        <div className="h-[3px] w-full" style={{ backgroundColor: 'hsl(var(--node-gmk))' }} />
                        <div className="px-2 py-1.5 text-center">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Grand Master Key</span>
                        </div>
                      </div>
                      <div className="h-2.5 w-px bg-border relative">
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'hsl(var(--node-gmk))', opacity: 0.5 }} />
                      </div>
                      <div className="w-[90%] rounded-md border border-border bg-card shadow-sm overflow-hidden">
                        <div className="h-[3px] w-full" style={{ backgroundColor: 'hsl(var(--node-mk))' }} />
                        <div className="px-2 py-1.5 text-center">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Master Key</span>
                        </div>
                      </div>
                      <div className="h-2.5 w-px bg-border relative">
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'hsl(var(--node-mk))', opacity: 0.5 }} />
                      </div>
                      <div className="w-[75%] rounded-md border border-border bg-card shadow-sm overflow-hidden">
                        <div className="h-[3px] w-full" style={{ backgroundColor: 'hsl(var(--node-cyl))' }} />
                        <div className="px-2 py-1.5 text-center">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Cylinder</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 text-center">
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">01 Design</span>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight">Build the structure</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                      Create your master key hierarchy visually.
                    </p>
                  </div>
                </div>
              </div>

              {/* MANAGE — ongoing record */}
              <div className="relative">
                <div className="hidden md:flex absolute top-[48px] left-1/2 -translate-x-1/2 z-10">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background border-2 shadow-sm" style={{ borderColor: 'hsl(var(--node-mk))' }}>
                    <span className="text-[9px] font-bold" style={{ color: 'hsl(var(--node-mk))' }}>02</span>
                  </span>
                </div>
                <div className="md:hidden absolute left-[17px] top-[44px] z-10">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 shadow-sm" style={{ borderColor: 'hsl(var(--node-mk))' }}>
                    <span className="text-[9px] font-bold" style={{ color: 'hsl(var(--node-mk))' }}>02</span>
                  </span>
                </div>

                <div className="bg-background rounded-xl border border-border p-6 shadow-sm relative overflow-hidden" style={{ borderTopWidth: 3, borderTopColor: 'hsl(var(--node-mk))' }}>
                  <div className="flex flex-col items-center">
                    {/* Organised record view */}
                    <div className="w-full max-w-[180px] rounded-lg border border-border bg-card p-3 shadow-sm">
                      <div className="space-y-1.5">
                        {[
                          { label: "Building", value: "Building A", accent: "text-primary" },
                          { label: "Key holder", value: "Sarah Wells", accent: "text-foreground" },
                          { label: "Cylinder", value: "Cylinder 5", accent: "text-foreground" },
                          { label: "Door", value: "Main entrance", accent: "text-foreground" },
                          { label: "Audit", value: "Key issued · 2d ago", accent: "text-muted-foreground" },
                        ].map((row) => (
                          <div key={row.label} className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground/70">{row.label}</span>
                            <span className={`font-medium ${row.accent}`}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 text-center">
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">02 Manage</span>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight">Keep it current</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                      Keep every building, key, cylinder and user organised.
                    </p>
                  </div>
                </div>
              </div>

              {/* ORDER — outcome */}
              <div className="relative">
                <div className="hidden md:flex absolute top-[48px] left-1/2 -translate-x-1/2 z-10">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background border-2 shadow-sm" style={{ borderColor: 'hsl(var(--primary))' }}>
                    <span className="text-[9px] font-bold" style={{ color: 'hsl(var(--primary))' }}>03</span>
                  </span>
                </div>
                <div className="md:hidden absolute left-[17px] top-[44px] z-10">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 shadow-sm" style={{ borderColor: 'hsl(var(--primary))' }}>
                    <span className="text-[9px] font-bold" style={{ color: 'hsl(var(--primary))' }}>03</span>
                  </span>
                </div>

                <div className="bg-background rounded-xl border border-border p-6 shadow-sm relative overflow-hidden" style={{ borderTopWidth: 3, borderTopColor: 'hsl(var(--primary))' }}>
                  <div className="flex flex-col items-center">
                    {/* My LOXX quote/order */}
                    <div className="w-full max-w-[180px] rounded-lg border border-border bg-card p-3 shadow-sm">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5 mb-1.5">
                        <span>Quote</span>
                        <span className="font-medium text-primary">Ready</span>
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { name: "Replacement key", qty: "3" },
                          { name: "Euro cylinder", qty: "2" },
                          { name: "Master key", qty: "1" },
                        ].map((item) => (
                          <div key={item.name} className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">{item.name}</span>
                            <span className="font-medium text-foreground tabular-nums">×{item.qty}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-border flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Total</span>
                        <span className="text-sm font-semibold text-foreground">£247.00</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 text-center">
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">03 Order</span>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight">Order from the record</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                      Order replacement keys, additional cylinders and expansions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — PRODUCT SHOWCASE */}
      <section className="border-t border-border">
        <div className="container py-20 md:py-28">
          <div className="max-w-2xl">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Inside My LOXX</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">A real product, built for real systems.</h2>
          </div>

          <div className="mt-14 space-y-16 md:space-y-24">
            {features.map((f, i) => (
              <div key={f.label} className={`grid md:grid-cols-2 gap-10 lg:gap-16 items-center ${i % 2 === 1 ? "md:[&>div:first-child]:order-2" : ""}`}>
                <div>
                  <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    {f.label}
                  </span>
                  <h3 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight leading-tight">{f.headline}</h3>
                  <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed max-w-md">{f.copy}</p>
                </div>
                <div className="relative aspect-[4/3] rounded-2xl border border-border bg-card overflow-hidden">
                  <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.06),transparent_60%)]" />
                  <FeatureVisual variant={f.label} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5 — BUILT FOR REAL BUILDINGS */}
      <section className="border-t border-border bg-card">
        <div className="container py-20 md:py-28">
          <div className="max-w-2xl">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Who it's for</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">Built for the buildings that rely on master key systems.</h2>
            <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
              Whether you manage one building or an entire estate, My LOXX keeps your master key system organised.
            </p>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectors.map((s) => (
              <div key={s.t} className="rounded-xl border border-border bg-background p-6 transition-all duration-200 hover:border-primary/40 hover:shadow-sm">
                <span className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                  <s.icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 text-base font-semibold tracking-tight">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 — TRUST */}
      <section className="border-t border-border">
        <div className="container py-20 md:py-28 grid md:grid-cols-[1fr_1.2fr] gap-14 items-start">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Trust</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight leading-tight">Built by people who understand master key systems.</h2>
            <p className="mt-6 text-[15px] text-muted-foreground leading-relaxed max-w-md">
              My LOXX is designed around real-world master key workflows, from system design and key control to ordering and long-term record keeping.
            </p>
          </div>
          <ul className="grid sm:grid-cols-2 gap-3">
            {trustPoints.map((t) => (
              <li key={t.t} className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3.5">
                <span className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 shrink-0">
                  <t.icon className="h-4 w-4 text-primary" strokeWidth={2} />
                </span>
                <span className="text-sm font-medium text-foreground pt-1">{t.t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SECTION 7 — FAQ */}
      <section className="border-t border-border bg-card">
        <div className="container py-20 md:py-28 max-w-3xl">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">FAQ</span>
          <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">Common questions.</h2>
          <div className="mt-10 border-t border-border">
            {faqs.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* SECTION 8 — FINAL CTA */}
      <section id="book-a-demo" className="bg-primary">
        <div className="container py-20 md:py-24 max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-primary-foreground leading-tight">
            Give your master key system a permanent home.
          </h2>
          <p className="mt-5 text-[15px] text-primary-foreground/80 leading-relaxed max-w-xl mx-auto">
            Start building a secure, organised record your team can rely on for years to come.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90">
              <Link to="/auth?mode=signup">Get Started <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <a href="mailto:hello@my-loxx.app">Book a Demo</a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="container py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <LoxxLogo />
            <div className="text-sm text-muted-foreground mt-2">My LOXX — the digital home for your master key system</div>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
          <div className="text-xs text-muted-foreground">© 2026 My LOXX</div>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------ */
/* Product-led feature visuals — abstracted from the real app.   */
/* ------------------------------------------------------------ */

function FeatureVisual({ variant }: { variant: string }) {
  if (variant === "System Builder") {
    return (
      <div className="absolute inset-0 p-6 flex items-center justify-center">
        <svg viewBox="0 0 320 220" className="w-full h-full max-w-md">
          <line x1="160" y1="46" x2="80" y2="100" stroke="hsl(var(--border))" strokeWidth="1.5" />
          <line x1="160" y1="46" x2="240" y2="100" stroke="hsl(var(--border))" strokeWidth="1.5" />
          <line x1="80" y1="132" x2="50" y2="180" stroke="hsl(var(--border))" strokeWidth="1.5" />
          <line x1="80" y1="132" x2="110" y2="180" stroke="hsl(var(--border))" strokeWidth="1.5" />
          <line x1="240" y1="132" x2="210" y2="180" stroke="hsl(var(--primary))" strokeWidth="2" />
          <line x1="240" y1="132" x2="270" y2="180" stroke="hsl(var(--border))" strokeWidth="1.5" />

          <g>
            <rect x="120" y="20" width="80" height="26" rx="6" fill="hsl(var(--primary)/0.12)" stroke="hsl(var(--primary))" strokeWidth="1.5" />
            <text x="160" y="37" textAnchor="middle" fontSize="10" fontWeight="600" fill="hsl(var(--primary))">Grand Master</text>
          </g>
          <g>
            <rect x="42" y="100" width="76" height="26" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
            <text x="80" y="117" textAnchor="middle" fontSize="10" fontWeight="600" fill="hsl(var(--foreground))">Master · N</text>
          </g>
          <g>
            <rect x="202" y="100" width="76" height="26" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
            <text x="240" y="117" textAnchor="middle" fontSize="10" fontWeight="600" fill="hsl(var(--foreground))">Master · S</text>
          </g>
          {[{ x: 20, hl: false }, { x: 80, hl: false }, { x: 180, hl: true }, { x: 240, hl: false }].map((c, i) => (
            <g key={i}>
              <rect x={c.x} y="180" width="60" height="22" rx="5"
                fill={c.hl ? "hsl(var(--primary)/0.12)" : "hsl(var(--card))"}
                stroke={c.hl ? "hsl(var(--primary))" : "hsl(var(--border))"} strokeWidth="1.5" />
              <text x={c.x + 30} y="195" textAnchor="middle" fontSize="9" fontWeight="500" fill="hsl(var(--foreground))">CYL {i + 1}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  }

  if (variant === "Dashboard") {
    return (
      <div className="absolute inset-0 p-6 flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-3">
          {[
            { l: "Buildings", v: "12" },
            { l: "Cylinders", v: "1,284" },
            { l: "Active keys", v: "3,412" },
          ].map((s) => (
            <div key={s.l} className="rounded-lg bg-background border border-border p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
              <div className="text-lg font-semibold tracking-tight mt-1">{s.v}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 rounded-lg bg-background border border-border p-3 flex flex-col justify-end gap-1.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Recent activity</div>
          {[
            { w: "72%", l: "West Wing" },
            { w: "58%", l: "Science Block" },
            { w: "44%", l: "Admin" },
            { w: "30%", l: "Gym" },
          ].map((b) => (
            <div key={b.l} className="flex items-center gap-2 text-[10px]">
              <span className="w-20 text-muted-foreground">{b.l}</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary/70 rounded-full" style={{ width: b.w }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "Ordering") {
    return (
      <div className="absolute inset-0 p-6 flex items-center justify-center">
        <div className="w-full max-w-sm rounded-xl bg-background border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold">Order · West Wing</div>
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Draft</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {[
              { n: "Euro Cylinder 35×35", q: "×4" },
              { n: "Replacement key · Differ 0118", q: "×2" },
              { n: "Sub Master key", q: "×1" },
            ].map((it) => (
              <div key={it.n} className="flex items-center justify-between text-[11px] py-2 border-b border-border last:border-0">
                <span className="text-foreground">{it.n}</span>
                <span className="font-mono text-muted-foreground">{it.q}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">7 items</span>
            <span className="font-semibold">Ready to order</span>
          </div>
        </div>
      </div>
    );
  }

  // Audit & Permissions
  return (
    <div className="absolute inset-0 p-6 flex items-center justify-center">
      <div className="w-full max-w-sm rounded-xl bg-background border border-border p-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Access · Estates Team</div>
        <div className="space-y-2.5">
          {[
            { n: "Sarah Wells", r: "Admin", ok: true },
            { n: "James Okafor", r: "Order only", ok: true },
            { n: "M. Chen", r: "View only", ok: true },
            { n: "R. Patel", r: "Revoked", ok: false },
          ].map((p) => (
            <div key={p.n} className="flex items-center justify-between text-[11px] py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-semibold text-primary">
                  {p.n.split(" ").map((w) => w[0]).join("")}
                </span>
                <span>{p.n}</span>
              </div>
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${p.ok ? "text-foreground" : "text-muted-foreground line-through"}`}>
                {p.ok && <Check className="h-3 w-3 text-primary" />}
                {p.r}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
