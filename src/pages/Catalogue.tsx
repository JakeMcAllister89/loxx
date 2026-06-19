import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, ShoppingCart, Info } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface Product {
  id: string; name: string; code: string; cylinder_type: string;
  pin_count: number; finish: string; size: string; price_gbp: number;
  description: string; bs_en_1303: boolean;
}

export default function Catalogue() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const [finish, setFinish] = useState<string>("all");
  const { add } = useCart();

  useEffect(() => { supabase.from("products").select("*").order("price_gbp").then(({ data }) => setProducts(data ?? [])); }, []);

  const types = useMemo(() => Array.from(new Set(products.map((p) => p.cylinder_type))), [products]);
  const finishes = useMemo(() => Array.from(new Set(products.map((p) => p.finish))), [products]);

  const filtered = products.filter((p) =>
    (q ? (p.name + p.code).toLowerCase().includes(q.toLowerCase()) : true) &&
    (type === "all" || p.cylinder_type === type) &&
    (finish === "all" || p.finish === finish)
  );

  const addToCart = (p: Product) => {
    add({ kind: "cylinder", product_code: p.code, cylinder_type: p.cylinder_type, finish: p.finish, quantity: 1, unit_price: Number(p.price_gbp), room_label: "" });
    toast.success(`${p.name} added to cart`);
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl">
        <h1 className="text-3xl font-semibold tracking-tight">Product catalogue</h1>
        <p className="text-muted-foreground text-sm mt-1">Euro cylinder hardware, BS EN 1303 compliant.</p>

        <div className="mt-6 rounded-[10px] border bg-card p-4 shadow-card flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">Search</label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or code…" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Type</label>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="all">All types</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Finish</label>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={finish} onChange={(e) => setFinish(e.target.value)}>
              <option value="all">All finishes</option>
              {finishes.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-[10px] border bg-card shadow-card overflow-hidden flex flex-col">
              <div className="h-32 bg-accent-light flex items-center justify-center">
                <Lock className="h-14 w-14 text-primary/60" />
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold leading-tight">{p.name}</h3>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">{p.code}</div>
                  </div>
                  {p.bs_en_1303 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-light text-primary uppercase font-medium">BS EN 1303</span>}
                </div>
                <div className="text-sm text-muted-foreground mt-3 font-mono">
                  {p.pin_count}-pin · {p.finish} · {p.size}
                </div>
                <div className="text-2xl font-semibold text-primary mt-3 font-mono">£{Number(p.price_gbp).toFixed(2)}</div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1"><Info className="h-3.5 w-3.5" /> Details</Button>
                  <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90" onClick={() => addToCart(p)}><ShoppingCart className="h-3.5 w-3.5" /> Add</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <div className="text-muted-foreground text-center py-12">No products match.</div>}
      </div>
    </DashboardLayout>
  );
}
