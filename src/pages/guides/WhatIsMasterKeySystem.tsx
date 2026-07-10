import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoxxLogo } from "@/components/LoxxLogo";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import {
  GraduationCap, HeartPulse, Briefcase, Home, Landmark, Ticket,
  ChevronDown, ChevronUp, CheckCircle2, AlertTriangle,
} from "lucide-react";

// ─── Environment cards ─────────────────────────────────────────────────────
const environments = [
  {
    icon: GraduationCap,
    title: "Schools, colleges and universities",
    body: "Education sites often need to control access across classrooms, staff rooms, offices, plant rooms, stores, sports areas and external gates. A well-planned system can give staff the access they need while keeping restricted areas separated. Over time, staff change and the system expands — keeping the record accurate is where most estates teams struggle.",
  },
  {
    icon: HeartPulse,
    title: "Hospitals and healthcare sites",
    body: "Healthcare buildings need to separate public areas, clinical spaces, administration and plant rooms. A master key system can support that structure while giving authorised facilities and security personnel access to critical areas. The system record needs to stay accurate as wards change and staff turn over.",
  },
  {
    icon: Briefcase,
    title: "Commercial buildings and offices",
    body: "Offices often need different access levels for reception, meeting rooms, staff areas, server rooms, stores and management offices. A master key system can be structured around departments, floors or job roles. Without a clear record, facilities teams quickly lose track of what each key opens.",
  },
  {
    icon: Home,
    title: "Apartment buildings and managed properties",
    body: "Residential blocks need a mix of private and shared access — individual apartments, main entrances, bin stores, bike rooms, car parks and plant areas. A master key structure lets residents use one key for permitted shared areas without accessing other private units. Replacement cylinders and future extensions need to be tracked carefully.",
  },
  {
    icon: Landmark,
    title: "Councils and public sector estates",
    body: "Public sector estates often span multiple buildings, departments, contractors and long-term maintenance responsibilities. Designing the system is only part of the challenge — keeping the record accurate over years of changes, staff turnover and building alterations is where the real management burden sits.",
  },
  {
    icon: Ticket,
    title: "Leisure, venues and public buildings",
    body: "Cinemas, theatres, sports facilities and public buildings need to separate public areas from staff-only, cash-handling, back-of-house and emergency routes. A master key system can support day-to-day operations while keeping restricted areas controlled. Lost keys and contractor access are the most common management issues.",
  },
];

// ─── Common mistakes ───────────────────────────────────────────────────────
const mistakes = [
  "Building the system around today's doors only, with no room for future expansion",
  "Creating too many master key levels, which makes the system harder to understand and maintain",
  "Allowing cross keying without recording why, creating confusion later",
  "Not recording who holds each key after the system is handed over",
  "Treating lost keys as a minor admin issue rather than an access risk",
  "Keeping the system record in spreadsheets, PDFs, emails or individual memory",
];

// ─── Planning steps ───────────────────────────────────────────────────────
const planningSteps = [
  { n: "1", t: "Map your buildings and doors", d: "List every door that needs to be part of the system, including which areas need to be separated and which can be shared." },
  { n: "2", t: "Group doors by how the site actually works", d: "Let the real access patterns — not the floor plan — guide the hierarchy. A department that shares a corridor does not need to share a master key group." },
  { n: "3", t: "Define who needs access to what", d: "Map people by job role or responsibility, not by name. The system should survive staff changes." },
  { n: "4", t: "Keep the hierarchy as simple as possible", d: "Every additional master key level adds complexity. Use the minimum number of levels that meets your access requirements." },
  { n: "5", t: "Plan for future expansion", d: "If you are likely to add floors, departments or buildings, leave room in the design without disrupting the existing system." },
  { n: "6", t: "Decide who can approve new keys and cylinders", d: "Be clear about who is authorised to request replacements or additions. This protects the security of the system over time." },
  { n: "7", t: "Keep the record live after handover", d: "The system record should reflect the current state — not just the original design. Every change, issued key and lost key event should be recorded." },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: "What is the difference between keyed alike and master keyed?",
    a: "Keyed alike means multiple locks share the same key, with no hierarchy. Master keyed means a higher-level key can open multiple locks, while each lock still has its own individual key. They solve different problems and should not be confused when planning a system.",
  },
  {
    q: "What is a grand master key?",
    a: "A grand master key sits at the top of the hierarchy and can open every lock in the system within its defined scope. It is typically held by authorised senior facilities, estates or security personnel and used for authorised access across the site.",
  },
  {
    q: "Can a master key system be expanded later?",
    a: "Yes, if the original system was designed with expansion in mind. A well-planned system leaves room to add new master key groups, sub master levels and cylinders without replacing existing hardware. My LOXX helps you plan and visualise extensions before ordering.",
  },
  {
    q: "What happens if a master key is lost?",
    a: "A lost grand master key can create a serious risk because it may provide access to a wide part of the system. The right response depends on what the key opens, where it was lost and whether the system record is accurate. My LOXX helps you see which doors a lost key is associated with so you can assess the impact clearly.",
  },
  {
    q: "Who should be responsible for managing a master key system?",
    a: "Usually the estates or facilities management team. In smaller organisations it may sit with a site manager or business manager. The key requirement is that one person or team owns the record, controls who can order keys and tracks changes over time.",
  },
  {
    q: "Can replacement keys be controlled?",
    a: "For systems supplied through My LOXX, replacement keys are ordered through the platform so requests can be recorded against the live system. This helps keep key control and order history in one place.",
  },
  {
    q: "Do master key systems work for schools and hospitals?",
    a: "Yes. Both sectors use master key systems routinely. Schools need to separate classrooms, stores, plant rooms and staff areas. Hospitals need to separate public areas, clinical spaces and restricted zones. The management challenge in both is keeping the record accurate over time, not just designing the initial system.",
  },
  {
    q: "Is a master key system the same as access control?",
    a: "No. Access control uses electronic readers, cards or fobs. A master key system uses physical locks and keys. The two can coexist in the same building — access control for high-traffic or high-security entry points, master keying for the remainder. My LOXX manages physical master key systems only.",
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
        {open
          ? <ChevronUp className="h-4 w-4 shrink-0 text-primary" />
          : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function WhatIsMasterKeySystem() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── NAV ── */}
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
            A master key system is a planned lock and key structure that lets different people open different doors with the right level of access.
          </p>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-2xl">
            A site manager may need access to every door. A department lead may only need one area. A teacher, tenant or contractor may only need a single room or defined group of doors. My LOXX helps organisations keep that system clear, current and controlled from one digital record.
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

      {/* ── 2. PLAIN-ENGLISH DEFINITION ── */}
      <section className="container py-14 max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight">Master key systems, explained simply</h2>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          In a basic lock setup, each door has its own key. That works for a small number of doors, but it quickly becomes difficult to manage across a school, hospital, office building or estate. Staff end up carrying large bunches of keys. There is no clear record of who has access to what. When someone leaves, you are never quite sure what to ask them to hand back.
        </p>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          A master key system solves this by creating a hierarchy. Individual keys open specific doors. Master keys open groups of doors. A grand master key can sit above those groups for authorised senior access, where specified.
        </p>
        <div className="mt-6 p-5 rounded-xl border border-border bg-card">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Example</div>
          <p className="text-sm text-foreground leading-relaxed">
            In a school, a classroom key may only open Room 12. A department key may open all the science rooms. A site manager's key may open every classroom, store, plant room and office included in the system.
          </p>
        </div>
      </section>

      {/* ── 3. HIERARCHY VISUAL ── */}
      <section className="bg-card border-y border-border">
        <div className="container py-14 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">The key hierarchy</h2>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            Most master key systems are built around four levels. Not every system needs all four — simpler sites may only need two or three.
          </p>
          <div className="mt-8 space-y-3">
            {/* GMK */}
            <div className="flex gap-4 items-start p-5 rounded-xl border bg-background"
              style={{ borderColor: "hsl(245,60%,67%,0.4)", borderLeftWidth: "3px", borderLeftColor: "hsl(245,60%,67%)" }}>
              <div className="h-3 w-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: "hsl(245,60%,67%)" }} />
              <div>
                <div className="text-sm font-bold text-foreground">Grand Master Key</div>
                <div className="text-sm text-muted-foreground mt-0.5">Highest level access across the system, where specified. Typically held by authorised senior facilities, estates or security personnel.</div>
              </div>
            </div>
            {/* MK */}
            <div className="ml-6 flex gap-4 items-start p-5 rounded-xl border bg-background"
              style={{ borderColor: "hsl(178,60%,45%,0.4)", borderLeftWidth: "3px", borderLeftColor: "hsl(178,60%,45%)" }}>
              <div className="h-3 w-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: "hsl(178,60%,45%)" }} />
              <div>
                <div className="text-sm font-bold text-foreground">Master Key</div>
                <div className="text-sm text-muted-foreground mt-0.5">Access to a building, department or main group of doors within the system.</div>
              </div>
            </div>
            {/* SMK */}
            <div className="ml-12 flex gap-4 items-start p-5 rounded-xl border bg-background"
              style={{ borderColor: "hsl(154,71%,36%,0.4)", borderLeftWidth: "3px", borderLeftColor: "hsl(154,71%,36%)" }}>
              <div className="h-3 w-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: "hsl(154,71%,36%)" }} />
              <div>
                <div className="text-sm font-bold text-foreground">Sub Master Key</div>
                <div className="text-sm text-muted-foreground mt-0.5">Access to a smaller zone, floor or team area within a master key group.</div>
              </div>
            </div>
            {/* CYL */}
            <div className="ml-18 flex gap-4 items-start p-5 rounded-xl border bg-background"
              style={{ borderColor: "hsl(33,91%,44%,0.4)", borderLeftWidth: "3px", borderLeftColor: "hsl(33,91%,44%)", marginLeft: "4.5rem" }}>
              <div className="h-3 w-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: "hsl(33,91%,44%)" }} />
              <div>
                <div className="text-sm font-bold text-foreground">Individual Key</div>
                <div className="text-sm text-muted-foreground mt-0.5">Access to one door or a defined keyed-alike group. Each lock also has its own individual key.</div>
              </div>
            </div>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            These colours match the My LOXX System Builder, so the hierarchy you plan here is the same one you will see in the platform.
          </p>
        </div>
      </section>

      {/* ── 4. KEY TERMS ── */}
      <section className="container py-14 max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight">Key terms worth knowing</h2>
        <p className="mt-3 text-base text-muted-foreground leading-relaxed">
          Master key terminology is used inconsistently in the industry. These definitions reflect standard UK practice.
        </p>
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {[
            { term: "Keyed to differ", def: "Each lock has its own unique key. No two locks in the system share a key." },
            { term: "Keyed alike", def: "Several locks share the same key. Useful for groups of identical rooms where one person needs access to all of them." },
            { term: "Master key", def: "A key that opens multiple locks within a defined group, while each lock still has its own individual key." },
            { term: "Grand master key", def: "A higher-level key that opens multiple master key groups across the system, where specified." },
            { term: "Central locking", def: "A shared door — such as a main entrance — that can be opened by many different user keys in the system, without those keys being master keys." },
            { term: "Cross keying", def: "When an extra key is allowed to open a cylinder outside the normal hierarchy. It can be useful in specific cases, but should be used carefully — it can make the system harder to understand and extend later." },
          ].map((g) => (
            <div key={g.term} className="p-4 rounded-lg border border-border bg-card">
              <div className="text-sm font-bold text-foreground">{g.term}</div>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{g.def}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. WHY ORGANISATIONS USE THEM ── */}
      <section className="bg-card border-y border-border">
        <div className="container py-14 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">Why organisations use master key systems</h2>
          <div className="mt-6 space-y-4">
            {[
              { t: "Fewer keys to carry", d: "People carry one key for the areas they are authorised to access, rather than a separate key for every door." },
              { t: "Clearer access levels", d: "Access can be planned around buildings, departments, roles or zones — making it easier to manage who can go where." },
              { t: "Faster authorised access", d: "Authorised facilities, estates or security personnel can access critical areas when needed without relying on others to open doors." },
              { t: "Cleaner handover", d: "A planned system is easier to explain, document and manage than a collection of unrelated locks and separate key bunches." },
              { t: "Room for future expansion", d: "If the system is designed properly, new doors, departments or buildings can be added later without replacing existing cylinders." },
            ].map((b) => (
              <div key={b.t} className="flex gap-3 items-start">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" strokeWidth={2.25} />
                <div>
                  <div className="text-sm font-semibold text-foreground">{b.t}</div>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{b.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. ENVIRONMENTS ── */}
      <section className="container py-14">
        <div className="max-w-3xl mb-8">
          <h2 className="text-2xl font-bold tracking-tight">How master key systems are used in different buildings</h2>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            The structure of a master key system depends on how the building is used. The access needs of a school are different from those of a hospital or residential block, even if the underlying lock and key principles are the same.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {environments.map((e) => (
            <div key={e.title} className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center gap-2 mb-3">
                <e.icon className="h-4 w-4 text-primary shrink-0" strokeWidth={2} />
                <h3 className="text-sm font-bold leading-snug">{e.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{e.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground max-w-3xl">
          My LOXX is used across all of these environments to keep the system record live, track changes and manage replacement orders from one place.
        </p>
      </section>

      {/* ── 7. COMMON MISTAKES ── */}
      <section className="bg-card border-y border-border">
        <div className="container py-14 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">Common mistakes when managing a master key system</h2>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            Most problems with master key systems are not technical. They are the result of record-keeping and process failures that build up over time.
          </p>
          <div className="mt-6 space-y-3">
            {mistakes.map((m) => (
              <div key={m} className="flex gap-3 items-start p-4 rounded-lg border border-border bg-background">
                <AlertTriangle className="h-4 w-4 text-primary/70 shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-sm text-muted-foreground leading-relaxed">{m}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. THE RECORD PROBLEM ── */}
      <section className="container py-14 max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight">The problem is rarely the lock. It is the record.</h2>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          Most master key systems start with a proper schedule. A locksmith or architectural ironmonger designs the hierarchy, supplies the cylinders and keys, and hands over a document that describes the system.
        </p>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          The problem is what happens afterwards. Keys are issued. Staff leave. Contractors borrow keys. Cylinders are replaced. Doors are added. Years later, the original schedule no longer reflects the real building.
        </p>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          When that happens, facilities teams can lose confidence in the system. They may not know who holds which key, what a lost key actually opens, or whether a replacement order matches the current setup. At that point, the system becomes more of a liability than an asset.
        </p>
      </section>

      {/* ── 9. PLANNING STEPS ── */}
      <section className="bg-card border-y border-border">
        <div className="container py-14 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">How to plan a master key system</h2>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            A well-planned system is easier to manage, easier to extend and less likely to create problems when staff change or buildings grow.
          </p>
          <div className="mt-8 space-y-5">
            {planningSteps.map((s) => (
              <div key={s.n} className="flex gap-4 items-start">
                <div className="text-2xl font-extrabold text-primary/25 tracking-tight shrink-0 w-7 text-right leading-tight mt-0.5">{s.n}</div>
                <div>
                  <div className="text-sm font-bold text-foreground">{s.t}</div>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. HOW MY LOXX HELPS ── */}
      <section className="container py-14 max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight">How My LOXX helps</h2>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          My LOXX gives your master key system a live digital record. Instead of relying on old schedules, spreadsheets and scattered emails, your team can see the system hierarchy, issued keys, lost key events, replacement orders and changes in one place.
        </p>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          It is not a replacement for good system design — but it is the management layer that most organisations are missing once the system has been installed and handed over.
        </p>
        <div className="mt-6 space-y-3">
          {[
            "Build or import a visual master key hierarchy",
            "Record doors, cylinders and keys",
            "Manage issued keys and key holders",
            "Report lost keys and record the resolution",
            "Keep an audit trail of system changes",
            "Order replacement keys and cylinders from the live record",
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

      {/* ── 11. FAQ ── */}
      <section className="bg-card border-y border-border">
        <div className="container py-14 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">Frequently asked questions</h2>
          <div className="mt-8 rounded-xl border border-border bg-background overflow-hidden px-6">
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
