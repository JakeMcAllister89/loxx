import { Link } from "react-router-dom";
import { LoxxLogo } from "@/components/LoxxLogo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <Link to="/"><LoxxLogo /></Link>
            <p className="mt-3 text-sm text-muted-foreground max-w-xs leading-relaxed">
              The digital home for your master key system.
            </p>
            <a href="mailto:hello@myloxx.co.uk"
               className="text-sm text-foreground/70 hover:text-foreground transition-colors mt-1 block">
              hello@myloxx.co.uk
            </a>
          </div>

          {/* Product */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Product</div>
            <ul className="space-y-2.5">
              <li><Link to="/cylinders-and-keys" className="text-sm text-foreground/80 hover:text-foreground transition-colors">Cylinders &amp; Keys</Link></li>
              <li><a href="/#system-builder" className="text-sm text-foreground/80 hover:text-foreground transition-colors">System Builder</a></li>
              <li><a href="/#dashboard" className="text-sm text-foreground/80 hover:text-foreground transition-colors">Dashboard</a></li>
              <li><a href="/#ordering" className="text-sm text-foreground/80 hover:text-foreground transition-colors">Ordering</a></li>
              <li><a href="/#audit-permissions" className="text-sm text-foreground/80 hover:text-foreground transition-colors">Audit &amp; Permissions</a></li>
            </ul>
          </div>

          {/* Get Started */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Get Started</div>
            <ul className="space-y-2.5">
              <li><Link to="/auth?mode=signup" className="text-sm text-foreground/80 hover:text-foreground transition-colors">Get Started</Link></li>
              <li><a href="/book-a-demo" className="text-sm text-foreground/80 hover:text-foreground transition-colors">Book a Demo</a></li>
              <li><Link to="/auth" className="text-sm text-foreground/80 hover:text-foreground transition-colors">Sign In</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Legal</div>
            <ul className="space-y-2.5">
              <li><Link to="/privacy" className="text-sm text-foreground/80 hover:text-foreground transition-colors">Privacy</Link></li>
              <li><Link to="/terms" className="text-sm text-foreground/80 hover:text-foreground transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© 2026 My LOXX</p>
        </div>
      </div>
    </footer>
  );
}
