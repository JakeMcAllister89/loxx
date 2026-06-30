import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoxxLogo } from "@/components/LoxxLogo";
import {
  ShieldCheck, Lock, BadgeCheck, ArrowRight, KeyRound, Users,
  LayoutGrid, Receipt, GraduationCap, HeartPulse, Home, Landmark,
  BookOpen, Briefcase, ShieldAlert,
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

const comparison = [
  { row: "Who has system access", paper: "Whoever last edited the spreadsheet, untracked", generic: "Basic logins, not built for key hierarchies", loxx: "Role-based access, scoped per system" },
  { row: "Lost key response", paper: "Manual check, hope the records are current", generic: "Not key-system aware", loxx: "Instantly see exactly what that key opened" },
  { row: "Reordering a cylinder", paper: "Phone call, then a wait", generic: "Still routed through a supplier call", loxx: "Real pricing, ordered online in minutes" },
  { row: "Audit trail", paper: "None, unless someone remembers to log it", generic: "Generic activity log, not keying-specific", loxx: "Every order, change and login, timestamped" },
  { row: "Quotes & invoices", paper: "Built by hand", generic: "Not generated", loxx: "Generated automatically from your system" },
];

const security = [
  { icon: ShieldCheck, t: "German engineering", d: "Cylinders engineered and manufactured in Germany, DIN EN1303 rated, with anti-bump, anti-pick, and drill-and-pull resistance." },
  { icon: KeyRound, t: "Patented key protection", d: "The key profile can't be cut by a high-street cutter. Replacements only come through My LOXX." },
  { icon: Users, t: "Role-based access", d: "Four permission tiers, scoped per system, so people only see and do what they should." },
  { icon: Lock, t: "Full audit trail", d: "Every order, change, and login logged with a name and a timestamp — nothing untraceable." },
];

const sectors = [
  { icon: GraduationCap, t: "Schools", d: "Protect classrooms, stores, and the people in them." },
  { icon: HeartPulse, t: "NHS sites", d: "Sensitive areas need controlled, traceable access." },
  { icon: Home, t: "Care homes", d: "Balance resident safety with staff access." },
  { icon: Landmark, t: "Councils", d: "Manage estates across multiple sites." },
  { icon: BookOpen, t: "Universities", d: "Layered access for students, staff, and faculty." },
  { icon: Briefcase, t: "Offices", d: "Keep meeting rooms, server rooms, and stores secure." },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="bg-[hsl(var(--sidebar-background))] text-sidebar-foreground">
        <div className="container flex items-center justify-between py-4">
          <LoxxLogo />
          <nav className="flex items-center gap-2">
            <Link to="/auth" className="text-sm px-3 py-2 text-sidebar-foreground/80 hover:text-sidebar-foreground">Sign in</Link>
            <Button asChild className="bg-primary hover:bg-primary/90"><Link to="/auth?mode=signup">Get started</Link></Button>
          </nav>
        </div>

        {/* Hero */}
        <section className="container py-20 md:py-28 max-w-4xl">
          <div className="inline-block px-3 py-1 rounded-full bg-white/5 text-xs text-sidebar-foreground/80 mb-6 border border-white/10">
            UK-fulfilled · German-engineered hardware
          </div>
          <h1 className="font-semibold text-4xl md:text-6xl leading-[1.05] tracking-tight">
            Your master key system,<br />out of the spreadsheet.
          </h1>
          <p className="mt-6 text-lg text-sidebar-foreground/70 max-w-2xl">
            My LOXX gives facilities managers one place to see every key, every door, and every person who holds access — reorder a lost key or add new doors to your system in minutes, and keep an online record that doesn't depend on whoever set it up still working here.
          </p>
          <p className="mt-4 text-sm text-sidebar-foreground/60 max-w-2xl">
            For the people who manage schools, care homes, NHS sites, councils, universities, and offices — buildings that run on a master key system.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link to="/auth?mode=signup">Get started <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            {/* TODO: Jake to provide real destination (mailto / booking link) before launch */}
            <Button asChild size="lg" variant="outline" className="border-white/20 bg-transparent text-sidebar-foreground hover:bg-white/5 hover:text-sidebar-foreground">
              <a href="#book-a-walkthrough">Book a walkthrough</a>
            </Button>
          </div>
        </section>
      </header>

      {/* Real product screenshot, high on the page */}
      <section className="container py-12 md:py-16">
        <div className="rounded-[12px] border border-border bg-card shadow-card overflow-hidden">
          <img
            src={builderCanvasExample}
            alt="My LOXX builder canvas showing a master key hierarchy with grand master, sub masters, and individual cylinders"
            width={1600}
            height={1024}
            className="w-full h-auto block"
          />
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          This is a real system, built in My LOXX — every key, every door, every change logged.
        </p>
      </section>

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

      {/* Pain -> feature blocks */}
      <section className="container py-20">
        <h2 className="text-3xl font-semibold tracking-tight max-w-3xl">The problems you're actually dealing with</h2>
        <div className="grid md:grid-cols-2 gap-6 mt-10">
          {painBlocks.map((b) => (
            <div key={b.q} className="rounded-[10px] border bg-card p-6 shadow-card">
              <b.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold leading-snug">{b.q}</h3>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{b.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-card border-y border-border">
        <div className="container py-16">
          <h2 className="text-3xl font-semibold tracking-tight">Not a spreadsheet. Not generic software.</h2>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left">
                  <th className="py-3 pr-4 font-medium text-muted-foreground"></th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">Paper / spreadsheet</th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">Generic software</th>
                  <th className="py-3 px-4 font-semibold text-primary">My LOXX</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.row} className="border-t border-border align-top">
                    <td className="py-4 pr-4 font-medium">{row.row}</td>
                    <td className="py-4 px-4 text-muted-foreground">{row.paper}</td>
                    <td className="py-4 px-4 text-muted-foreground">{row.generic}</td>
                    <td className="py-4 px-4 text-foreground font-medium">{row.loxx}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Security / trust grid */}
      <section className="container py-20">
        <h2 className="text-3xl font-semibold tracking-tight">Built to actually be secure</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          {security.map((s) => (
            <div key={s.t} className="rounded-[10px] border bg-card p-6 shadow-card">
              <s.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-base font-semibold">{s.t}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="bg-card border-y border-border">
        <div className="container py-16">
          <h2 className="text-3xl font-semibold tracking-tight max-w-3xl">
            For the people who manage buildings, not the people who lock them up
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            {sectors.map((s) => (
              <div key={s.t} className="rounded-[10px] border bg-background p-6">
                <s.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-4 text-base font-semibold">{s.t}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing line */}
      <section className="container py-16">
        <p className="max-w-3xl mx-auto text-center text-lg text-foreground leading-relaxed">
          No subscription. No software fee. You pay only when you order hardware — which most facilities teams already expense through their maintenance budget.
        </p>
      </section>

      {/* Final CTA */}
      <section id="book-a-walkthrough" className="bg-[hsl(var(--sidebar-background))] text-sidebar-foreground">
        <div className="container py-20 max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Get your master key system out of the spreadsheet.
          </h2>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link to="/auth?mode=signup">Get started <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 bg-transparent text-sidebar-foreground hover:bg-white/5 hover:text-sidebar-foreground">
              <a href="#book-a-walkthrough">Book a walkthrough</a>
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
