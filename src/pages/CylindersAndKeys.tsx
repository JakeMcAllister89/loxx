import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import {
  ArrowRight, Layers, KeyRound, RefreshCw, ShieldCheck, Lock,
  FileBadge, Puzzle, ClipboardList, Truck, Building2, FileText,
} from "lucide-react";
import domHeroImage from "@/assets/domrssirius-main.jpg";
import domLogo from "@/assets/dom-logo.jpg";
import cylinderDouble from "@/assets/cylinder-double.png";
import cylinderThumbTurn from "@/assets/cylinder-thumbturn.jpg";
import cylinderHalf from "@/assets/cylinder-half.jpg";
import cylinderPadlock from "@/assets/cylinder-padlock.jpg";
import cylinderRoundRim from "@/assets/cylinder-round-rim.jpg";

// ─── Sirius proof points (4, not 6 equal cards) ───────────────────────────
const siriusPoints = [
  { icon: ShieldCheck, title: "Key copy protection", copy: "Restricted key profiles help prevent unauthorised duplication." },
  { icon: FileBadge, title: "Patent protected", copy: "Patent-protected key profiles support long-term control over key supply." },
  { icon: Lock, title: "Manipulation and drill resistance", copy: "Hardened components resist common attack methods. Selected TS007 3-star options available." },
  { icon: Puzzle, title: "Modular range", copy: "A wide range of cylinder types and lengths to suit different door and ironmongery configurations." },
];

// ─── Cylinder options with real product images where available ─────────────
const cylinderOptions = [
  {
    title: "Double cylinders",
    copy: "Key operation from both sides. Standard for most external and internal commercial doors.",
    img: cylinderDouble,
    alt: "DOM rs Sirius® euro double cylinder",
  },
  {
    title: "Thumbturn cylinders",
    copy: "Key operation from outside with an internal thumbturn for accessible and escape doors.",
    img: cylinderThumbTurn,
    alt: "DOM rs Sirius® euro thumbturn cylinder",
  },
  {
    title: "Half cylinders",
    copy: "Single-sided cylinders for gates, cabinets, switches and specialist applications.",
    img: cylinderHalf,
    alt: "DOM rs Sirius® half cylinder",
  },
  {
    title: "Round rim cylinders",
    copy: "Used on common entrance doors with traditional night-latch lock cases, particularly in residential and student accommodation.",
    img: cylinderRoundRim,
    alt: "DOM rs Sirius® round rim cylinder",
  },
  {
    title: "Padlocks and specialist cylinders",
    copy: "For gates, cabinets, stores or external assets that need to sit within the same key hierarchy.",
    img: cylinderPadlock,
    alt: "DOM padlock",
  },
  {
    title: "Replacement keys",
    copy: "Additional or replacement keys cut to your existing system differ, ordered from the live record.",
    img: null,
    alt: null,
  },
];

// ─── Finishes ─────────────────────────────────────────────────────────────
const finishes = [
  "Dull Nickel", "Matt Chrome", "Bright Chrome", "Satin Brass", "Polished Brass",
  "Dark Bronze", "Antique Bronze", "Black", "Gold Plated", "Matt Black",
];

// ─── Ordering steps ───────────────────────────────────────────────────────
const steps = [
  { icon: Layers, n: "01", title: "Build or import the system", copy: "Your master key system is built or imported into My LOXX, with every door, cylinder and access level recorded." },
  { icon: ClipboardList, n: "02", title: "Specify cylinders and keys", copy: "Cylinders and keys are specified against the correct doors, suites and access levels in the live record." },
  { icon: Truck, n: "03", title: "Supply and record the order", copy: "Orders are fulfilled and every item is recorded back against the live system — not a separate spreadsheet." },
  { icon: RefreshCw, n: "04", title: "Reorder from the same record", copy: "Future replacement keys and cylinders are ordered directly from the existing digital system record, accurately and quickly." },
];

export default function CylindersAndKeys() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader activePage="/cylinders-and-keys" />

      {/* ── 1. HERO ── */}
      <section className="bg-[#fafafa] border-b border-border/60">
        <div className="container py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Cylinders &amp; Keys
            </span>
            <h1 className="mt-5 font-extrabold text-4xl md:text-[3rem] leading-[1.05] tracking-tight">
              Master key cylinders and keys, managed from one digital record.
            </h1>
            <p className="mt-6 text-lg text-foreground/65 leading-relaxed max-w-xl">
              My LOXX supplies DOM rs Sirius® cylinders and keys for commercial master key systems, with every cylinder, key and future order linked back to your live system record.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                <Link to="/book-a-demo">Book a My LOXX Demo <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-border bg-transparent">
                <a href="#ordering-process">View how ordering works</a>
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <img
              src={domHeroImage}
              alt="DOM rs Sirius® euro profile master key cylinder with key"
              className="max-h-[420px] w-auto object-contain"
            />
          </div>
        </div>
      </section>

      {/* ── 2. HARDWARE + SOFTWARE BRIDGE ── */}
      <section className="border-b border-border">
        <div className="container py-20 md:py-24">
          <div className="max-w-2xl mb-12">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Connected hardware</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">Physical hardware, connected to a live digital record</h2>
            <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
              Most cylinder and key suppliers work from PDFs and email. My LOXX connects every order directly to the system record — so future replacement keys, extended systems and lost key events are managed from one place, not scattered across inboxes and spreadsheets.
            </p>
          </div>

          {/* Flow diagram: physical → digital → future */}
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-0 max-w-4xl mx-auto">
            {/* Step 1 */}
            <div className="flex-1 rounded-xl border border-border bg-card p-6 shadow-sm text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mx-auto mb-4">
                <Lock className="h-6 w-6" />
              </div>
              <div className="text-sm font-bold text-foreground">Physical hardware</div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">DOM rs Sirius® cylinders and keys, specified against your door schedule</p>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center px-4 shrink-0">
              <ArrowRight className="h-5 w-5 text-primary rotate-90 md:rotate-0" />
            </div>

            {/* Step 2 */}
            <div className="flex-1 rounded-xl border-2 border-primary bg-primary/5 p-6 shadow-sm text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground mx-auto mb-4">
                <FileText className="h-6 w-6" />
              </div>
              <div className="text-sm font-bold text-foreground">Live system record</div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">Every door, cylinder, key and change recorded in My LOXX — not a spreadsheet</p>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center px-4 shrink-0">
              <ArrowRight className="h-5 w-5 text-primary rotate-90 md:rotate-0" />
            </div>

            {/* Step 3 */}
            <div className="flex-1 rounded-xl border border-border bg-card p-6 shadow-sm text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mx-auto mb-4">
                <RefreshCw className="h-6 w-6" />
              </div>
              <div className="text-sm font-bold text-foreground">Future orders</div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">Replacement keys, new cylinders and system extensions ordered from the same record</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. DOM RS SIRIUS® PRODUCT SECTION ── */}
      <section className="border-b border-border bg-card">
        <div className="container py-20 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Product</span>
              <div className="mt-4 flex items-center gap-4">
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">DOM rs Sirius®</h2>
                <img src={domLogo} alt="DOM" className="h-10 w-10 rounded object-cover shrink-0" />
              </div>
              <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
                Commercial-grade master key cylinders engineered and manufactured in Germany. The Sirius® range is designed for complex master key systems where long-term key control, security and modular configuration matter.
              </p>
              <p className="mt-3 text-[15px] text-muted-foreground leading-relaxed">
                DIN EN1303 rated. Patent-protected key profile to 2036. Supplied exclusively through My LOXX for managed master key systems.
              </p>
              <div className="mt-8 space-y-4">
                {siriusPoints.map((p) => (
                  <div key={p.title} className="flex gap-3 items-start">
                    <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
                      <p.icon className="h-4 w-4 text-primary" strokeWidth={2.25} />
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{p.title}</div>
                      <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{p.copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center">
              <img
                src={cylinderDouble}
                alt="DOM rs Sirius® euro double cylinder"
                className="max-h-[340px] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. CYLINDER OPTIONS WITH REAL IMAGES ── */}
      <section className="border-b border-border">
        <div className="container py-20 md:py-24">
          <div className="max-w-2xl mb-12">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Options</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">Cylinder and key options</h2>
            <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
              The right cylinder depends on the door type, lock case and access requirements. All options below can be specified within the same master key system and ordered from the My LOXX platform.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cylinderOptions.map((o) => (
              <div key={o.title} className="rounded-xl border border-border bg-card p-5 shadow-sm flex gap-4 items-start">
                {o.img ? (
                  <div className="h-16 w-16 shrink-0 rounded-lg border border-border bg-white overflow-hidden flex items-center justify-center p-1.5">
                    <img src={o.img} alt={o.alt ?? o.title} className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-lg border border-border bg-primary/5 flex items-center justify-center">
                    <KeyRound className="h-6 w-6 text-primary/50" strokeWidth={1.5} />
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-sm font-bold text-foreground">{o.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{o.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. FINISHES ── */}
      <section className="border-b border-border bg-card">
        <div className="container py-20 md:py-24">
          <div className="max-w-2xl">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Finishes</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">Architectural finishes</h2>
            <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
              Available in a wide range of standard finishes to match the ironmongery specification. Colour matching is available for project-specific requirements.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            {finishes.map((f) => (
              <span key={f} className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground/80">
                {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. HOW ORDERING WORKS ── */}
      <section id="ordering-process" className="border-b border-border">
        <div className="container py-20 md:py-24">
          <div className="max-w-2xl mb-12">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Process</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">How supply and ordering works</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div key={s.title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-bold text-primary tracking-widest">{s.n}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary mb-4">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. PARTNER CTA ── */}
      <section className="bg-card border-b border-border">
        <div className="container py-20 md:py-24">
          <div className="rounded-2xl border border-border bg-background p-8 md:p-12 shadow-card grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-primary mb-4">
                <Building2 className="h-5 w-5" />
                <span className="text-[11px] font-medium uppercase tracking-[0.14em]">Partner projects</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
                For doorset manufacturers and project partners
              </h2>
              <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed max-w-2xl">
                Add a managed master key system to your doorset package without taking on long-term admin. My LOXX supports the cylinder and key package after handover, giving the end customer a clear way to manage future orders.
              </p>
            </div>
            <div className="flex md:justify-end">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                <Link to="/book-a-demo">Talk to us about partner projects <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-primary">
        <div className="container py-14 max-w-2xl text-center">
          <p className="text-sm text-primary-foreground/75 mb-3">Every cylinder and key, linked to your system record.</p>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-primary-foreground">
            See how My LOXX connects hardware to a live digital system.
          </h2>
          <div className="mt-6 flex justify-center">
            <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90">
              <Link to="/book-a-demo">Book a My LOXX Demo <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
