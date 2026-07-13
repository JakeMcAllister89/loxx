import { Link, NavLink } from "react-router-dom";
import { LoxxLogo } from "@/components/LoxxLogo";
import { Button } from "@/components/ui/button";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm px-3 py-2 transition-colors ${
    isActive ? "text-foreground font-medium" : "text-foreground/70 hover:text-foreground"
  }`;

export function MarketingHeader() {
  return (
    <header className="bg-[#fafafa] text-foreground border-b border-border/60">
      <div className="container flex items-center justify-between py-4">
        <Link to="/">
          <LoxxLogo />
        </Link>

        <nav className="hidden md:flex items-center gap-2">
          <NavLink to="/guides/what-is-a-master-key-system" className={navLinkClass}>
            Guide
          </NavLink>
          <NavLink to="/cylinders-and-keys" className={navLinkClass}>
            Cylinders &amp; Keys
          </NavLink>
          <NavLink to="/book-a-demo" className={navLinkClass}>
            Book a Demo
          </NavLink>
          <NavLink to="/auth" className={navLinkClass}>
            Sign In
          </NavLink>
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link to="/auth?mode=signup">Get Started</Link>
          </Button>
        </nav>

        <div className="md:hidden">
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
            <Link to="/auth?mode=signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
