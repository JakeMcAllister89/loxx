import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Network, Package, ShoppingCart, ClipboardList, Settings, Plus, LogOut, Shield, FileText, ShoppingBag, LayoutGrid, Loader2, Users, UserCheck, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/lib/auth";
import { useCart } from "@/contexts/CartContext";
import { createSystem } from "@/lib/createSystem";
import { LoxxLogo } from "./LoxxLogo";
import { Button } from "@/components/ui/button";

interface NavItem { to: string; label: string; icon: any; builder?: boolean; basket?: boolean; hideForViewOnly?: boolean; quoteCount?: boolean }

const nav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/team", label: "Team", icon: Users },
  { to: "/systems", label: "My Systems", icon: LayoutGrid },
  { to: "/builder", label: "System Builder", icon: Network, builder: true },
  { to: "/catalogue", label: "Product Catalogue", icon: Package, hideForViewOnly: true },
  { to: "/quotes", label: "My Quotes", icon: FileText, hideForViewOnly: true, quoteCount: true },
  { to: "/cart", label: "Basket", icon: ShoppingCart, basket: true, hideForViewOnly: true },
  { to: "/orders", label: "My Orders", icon: ClipboardList, hideForViewOnly: true },
  { to: "/account", label: "Account", icon: Settings },
];

export function AppSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut, orgRole } = useAuth();
  const isAdmin = useIsAdmin();
  const { items } = useCart();
  const basketCount = items.reduce((s, i) => s + (i.quantity ?? 0), 0);
  const [systems, setSystems] = useState<{ id: string; name: string; door_count: number }[]>([]);
  const [quoteCount, setQuoteCount] = useState<number>(0);
  const [creating, setCreating] = useState(false);
  const [newSystemConfirm, setNewSystemConfirm] = useState(false);

  const isViewOnly = orgRole === "view_only";
  const canCreate = orgRole && orgRole !== "view_only";

  useEffect(() => {
    if (!user) return;
    const fetchSystems = () => {
      supabase
        .from("key_systems")
        .select("id,name,door_count")
        .order("updated_at", { ascending: false })
        .limit(6)
        .then(({ data }) => setSystems((data as any) ?? []));
    };
    fetchSystems();
    const channel = supabase
      .channel("sidebar-systems")
      .on("postgres_changes", { event: "*", schema: "public", table: "key_systems" }, () => {
        if (document.visibilityState === "visible") fetchSystems();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchQuotes = () => {
      (supabase.from("quotes" as any) as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .then(({ count }: { count: number | null }) => setQuoteCount(count ?? 0));
    };
    fetchQuotes();
    const channel = supabase
      .channel("sidebar-quotes")
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, () => {
        if (document.visibilityState === "visible") fetchQuotes();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const newSystem = async () => {
    if (!user || creating || !canCreate) return;
    // If currently in the builder, confirm before navigating away
    if (pathname.startsWith("/builder/")) {
      setNewSystemConfirm(true);
      return;
    }
    await doCreateSystem();
  };

  const doCreateSystem = async () => {
    setCreating(true);
    const id = await createSystem(user.id);
    setCreating(false);
    if (id) navigate(`/builder/${id}`);
  };

  return (
    <aside className="w-[220px] shrink-0 bg-sidebar text-sidebar-foreground flex flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <NavLink to="/dashboard"><LoxxLogo /></NavLink>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.filter(item => !(isViewOnly && item.hideForViewOnly)).map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          const to = item.builder && systems.length > 0 ? `/builder/${systems[0].id}` : item.to;
          return (
            <NavLink
              key={item.to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60 hover:text-amber-500"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.basket && basketCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full text-white text-[11px] font-medium leading-none" style={{ background: "#d4820a", width: 18, height: 18 }}>
                  {basketCount > 99 ? "99+" : basketCount}
                </span>
              )}
              {item.quoteCount && quoteCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full text-white text-[11px] font-medium leading-none" style={{ background: "#d4820a", width: 18, height: 18 }}>
                  {quoteCount > 99 ? "99+" : quoteCount}
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
              <NavLink key={s.id} to={`/builder/${s.id}`} className="block px-3 py-1.5 rounded-md text-xs hover:bg-sidebar-accent/60 hover:text-amber-500 truncate">
                <span className="truncate">{s.name}</span>
                <span className="text-sidebar-foreground/40 ml-2">{s.door_count}</span>
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
              { to: "/admin/users", label: "Users", icon: UserCheck },
              { to: "/admin/partners", label: "Partners", icon: Users },
              { to: "/admin/products", label: "Product catalogue", icon: Package },
              { to: "/admin/settings", label: "Settings", icon: Settings },
            ].map((a) => (
              <NavLink key={a.to} to={a.to} end={a.end} className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md text-sm ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60"}`}>
                <a.icon className="h-4 w-4" /> {a.label}
              </NavLink>
            ))}
          </div>
        )}
        {canCreate && (
          <Button onClick={newSystem} disabled={creating} className="w-full bg-primary hover:bg-primary/90">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} New System
          </Button>
        )}
        <button onClick={async () => { await signOut(); navigate("/"); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>

      {newSystemConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4 text-foreground border border-border">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center shrink-0">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Your system is saved</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Your current system has been saved automatically. You can find it in your 
                  systems list at any time.
                </p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Start a new system now?
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setNewSystemConfirm(false)}
              >
                Stay here
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={async () => {
                  setNewSystemConfirm(false);
                  await doCreateSystem();
                }}
              >
                New system
              </Button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
