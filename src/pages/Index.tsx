import { Link } from 'react-router-dom';
import { Shield, Award, Lock, ArrowRight, CheckCircle, Key, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-image.jpg';

const trustBadges = [
  { icon: Shield, label: 'BS EN 1303 Compliant' },
  { icon: Award, label: 'DOM-UK Official Partner' },
  { icon: Lock, label: '256-bit Secure Checkout' },
];

const features = [
  { icon: Key, title: 'Visual Key Hierarchy', description: 'Design your master-key system with an interactive drag-and-drop tree builder.' },
  { icon: Shield, title: 'Smart Validation', description: 'Automatic conflict detection for key codes, hierarchy levels, and cylinder compatibility.' },
  { icon: Building2, title: 'One-Click Ordering', description: 'Export your entire system to a shopping cart and order with Stripe checkout.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Lock className="h-6 w-6 text-accent" />
            <span className="font-display text-lg font-bold text-foreground">DOM-UK Master Key</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link to="/catalog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Products</Link>
            <Link to="/designer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Designer</Link>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
            <Button asChild variant="hero" size="sm">
              <Link to="/register">Start Free</Link>
            </Button>
          </div>
          <Button asChild variant="hero" size="sm" className="md:hidden">
            <Link to="/register">Start Free</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-95" />
        <div className="absolute inset-0" style={{ backgroundImage: `url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15 }} />
        <div className="relative container mx-auto px-4 py-24 md:py-36 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 mb-8">
            <Shield className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-medium text-accent">Trusted by 500+ facility managers across the UK</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-primary-foreground max-w-4xl mx-auto leading-tight">
            Build & Order Perfect Master-Key Systems{' '}
            <span className="text-accent">in Minutes</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto">
            Design your DOM-UK Euro cylinder hierarchy visually, validate for conflicts, and order exact replacements with one click. Delivered directly to your door.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild variant="hero" size="lg" className="text-base px-8">
              <Link to="/register">
                Start Designing Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base px-8 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link to="/catalog">Browse Catalog</Link>
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8">
            {trustBadges.map(b => (
              <div key={b.label} className="flex items-center gap-2 text-primary-foreground/60">
                <b.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">How It Works</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Three simple steps from design to delivery</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <div key={f.title} className="relative bg-card rounded-xl p-8 shadow-card border hover:shadow-elevated transition-shadow">
                <div className="absolute -top-4 -left-2 w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold text-sm">
                  {i + 1}
                </div>
                <f.icon className="h-10 w-10 text-accent mb-4" />
                <h3 className="text-lg font-display font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">Ready to Simplify Your Key Management?</h2>
          <p className="text-primary-foreground/70 mb-8 max-w-xl mx-auto">Join facility managers across UK and Europe who trust DOM-UK Master Key Platform.</p>
          <Button asChild variant="hero" size="lg" className="text-base px-8">
            <Link to="/register">Create Free Account <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-accent" />
              <span className="font-display font-bold text-foreground">DOM-UK Master Key</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/catalog" className="hover:text-foreground">Products</Link>
              <Link to="/designer" className="hover:text-foreground">Designer</Link>
              <a href="#" className="hover:text-foreground">Privacy</a>
              <a href="#" className="hover:text-foreground">Terms</a>
            </div>
            <p className="text-xs text-muted-foreground">© 2026 DOM-UK Master Key Platform</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
