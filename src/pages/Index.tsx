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
  {
    icon: GraduationCap,
    t: "Education",
    s: "Manage access across classrooms, staff areas, sports facilities, plant rooms and multiple buildings.",
    zones: ["Public", "Staff", "Restricted", "Plant"],
  },
  {
    icon: HeartPulse,
    t: "Healthcare",
    s: "Keep controlled areas, staff-only spaces, medicine rooms and service areas clearly organised.",
    zones: ["Public", "Staff", "Restricted", "Plant"],
  },
  {
    icon: Building2,
    t: "Commercial buildings",
    s: "Manage offices, tenants, shared entrances, restricted rooms and contractor access from one record.",
    zones: ["Public", "Staff", "Restricted", "Plant"],
  },
  {
    icon: Landmark,
    t: "Local government",
    s: "Maintain clear records across civic buildings, depots, libraries, schools and public facilities.",
    zones: ["Public", "Staff", "Restricted", "Plant"],
  },
  {
    icon: Home,
    t: "Property management",
    s: "Keep keys, cylinders and access records organised across blocks, sites and managed portfolios.",
    zones: ["Public", "Staff", "Restricted", "Plant"],
  },
  {
    icon: Factory,
    t: "Industrial sites",
    s: "Control access across warehouses, yards, offices, plant rooms and operational areas.",
    zones: ["Staff", "Restricted", "Plant", "Stores"],
  },
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
    a: "Yes. Existing systems can be brought into My LOXX so your team has one organised digital record to work from. You can also use My LOXX to design new systems from scratch.",
  },
  {
    q: "Can multiple users access the same organisation?",
    a: "Yes. Invite team members into your organisation and control what each person can see or change. This helps keep ordering, records and permissions under proper control.",
  },
  {
    q: "Can I manage more than one building?",
    a: "Yes. My LOXX is designed for single buildings, multiple buildings and larger estates. Each system can be kept organised while still being managed from one account.",
  },
  {
    q: "Can I order replacement keys and cylinders?",
    a: "Yes. Replacement keys, additional cylinders and system expansions can be ordered directly from the system record, helping reduce emails, manual quotes and mistakes.",
  },
  {
    q: "Does My LOXX replace my locksmith?",
    a: "No. My LOXX does not replace professional locksmiths or installers. It gives your organisation a permanent digital record and ordering workflow for the master key system.",
  },
  {
    q: "Is there a software subscription?",
    a: "No. There is no software subscription. You pay when you order hardware.",
  },
  {
    q: "Who is My LOXX for?",
    a: "My LOXX is built for facilities managers, estates teams, property managers, security managers and organisations responsible for managing master key systems across real buildings.",
  },
  {
    q: "What makes My LOXX different from a spreadsheet?",
    a: "A spreadsheet is only a document. My LOXX is a structured system record with buildings, keys, cylinders, orders, users and audit history connected in one place.",
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
      <section className="border-t border-border bg-gradient-to-b from-background via-muted/30 to-background">
        <div className="container py-20 md:py-28">
          <div className="max-w-2xl">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Inside My LOXX</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">A real product, built for real systems.</h2>
          </div>

          <div className="mt-16 space-y-20 md:space-y-28">
            {features.map((f, i) => {
              const reverse = i % 2 === 1;
              return (
                <div
                  key={f.label}
                  className={`grid md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-10 lg:gap-16 items-center`}
                >
                  <div className={reverse ? "md:order-2" : ""}>
                    <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
                      <span className="h-1 w-1 rounded-full bg-primary" />
                      Feature 0{i + 1} · {f.label}
                    </span>
                    <h3 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight leading-tight">{f.headline}</h3>
                    <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed max-w-md">{f.copy}</p>
                  </div>
                  <div className={reverse ? "md:order-1" : ""}>
                    <ProductFrame variant={f.label} />
                  </div>
                </div>
              );
            })}
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
              <div key={s.t} className="group rounded-xl border border-border bg-background p-6 transition-all duration-200 hover:border-primary/40 hover:shadow-sm">
                <div className="flex items-center gap-3">
                  <s.icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
                  <h3 className="text-base font-semibold tracking-tight">{s.t}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.s}</p>
                {/* Access map mini-visual */}
                <div className="mt-4 flex flex-wrap items-center gap-y-2">
                  {s.zones.map((z, zi) => (
                    <div key={z} className="flex items-center">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <span className="text-[10px] font-medium text-foreground">{z}</span>
                      </span>
                      {zi < s.zones.length - 1 && (
                        <span className="mx-1.5 h-px w-4 bg-border" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 — TRUST */}
      <section className="border-t border-border">
        <div className="container py-20 md:py-28">
          <div className="max-w-2xl">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Trust</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
              Built by people who understand master key systems.
            </h2>
            <p className="mt-6 text-[15px] text-muted-foreground leading-relaxed max-w-lg">
              My LOXX is built around real master key workflows — from system design and key control to ordering, audit history and long-term record keeping.
            </p>
          </div>

          {/* Three trust pillars */}
          <div className="mt-14 grid md:grid-cols-3 gap-5">
            <div className="rounded-xl border border-border bg-card p-7 relative overflow-hidden">
              <div className="absolute left-0 top-6 bottom-6 w-[3px] rounded-r-full bg-primary/70" />
              <div className="pl-5">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">Real-world expertise</h3>
                <p className="mt-3 text-[15px] text-muted-foreground leading-relaxed">
                  Designed around how master key systems are actually specified, managed and expanded.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-7 relative overflow-hidden">
              <div className="absolute left-0 top-6 bottom-6 w-[3px] rounded-r-full bg-primary/70" />
              <div className="pl-5">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">Secure organisation control</h3>
                <p className="mt-3 text-[15px] text-muted-foreground leading-relaxed">
                  Invite the right people, control access levels and keep system records inside your organisation.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-7 relative overflow-hidden">
              <div className="absolute left-0 top-6 bottom-6 w-[3px] rounded-r-full bg-primary/70" />
              <div className="pl-5">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">Permanent system history</h3>
                <p className="mt-3 text-[15px] text-muted-foreground leading-relaxed">
                  Keep a clear record of orders, changes, users and activity so knowledge does not disappear when people leave.
                </p>
              </div>
            </div>
          </div>

          {/* Supporting proof points */}
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {trustPoints.map((t) => (
              <div key={t.t} className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3.5">
                <span className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10 shrink-0">
                  <t.icon className="h-4 w-4 text-primary" strokeWidth={2} />
                </span>
                <span className="text-sm font-medium text-foreground pt-1">{t.t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7 — FAQ */}
      <section className="border-t border-border bg-background">
        <div className="container py-20 md:py-28 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Questions facilities teams usually ask.</h2>
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12 lg:gap-16">
            {/* LEFT — FAQ accordion */}
            <div className="border-t border-border">
              {faqs.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
            </div>

            {/* RIGHT — Support panel */}
            <div className="lg:pt-4">
              <div className="rounded-xl border border-border bg-card p-7 relative">
                <div className="absolute left-0 top-6 bottom-6 w-[3px] rounded-r-full bg-primary/70" />
                <div className="pl-5">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">Still have questions?</h3>
                  <p className="mt-3 text-[15px] text-muted-foreground leading-relaxed">
                    Talk through your current master key system and see whether My LOXX is the right fit for your buildings.
                  </p>
                  <div className="mt-6 flex flex-col gap-3">
                    <Button asChild size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                      <a href="mailto:hello@my-loxx.app">Book a Demo</a>
                    </Button>
                    <Link to="/auth?mode=signup" className="text-sm text-muted-foreground hover:text-foreground text-center">
                      Or create an account
                    </Link>
                  </div>
                  <div className="mt-6 pt-6 border-t border-border space-y-2.5">
                    {[
                      "Existing systems can be added",
                      "Multiple buildings supported",
                      "No software subscription",
                    ].map((pt) => (
                      <div key={pt} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary shrink-0" strokeWidth={2} />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8 — FINAL CTA */}
      <section id="book-a-demo" className="relative overflow-hidden bg-primary">
        {/* Subtle hierarchy motif */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
          <svg className="h-full w-full" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="ctaGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="white" stopOpacity="0.6" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Nodes */}
            <circle cx="180" cy="420" r="6" fill="white" />
            <circle cx="180" cy="180" r="10" fill="white" />
            <circle cx="420" cy="300" r="8" fill="white" />
            <circle cx="780" cy="240" r="10" fill="white" />
            <circle cx="780" cy="420" r="6" fill="white" />
            <circle cx="1020" cy="180" r="8" fill="white" />
            <circle cx="1020" cy="360" r="6" fill="white" />
            {/* Connections */}
            <line x1="180" y1="180" x2="420" y2="300" stroke="white" strokeWidth="1.5" />
            <line x1="180" y1="420" x2="420" y2="300" stroke="white" strokeWidth="1.5" />
            <line x1="420" y1="300" x2="780" y2="240" stroke="white" strokeWidth="1.5" />
            <line x1="420" y1="300" x2="780" y2="420" stroke="white" strokeWidth="1.5" />
            <line x1="780" y1="240" x2="1020" y2="180" stroke="white" strokeWidth="1.5" />
            <line x1="780" y1="420" x2="1020" y2="360" stroke="white" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="container relative z-10 py-20 md:py-28 text-center">
          <h2 className="text-3xl md:text-[2.75rem] font-bold tracking-tight text-primary-foreground leading-[1.15]">
            Give your master key system a permanent home.
          </h2>
          <p className="mt-5 text-[15px] md:text-base text-primary-foreground/85 leading-relaxed max-w-xl mx-auto">
            Create one secure record for every building, key, cylinder, order and change.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90 shadow-lg">
              <Link to="/auth?mode=signup">Get Started <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-primary-foreground/35 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground hover:border-primary-foreground/50">
              <a href="mailto:hello@my-loxx.app">Book a Demo</a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="container py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-2">
              <LoxxLogo />
              <p className="mt-3 text-sm text-muted-foreground max-w-xs leading-relaxed">
                The digital home for your master key system.
              </p>
            </div>

            {/* Product */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Product</div>
              <ul className="space-y-2.5">
                <li><a href="#" className="text-sm text-foreground/80 hover:text-foreground transition-colors">System Builder</a></li>
                <li><a href="#" className="text-sm text-foreground/80 hover:text-foreground transition-colors">Dashboard</a></li>
                <li><a href="#" className="text-sm text-foreground/80 hover:text-foreground transition-colors">Ordering</a></li>
                <li><a href="#" className="text-sm text-foreground/80 hover:text-foreground transition-colors">Audit &amp; Permissions</a></li>
              </ul>
            </div>

            image.png            {/* Get Started */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Get Started</div>
              <ul className="space-y-2.5">
                <li><Link to="/auth?mode=signup" className="text-sm text-foreground/80 hover:text-foreground transition-colors">Get Started</Link></li>
                <li><a href="mailto:hello@my-loxx.app" className="text-sm text-foreground/80 hover:text-foreground transition-colors">Book a Demo</a></li>
                <li><Link to="/auth" className="text-sm text-foreground/80 hover:text-foreground transition-colors">Sign In</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Legal</pplication</div>
              <ul className="space-y-2.5">
                <li><a href="#" className="text-sm text-foreground/80 hover:text-foreground transition-colors">Privacy</a></li>
                <li><Link to="/terms" className="text-sm text-foreground/80 hover:text-foreground transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">© 2026 My LOXX</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------ */
/* Product-led feature visuals — abstracted from the real app.   */
/* ------------------------------------------------------------ */

function ProductFrame({ variant }: { variant: string }) {
  // Titles that appear in the frame's tab / URL bar
  const meta: Record<string, { path: string; title: string }> = {
    "System Builder": { path: "my-loxx.app/builder", title: "System Builder" },
    "Dashboard": { path: "my-loxx.app/dashboard", title: "Dashboard" },
    "Ordering": { path: "my-loxx.app/orders/new", title: "New Order" },
    "Audit & Permissions": { path: "my-loxx.app/team", title: "Team & Audit" },
  };
  const m = meta[variant] ?? { path: "my-loxx.app", title: variant };

  return (
    <div className="relative">
      {/* Ambient shadow / glow */}
      <div aria-hidden className="absolute -inset-6 rounded-[28px] bg-gradient-to-br from-primary/10 via-transparent to-transparent blur-2xl" />
      <div className="relative rounded-2xl border border-border bg-white shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35),0_10px_20px_-10px_rgba(15,23,42,0.15)] overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="text-[10px] text-slate-500 bg-white border border-slate-200 rounded-md px-3 py-1 font-mono truncate max-w-[70%]">
              {m.path}
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">{m.title}</span>
        </div>

        {/* App body */}
        <div className="flex bg-white h-[380px] md:h-[440px]">
          {/* Left nav */}
          <div className="hidden sm:flex w-14 md:w-16 border-r border-slate-100 bg-slate-50/60 flex-col items-center py-4 gap-1">
            <div className="h-7 w-7 rounded-md bg-primary text-white flex items-center justify-center text-[10px] font-bold">L</div>
            <div className="h-px w-6 bg-slate-200 my-2" />
            {[
              { icon: LayoutDashboard, active: variant === "Dashboard" },
              { icon: GitBranch, active: variant === "System Builder" },
              { icon: ShoppingCart, active: variant === "Ordering" },
              { icon: Users, active: variant === "Audit & Permissions" },
              { icon: FileText, active: false },
            ].map((n, idx) => (
              <div
                key={idx}
                className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  n.active ? "bg-primary/10 text-primary" : "text-slate-400"
                }`}
              >
                <n.icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <FeatureContent variant={variant} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureContent({ variant }: { variant: string }) {
  if (variant === "System Builder") {
    return (
      <div className="flex h-full">
        {/* Dotted canvas */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{
            backgroundImage: "radial-gradient(circle, rgb(203 213 225) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
            backgroundColor: "#fafafa",
          }}
        >
          <div className="absolute inset-0 p-5">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] font-semibold text-slate-700">West Wing · Grand Master A</div>
              <button className="text-[10px] font-medium bg-primary text-white px-2.5 py-1 rounded-md shadow-sm">
                + Add key
              </button>
            </div>

            {/* Hierarchy */}
            <svg viewBox="0 0 360 260" className="w-full h-[calc(100%-2rem)]">
              <line x1="180" y1="42" x2="90" y2="100" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1="180" y1="42" x2="180" y2="100" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1="180" y1="42" x2="270" y2="100" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1="90" y1="140" x2="60" y2="200" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1="90" y1="140" x2="120" y2="200" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1="270" y1="140" x2="240" y2="200" stroke="hsl(var(--primary))" strokeWidth="2" />
              <line x1="270" y1="140" x2="300" y2="200" stroke="#cbd5e1" strokeWidth="1.5" />

              {/* GMK */}
              <g>
                <rect x="130" y="14" width="100" height="30" rx="8" fill="hsl(var(--primary))" />
                <text x="180" y="28" textAnchor="middle" fontSize="9" fontWeight="700" fill="white" letterSpacing="0.5">GRAND MASTER</text>
                <text x="180" y="39" textAnchor="middle" fontSize="9" fontWeight="600" fill="white" opacity="0.9">GMK · A</text>
              </g>
              {/* Master rows */}
              {[
                { x: 40, label: "MK · N", primary: false },
                { x: 130, label: "MK · C", primary: false },
                { x: 220, label: "MK · S", primary: true },
              ].map((k) => (
                <g key={k.label}>
                  <rect x={k.x} y="100" width="100" height="40" rx="8" fill="white" stroke={k.primary ? "hsl(var(--primary))" : "#e2e8f0"} strokeWidth="1.5" />
                  <rect x={k.x} y="100" width="4" height="40" rx="2" fill={k.primary ? "hsl(var(--primary))" : "#94a3b8"} />
                  <text x={k.x + 52} y="118" textAnchor="middle" fontSize="9" fontWeight="700" fill="#0f172a">MASTER KEY</text>
                  <text x={k.x + 52} y="132" textAnchor="middle" fontSize="9" fontWeight="500" fill="#64748b">{k.label}</text>
                </g>
              ))}
              {/* Cylinders */}
              {[
                { x: 30, label: "CYL 1" },
                { x: 90, label: "CYL 2" },
                { x: 210, label: "CYL 3", hl: true },
                { x: 270, label: "CYL 4" },
              ].map((c) => (
                <g key={c.label}>
                  <rect x={c.x} y="200" width="60" height="30" rx="6"
                    fill={c.hl ? "hsl(var(--primary)/0.08)" : "white"}
                    stroke={c.hl ? "hsl(var(--primary))" : "#e2e8f0"} strokeWidth="1.5" />
                  <text x={c.x + 30} y="212" textAnchor="middle" fontSize="8" fontWeight="600" fill="#94a3b8" letterSpacing="0.4">CYLINDER</text>
                  <text x={c.x + 30} y="223" textAnchor="middle" fontSize="9" fontWeight="600" fill="#0f172a">{c.label}</text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Side inspector */}
        <div className="hidden lg:flex w-48 border-l border-slate-100 flex-col p-4 bg-white">
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Selected</div>
          <div className="mt-2 text-[12px] font-semibold text-slate-900">Cylinder 3</div>
          <div className="text-[10px] text-slate-500">Master · S · Room 214</div>

          <div className="mt-4 space-y-2">
            {[
              { l: "Differ", v: "0118" },
              { l: "Size", v: "35 × 35" },
              { l: "Keys issued", v: "4" },
            ].map((r) => (
              <div key={r.l} className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500">{r.l}</span>
                <span className="font-medium text-slate-900 font-mono">{r.v}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Activity</div>
            <div className="space-y-1.5">
              <div className="text-[10px] text-slate-600">Added by Sarah · 2h</div>
              <div className="text-[10px] text-slate-600">Key issued · 1d</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "Dashboard") {
    return (
      <div className="p-5 h-full flex flex-col gap-4 bg-slate-50/40">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Overview</div>
            <div className="text-[14px] font-semibold text-slate-900">Estates workspace</div>
          </div>
          <button className="text-[10px] font-medium bg-primary text-white px-2.5 py-1.5 rounded-md shadow-sm">
            + New system
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {[
            { l: "Total doors", v: "1,284", d: "+12" },
            { l: "Active systems", v: "8", d: "+1" },
            { l: "Orders placed", v: "36", d: "+4" },
            { l: "Total spend", v: "£24.8k", d: "+£1.2k" },
          ].map((s) => (
            <div key={s.l} className="rounded-lg bg-white border border-slate-200 p-3">
              <div className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">{s.l}</div>
              <div className="text-[15px] font-semibold text-slate-900 mt-1">{s.v}</div>
              <div className="text-[9px] text-primary font-medium mt-0.5">{s.d} this month</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-3 flex-1 min-h-0">
          <div className="col-span-3 rounded-lg bg-white border border-slate-200 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-semibold text-slate-700">Your systems</div>
              <div className="text-[9px] text-slate-400">4 of 8</div>
            </div>
            <div className="space-y-1.5 flex-1">
              {[
                { n: "West Wing · GMK A", d: "412 doors", s: "Active" },
                { n: "Science Block · GMK B", d: "268 doors", s: "Active" },
                { n: "Admin · GMK C", d: "184 doors", s: "Active" },
                { n: "Sports Centre · GMK D", d: "96 doors", s: "Draft" },
              ].map((r) => (
                <div key={r.n} className="flex items-center justify-between text-[10px] py-1.5 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-3 w-3 text-primary" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-slate-900 font-medium truncate">{r.n}</div>
                      <div className="text-slate-500 text-[9px]">{r.d}</div>
                    </div>
                  </div>
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${r.s === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {r.s}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-2 rounded-lg bg-white border border-slate-200 p-3 flex flex-col">
            <div className="text-[10px] font-semibold text-slate-700 mb-2">Recent activity</div>
            <div className="space-y-2 flex-1">
              {[
                { l: "Order #1284 placed", t: "2h" },
                { l: "3 keys issued · West Wing", t: "5h" },
                { l: "Cylinder added · MK · S", t: "1d" },
                { l: "Sarah joined team", t: "2d" },
              ].map((a) => (
                <div key={a.l} className="flex items-start gap-2 text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="text-slate-800">{a.l}</div>
                    <div className="text-slate-400 text-[9px]">{a.t} ago</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "Ordering") {
    return (
      <div className="p-5 h-full flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Order · draft</div>
            <div className="text-[14px] font-semibold text-slate-900">West Wing · GMK A</div>
          </div>
          <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">Ready to order</span>
        </div>

        <div className="rounded-lg border border-slate-200 overflow-hidden bg-white flex-1 flex flex-col">
          <div className="grid grid-cols-[1fr_60px_80px_80px] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200 text-[9px] uppercase tracking-wider text-slate-500 font-medium">
            <span>Item</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit</span>
            <span className="text-right">Total</span>
          </div>
          {[
            { n: "Replacement key", d: "Differ 0118 · MK · S", q: 6, u: "£8.50", t: "£51.00" },
            { n: "Euro cylinder", d: "35 × 35 · anti-snap", q: 4, u: "£38.00", t: "£152.00" },
            { n: "Sub master key", d: "Differ 0402", q: 2, u: "£14.00", t: "£28.00" },
            { n: "Cylinder core", d: "Retrofit set", q: 1, u: "£16.00", t: "£16.00" },
          ].map((r) => (
            <div key={r.n} className="grid grid-cols-[1fr_60px_80px_80px] gap-2 px-3 py-2.5 border-b border-slate-100 last:border-0 items-center text-[10.5px]">
              <div className="min-w-0">
                <div className="text-slate-900 font-medium truncate">{r.n}</div>
                <div className="text-slate-500 text-[9px] truncate">{r.d}</div>
              </div>
              <span className="text-right font-mono text-slate-700">×{r.q}</span>
              <span className="text-right font-mono text-slate-500">{r.u}</span>
              <span className="text-right font-mono font-semibold text-slate-900">{r.t}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
          <div className="text-[10px] text-slate-500">Quote total · 13 items</div>
          <div className="flex items-center gap-3">
            <div className="text-[15px] font-semibold text-slate-900">£247.00</div>
            <button className="text-[11px] font-semibold bg-primary text-white px-3.5 py-2 rounded-md shadow-sm inline-flex items-center gap-1.5">
              Add to basket <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Audit & Permissions
  return (
    <div className="p-5 h-full flex flex-col gap-3 bg-slate-50/40">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Team & Audit</div>
          <div className="text-[14px] font-semibold text-slate-900">Estates workspace</div>
        </div>
        <button className="text-[10px] font-medium bg-primary text-white px-2.5 py-1.5 rounded-md shadow-sm">
          + Invite
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        <div className="rounded-lg border border-slate-200 bg-white p-3 flex flex-col">
          <div className="text-[10px] font-semibold text-slate-700 mb-2">Members · 4</div>
          <div className="space-y-1.5 flex-1">
            {[
              { n: "Sarah Wells", e: "sarah@estates.co.uk", r: "Admin", tone: "primary" },
              { n: "James Okafor", e: "james@estates.co.uk", r: "Order only", tone: "slate" },
              { n: "M. Chen", e: "mchen@estates.co.uk", r: "View only", tone: "slate" },
              { n: "R. Patel", e: "rpatel@estates.co.uk", r: "Revoked", tone: "revoked" },
            ].map((p) => (
              <div key={p.n} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-7 w-7 rounded-full flex items-center justify-center text-[9px] font-semibold shrink-0 ${
                    p.tone === "revoked" ? "bg-slate-100 text-slate-400" : "bg-primary/10 text-primary"
                  }`}>
                    {p.n.split(" ").map((w) => w[0]).join("")}
                  </span>
                  <div className="min-w-0">
                    <div className={`text-[10.5px] font-medium truncate ${p.tone === "revoked" ? "text-slate-400 line-through" : "text-slate-900"}`}>{p.n}</div>
                    <div className="text-[9px] text-slate-500 truncate">{p.e}</div>
                  </div>
                </div>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${
                  p.tone === "primary" ? "bg-primary/10 text-primary" :
                  p.tone === "revoked" ? "bg-slate-100 text-slate-400" :
                  "bg-slate-100 text-slate-600"
                }`}>{p.r}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 flex flex-col">
          <div className="text-[10px] font-semibold text-slate-700 mb-2">Audit log</div>
          <div className="space-y-2 flex-1">
            {[
              { u: "Sarah Wells", a: "Issued 3 keys · West Wing", t: "10:42" },
              { u: "James Okafor", a: "Placed order #1284", t: "09:18" },
              { u: "Sarah Wells", a: "Added cylinder · MK · S", t: "Yesterday" },
              { u: "M. Chen", a: "Viewed system record", t: "Yesterday" },
              { u: "Admin", a: "Revoked access · R. Patel", t: "2 days ago" },
            ].map((l, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[10px] pb-1.5 border-b border-slate-100 last:border-0">
                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-slate-800 truncate">{l.a}</div>
                  <div className="text-slate-500 text-[9px]">by {l.u} · {l.t}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

