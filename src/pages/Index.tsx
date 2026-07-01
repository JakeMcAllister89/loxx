import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoxxLogo } from "@/components/LoxxLogo";
import {
  ShieldCheck, Lock, BadgeCheck, ArrowRight, Users,
  LayoutGrid, Receipt, GraduationCap, HeartPulse, Home, Landmark,
  BookOpen, Briefcase, ShieldAlert, Check, X,
} from "lucide-react";
import builderCanvasExample from "@/assets/builder-canvas-example.png";

const trust = [
  { icon: ShieldCheck, label: "German-engineered cylinders" },
  { icon: BadgeCheck, label: "DIN EN1303 rated" },
  { icon: Lock, label: "Full audit trail" },
  { icon: LayoutGrid, label: "Manage multiple systems online" },
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
    icon: Receipt,
    q: "Reordering means a phone call, an email, and waiting for a quote.",
    a: "Real pricing, instantly. See the price as you build. Order online by card, or raise a pro-forma for your finance team. My LOXX generates your quote, schedule, and invoice straight from your system — no waiting on a supplier to send a price back.",
  },
];

const comparisonRows = [
  { row: "Who has system access", paper: "Whoever last edited the spreadsheet, untracked", loxx: "Role-based access, scoped per system" },
  { row: "Lost key response", paper: "Manual check, hope the records are current", loxx: "Instantly see exactly what that key opened" },
  { row: "Reordering a cylinder", paper: "Phone call, then a wait", loxx: "Real pricing, ordered online in minutes" },
  { row: "Audit trail", paper: "None, unless someone remembers to log it", loxx: "Every order, change and login, timestamped" },
  { row: "Quotes & invoices", paper: "Built by hand", loxx: "Generated automatically from your system" },
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
  const [activeNode, setActiveNode] = useState<"gmk" | "mk" | "smk" | "cyl" | null>(null);
  const nodeColors: Record<string, string> = {
    gmk: "hsl(245,60%,67%)",
    mk: "hsl(178,60%,45%)",
    smk: "hsl(154,71%,45%)",
    cyl: "hsl(33,91%,44%)",
  };
  const heroBadges: Array<{ key: "gmk" | "mk" | "smk" | "cyl"; label: string; bg: string; color: string }> = [
    { key: "gmk", label: "GMK", bg: "hsl(245,60%,67%,0.14)", color: "hsl(245,45%,42%)" },
    { key: "mk", label: "MK", bg: "hsl(178,60%,45%,0.14)", color: "hsl(178,55%,28%)" },
    { key: "smk", label: "SMK", bg: "hsl(154,71%,45%,0.14)", color: "hsl(154,55%,26%)" },
    { key: "cyl", label: "CYL", bg: "hsl(33,91%,44%,0.16)", color: "hsl(33,85%,32%)" },
  ];
  const cardBoxShadow = activeNode
    ? `0 0 0 3px ${nodeColors[activeNode]}, 0 20px 50px rgba(20,20,22,0.08)`
    : "0 20px 50px rgba(20,20,22,0.08), 0 2px 8px rgba(0,0,0,0.04)";

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

        {/* Hero — light, orange-forward, with hierarchy badge strip and staged entrance animation */}
        <section className="relative overflow-hidden">
          <div className="container relative py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <h1 className="font-extrabold text-4xl md:text-6xl leading-[1.05] tracking-tight text-foreground">
                Your master key system,<br />out of the spreadsheet.
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-1.5 text-xs font-bold">
                {heroBadges.map((b, i) => (
                  <span key={b.key} className="inline-flex items-center gap-1.5">
                    <span
                      onMouseEnter={() => setActiveNode(b.key)}
                      onMouseLeave={() => setActiveNode(null)}
                      className="px-2.5 py-1 rounded-full transition-shadow cursor-default"
                      style={{ backgroundColor: b.bg, color: b.color }}
                    >
                      {b.label}
                    </span>
                    {i < heroBadges.length - 1 && <ArrowRight className="h-3 w-3 text-foreground/25" />}
                  </span>
                ))}
                <span className="ml-1 text-foreground/40 font-normal">Grand master → master → sub master → cylinder</span>
              </div>

              <p className="mt-5 text-lg text-foreground/65 max-w-xl">
                My LOXX gives facilities managers one place to see every key, every door, and every person who holds access — reorder a lost key or add new doors to your system in minutes, and keep an online record that doesn't depend on whoever set it up still working here.
              </p>
              <p className="mt-4 text-sm text-foreground/50 max-w-xl">
                For the people who manage schools, care homes, NHS sites, councils, universities, and offices — buildings that run on a master key system.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30">
                  <Link to="/auth?mode=signup">Get started <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                {/* TODO: Jake to provide real destination before launch */}
                <Button asChild size="lg" variant="outline" className="border-border bg-transparent text-foreground hover:bg-black/[0.03]">
                  <a href="#book-a-walkthrough">Book a walkthrough</a>
                </Button>
              </div>
            </div>

            <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
              <div
                id="hero-canvas-card"
                className="bg-white rounded-xl p-2.5 border border-border transition-shadow"
                style={{ boxShadow: cardBoxShadow }}
              >
                <img
                  src={builderCanvasExample}
                  alt="My LOXX builder canvas showing a master key hierarchy with grand master, sub masters, and individual cylinders"
                  width={1600}
                  height={1024}
                  className="w-full h-auto rounded-lg block"
                />
              </div>
            </div>
          </div>
        </section>
      </header>


      {/* Trust strip */}
      <section className="border-y border-border bg-card">
        <div className="container py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {trust.map((t) => (
            <div key={t.label} className="flex items-center gap-3 text-sm">
              <t.icon className="h-5 w-5 text-primary shrink-0" />
              <span className="text-foreground">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pain -> feature blocks, orange left-edge accent */}
      <section className="container py-20">
        <h2 className="text-3xl font-semibold tracking-tight max-w-3xl">The problems you're actually dealing with</h2>
        <div className="grid md:grid-cols-2 gap-6 mt-10">
          {painBlocks.map((b) => (
            <div key={b.q} className="rounded-[10px] border border-border border-l-2 border-l-primary bg-card p-6 shadow-card">
              <b.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold leading-snug">{b.q}</h3>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{b.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison — two-column card layout, no "generic software" column */}
      <section className="bg-card border-y border-border">
        <div className="container py-16">
          <h2 className="text-3xl font-semibold tracking-tight">Not a spreadsheet.</h2>
          <div className="grid md:grid-cols-2 gap-px mt-8 rounded-[10px] overflow-hidden border border-border">
            <div className="bg-background p-6 md:p-8">
              <div className="text-sm font-medium text-muted-foreground mb-6">Paper / spreadsheet</div>
              <div className="space-y-5">
                {comparisonRows.map((r) => (
                  <div key={r.row} className="flex gap-3">
                    <X className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground">{r.row}</div>
                      <div className="text-sm text-foreground/80 mt-0.5">{r.paper}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-primary/5 p-6 md:p-8">
              <div className="text-sm font-semibold text-primary mb-6">My LOXX</div>
              <div className="space-y-5">
                {comparisonRows.map((r) => (
                  <div key={r.row} className="flex gap-3">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground">{r.row}</div>
                      <div className="text-sm text-foreground font-medium mt-0.5">{r.loxx}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
