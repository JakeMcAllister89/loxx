import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoxxLogo } from "@/components/LoxxLogo";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import {
  GraduationCap, HeartPulse, Briefcase, Home, Landmark, Ticket,
  ChevronDown, ChevronUp, Key, ShieldCheck, Users, LayoutGrid,
  FileText, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { useState } from "react";

// ─── Environment cards ─────────────────────────────────────────────────────
const environments = [
  {
    icon: GraduationCap,
    title: "Schools, colleges and universities",
    body: "Education sites often need to control access across classrooms, staff rooms, offices, plant rooms, stores, sports areas and external gates. A well-planned master key system can give staff the access they need while keeping classrooms, restricted rooms and service areas separated. My LOXX helps estates teams keep the system record live, including issued keys, lost keys, replacement orders and future changes.",
  },
  {
    icon: HeartPulse,
    title: "Hospitals and healthcare sites",
    body: "Healthcare buildings often include public areas, wards, consultation rooms, administration areas, plant rooms and restricted clinical spaces. A master key system can help separate general access from sensitive or high-risk areas, while still allowing authorised staff to reach critical areas quickly. My LOXX gives facilities and security teams a clearer record of who holds keys and how access is structured across the site.",
  },
  {
    icon: Briefcase,
    title: "Commercial buildings and offices",
    body: "Offices often need different access levels for reception, meeting rooms, staff areas, IT/server rooms, stores, cleaning cupboards and management offices. A master key system can be structured around departments, floors or job roles. My LOXX helps keep the access hierarchy visible, so facilities teams can understand what each key opens without relying on old schedules or individual memory.",
  },
  {
    icon: Home,
    title: "Apartment buildings and managed properties",
    body: "Residential blocks often need a mix of private and shared access: individual apartments, main entrances, bin stores, bike rooms, car parks, risers and plant areas. A central locking or master key structure can let residents use one key for permitted shared areas without giving access to other private units. My LOXX helps property managers keep communal access, replacement cylinders and future system extensions organised.",
  },
  {
    icon: Landmark,
    title: "Councils and public sector estates",
    body: "Public sector estates often include multiple buildings, departments, contractors and long-term maintenance responsibilities. The challenge is not just designing the system — it is keeping the record accurate over time. My LOXX helps create a permanent system record for doors, cylinders, keys, holders, lost key events and replacement orders.",
  },
  {
    icon: Ticket,
    title: "Leisure, venues and public buildings",
    body: "Cinemas, theatres, sports facilities and public buildings often need to separate public areas from staff-only, cash-handling, back-of-house and emergency access routes. A master key system can support day-to-day operations while keeping restricted areas controlled. My LOXX helps teams manage issued keys and understand the impact of changes or lost keys.",
  },
];

// ─── Glossary terms ────────────────────────────────────────────────────────
const glossary = [
  { term: "Keyed to differ", def: "Each lock has its own individual key. No two locks share a key." },
  { term: "Keyed alike", def: "Several locks are opened by the same key. Useful for shared areas or where one person needs access to multiple identical rooms." },
  { term: "Master key", def: "A key that opens multiple locks within a defined group, while each lock still has its own individual key." },
  { term: "Grand master key", def: "A higher-level key that opens multiple master key groups. In a large estate, the grand master might open every door across every building." },
  { term: "Common entrance / central locking", def: "A shared door — such as a main entrance — that can be opened by many different user keys in the system, without those keys being master keys." },
  { term: "Cross keying", def: "Where an extra key is allowed to operate a cylinder outside the normal hierarchy. Use carefully — it can reduce system clarity and make future management harder." },
];

// ─── Benefits ─────────────────────────────────────────────────────────────
const benefits = [
  { icon: Key, title: "Fewer keys in circulation", desc: "Staff carry one key for their access level rather than a separate key for every door." },
  { icon: ShieldCheck, title: "Controlled access", desc: "Different areas can be restricted to specific people, job roles or time periods." },
  { icon: AlertTriangle, title: "Emergency access", desc: "Senior staff or emergency responders can hold a master key that opens everything when needed." },
  { icon: Users, title: "Cleaner administration", desc: "New starters get one key. Leavers hand one key back. Access levels are defined by the system, not individual arrangements." },
  { icon: LayoutGrid, title: "Future expansion", desc: "A well-planned system can be extended to new floors, buildings or access groups without replacing existing cylinders." },
];

// ─── Risks ────────────────────────────────────────────────────────────────
const risks = [
  "No one knows who holds which keys",
  "Lost keys are not assessed properly — the impact on the system is unknown",
  "Replacement keys are ordered without a clear audit trail",
  "Old records become out of date as staff change and buildings are extended",
  "Future extensions become harder to plan without an accurate picture of the current system",
];

// ─── Planning steps ───────────────────────────────────────────────────────
const planningSteps = [
  { n: "01", title: "Map your buildings and doors", desc: "List every door that needs to be part of the system, including which areas need to be separated and which can be shared." },
  { n: "02", title: "Define who needs access to what", desc: "Group people by job role, department or floor and map those groups to the areas they need to reach." },
  { n: "03", title: "Keep the structure simple", desc: "A system with too many master key levels becomes difficult to manage. Start with the simplest hierarchy that meets your access needs." },
  { n: "04", title: "Plan for future growth", desc: "If you are likely to add more floors, departments or buildings, leave room in the system design for expansion without disruption." },
  { n: "05", title: "Decide who controls orders", desc: "Be clear about who is authorised to request new keys or replacement cylinders. This protects the security of the system." },
  { n: "06", title: "Keep a live record", desc: "The system record should reflect the current state — including issued keys, lost keys, changes and new additions — not just the original design." },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: "What is the difference between keyed alike and master keyed?",
    a: "Keyed alike means multiple locks share the same key, with no hierarchy. Master keyed means a higher-level key can open multiple locks, while each lock still has its own individual key. They are different things and should not be confused when planning a system.",
  },
  {
    q: "What is a grand master key?",
    a: "A grand master key sits at the top of the hierarchy and opens every lock in the system. It is typically held by senior estate or facilities management and provides emergency access across all areas.",
  },
  {
    q: "Can a master key system be expanded later?",
    a: "Yes, if the original system was designed with expansion in mind. A well-planned system leaves room to add new master key groups, sub master levels and cylinders without replacing existing hardware. My LOXX helps you plan and visualise these extensions before ordering.",
  },
  {
    q: "What happens if a master key is lost?",
    a: "The impact depends on which key is lost. A grand master key loss compromises the entire system. A sub master or individual key has a narrower impact. My LOXX helps you see exactly which doors a lost key could open, so you can respond accurately rather than having to guess.",
  },
  {
    q: "Who should be responsible for managing a master key system?",
    a: "Usually the estates or facilities management team. In smaller organisations it may sit with a site manager or business manager. The key requirement is that one person or team owns the record, controls who can order keys and tracks changes over time.",
  },
  {
    q: "Can replacement keys be controlled?",
    a: "Yes. DOM Sirius® cylinders use a patented key profile that cannot be copied on the high street. Replacement keys can only be ordered through My LOXX, which means the system stays under your control.",
  },
  {
    q: "Do master key systems work for schools and hospitals?",
    a: "Yes. Both sectors use master key systems routinely. Schools need to separate classrooms, stores, plant rooms and staff areas. Hospitals need to separate public areas, clinical spaces and restricted zones. My LOXX was built specifically to support the management needs of these environments.",
  },
  {
    q: "Is a master key system the same as access control?",
    a: "No. Access control uses electronic readers, cards or fobs and can be programmed remotely. A master key system uses physical locks and keys. The two can coexist in the same building — access control for high-traffic or high-security entry points, master keying for the remainder. My LOXX manages physical master key systems only.",
  },
];

// ─── FAQ accordion item ───────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-foreground hover:text-primary transition-colors"
      >
        <span>{q}</span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-primary" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function WhatIsMasterKeySystem() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── NAV — matches Index.tsx exactly ── */}
      <header className="bg-[#fafafa] text-foreground border-b border-border/60">
        <div className="container flex items-center justify-between py-4">
          <Link to="/"><LoxxLogo /></Link>
          <nav className="flex items-center gap-2">
            <Link to="/guides/what-is-a-master-key-system" className="text-sm px-3 py-2 text-foreground font-medium">Guide</Link>
            <Link to="/cylinders-and-keys" className="text-sm px-3 py-2 text-foreground/70 hover:text-foreground">Cylinders &amp; Keys</Link>
            <Link to="/auth" className="text-sm px-3 py-2 text-foreground/70 hover:text-foreground">Sign In</Link>
            <Button asChild className="bg-primary hover:bg-primary/90"><Link to="/auth?mode=signup">Get Started</Link></Button>
          </nav>
        </div>
      </header>

      {/* ── 1. HERO ── */}
      <section className="bg-[#fafafa] border-b border-border/60">
        <div className="container py-14 md:py-20 max-w-3xl">
          <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-primary mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Guide
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
            What is a master key system?
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-2xl">
            A master key system allows different keys to open different doors within the same building or estate. It gives the right people access to the right areas, while reducing the number of keys in circulation.
          </p>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-2xl">
            My LOXX helps organisations design, manage and maintain these systems from one secure digital record.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
              <Link to="/book-a-demo">Book a My LOXX Demo</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/cylinders-and-keys">View Cylinders &amp; Keys</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── 2. QUICK DEFINITION ── */}
      <section className="container py-14 max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight">Master key systems, explained simply</h2>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          A master key system is a planned lock and key structure where selected keys can open more than one door.
        </p>
        <div className="mt-4 p-5 rounded-xl border border-border bg-card text-sm text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Example:</span> A classroom key may only open one classroom. A department master key may open several classrooms. A grand master key may open every door in the building.
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="px-3 py-1.5 rounded-full" style={{ backgroundColor: "hsl(245,60%,67%,0.14)", color: "hsl(245,45%,42%)" }}>GMK — opens all</span>
          <span className="text-muted-foreground/40">→</span>
          <span className="px-3 py-1.5 rounded-full" style={{ backgroundColor: "hsl(178,60%,45%,0.14)", color: "hsl(178,55%,28%)" }}>MK — opens one building or department</span>
          <span className="text-muted-foreground/40">→</span>
          <span className="px-3 py-1.5 rounded-full" style={{ backgroundColor: "hsl(154,71%,45%,0.14)", color: "hsl(154,55%,26%)" }}>SMK — opens a zone or smaller group</span>
          <span className="text-muted-foreground/40">→</span>
          <span className="px-3 py-1.5 rounded-full" style={{ backgroundColor: "hsl(33,91%,44%,0.16)", color: "hsl(33,85%,32%)" }}>Individual key — opens defined door(s)</span>
        </div>
      </section>

      {/* ── 3. GLOSSARY ── */}
      <section className="bg-card border-y border-border">
        <div className="container py-14">
          <h2 className="text-2xl font-bold tracking-tight">Common terms</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {glossary.map((g) => (
              <div key={g.term} className="rounded-xl border border-border bg-background p-5 shadow-sm">
                <div className="text-sm font-bold text-foreground">{g.term}</div>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{g.def}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. BENEFITS ── */}
      <section className="container py-14">
        <h2 className="text-2xl font-bold tracking-tight">Why organisations use master key systems</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <span className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
                <b.icon className="h-4 w-4 text-primary" strokeWidth={2.25} />
              </span>
              <div className="mt-3 text-sm font-bold text-foreground">{b.title}</div>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. ENVIRONMENTS ── */}
      <section className="bg-card border-y border-border">
        <div className="container py-14">
          <h2 className="text-2xl font-bold tracking-tight">How master key systems work in different buildings</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            {environments.map((e) => (
              <div key={e.title} className="rounded-xl border border-border bg-background p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                <span className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                  <e.icon className="h-5 w-5 text-primary" strokeWidth={2} />
                </span>
                <h3 className="mt-4 text-base font-bold leading-snug">{e.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{e.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. RISKS ── */}
      <section className="container py-14 max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight">The system is only as good as the record behind it</h2>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          A master key system can become difficult to manage when records are spread across spreadsheets, PDFs, emails, locksmith notes and individual memory. Common problems include:
        </p>
        <div className="mt-6 space-y-3">
          {risks.map((r) => (
            <div key={r} className="flex gap-3 items-start p-4 rounded-lg border border-border bg-card">
              <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" strokeWidth={2.25} />
              <p className="text-sm text-muted-foreground leading-relaxed">{r}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. PLANNING STEPS ── */}
      <section className="bg-card border-y border-border">
        <div className="container py-14">
          <h2 className="text-2xl font-bold tracking-tight">How to plan a master key system</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            {planningSteps.map((s) => (
              <div key={s.n} className="rounded-xl border border-border bg-background p-5 shadow-sm">
                <div className="text-2xl font-extrabold text-primary/30 tracking-tight">{s.n}</div>
                <div className="mt-2 text-sm font-bold text-foreground">{s.title}</div>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. HOW MY LOXX HELPS ── */}
      <section className="container py-14 max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight">My LOXX gives your master key system a permanent digital home</h2>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          My LOXX is built for the day-to-day reality of managing a master key system — not just specifying a new one, but keeping the record accurate over time as keys are lost, staff change and buildings grow.
        </p>
        <div className="mt-6 space-y-3">
          {[
            "Build a visual system hierarchy — floors, zones, cylinders and keys, all mapped in one place",
            "Record every door, cylinder and key in your system",
            "Manage issued keys and track changes over time",
            "Report and resolve lost keys — with an instant view of what that key could open",
            "Track every system change with a full audit log",
            "Order replacement keys and cylinders directly from the live system record",
          ].map((point) => (
            <div key={point} className="flex gap-3 items-start">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" strokeWidth={2.25} />
              <p className="text-sm text-muted-foreground leading-relaxed">{point}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
            <Link to="/book-a-demo">Book a My LOXX Demo</Link>
          </Button>
        </div>
      </section>

      {/* ── 9. FAQ ── */}
      <section className="bg-card border-y border-border">
        <div className="container py-14 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">Frequently asked questions</h2>
          <div className="mt-8 rounded-xl border border-border bg-background divide-y divide-border overflow-hidden px-6">
            {faqs.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-primary">
        <div className="container py-14 max-w-2xl text-center">
          <p className="text-sm text-primary-foreground/75 mb-3">Managing an existing system?</p>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-primary-foreground">
            My LOXX keeps everything in one place.
          </h2>
          <div className="mt-6 flex justify-center">
            <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90">
              <Link to="/book-a-demo">Book a My LOXX Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
