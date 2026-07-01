import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoxxLogo } from "@/components/LoxxLogo";
import {
  ShieldCheck, Lock, BadgeCheck, ArrowRight, Users,
  LayoutGrid, Receipt, GraduationCap, HeartPulse, Home, Landmark,
  BookOpen, Briefcase, ShieldAlert, Check, Key, FileText, PoundSterling,
  Cloud, Building2, History, Wallet,
} from "lucide-react";
import { HeroCanvasDemo } from "@/components/marketing/HeroCanvasDemo";

const trust = [
  { icon: ShieldCheck, label: "German-engineered cylinders" },
  { icon: BadgeCheck, label: "DIN EN1303 rated" },
  { icon: Lock, label: "Full audit trail" },
  { icon: LayoutGrid, label: "Multiple systems, one login" },
];

const painBlocks = [
  {
    icon: ShieldAlert,
    q: "A key's gone missing — how bad is it?",
    a: "My LOXX knows what door that key opened, so you know instantly whether you're replacing one cylinder or re-keying a whole building. The old differ is retired for good, and because the key profile is patented, no high-street cutter has the equipment to copy it — only My LOXX can supply a replacement.",
  },
  {
    icon: Users,
    q: "Who can order, change, or even see your system?",
    a: "Four access levels, an audit trail, and scoped invites. Give each team member the right permission — full control, ordering only, or view-only — and limit them to specific systems. My LOXX logs every order, change, and login with a name and a timestamp. When someone leaves, you revoke their access in seconds.",
  },
  {
    icon: LayoutGrid,
    q: "Setting up a new system used to mean weeks of back-and-forth with a locksmith over email.",
    a: "Build it visually in My LOXX — every floor, every door, every key, laid out as you go. Replacing an ageing system that's lost its security integrity over the years, or specifying a new one from scratch — either way, nothing gets lost in someone's inbox.",
  },
  {
    icon: PoundSterling,
    q: "Reordering means a phone call, an email, and waiting for a quote.",
    a: "Real pricing, instantly. See the price as you build. Order online by card, or raise a pro-forma for your finance team. My LOXX generates your quote, schedule, and invoice straight from your system — no waiting on a supplier to send a price back.",
  },
];

const capabilities = [
  { icon: Users, label: "Access & roles", detail: "Role-based access, scoped per system" },
  { icon: ShieldAlert, label: "Lost key response", detail: "Instantly see exactly what that key opened" },
  { icon: Receipt, label: "Ordering", detail: "Real pricing, ordered online in minutes" },
  { icon: Lock, label: "Audit trail", detail: "Every order, change and login, timestamped" },
  { icon: FileText, label: "Paperwork", detail: "Quotes, schedules and invoices generated automatically" },
  { icon: LayoutGrid, label: "Multi-system", detail: "Manage every building from one account" },
];

const sectors = [
  { icon: GraduationCap, t: "Schools" },
  { icon: HeartPulse, t: "NHS sites" },
  { icon: Home, t: "Care homes" },
  { icon: Landmark, t: "Councils" },
  { icon: BookOpen, t: "Universities" },
  { icon: Briefcase, t: "Offices" },
];

export default function Index() {
  const heroTrust = [
    { icon: Cloud, label: "Secure cloud platform" },
    { icon: Building2, label: "Built for commercial buildings" },
    { icon: History, label: "Complete audit history" },
    { icon: Wallet, label: "No software subscription" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="bg-[#fafafa] text-foreground">
        <div className="container flex items-center justify-between py-4">
          <LoxxLogo />
          <nav className="flex items-center gap-2">
            <Link to="/auth" className="text-sm px-3 py-2 text-foreground/70 hover:text-foreground">Sign in</Link>
            <Button asChild className="bg-primary hover:bg-primary/90"><Link to="/auth?mode=signup">Get started</Link></Button>
          </nav>
        </div>

        {/* Hero — premium SaaS product-forward layout */}
        <section className="relative overflow-hidden">
          <div className="container relative py-16 md:py-24 grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 backdrop-blur px-3 py-1 text-[11px] font-medium text-foreground/70">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Built for facilities managers, estates teams and security professionals
              </span>

              <h1 className="mt-5 font-extrabold text-4xl md:text-6xl leading-[1.05] tracking-tight text-foreground">
                Your master key system. <span className="text-foreground/70">Finally organised.</span>
              </h1>

              <p className="mt-6 text-lg text-foreground/65 max-w-xl leading-relaxed">
                My LOXX gives you one secure place to manage every building, every door, every cylinder and every key. Replace spreadsheets with a permanent digital record your whole team can trust.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                  <Link to="/auth?mode=signup">Get Started <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-border bg-transparent text-foreground hover:bg-black/[0.03]">
                  <a href="#book-a-walkthrough">Book a Demo</a>
                </Button>
              </div>

              <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 max-w-lg">
                {heroTrust.map((t) => (
                  <li key={t.label} className="flex items-center gap-2.5 text-[13px] text-foreground/75">
                    <span className="flex items-center justify-center h-6 w-6 rounded-md bg-primary/10 shrink-0">
                      <t.icon className="h-3.5 w-3.5 text-primary" strokeWidth={2.25} />
                    </span>
                    {t.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
              {/* Ambient premium glow */}
              <div aria-hidden className="absolute -inset-6 rounded-[28px] bg-gradient-to-tr from-primary/10 via-transparent to-primary/5 blur-2xl" />
              <div aria-hidden className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

              {/* Product frame — browser chrome around the real builder */}
              <div className="relative rounded-2xl border border-border bg-card shadow-2xl shadow-black/[0.08] overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-[#fafafa]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
                    <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
                    <span className="h-2.5 w-2.5 rounded-full bg-black/10" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <span className="inline-flex items-center gap-2 text-[11px] font-medium text-foreground/60 tracking-tight">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      my-loxx.app <span className="text-foreground/30">/</span> System Builder
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-foreground/40 uppercase tracking-wider">Live</span>
                </div>
                <div className="relative">
                  <HeroCanvasDemo />
                  {/* Soft edge fade for premium framing */}
                  <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-[#fafafa] text-[11px] text-foreground/55">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Auto-saved
                  </span>
                  <span className="font-medium">1 Grand Master · 2 Masters · 4 Cylinders</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </header>



      {/* Trust strip */}
      <section className="border-y border-border bg-card">
        <div className="container py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {trust.map((t) => (
            <div key={t.label} className="flex items-center gap-3">
              <span className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 shrink-0">
                <t.icon className="h-5 w-5 text-primary" strokeWidth={2.25} />
              </span>
              <span className="text-sm font-medium text-foreground">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pain -> feature blocks: featured lost-key card + compact supporting row */}
      <section className="container py-20">
        <h2 className="text-3xl font-semibold tracking-tight max-w-3xl">Where spreadsheets fall short</h2>
        {/* Featured card — first item in painBlocks (lost key scenario) */}
        <div className="mt-10 rounded-xl border border-border border-l-[3px] border-l-primary bg-card p-8 shadow-lg grid md:grid-cols-[1.3fr_1fr] gap-8 items-center">
          <div>
            <span className="flex items-center justify-center h-11 w-11 rounded-lg bg-primary/10">
              {(() => { const Icon = painBlocks[0].icon; return <Icon className="h-5 w-5 text-primary" strokeWidth={2.25} />; })()}
            </span>
            <h3 className="mt-4 text-2xl font-extrabold leading-snug tracking-tight">{painBlocks[0].q}</h3>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-lg">{painBlocks[0].a}</p>
          </div>
          <div className="flex items-center justify-center gap-4 bg-background rounded-lg p-6">
            <div className="text-center">
              <div className="h-[52px] w-[52px] rounded-lg bg-primary/15 flex items-center justify-center opacity-50">
                <Key className="h-6 w-6 text-primary line-through" strokeWidth={1.5} />
              </div>
              <div className="text-[10px] text-muted-foreground mt-2 leading-tight">Differ 0042<br />retired</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            <div className="text-center">
              <div className="h-[52px] w-[52px] rounded-lg bg-primary/20 flex items-center justify-center">
                <Key className="h-6 w-6 text-primary" strokeWidth={2} />
              </div>
              <div className="text-[10px] text-primary font-semibold mt-2 leading-tight">Differ 0118<br />issued</div>
            </div>
          </div>
        </div>
        {/* Supporting row — remaining three pain blocks, compact */}
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          {painBlocks.slice(1).map((b) => (
            <div key={b.q} className="rounded-[10px] border border-border border-l-2 border-l-primary bg-card p-5 shadow-card transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                <b.icon className="h-4 w-4 text-primary" strokeWidth={2.25} />
              </span>
              <h3 className="mt-3 text-sm font-bold leading-snug tracking-tight">{b.q}</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{b.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities showcase — My LOXX only, chip-icon language matching trust strip / pain blocks */}
      <section className="bg-card border-y border-border">
        <div className="container py-16">
          <h2 className="text-3xl font-semibold tracking-tight">Everything, in one place</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
            {capabilities.map((c) => (
              <div
                key={c.label}
                className="rounded-[10px] border border-border bg-background p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 shrink-0">
                    <c.icon className="h-4 w-4 text-primary" strokeWidth={2.25} />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
                  </div>
                </div>
                <div className="text-sm font-semibold text-foreground mt-3">{c.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for — icon + label only, no body copy, hover accent */}
      <section className="container py-20">
        <h2 className="text-3xl font-semibold tracking-tight max-w-3xl">
          Built for the buildings that run on master keys
        </h2>
        <div className="flex flex-wrap gap-4 mt-10">
          {sectors.map((s) => (
            <div
              key={s.t}
              className="flex flex-col items-center gap-3 px-8 py-8 flex-1 min-w-[140px] border-t-2 border-t-transparent hover:border-t-primary transition-colors"
            >
              <s.icon className="h-9 w-9 text-primary" strokeWidth={1.5} />
              <span className="text-sm font-medium text-foreground">{s.t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA — solid saturated orange block, light-mode bookend */}
      <section id="book-a-walkthrough" className="bg-primary">
        <div className="container py-16 md:py-20 max-w-3xl text-center">
          <p className="text-sm text-primary-foreground/75 mb-4">
            No subscription. No software fee. You pay only when you order hardware.
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-primary-foreground">
            Get your master key system out of the spreadsheet.
          </h2>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90">
              <Link to="/auth?mode=signup">Get started <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="container py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <LoxxLogo />
            <div className="text-sm text-muted-foreground mt-2">My LOXX — manage your master key system online</div>
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
