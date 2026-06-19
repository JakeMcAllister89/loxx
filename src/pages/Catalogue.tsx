import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Lock, ShoppingCart, Info, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface Product {
  id: string; name: string; code: string; cylinder_type: string;
  pin_count: number; finish: string; size: string; price_gbp: number;
  description: string; bs_en_1303: boolean; security_rating?: string | null;
}

export default function Catalogue() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const [finish, setFinish] = useState<string>("all");
  const [pins, setPins] = useState<string>("all");
  const [size, setSize] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<number>(200);
  const [sort, setSort] = useState<"price-asc" | "price-desc" | "name">("price-asc");
  const [detail, setDetail] = useState<Product | null>(null);
  const { add } = useCart();

  useEffect(() => {
    supabase.from("products").select("*").order("price_gbp").then(({ data }) => setProducts((data ?? []) as Product[]));
  }, []);

  const types = useMemo(() => Array.from(new Set(products.map((p) => p.cylinder_type))).sort(), [products]);
  const finishes = useMemo(() => Array.from(new Set(products.map((p) => p.finish).filter(Boolean))).sort(), [products]);
  const pinOptions = useMemo(() => Array.from(new Set(products.map((p) => p.pin_count))).sort((a, b) => a - b), [products]);
  const sizes = useMemo(() => Array.from(new Set(products.map((p) => p.size).filter(Boolean))).sort(), [products]);
  const priceCap = useMemo(() => Math.max(50, Math.ceil(Math.max(0, ...products.map((p) => Number(p.price_gbp))))), [products]);

  useEffect(() => { setMaxPrice(priceCap); }, [priceCap]);

  const filtered = useMemo(() => {
    let out = products.filter((p) =>
      (q ? (p.name + p.code + (p.description ?? "")).toLowerCase().includes(q.toLowerCase()) : true) &&
      (type === "all" || p.cylinder_type === type) &&
      (finish === "all" || p.finish === finish) &&
      (pins === "all" || p.pin_count === Number(pins)) &&
      (size === "all" || p.size === size) &&
      Number(p.price_gbp) <= maxPrice
    );
    if (sort === "price-asc") out = out.sort((a, b) => Number(a.price_gbp) - Number(b.price_gbp));
    if (sort === "price-desc") out = out.sort((a, b) => Number(b.price_gbp) - Number(a.price_gbp));
    if (sort === "name") out = out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [products, q, type, finish, pins, size, maxPrice, sort]);

  const addToCart = (p: Product) => {
    add({
      kind: "cylinder", product_code: p.code, cylinder_type: p.cylinder_type,
      finish: p.finish, quantity: 1, unit_price: Number(p.price_gbp), room_label: "",
    });
    toast.success(`${p.name} added to cart`);
  };

  const clearFilters = () => { setQ(""); setType("all"); setFinish("all"); setPins("all"); setSize("all"); setMaxPrice(priceCap); };
  const filtersActive = q || type !== "all" || finish !== "all" || pins !== "all" || size !== "all" || maxPrice !== priceCap;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl">
        <h1 className="text-3xl font-semibold tracking-tight">Product catalogue</h1>
        <p className="text-muted-foreground text-sm mt-1">Euro cylinder hardware, BS EN 1303 compliant.</p>

        <div className="mt-6 rounded-[10px] border bg-card p-5 shadow-card">
          <div className="grid md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <Label className="text-xs">Search</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, code or description…" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Finish</Label>
              <Select value={finish} onValueChange={setFinish}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All finishes</SelectItem>
                  {finishes.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Pins</Label>
              <Select value={pins} onValueChange={setPins}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {pinOptions.map((p) => <SelectItem key={p} value={String(p)}>{p} pin</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sizes</SelectItem>
                  {sizes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-12 gap-3 items-end mt-4">
            <div className="md:col-span-6">
              <Label className="text-xs">Max price <span className="font-mono ml-1 text-foreground">£{maxPrice}</span></Label>
              <Slider value={[maxPrice]} min={20} max={priceCap} step={5} onValueChange={(v) => setMaxPrice(v[0])} className="mt-3" />
            </div>
            <div className="md:col-span-3">
              <Label className="text-xs">Sort</Label>
              <Select value={sort} onValueChange={(v: any) => setSort(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="price-asc">Price · low to high</SelectItem>
                  <SelectItem value="price-desc">Price · high to low</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 flex justify-end">
              {filtersActive && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" /> Clear filters
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-3">
          {filtered.length} of {products.length} product{products.length !== 1 ? "s" : ""}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-[10px] border bg-card shadow-card overflow-hidden flex flex-col">
              <button onClick={() => setDetail(p)} className="h-32 bg-accent-light flex items-center justify-center hover:bg-accent-light/70 transition-colors">
                <Lock className="h-14 w-14 text-primary/60" />
              </button>
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
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setDetail(p)}><Info className="h-3.5 w-3.5" /> Details</Button>
                  <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90" onClick={() => addToCart(p)}><ShoppingCart className="h-3.5 w-3.5" /> Add</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-muted-foreground text-center py-16 border rounded-[10px] mt-3 bg-card">
            No products match. <button onClick={clearFilters} className="text-primary hover:underline">Clear filters</button>
          </div>
        )}
      </div>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle>{detail.name}</SheetTitle>
                <SheetDescription className="font-mono">{detail.code}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="h-40 rounded-md bg-accent-light flex items-center justify-center">
                  <Lock className="h-16 w-16 text-primary/60" />
                </div>
                <div className="text-3xl font-semibold text-primary font-mono">£{Number(detail.price_gbp).toFixed(2)}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{detail.description ?? "No description provided."}</p>
                <dl className="text-sm grid grid-cols-2 gap-x-4 gap-y-2">
                  <dt className="text-muted-foreground">Type</dt><dd>{detail.cylinder_type}</dd>
                  <dt className="text-muted-foreground">Pins</dt><dd className="font-mono">{detail.pin_count}</dd>
                  <dt className="text-muted-foreground">Finish</dt><dd>{detail.finish}</dd>
                  <dt className="text-muted-foreground">Size</dt><dd className="font-mono">{detail.size}</dd>
                  {detail.security_rating && (<><dt className="text-muted-foreground">Security</dt><dd>{detail.security_rating}</dd></>)}
                  <dt className="text-muted-foreground">Standard</dt><dd>{detail.bs_en_1303 ? "BS EN 1303" : "—"}</dd>
                </dl>
                <Button onClick={() => { addToCart(detail); setDetail(null); }} className="w-full bg-primary hover:bg-primary/90">
                  <ShoppingCart className="h-4 w-4" /> Add to cart
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
