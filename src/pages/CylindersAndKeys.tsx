import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import {
  ArrowRight, Layers, KeyRound, RefreshCw, ShieldCheck, Lock,
  Wrench, Drill, Puzzle, FileBadge, Boxes, Settings2, Repeat,
  ClipboardList, Truck, Building2,
} from "lucide-react";
import cylinderAsset from "@/assets/cylinder.png.asset.json";

const hardwareCards = [
  { icon: Layers, title: "Specified in the system", copy: "Every cylinder and key is linked to the correct door, suite and access level." },
  { icon: KeyRound, title: "Issued and tracked", copy: "Keys can be assigned to holders, returned, reported lost or resolved." },
  { icon: RefreshCw, title: "Reordered with confidence", copy: "Replacement keys and cylinders are ordered from the existing digital record." },
];

const siriusFeatures = [
  { icon: ShieldCheck, title: "Key copy protection", copy: "Restricted key profiles help prevent unauthorised duplication of keys." },
  { icon: Layers, title: "Master key capability", copy: "Supports grand master, master, sub-master and change-key hierarchies for real buildings." },
  { icon: Lock, title: "Manipulation protection", copy: "Cylinder mechanisms are designed to resist common manipulation techniques." },
  { icon: Drill, title: "Drill and pull protection", copy: "Hardened components help protect against drilling and pulling attacks. Selected DOM rs Sirius® euro profile cylinders are available in TS007 3-star options." },
  { icon: Puzzle, title: "Modular cylinder options", copy: "A wide range of cylinder types and lengths to suit different door and ironmongery configurations." },
  { icon: FileBadge, title: "Patent protection", copy: "Patent-protected key profiles support long-term control over key supply." },
];

const cylinderOptions = [
  { icon: Lock, title: "Double cylinders", copy: "Keyed on both sides for standard commercial doors." },
  { icon: Settings2, title: "Thumbturn cylinders", copy: "Keyed externally with an internal thumbturn for escape and accessible doors." },
  { icon: KeyRound, title: "Half cylinders", copy: "Single-sided cylinders for gates, cabinets and specialist applications." },
  { icon: Repeat, title: "Freewheel cylinders", copy: "Allow the door to be opened from outside even when a key is left in the inside cylinder." },
  { icon: KeyRound, title: "Replacement keys", copy: "Additional or replacement keys cut to your existing system." },
  { icon: Wrench, title: "Specialist cylinders", copy: "Options for padlocks, cam locks and other non-standard applications." },
];

const finishes = [
  "Dull Nickel", "Matt Chrome", "Bright Chrome", "Satin Brass", "Polished Brass",
  "Dark Bronze", "Antique Bronze", "Black", "Gold Plated", "Matt Black",
];

const steps = [
  { icon: Layers, title: "Create or import the system", copy: "Your master key system is built or imported into My LOXX." },
  { icon: ClipboardList, title: "Specify cylinders and keys", copy: "Cylinders and keys are specified against the correct doors, suites and access levels." },
  { icon: Truck, title: "Supply and record the order", copy: "Orders are supplied and every item is recorded against the live system." },
  { icon: RefreshCw, title: "Reorder from the same record", copy: "Future replacement keys and cylinders can be ordered quickly and accurately." },
];

export default function CylindersAndKeys() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />

      {/* HERO */}
      <section className="bg-[#fafafa] border-b border-border/60">
        <div className="container py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Cylinders &amp; Keys
            </span>
            <h1 className="mt-5 font-extrabold text-4xl md:text-[3rem] leading-[1.05] tracking-tight">
              Commercial master key cylinders and keys, supplied and managed through My LOXX.
            </h1>
            <p className="mt-6 text-lg text-foreground/65 leading-relaxed max-w-xl">
              My LOXX supplies DOM rs Sirius® cylinders and keys for managed master key systems, with every cylinder, key and future order linked back to your live digital system record.
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
          <div className="relative">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-card flex items-center justify-center">
              <img src={cylinderAsset.url} alt="Euro profile master key cylinder with keys" className="max-h-[380px] w-auto object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* HARDWARE CONNECTED */}
      <section className="border-b border-border">
        <div className="container py-20 md:py-24">
          <div className="max-w-2xl">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Connected hardware</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">Hardware connected to your system record</h2>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {hardwareCards.map((c) => (
              <div key={c.title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary mb-4">
                  <c.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SIRIUS FEATURES */}
      <section className="border-b border-border bg-card">
        <div className="container py-20 md:py-24">
          <div className="max-w-2xl">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Product</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">DOM rs Sirius® key features</h2>
          </div>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {siriusFeatures.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary mb-4">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CYLINDER OPTIONS */}
      <section className="border-b border-border">
        <div className="container py-20 md:py-24">
          <div className="max-w-2xl">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Options</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">Cylinder options</h2>
          </div>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cylinderOptions.map((o) => (
              <div key={o.title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary mb-4">
                  <o.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{o.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{o.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINISHES */}
      <section className="border-b border-border bg-card">
        <div className="container py-20 md:py-24">
          <div className="max-w-2xl">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Finishes</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">Architectural finishes to match the project</h2>
            <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
              Cylinders are available in a wide range of standard finishes, with colour matching available for project-specific requirements.
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

      {/* ORDERING PROCESS */}
      <section id="ordering-process" className="border-b border-border">
        <div className="container py-20 md:py-24">
          <div className="max-w-2xl">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">Process</span>
            <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">How supply and ordering works</h2>
          </div>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-bold text-primary tracking-widest">0{i + 1}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary mb-4">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARTNER CTA */}
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
                Add a managed master key system to your doorset package without taking on long-term admin. My LOXX can support the cylinder/key package after handover, giving the end customer a clear way to manage future orders.
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

      <MarketingFooter />
    </div>
  );
}
