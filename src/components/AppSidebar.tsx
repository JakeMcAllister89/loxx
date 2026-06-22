import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Network, Package, ShoppingCart, ClipboardList, Settings, Plus, LogOut, Shield, FileText, ShoppingBag, LayoutGrid, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/lib/auth";
import { useCart } from "@/contexts/CartContext";
import { createSystem } from "@/lib/createSystem";
import { LoxxLogo } from "./LoxxLogo";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/systems", label: "My Systems", icon: LayoutGrid },
  { to: "/builder", label: "System Builder", icon: Network },
  { to: "/catalogue", label: "Product Catalogue", icon: Package },
  { to: "/quotes", label: "My Quotes", icon: FileText },
  { to: "/cart", label: "Basket", icon: ShoppingCart, basket: true },
  { to: "/orders", label: "My Orders", icon: ClipboardList },
  { to: "/account", label: "Account", icon: Settings },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isAdmin = useIsAdmin();
  const { items } = useCart();
  const basketCount = items.length;
  const [systems, setSystems] = useState<{ id: string; name: string; door_count: number }[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("key_systems")
      .select("id,name,door_count")
      .order("updated_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setSystems(data ?? []));
  }, [user, pathname]);

  const newSystem = async () => {
    if (!user || creating) return;
    setCreating(true);
    const id = await createSystem(user.id);
    setCreating(false);
    if (id) navigate(`/builder/${id}`);
  };

  return (
    <aside className="w-[220px] shrink-0 bg-sidebar text-sidebar-foreground flex flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <NavLink to="/dashboard">
          <LoxxLogo />
        </NavLink>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.basket && basketCount > 0 && (
                <span
                  className="inline-flex items-center justify-center rounded-full text-white text-[11px] font-medium leading-none"
                  style={{ background: "#d4820a", width: 18, height: 18 }}
                >
                  {basketCount > 99 ? "99+" : basketCount}
                </span>
              )}
            </NavLink>
          );
        })}

        <div className="pt-5 mt-3 border-t border-sidebar-border">
          <div className="px-3 pb-2 text-[11px] uppercase tracking-wider text-sidebar-foreground/50">Your systems</div>
          <div className="space-y-0.5">
            {systems.length === 0 && <div className="px-3 py-2 text-xs text-sidebar-foreground/40">No systems yet</div>}
            {systems.map((s) => (
              <NavLink
                key={s.id}
                to={`/builder/${s.id}`}
                className="block px-3 py-1.5 rounded-md text-xs hover:bg-sidebar-accent/60 truncate"
              >
                <span className="truncate">{s.name}</span>
                <span className="text-sidebar-foreground/40 ml-2 font-mono">{s.door_count}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        {isAdmin && (
          <div className="pb-2 mb-1 border-b border-sidebar-border">
            <div className="px-3 pb-1 text-[11px] uppercase tracking-wider text-sidebar-foreground/50 flex items-center gap-1.5"><Shield className="h-3 w-3" /> Admin</div>
            {[
              { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
              { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
              { to: "/admin/products", label: "Product catalogue", icon: Package },
              { to: "/admin/settings", label: "Settings", icon: Settings },
            ].map((a) => (
              <NavLink key={a.to} to={a.to} end={a.end} className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md text-sm ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"}`}>
                <a.icon className="h-4 w-4" /> {a.label}
              </NavLink>
            ))}
          </div>
        )}
        <Button onClick={newSystem} disabled={creating} className="w-full bg-primary hover:bg-primary/90">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} New System
        </Button>
        <button
          onClick={async () => { await signOut(); navigate("/"); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );
}
