import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoxxLogo } from "@/components/LoxxLogo";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import builderCanvasExample from "@/assets/builder-canvas-example.png";
import keyHierarchyImage from "@/assets/key-hierarchy.png";
import cylinderDouble from "@/assets/cylinder-double.png";
import cylinderThumbTurn from "@/assets/cylinder-thumbturn.jpg";
import cylinderHalf from "@/assets/cylinder-half.jpg";
import cylinderPadlock from "@/assets/cylinder-padlock.jpg";
import cylinderRoundRim from "@/assets/cylinder-round-rim.jpg";
import {
  GraduationCap,
  HeartPulse,
  Briefcase,
  Home,
  Landmark,
  Ticket,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";

// ─── Environment cards ─────────────────────────────────────────────────────
const environments = [
  {
    icon: GraduationCap,
    title: "Schools, colleges and universities",
    areas: "Classrooms, staff rooms, offices, plant rooms, sports halls, stores, external gates and contractor areas.",
    body: "Education sites often need to control access across classrooms, staff rooms, offices, plant rooms, stores, sports areas and external gates. A well-planned system can give staff the access they need while keeping restricted areas separated. Over time, staff change and the system expands — keeping the record accurate is where most estates teams struggle.",
  },
  {
    icon: HeartPulse,
    title: "Hospitals and healthcare sites",
    areas:
      "Wards, consultation rooms, admin offices, plant rooms, stores, restricted clinical spaces and back-of-house areas.",
    body: "Healthcare buildings need to separate public areas, clinical spaces, administration and plant rooms. A master key system can support that structure while giving authorised facilities and security personnel access to critical areas. The system record needs to stay accurate as wards change and staff turn over.",
  },
  {
    icon: Briefcase,
    title: "Commercial buildings and offices",
    areas: "Reception, meeting rooms, staff areas, server rooms, stores, cleaning cupboards and management offices.",
    body: "Offices often need different access levels for reception, meeting rooms, staff areas, server rooms, stores and management offices. A master key system can be structured around departments, floors or job roles. Without a clear record, facilities teams quickly lose track of what each key opens.",
  },
  {
    icon: Home,
    title: "Apartment buildings and managed properties",
    areas: "Main entrance, individual apartments, bin stores, cycle rooms, car parks, plant rooms and riser cupboards.",
    body: "Residential blocks need a mix of private and shared access — individual apartments, main entrances, bin stores, bike rooms, car parks and plant areas. A master key structure lets residents use one key for permitted shared areas without accessing other private units. Replacement cylinders and future extensions need to be tracked carefully.",
  },
  {
    icon: Landmark,
    title: "Councils and public sector estates",
    areas:
      "Offices, public counters, secure storage, plant rooms, depots, maintenance areas and contractor access points.",
    body: "Public sector estates often span multiple buildings, departments, contractors and long-term maintenance responsibilities. Designing the system is only part of the challenge — keeping the record accurate over years of changes, staff turnover and building alterations is where the real management burden sits.",
  },
  {
    icon: Ticket,
    title: "Leisure, venues and public buildings",
    areas:
      "Public areas, box offices, cash-handling rooms, back-of-house, staff areas, plant rooms and emergency routes.",
    body: "Cinemas, theatres, sports facilities and public buildings need to separate public areas from staff-only, cash-handling, back-of-house and emergency routes. A master key system can support day-to-day operations while keeping restricted areas controlled. Lost keys and contractor access are the most common management issues.",
  },
];

// ─── Common mistakes ───────────────────────────────────────────────────────
const mistakes = [
  "Building the system around today's doors only, with no room for future expansion",
  "Creating too many master key levels, which makes the system harder to understand and maintain",
  "Not recording who holds each key after the system is handed over",
  "Treating lost keys as a minor admin issue rather than an access risk",
  "Keeping the system record in spreadsheets, PDFs, emails or individual memory",
];

// ─── Planning steps ───────────────────────────────────────────────────────
const planningSteps = [
  {
    n: "1",
    t: "Map your buildings and doors",
    d: "List every door that needs to be part of the system, including which areas need to be separated and which can be shared.",
  },
  {
    n: "2",
    t: "Group doors by how the site actually works",
    d: "Let the real access patterns — not the floor plan — guide the hierarchy. A department that shares a corridor does not need to share a master key group.",
  },
  {
    n: "3",
    t: "Define who needs access to what",
    d: "Map people by job role or responsibility, not by name. The system should survive staff changes.",
  },
  {
    n: "4",
    t: "Keep the hierarchy as simple as possible",
    d: "Every additional master key level adds complexity. Use the minimum number of levels that meets your access requirements.",
  },
  {
    n: "5",
    t: "Plan for future expansion",
    d: "If you are likely to add floors, departments or buildings, leave room in the design without disrupting the existing system.",
  },
  {
    n: "6",
    t: "Decide who can approve new keys and cylinders",
    d: "Be clear about who is authorised to request replacements or additions. This protects the security of the system over time.",
  },
  {
    n: "7",
    t: "Keep the record live after handover",
    d: "The system record should reflect the current state — not just the original design. Every change, issued key and lost key event should be recorded.",
  },
];

// ─── System types ─────────────────────────────────────────────────────────
const systemTypes = [
  {
    t: "Keyed to differ",
    d: "Each lock has its own individual key. Simple to understand, but difficult to manage when there are many doors. The most common starting point for small buildings.",
  },
  {
    t: "Keyed alike",
    d: "Several locks are opened by the same key. Useful for small groups of identical rooms, but it does not create different access levels and should be used deliberately, not by default.",
  },
  {
    t: "Common entrance",
    d: "Shared entrances or communal areas can be opened by many authorised user keys, while private areas remain separate and independently keyed. Widely used in apartment blocks, student accommodation and managed residential developments.",
  },
  {
    t: "Master keyed",
    d: "Individual keys open specific doors, while a master key opens a wider group. The most common arrangement for organisations that need tiered access without a complex hierarchy.",
  },
  {
    t: "Grand master keyed",
    d: "Several master key groups sit beneath a higher-level grand master key, usually for authorised senior facilities or estates access. Used in larger buildings or multi-building estates.",
  },
  {
    t: "Complex systems",
    d: "Large estates may include multiple buildings, departments, shared areas and specialist access groups. These need careful planning so the system remains understandable and expandable as the estate changes.",
  },
];

// ─── Pre-design checklist ─────────────────────────────────────────────────
const preDesignChecklist = [
  "A door schedule or list of openings",
  "Cylinder types and sizes required for each door",
  "Which doors, if any, need to be keyed alike",
  "Which users or roles need access to each area",
  "Any restricted or sensitive areas that need to be separated",
  "Likely future extensions — new floors, departments or buildings",
  "Who is authorised to approve replacement keys and cylinders",
  "Preferred cylinder finishes",
  "Any specialist requirements such as thumbturns, half cylinders, freewheel cylinders or padlocks",
];

// ─── Cylinder options (img is optional — only set for types with real product photos) ─
const cylinderOptions: { t: string; d: string; img?: string; alt?: string }[] = [
  {
    t: "Double cylinders",
    d: "Key operation from both sides of the door. Standard for most external doors and internal doors where both sides need key access.",
    img: cylinderDouble,
    alt: "DOM rs Sirius® double cylinder",
  },
  {
    t: "Thumbturn cylinders",
    d: "Key operation from one side, with a thumbturn on the other. Often used on internal doors where quick egress from one side is needed.",
    img: cylinderThumbTurn,
    alt: "DOM rs Sirius® thumbturn cylinder",
  },
  {
    t: "Half cylinders",
    d: "Often used for plant rooms, cupboards, switches, gates or specialist applications where a full cylinder is not required.",
    img: cylinderHalf,
    alt: "DOM rs Sirius® half cylinder",
  },
  {
    t: "Round rim cylinders",
    d: "Commonly found on common entrance doors, particularly in student accommodation and residential developments. They work with a traditional night-latch style lock case rather than a mortice lock, and can be included in a master key system to give authorised access to shared building entrances.",
    img: cylinderRoundRim,
    alt: "DOM round rim cylinder",
  },
  {
    t: "Padlocks and specialist cylinders",
    d: "Useful where gates, cabinets, stores or external assets need to sit within the same system and be opened by the same key hierarchy.",
    img: cylinderPadlock,
    alt: "DOM padlock",
  },
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
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-primary" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>}
    </div>
  );
}

// ─── System type mini-diagram ─────────────────────────────────────────────
// Simple CSS-only diagrams for keyed-to-differ, keyed-alike, master-keyed
function KeyedToDifferDiagram() {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-background border border-border">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        Keyed to differ
      </div>
      {["Room A", "Room B", "Room C"].map((room, i) => (
        <div key={room} className="flex items-center gap-2">
          <div
            className="h-5 w-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
            style={{ background: `hsl(33,91%,${52 - i * 8}%)`, color: "#fff" }}
          >
            K{i + 1}
          </div>
          <div className="h-px flex-1 bg-border" />
          <div className="h-5 w-14 rounded border border-border bg-card flex items-center justify-center text-[9px] text-muted-foreground shrink-0">
            {room}
          </div>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
        One key per lock. Each key opens only its own door.
      </p>
    </div>
  );
}

function KeyedAlikeDiagram() {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-background border border-border">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Keyed alike</div>
      <div className="flex items-start gap-3">
        <div
          className="h-7 w-7 rounded flex items-center justify-center text-[9px] font-bold shrink-0 mt-1"
          style={{ background: "hsl(33,91%,44%)", color: "#fff" }}
        >
          K1
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          {["Room A", "Room B", "Room C"].map((room) => (
            <div key={room} className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <div className="h-5 w-14 rounded border border-border bg-card flex items-center justify-center text-[9px] text-muted-foreground shrink-0">
                {room}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
        One key opens multiple locks. No access hierarchy.
      </p>
    </div>
  );
}

function MasterKeyedDiagram() {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-background border border-border">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Master keyed</div>
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center gap-1">
          <div
            className="h-6 w-10 rounded flex items-center justify-center text-[9px] font-bold"
            style={{ background: "hsl(178,60%,38%)", color: "#fff" }}
          >
            MK
          </div>
          <div className="w-px flex-1 bg-border min-h-[24px]" />
        </div>
        <div className="flex flex-col gap-1.5 flex-1 mt-0.5">
          {[
            ["K1", "Room A"],
            ["K2", "Room B"],
            ["K3", "Room C"],
          ].map(([k, room]) => (
            <div key={room} className="flex items-center gap-2">
              <div
                className="h-5 w-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{ background: "hsl(33,91%,44%)", color: "#fff" }}
              >
                {k}
              </div>
              <div className="h-px flex-1 bg-border" />
              <div className="h-5 w-14 rounded border border-border bg-card flex items-center justify-center text-[9px] text-muted-foreground shrink-0">
                {room}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
        Individual keys + one master key that opens all doors in the group.
      </p>
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
          <Link to="/">
            <LoxxLogo />
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/guides/what-is-a-master-key-system" className="text-sm px-3 py-2 text-foreground font-medium">
              Guide
            </Link>
            <Link to="/cylinders-and-keys" className="text-sm px-3 py-2 text-foreground/70 hover:text-foreground">
              Cylinders &amp; Keys
            </Link>
            <Link to="/auth" className="text-sm px-3 py-2 text-foreground/70 hover:text-foreground">
              Sign In
            </Link>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/auth?mode=signup">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* ── 1. HERO — two-column on desktop ── */}
      <section className="bg-[#fafafa] border-b border-border/60">
        <div className="container py-14 md:py-20 grid md:grid-cols-[1fr_1.1fr] gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-primary mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Guide
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
              What is a master key system?
            </h1>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              A master key system is a planned lock and key structure that lets different people open different doors
              with the right level of access.
            </p>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
              A site manager may need access to every door. A department lead may only need one area. A teacher, tenant
              or contractor may only need a single room or defined group of doors. My LOXX helps organisations keep that
              system clear, current and controlled from one digital record.
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
          <div className="hidden md:block">
            <div className="rounded-xl border border-border bg-white shadow-lg overflow-hidden">
              <img
                src={keyHierarchyImage}
                alt="Master key system hierarchy diagram showing Grand Master Key, Master Keys, Sub Master Keys and individual cylinders"
                className="w-full h-auto block"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. ANCHOR NAV ── */}
      <nav className="border-b border-border bg-card static md:sticky md:top-0 md:z-10">
        <div className="container py-3 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            <span className="text-xs font-medium text-muted-foreground self-center mr-2">Quick links:</span>
            {[
              { label: "Key hierarchy", id: "key-hierarchy" },
              { label: "System types", id: "system-types" },
              { label: "Planning", id: "planning" },
              { label: "Common mistakes", id: "common-mistakes" },
              { label: "How My LOXX helps", id: "how-loxx-helps" },
              { label: "FAQ", id: "faq" },
            ].map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="text-xs px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-colors whitespace-nowrap"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* ── 3. PLAIN-ENGLISH DEFINITION ── */}
      <section className="container py-14 max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight">Master key systems, explained simply</h2>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          In a basic lock setup, each door has its own key. That works for a small number of doors, but it quickly
          becomes difficult to manage across a school, hospital, office building or estate. Staff end up carrying large
          bunches of keys. There is no clear record of who has access to what. When someone leaves, you are never quite
          sure what to ask them to hand back.
        </p>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          A master key system solves this by creating a hierarchy. Individual keys open specific doors. Master keys open
          groups of doors. A grand master key can sit above those groups for authorised senior access, where specified.
        </p>
        <div className="mt-6 p-5 rounded-xl border border-border bg-card">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Example</div>
          <p className="text-sm text-foreground leading-relaxed">
            In a school, a classroom key may only open Room 12. A department key may open all the science rooms. A site
            manager's key may open every classroom, store, plant room and office included in the system.
          </p>
        </div>
      </section>

      {/* ── 4. HIERARCHY DIAGRAM ── */}
      <section id="key-hierarchy" className="bg-card border-y border-border">
        <div className="container py-14 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">The key hierarchy</h2>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            Most master key systems are built around four levels. Not every system needs all four — simpler sites may
            only need two or three.
          </p>

          {/* Visual stepped tree */}
          <div className="mt-8 relative">
            {/* Vertical connector line */}
            <div className="absolute left-[18px] top-8 bottom-8 w-px bg-border" />

            <div className="space-y-0">
              {/* GMK */}
              <div className="relative flex gap-4 pb-6">
                <div
                  className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center z-10 border-2 border-background"
                  style={{ background: "hsl(245,60%,67%)" }}
                >
                  <span className="text-[9px] font-bold text-white">GMK</span>
                </div>
                <div className="flex-1 pt-1">
                  <div className="text-sm font-bold text-foreground">Grand Master Key</div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    Highest level access across the system, where specified.
                  </div>
                </div>
              </div>

              {/* MK — indented */}
              <div className="relative flex gap-4 pb-6 pl-6">
                <div
                  className="absolute left-[18px] top-0 h-4 w-6 border-l border-b border-border rounded-bl"
                  style={{ left: "18px" }}
                />
                <div
                  className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center z-10 border-2 border-background"
                  style={{ background: "hsl(178,60%,38%)" }}
                >
                  <span className="text-[9px] font-bold text-white">MK</span>
                </div>
                <div className="flex-1 pt-1">
                  <div className="text-sm font-bold text-foreground">Master Key</div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    Access to a building, department or main group of doors.
                  </div>
                </div>
              </div>

              {/* SMK — further indented */}
              <div className="relative flex gap-4 pb-6 pl-12">
                <div
                  className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center z-10 border-2 border-background"
                  style={{ background: "hsl(154,71%,36%)" }}
                >
                  <span className="text-[9px] font-bold text-white">SMK</span>
                </div>
                <div className="flex-1 pt-1">
                  <div className="text-sm font-bold text-foreground">Sub Master Key</div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    Access to a smaller zone, floor or team area.
                  </div>
                </div>
              </div>

              {/* CYL — furthest indented */}
              <div className="relative flex gap-4 pl-[4.5rem]">
                <div
                  className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center z-10 border-2 border-background"
                  style={{ background: "hsl(33,91%,44%)" }}
                >
                  <span className="text-[9px] font-bold text-white">CYL</span>
                </div>
                <div className="flex-1 pt-1">
                  <div className="text-sm font-bold text-foreground">Individual Key</div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    Access to one door or a defined keyed-alike group, depending on how the system is designed.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            These colours match the My LOXX System Builder, so the hierarchy you plan here is the same one you will see
            in the platform.
          </p>
        </div>
      </section>

      {/* ── 5. KEY TERMS ── */}
      <section className="container py-14 max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight">Key terms worth knowing</h2>
        <p className="mt-3 text-base text-muted-foreground leading-relaxed">
          Master key terminology is used inconsistently in the industry. These definitions reflect standard UK practice.
        </p>
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {[
            {
              term: "Keyed to differ",
              def: "Each lock has its own unique key. No two locks in the system share a key.",
            },
            {
              term: "Keyed alike",
              def: "Several locks share the same key. Useful for groups of identical rooms where one person needs access to all of them.",
            },
            {
              term: "Master key",
              def: "A key that opens multiple locks within a defined group, while each lock still has its own individual key.",
            },
            {
              term: "Grand master key",
              def: "A higher-level key that opens multiple master key groups across the system, where specified.",
            },
          ].map((g) => (
            <div key={g.term} className="p-4 rounded-lg border border-border bg-card">
              <div className="text-sm font-bold text-foreground">{g.term}</div>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{g.def}</p>
            </div>
          ))}
          <div className="sm:col-span-2 p-4 rounded-lg border border-border bg-card">
            <div className="text-sm font-bold text-foreground">Common entrance</div>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Used in multi-occupancy buildings where residents or staff hold a key for shared areas — main entrance,
              bin stores, cycle facilities — while individual flats or rooms remain independently keyed. Building
              managers or caretakers can be issued higher-level keys for service areas.
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. SYSTEM TYPES with mini-diagrams ── */}
      <section id="system-types" className="bg-card border-y border-border">
        <div className="container py-14 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">The main types of key system</h2>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            Not every suited lock system is a full master key system. The right structure depends on how the building is
            used, how many access levels are needed and how much the system is likely to grow.
          </p>

          {/* Three visual types */}
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            <KeyedToDifferDiagram />
            <KeyedAlikeDiagram />
            <MasterKeyedDiagram />
          </div>

          {/* Remaining types — text only (keyed-to-differ, keyed-alike and master-keyed already shown above) */}
          <div className="mt-4 space-y-4">
            {systemTypes
              .filter((s) => !["Keyed to differ", "Keyed alike", "Master keyed"].includes(s.t))
              .map((s) => (
                <div key={s.t} className="flex gap-3 items-start">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2" />
                  <div>
                    <div className="text-sm font-bold text-foreground">{s.t}</div>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{s.d}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* ── 7. WHY ORGANISATIONS USE THEM ── */}
      <section className="container py-14 max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight">Why organisations use master key systems</h2>
        <div className="mt-6 space-y-4">
          {[
            {
              t: "Fewer keys to carry",
              d: "People carry one key for the areas they are authorised to access, rather than a separate key for every door.",
            },
            {
              t: "Clearer access levels",
              d: "Access can be planned around buildings, departments, roles or zones — making it easier to manage who can go where.",
            },
            {
              t: "Faster authorised access",
              d: "Authorised facilities, estates or security personnel can access critical areas when needed without relying on others to open doors.",
            },
            {
              t: "Cleaner handover",
              d: "A planned system is easier to explain, document and manage than a collection of unrelated locks and separate key bunches.",
            },
            {
              t: "Room for future expansion",
              d: "If the system is designed properly, new doors, departments or buildings can be added later without replacing existing cylinders.",
            },
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
      </section>

      {/* ── 8. ENVIRONMENTS ── */}
      <section className="bg-card border-y border-border">
        <div className="container py-14">
          <div className="max-w-3xl mb-8">
            <h2 className="text-2xl font-bold tracking-tight">
              How master key systems are used in different buildings
            </h2>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
              The structure of a master key system depends on how the building is used. The access needs of a school are
              different from those of a hospital or residential block, even if the underlying lock and key principles
              are the same.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {environments.map((e) => (
              <div
                key={e.title}
                className="rounded-xl border border-border bg-background p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <e.icon className="h-4 w-4 text-primary shrink-0" strokeWidth={2} />
                  <h3 className="text-sm font-bold leading-snug">{e.title}</h3>
                </div>
                <p className="text-[11px] font-semibold text-primary/80 uppercase tracking-wide mb-2">Typical areas</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">{e.areas}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{e.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground max-w-3xl">
            My LOXX is used across all of these environments to keep the system record live, track changes and manage
            replacement orders from one place.
          </p>
        </div>
      </section>

      {/* ── 9. COMMON MISTAKES ── */}
      <section id="common-mistakes" className="container py-14 max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight">Common mistakes when managing a master key system</h2>
        <p className="mt-3 text-base text-muted-foreground leading-relaxed">
          Most problems with master key systems are not technical. They are the result of record-keeping and process
          failures that build up over time.
        </p>
        <div className="mt-6 space-y-3">
          {mistakes.map((m) => (
            <div key={m} className="flex gap-3 items-start p-4 rounded-lg border border-border bg-card">
              <AlertTriangle className="h-4 w-4 text-primary/70 shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-sm text-muted-foreground leading-relaxed">{m}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 10. THE RECORD PROBLEM ── */}
      <section className="bg-card border-y border-border">
        <div className="container py-14 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">The problem is rarely the lock. It is the record.</h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Most master key systems do not fail on day one. They fail slowly.
          </p>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            A key is issued but not recorded. A contractor keeps a key longer than expected. A cylinder is replaced but
            the schedule is not updated. A staff member leaves and no one is certain whether their key was returned.
            Individually, these are small admin issues. Over time, they become a security problem.
          </p>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Most master key systems start with a proper schedule. A locksmith or architectural ironmonger designs the
            hierarchy, supplies the cylinders and keys, and hands over a document that describes the system. The problem
            is that the document stays static while the building keeps changing.
          </p>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            When the record falls behind, facilities teams lose confidence in the system. They may not know who holds
            which key, what a lost key actually opens, or whether a replacement order matches the current setup. At that
            point, the system becomes more of a liability than an asset.
          </p>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            In practice, key control means knowing which keys exist, who holds them, what they open, who approved them,
            and what action was taken when something changed.
          </p>
        </div>
      </section>

      {/* ── 11. BEFORE / AFTER PANEL ── */}
      <section className="container py-14 max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight">From scattered records to one live system</h2>
        <div className="mt-8 grid sm:grid-cols-2 gap-px rounded-xl overflow-hidden border border-border shadow-sm">
          {/* Before */}
          <div className="bg-background p-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">The old way</div>
            <div className="space-y-3">
              {[
                "Spreadsheets and PDF schedules",
                "Supplier emails",
                "Individual memory",
                "Unclear key holders",
                "Lost keys with unknown impact",
                "No record of system changes",
              ].map((item) => (
                <div key={item} className="flex gap-2.5 items-start">
                  <X className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
          {/* After */}
          <div className="bg-primary/5 p-6">
            <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-4">With My LOXX</div>
            <div className="space-y-3">
              {[
                "Live visual system hierarchy",
                "Issued key record",
                "Lost key events and resolution",
                "Replacement orders from the live record",
                "Audit trail of system changes",
                "One record for the whole team",
              ].map((item) => (
                <div key={item} className="flex gap-2.5 items-start">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" strokeWidth={2.5} />
                  <span className="text-sm text-foreground font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 12. PRE-DESIGN CHECKLIST ── */}
      <section className="bg-card border-y border-border">
        <div className="container py-14 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">
            What information is needed to design a master key system?
          </h2>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            Before a system can be properly designed, the following information is normally required. Having this ready
            makes the design process faster and reduces the likelihood of changes after installation.
          </p>
          <div className="mt-6 space-y-2.5">
            {preDesignChecklist.map((item) => (
              <div key={item} className="flex gap-3 items-start">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" strokeWidth={2.25} />
                <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
            My LOXX provides a structured place to record and maintain all of this information, so it stays accurate
            after handover rather than being locked in a spreadsheet or a supplier's files.
          </p>
        </div>
      </section>

      {/* ── 13. PLANNING STEPS ── */}
      <section id="planning" className="container py-14 max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight">How to plan a master key system</h2>
        <p className="mt-3 text-base text-muted-foreground leading-relaxed">
          A well-planned system is easier to manage, easier to extend and less likely to create problems when staff
          change or buildings grow.
        </p>
        <div className="mt-8 space-y-5">
          {planningSteps.map((s) => (
            <div key={s.n} className="flex gap-4 items-start">
              <div className="text-2xl font-extrabold text-primary/25 tracking-tight shrink-0 w-7 text-right leading-tight mt-0.5">
                {s.n}
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">{s.t}</div>
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 14. CYLINDER OPTIONS ── */}
      <section className="bg-card border-y border-border">
        <div className="container py-14 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">Cylinder options in a master key system</h2>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            A master key system is not limited to standard door cylinders. The right option depends on the door type,
            lock case, user requirements and escape requirements. Common options include:
          </p>
          <div className="mt-6 space-y-4">
            {cylinderOptions.map((c) => (
              <div key={c.t} className="flex gap-4 items-start p-4 rounded-lg border border-border bg-background">
                {c.img && (
                  <div className="h-16 w-16 shrink-0 rounded-lg border border-border bg-white overflow-hidden flex items-center justify-center p-1.5">
                    <img src={c.img} alt={c.alt} className="max-h-full max-w-full object-contain" />
                  </div>
                )}
                {!c.img && (
                  <div className="h-16 w-16 shrink-0 rounded-lg border border-border bg-card flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                  </div>
                )}
                <div className="flex-1 pt-1">
                  <div className="text-sm font-bold text-foreground">{c.t}</div>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{c.d}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
            My LOXX supplies DOM rs Sirius® cylinders and keys for managed master key systems, including common cylinder
            functions such as double cylinders, thumbturn cylinders, half cylinders and specialist options where
            required.{" "}
            <Link to="/cylinders-and-keys" className="text-primary hover:underline font-medium">
              View the full cylinder range →
            </Link>
          </p>
        </div>
      </section>

      {/* ── 15. HOW MY LOXX HELPS ── */}
      <section id="how-loxx-helps" className="container py-14 max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight">How My LOXX helps</h2>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          My LOXX gives your master key system a live digital record. Instead of relying on old schedules, spreadsheets
          and scattered emails, your team can see the system hierarchy, issued keys, lost key events, replacement orders
          and changes in one place.
        </p>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          It is not a replacement for good system design — but it is the management layer that most organisations are
          missing once the system has been installed and handed over.
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

      {/* ── 16. FAQ ── */}
      <section id="faq" className="bg-card border-y border-border">
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
