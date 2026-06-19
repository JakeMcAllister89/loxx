import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoxxLogo } from "@/components/LoxxLogo";
import { ShieldCheck, Lock, Truck, BadgeCheck, ArrowRight } from "lucide-react";

const trust = [
  { icon: ShieldCheck, label: "BS EN 1303 compliant cylinders" },
  { icon: BadgeCheck, label: "Authorised UK distributor" },
  { icon: Lock, label: "Secure checkout via Stripe" },
  { icon: Truck, label: "Systems saved to your account" },
];

const steps = [
  { n: 1, t: "Build your hierarchy", d: "Drag and drop grand master, sub masters, change keys and cylinders into a visual tree." },
  { n: 2, t: "Assign cylinders", d: "Choose type, finish and room name for each door. Differ numbers assigned automatically." },
  { n: 3, t: "Order in one click", d: "Validated system goes straight to checkout. We handle fulfilment." },
];

const sampleProducts = [
  { name: "Euro Cylinder Standard", spec: "6-pin · Nickel · 35/35", price: 45 },
  { name: "Euro Cylinder Anti-Snap", spec: "6-pin · Satin Brass · 35/35", price: 38 },
  { name: "Double Cylinder Standard", spec: "6-pin · Polished Brass · 36/36", price: 58 },
  { name: "Oval Cylinder", spec: "6-pin · Polished Brass · 36/36", price: 72 },
  { name: "High Security Euro", spec: "6-pin · Satin Chrome · 35/35", price: 85 },
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
            UK distributor · Master key specialists
          </div>
          <h1 className="font-semibold text-4xl md:text-6xl leading-[1.05] tracking-tight">
            Build & Order Master Key<br />Systems Online
          </h1>
          <p className="mt-6 text-lg text-sidebar-foreground/70 max-w-2xl">
            Design your cylinder hierarchy visually, validate it instantly, and order direct.
            No spreadsheets, no back-and-forth emails.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link to="/auth?mode=signup">Start designing free <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 bg-transparent text-sidebar-foreground hover:bg-white/5 hover:text-sidebar-foreground">
              <a href="#how">See how it works</a>
            </Button>
          </div>
        </section>
      </header>

      {/* Trust */}
      <section className="border-b border-border bg-card">
        <div className="container py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {trust.map((t) => (
            <div key={t.label} className="flex items-center gap-3 text-sm text-muted-foreground">
              <t.icon className="h-5 w-5 text-primary shrink-0" />
              <span className="text-foreground">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How */}
      <section id="how" className="container py-20">
        <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
        <p className="text-muted-foreground mt-2">Three steps from blank canvas to delivered cylinders.</p>
        <div className="grid md:grid-cols-3 gap-6 mt-10">
          {steps.map((s) => (
            <div key={s.n} className="rounded-[10px] border bg-card p-6 shadow-card">
              <div className="font-mono text-sm text-primary">0{s.n}</div>
              <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section className="bg-card border-y border-border">
        <div className="container py-14">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold">From the catalogue</h2>
              <p className="text-muted-foreground text-sm mt-1">A selection of Euro cylinders ready to drop into your system.</p>
            </div>
            <Link to="/catalogue" className="text-sm text-primary hover:underline">Browse all →</Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
            {sampleProducts.map((p) => (
              <div key={p.name} className="min-w-[240px] rounded-[10px] border border-border bg-background p-4">
                <div className="h-28 rounded-md bg-accent-light flex items-center justify-center mb-3">
                  <Lock className="h-10 w-10 text-primary/70" />
                </div>
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 font-mono">{p.spec}</div>
                <div className="text-lg font-semibold text-primary mt-2">£{p.price.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="container py-20 max-w-3xl">
        <div className="rounded-[10px] border bg-card p-8 shadow-card">
          <p className="text-xl leading-relaxed">
            "Finally a system we can manage ourselves without calling a locksmith every time."
          </p>
          <div className="mt-4 text-sm text-muted-foreground">Facilities Manager, University of Nottingham</div>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="container py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <LoxxLogo />
            <div className="text-sm text-muted-foreground mt-2">Master key systems made simple</div>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
          <div className="text-xs text-muted-foreground">© 2025 LOXX</div>
        </div>
      </footer>
    </div>
  );
}
