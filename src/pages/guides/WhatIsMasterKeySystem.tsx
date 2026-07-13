import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoxxLogo } from "@/components/LoxxLogo";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import builderCanvasExample from "@/assets/builder-canvas-example.png";
import cylinderDouble from "@/assets/cylinder-double.png";
import cylinderThumbTurn from "@/assets/cylinder-thumbturn.jpg";
import cylinderHalf from "@/assets/cylinder-half.jpg";
import {
  GraduationCap, HeartPulse, Briefcase, Home, Landmark, Ticket,
  ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, X,
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
    areas: "Wards, consultation rooms, admin offices, plant rooms, stores, restricted clinical spaces and back-of-house areas.",
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
    areas: "Offices, public counters, secure storage, plant rooms, depots, maintenance areas and contractor access points.",
    body: "Public sector estates often span multiple buildings, departments, contractors and long-term maintenance responsibilities. Designing the system is only part of the challenge — keeping the record accurate over years of changes, staff turnover and building alterations is where the real management burden sits.",
  },
  {
    icon: Ticket,
    title: "Leisure, venues and public buildings",
    areas: "Public areas, box offices, cash-handling rooms, back-of-house, staff areas, plant rooms and emergency routes.",
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
  { n: "1", t: "Map your buildings and doors", d: "List every door that needs to be part of the system, including which areas need to be separated and which can be shared." },
  { n: "2", t: "Group doors by how the site actually works", d: "Let the real access patterns — not the floor plan — guide the hierarchy. A department that shares a corridor does not need to share a master key group." },
  { n: "3", t: "Define who needs access to what", d: "Map people by job role or responsibility, not by name. The system should survive staff changes." },
  { n: "4", t: "Keep the hierarchy as simple as possible", d: "Every additional master key level adds complexity. Use the minimum number of levels that meets your access requirements." },
  { n: "5", t: "Plan for future expansion", d: "If you are likely to add floors, departments or buildings, leave room in the design without disrupting the existing system." },
  { n: "6", t: "Decide who can approve new keys and cylinders", d: "Be clear about who is authorised to request replacements or additions. This protects the security of the system over time." },
  { n: "7", t: "Keep the record live after handover", d: "The system record should reflect the current state — not just the original design. Every change, issued key and lost key event should be recorded." },
];

// ─── System types ─────────────────────────────────────────────────────────
const systemTypes = [
  { t: "Keyed to differ", d: "Each lock has its own individual key. Simple to understand, but difficult to manage when there are many doors. The most common starting point for small buildings." },
  { t: "Keyed alike", d: "Several locks are opened by the same key. Useful for small groups of identical rooms, but it does not create different access levels and should be used deliberately, not by default." },
  { t: "Common entrance", d: "Shared entrances or communal areas can be opened by many authorised user keys, while private areas remain separate and independently keyed. Widely used in apartment blocks, student accommodation and managed residential developments." },
  { t: "Master keyed", d: "Individual keys open specific doors, while a master key opens a wider group. The most common arrangement for organisations that need tiered access without a complex hierarchy." },
  { t: "Grand master keyed", d: "Several master key groups sit beneath a higher-level grand master key, usually for authorised senior facilities or estates access. Used in larger buildings or multi-building estates." },
  { t: "Complex systems", d: "Large estates may include multiple buildings, departments, shared areas and specialist access groups. These need careful planning so the system remains understandable and expandable as the estate changes." },
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
  { t: "Double cylinders", d: "Key operation from both sides of the door. Standard for most external doors and internal doors where both sides need key access.", img: cylinderDouble, alt: "DOM rs Sirius® double cylinder" },
  { t: "Thumbturn cylinders", d: "Key operation from one side, with a thumbturn on the other. Often used on internal doors where quick egress from one side is needed.", img: cylinderThumbTurn, alt: "DOM rs Sirius® thumbturn cylinder" },
  { t: "Half cylinders", d: "Often used for plant rooms, cupboards, switches, gates or specialist applications where a full cylinder is not required.", img: cylinderHalf, alt: "DOM rs Sirius® half cylinder" },
  { t: "Freewheel cylinders", d: "Used where the door hardware or lock case requires freewheel operation — the cylinder rotates freely until the correct key is inserted." },
  { t: "Padlocks and specialist cylinders", d: "Useful where gates, cabinets, stores or external assets need to sit within the same system and be opened by the same key hierarchy." },
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

// ─── System type mini-diagram ─────────────────────────────────────────────
// Simple CSS-only diagrams for keyed-to-differ, keyed-alike, master-keyed
function KeyedToDifferDiagram() {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-background border border-border">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Keyed to differ</div>
      {["Room A", "Room B", "Room C"].map((room, i) => (
        <div key={room} className="flex items-center gap-2">
          <div className="h-5 w-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
            style={{ background: `hsl(33,91%,${52 - i * 8}%)`, color: "#fff" }}>K{i + 1}</div>
          <div className="h-px flex-1 bg-border" />
          <div className="h-5 w-14 rounded border border-border bg-card flex items-center justify-center text-[9px] text-muted-foreground shrink-0">{room}</div>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground mt-1 leading-snug">One key per lock. Each key opens only its own door.</p>
    </div>
  );
}

function KeyedAlikeDiagram() {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-background border border-border">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Keyed alike</div>
      <div className="flex items-start gap-3">
        <div className="h-7 w-7 rounded flex items-center justify-center text-[9px] font-bold shrink-0 mt-1"
          style={{ background: "hsl(33,91%,44%)", color: "#fff" }}>K1</div>
        <div className="flex flex-col gap-1.5 flex-1">
          {["Room A", "Room B", "Room C"].map((room) => (
            <div key={room} className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <div className="h-5 w-14 rounded border border-border bg-card flex items-center justify-center text-[9px] text-muted-foreground shrink-0">{room}</div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 leading-snug">One key opens multiple locks. No access hierarchy.</p>
    </div>
  );
}

function MasterKeyedDiagram() {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-background border border-border">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Master keyed</div>
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center gap-1">
          <div className="h-6 w-10 rounded flex items-center justify-center text-[9px] font-bold"
            style={{ background: "hsl(178,60%,38%)", color: "#fff" }}>MK</div>
          <div className="w-px flex-1 bg-border min-h-[24px]" />
        </div>
        <div className="flex flex-col gap-1.5 flex-1 mt-0.5">
          {[["K1", "Room A"], ["K2", "Room B"], ["K3", "Room C"]].map(([k, room]) => (
            <div key={room} className="flex items-center gap-2">
              <div className="h-5 w-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                style={{ background: "hsl(33,91%,44%)", color: "#fff" }}>{k}</div>
              <div className="h-px flex-1 bg-border" />
              <div className="h-5 w-14 rounded border border-border bg-card flex items-center justify-center text-[9px] text-muted-foreground shrink-0">{room}</div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 leading-snug">Individual keys + one master key that opens all doors in the group.</p>
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
              A master key system is a planned lock and key structure that lets different people open different doors with the right level of access.
            </p>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
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
          <div className="hidden md:block">
            <div className="rounded-xl border border-border bg-white shadow-lg overflow-hidden">
              {/* Lightweight app frame bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-[#fafafa]">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                  <span className="h-2.5 w-2.5 rounded-full bg-border" />
                </div>
                <span className="text-[11px] text-muted-foreground ml-2">myloxx.co.uk — System Builder</span>
              </div>
              <img
                src={builderCanvasExample}
                alt="Visual master key hierarchy inside the My LOXX System Builder"
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
          In a basic lock setup, each door has its own key. That works for a small number of doors, but it quickly becomes difficult to manage across a school, hospital, office building or estate. Staff end up carrying large bunches of keys. There is no clear record of who has access to what. When someone leaves, you are never quite sure what to ask them to hand back.
        </p>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          A master key system solves this by creating a hierarchy. Individual keys open specific doors, while master keys open defined groups of doors. Each person holds only the keys they need, and every key in the system has a clear place in the plan.
        </p>
      </section>

      <MarketingFooter />
    </div>
  );
}

