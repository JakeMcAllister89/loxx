import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Lock, Info, X, ArrowRight, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Product {
  id: string; name: string; code: string; cylinder_type: string;
  finish: string | null; finish_colour?: string | null;
  size: string | null; price_gbp: number;
  description: string | null; product_description: string | null;
  product_features?: string | null;
  cylinder_profile?: string | null; image_url?: string | null;
}

interface KeySystem { id: string; name: string; reference: string | null; }

interface Family {
  type: string;
  variants: Product[];
  finishes: string[];
  sizes: string[];
  profile: string | null;
  image: string | null;
  description: string;
  features: string | null;
  finishColours: Record<string, string>;
  minPrice: number;
}

function buildFamilies(products: Product[]): Family[] {
  const map = new Map<string, Product[]>();
  for (const p of products) {
    const arr = map.get(p.cylinder_type) ?? [];
    arr.push(p);
    map.set(p.cylinder_type, arr);
  }
  return Array.from(map.entries()).map(([type, variants]) => {
    const finishes = Array.from(new Set(variants.map(v => v.finish).filter(Boolean))) as string[];
    const sizes = Array.from(new Set(variants.map(v => v.size).filter(Boolean))) as string[];
    const profiles = Array.from(new Set(variants.map(v => v.cylinder_profile).filter(Boolean)));
    const first = variants[0];
    return {
      type,
      variants,
      finishes,
      sizes,
      profile: profiles.length === 1 ? (profiles[0] as string) : null,
      image: variants.find(v => v.image_url)?.image_url ?? null,
      description: first.product_description ?? first.description ?? "",
      minPrice: Math.min(...variants.map(v => Number(v.price_gbp))),
    };
  });
}

export default function Catalogue() {
  const [products, setProducts] = useState<Product[]>([]);
  const [systems, setSystems] = useState<KeySystem[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const [finish, setFinish] = useState<string>("all");
  const [size, setSize] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<number>(200);
  const [sort, setSort] = useState<"price-asc" | "price-desc" | "name">("price-asc");
  const [detail, setDetail] = useState<Family | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("products").select("*").eq("is_active", true).order("price_gbp").then(({ data }) => setProducts((data ?? []) as Product[]));
    supabase.from("key_systems").select("id,name,reference").order("created_at", { ascending: false }).then(({ data }) => setSystems((data ?? []) as KeySystem[]));
  }, []);

  const families = useMemo(() => buildFamilies(products), [products]);

  const types = useMemo(() => Array.from(new Set(families.map(f => f.type))).sort(), [families]);
  const allFinishes = useMemo(() => Array.from(new Set(products.map(p => p.finish).filter(Boolean))).sort() as string[], [products]);
  const allSizes = useMemo(() => Array.from(new Set(products.map(p => p.size).filter(Boolean))).sort() as string[], [products]);
  const priceCap = useMemo(() => Math.max(50, Math.ceil(Math.max(0, ...products.map(p => Number(p.price_gbp))))), [products]);

  useEffect(() => { setMaxPrice(priceCap); }, [priceCap]);

  const filtered = useMemo(() => {
    let out = families.filter(f => {
      if (q && !(f.type + " " + f.description + " " + f.variants.map(v => v.code).join(" ")).toLowerCase().includes(q.toLowerCase())) return false;
      if (type !== "all" && f.type !== type) return false;
      if (finish !== "all" && !f.finishes.includes(finish)) return false;
      if (size !== "all" && !f.sizes.includes(size)) return false;
      if (f.minPrice > maxPrice) return false;
      return true;
    });
    if (sort === "price-asc") out = out.sort((a, b) => a.minPrice - b.minPrice);
    if (sort === "price-desc") out = out.sort((a, b) => b.minPrice - a.minPrice);
    if (sort === "name") out = out.sort((a, b) => a.type.localeCompare(b.type));
    return out;
  }, [families, q, type, finish, size, maxPrice, sort]);

  const clearFilters = () => { setQ(""); setType("all"); setFinish("all"); setSize("all"); setMaxPrice(priceCap); };
  const filtersActive = q || type !== "all" || finish !== "all" || size !== "all" || maxPrice !== priceCap;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl">
        <h1 className="text-3xl font-semibold tracking-tight">Product catalogue</h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-3xl">
          Browse our cylinder range. Assign products to your system in the builder — cylinders are ordered as part of your complete master key system.
        </p>

        <div className="mt-6 rounded-[10px] border bg-card p-5 shadow-card">
          <div className="grid md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <Label className="text-xs">Search</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type, description or code…" />
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
            <div className="md:col-span-3">
              <Label className="text-xs">Finish</Label>
              <Select value={finish} onValueChange={setFinish}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All finishes</SelectItem>
                  {allFinishes.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Label className="text-xs">Size</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sizes</SelectItem>
                  {allSizes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-12 gap-3 items-end mt-4">
            <div className="md:col-span-7">
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
            <div className="md:col-span-2 flex justify-end">
              {filtersActive && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-3">
          {filtered.length} of {families.length} famil{families.length !== 1 ? "ies" : "y"}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-3">
          {filtered.map((fam) => (
            fam.type === "Key" ? (
              <KeysFamilyCard key={fam.type} fam={fam} systems={systems} onDetails={() => setDetail(fam)} onUseInBuilder={(sysId) => navigate(sysId ? `/builder/${sysId}` : "/builder/new")} />
            ) : (
              <FamilyCard key={fam.type} fam={fam} systems={systems} onDetails={() => setDetail(fam)} onUseInBuilder={(sysId) => navigate(sysId ? `/builder/${sysId}` : "/builder/new")} />
            )
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-muted-foreground text-center py-16 border rounded-[10px] mt-3 bg-card">
            No families match. <button onClick={clearFilters} className="text-primary hover:underline">Clear filters</button>
          </div>
        )}
      </div>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {detail && (detail.type === "Key"
            ? <KeysDetailDrawer fam={detail} systems={systems} onUseInBuilder={(sysId) => { setDetail(null); navigate(sysId ? `/builder/${sysId}` : "/builder/new"); }} />
            : <DetailDrawer fam={detail} systems={systems} onUseInBuilder={(sysId) => { setDetail(null); navigate(sysId ? `/builder/${sysId}` : "/builder/new"); }} />
          )}
        </SheetContent>
      </Sheet>

    </DashboardLayout>
  );
}

function FamilyCard({ fam, systems, onDetails, onUseInBuilder }: {
  fam: Family; systems: KeySystem[]; onDetails: () => void; onUseInBuilder: (sysId: string | null) => void;
}) {
  const [selFinish, setSelFinish] = useState<string | null>(fam.finishes[0] ?? null);
  const [selSize, setSelSize] = useState<string | null>(fam.sizes[0] ?? null);

  const matched = useMemo(
    () => fam.variants.find(v => (!selFinish || v.finish === selFinish) && (!selSize || v.size === selSize)) ?? null,
    [fam, selFinish, selSize]
  );

  const sizesForFinish = useMemo(
    () => new Set(fam.variants.filter(v => !selFinish || v.finish === selFinish).map(v => v.size).filter(Boolean) as string[]),
    [fam, selFinish]
  );

  const priceDisplay = matched
    ? `£${Number(matched.price_gbp).toFixed(2)}`
    : `from £${fam.minPrice.toFixed(2)}`;

  return (
    <div className="rounded-[10px] border bg-card shadow-card overflow-hidden flex flex-col">
      <button onClick={onDetails} className="h-36 bg-accent-light flex items-center justify-center hover:bg-accent-light/70 transition-colors">
        {fam.image
          ? <img src={fam.image} alt={fam.type} className="h-full w-full object-contain" />
          : <Lock className="h-14 w-14 text-primary/60" />}
      </button>
      <div className="p-5 flex-1 flex flex-col gap-3">
        <div>
          <h3 className="font-semibold leading-tight text-lg">{fam.type}</h3>
          {fam.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{fam.description}</p>}
        </div>

        {fam.finishes.length > 1 ? (
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {fam.finishes.map(f => (
                <button
                  key={f}
                  onClick={() => setSelFinish(f)}
                  title={f}
                  aria-label={f}
                  className={`h-7 w-7 rounded-full border-2 transition-all ${selFinish === f ? "ring-2 ring-primary ring-offset-1" : "border-border"}`}
                  style={{ background: finishColour(f) }}
                />
              ))}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">{selFinish}</div>
          </div>
        ) : fam.finishes.length === 1 ? (
          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border" style={{ background: finishColour(fam.finishes[0]) }} />
            {fam.finishes[0]}
          </div>
        ) : null}

        {fam.sizes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {fam.sizes.map(s => {
              const available = sizesForFinish.has(s);
              const active = selSize === s;
              return (
                <button
                  key={s}
                  disabled={!available}
                  onClick={() => setSelSize(s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-mono border transition-colors ${
                    active ? "bg-primary text-primary-foreground border-primary" :
                    available ? "bg-card text-foreground border-border hover:border-primary/50" :
                    "bg-muted text-muted-foreground/50 border-border cursor-not-allowed"
                  }`}
                >{s}</button>
              );
            })}
          </div>
        )}

        {fam.profile && (
          <Badge variant="secondary" className="text-[10px] self-start">{fam.profile} profile</Badge>
        )}

        <div className="text-2xl font-semibold text-amber-600 mt-auto font-mono">{priceDisplay}</div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={onDetails}><Info className="h-3.5 w-3.5" /> Details</Button>
          <UseInBuilderButton systems={systems} onPick={onUseInBuilder} />
        </div>
      </div>
    </div>
  );
}

function UseInBuilderButton({ systems, onPick, fullWidth = false }: {
  systems: KeySystem[]; onPick: (sysId: string | null) => void; fullWidth?: boolean;
}) {
  if (systems.length === 0) {
    return (
      <Button size="sm" className={`bg-amber-500 hover:bg-amber-600 text-white ${fullWidth ? "w-full" : "flex-1"}`} onClick={() => onPick(null)}>
        Use in builder <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className={`bg-amber-500 hover:bg-amber-600 text-white ${fullWidth ? "w-full" : "flex-1"}`}>
          Use in builder <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 overflow-auto">
        {systems.map(s => (
          <DropdownMenuItem key={s.id} onClick={() => onPick(s.id)}>
            <div>
              <div className="text-sm">{s.name}</div>
              {s.reference && <div className="text-[10px] font-mono text-muted-foreground">{s.reference}</div>}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={() => onPick(null)} className="border-t mt-1 pt-2">
          <span className="text-sm text-primary">+ New system…</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DetailDrawer({ fam, systems, onUseInBuilder }: {
  fam: Family; systems: KeySystem[]; onUseInBuilder: (sysId: string | null) => void;
}) {
  const [selFinish, setSelFinish] = useState<string | null>(fam.finishes[0] ?? null);
  const [selSize, setSelSize] = useState<string | null>(fam.sizes[0] ?? null);
  const selected = useMemo(
    () => fam.variants.find(v => (!selFinish || v.finish === selFinish) && (!selSize || v.size === selSize)) ?? fam.variants[0],
    [fam, selFinish, selSize]
  );

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <SheetTitle>{fam.type}</SheetTitle>
          <Badge variant="outline">{fam.type}</Badge>
        </div>
        <SheetDescription>{fam.variants.length} variant{fam.variants.length !== 1 ? "s" : ""} available</SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-5">
        <div className="h-40 rounded-md bg-accent-light flex items-center justify-center overflow-hidden">
          {fam.image ? <img src={fam.image} alt={fam.type} className="h-full w-full object-contain" /> : <Lock className="h-16 w-16 text-primary/60" />}
        </div>

        {fam.finishes.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {fam.finishes.map(f => (
              <button
                key={f}
                onClick={() => setSelFinish(f)}
                title={f}
                className={`h-7 w-7 rounded-full border-2 ${selFinish === f ? "ring-2 ring-primary ring-offset-1" : "border-border"}`}
                style={{ background: finishColour(f) }}
              />
            ))}
          </div>
        )}

        {fam.sizes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {fam.sizes.map(s => (
              <button
                key={s}
                onClick={() => setSelSize(s)}
                className={`px-2.5 py-1 rounded-full text-xs font-mono border ${selSize === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}
              >{s}</button>
            ))}
          </div>
        )}

        <div className="text-3xl font-semibold text-amber-600 font-mono">£{Number(selected.price_gbp).toFixed(2)}</div>

        <dl className="text-sm grid grid-cols-2 gap-x-4 gap-y-2">
          {selected.cylinder_profile && (<><dt className="text-muted-foreground">Profile</dt><dd>{selected.cylinder_profile}</dd></>)}
          <dt className="text-muted-foreground">Type</dt><dd>{selected.cylinder_type}</dd>
          {selected.finish && (<><dt className="text-muted-foreground">Finish</dt><dd>{selected.finish}</dd></>)}
          {selected.size && (<><dt className="text-muted-foreground">Size</dt><dd className="font-mono">{selected.size}</dd></>)}
          <dt className="text-muted-foreground">Product code</dt><dd className="font-mono">{selected.code}</dd>
        </dl>

        {fam.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{fam.description}</p>
        )}

        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">All variants</div>
          <div className="space-y-1">
            {fam.variants.map(v => (
              <div key={v.id} className="grid grid-cols-[1fr_auto_auto] gap-3 text-xs items-center">
                <span>{v.finish ?? "—"}</span>
                <span className="font-mono text-muted-foreground">{v.size ?? "—"}</span>
                <span className="font-mono font-semibold">£{Number(v.price_gbp).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Cylinders are ordered through your system builder. Assign this product to a door in your system and it will be included in your order automatically.
        </p>

        <UseInBuilderButton systems={systems} onPick={onUseInBuilder} fullWidth />
      </div>
    </>
  );
}

/* -------------------- KEYS family card -------------------- */

const KEY_TYPES = [
  { code: "KEY-DIFFER", label: "Differ key", price: 12, opens: "Opens one specific door" },
  { code: "KEY-SMK",    label: "Sub-master key", price: 14, opens: "Opens all cylinders in a zone" },
  { code: "KEY-MK",     label: "Master key", price: 16, opens: "Opens all cylinders in a building" },
  { code: "KEY-GMK",    label: "Grand master key", price: 18, opens: "Opens all cylinders across the entire system" },
];

function KeysFamilyCard({ fam, systems, onDetails, onUseInBuilder }: {
  fam: Family; systems: KeySystem[]; onDetails: () => void; onUseInBuilder: (sysId: string | null) => void;
}) {
  const [selCode, setSelCode] = useState<string>("KEY-DIFFER");
  const variantByCode = useMemo(() => new Map(fam.variants.map(v => [v.code, v])), [fam]);
  const selected = variantByCode.get(selCode);
  const selectedMeta = KEY_TYPES.find(k => k.code === selCode)!;
  const price = selected ? Number(selected.price_gbp) : selectedMeta.price;
  const desc = selected?.product_description ?? selected?.description ?? selectedMeta.opens;

  return (
    <div className="rounded-[10px] border-2 border-amber-200 bg-gradient-to-br from-amber-50/60 to-card shadow-card overflow-hidden flex flex-col relative">
      <KeyRound className="absolute right-3 top-3 h-20 w-20 text-amber-200/40 -rotate-12 pointer-events-none" />
      <button onClick={onDetails} className="h-36 bg-amber-100/40 flex items-center justify-center hover:bg-amber-100/60 transition-colors relative">
        <KeyRound className="h-16 w-16 text-amber-600/80" />
      </button>
      <div className="p-5 flex-1 flex flex-col gap-3 relative">
        <div>
          <h3 className="font-semibold leading-tight text-lg">Cut Keys</h3>
          <p className="text-xs text-amber-700/80 mt-0.5">For master key systems</p>
          <p className="text-xs text-muted-foreground mt-1.5">Replacement and additional cut keys for every level of your master key system. Priced per key.</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {KEY_TYPES.filter(k => variantByCode.has(k.code)).map(k => {
            const active = selCode === k.code;
            return (
              <button
                key={k.code}
                onClick={() => setSelCode(k.code)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  active ? "bg-amber-500 text-white border-amber-500" : "bg-card text-foreground border-amber-200 hover:border-amber-400"
                }`}
              >{k.label} · £{(variantByCode.get(k.code) ? Number(variantByCode.get(k.code)!.price_gbp) : k.price).toFixed(0)}</button>
            );
          })}
        </div>

        <div className="mt-1">
          <div className="font-semibold text-sm">{selectedMeta.label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
        </div>

        <div className="text-2xl font-semibold text-amber-600 mt-auto font-mono">£{price.toFixed(2)}</div>
        <p className="text-[11px] text-muted-foreground -mt-1">2 keys included with every new cylinder</p>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={onDetails}><Info className="h-3.5 w-3.5" /> View details</Button>
          <UseInBuilderButton systems={systems} onPick={onUseInBuilder} />
        </div>
      </div>
    </div>
  );
}

function KeysDetailDrawer({ fam, systems, onUseInBuilder }: {
  fam: Family; systems: KeySystem[]; onUseInBuilder: (sysId: string | null) => void;
}) {
  const variantByCode = new Map(fam.variants.map(v => [v.code, v]));
  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-amber-600" /> Cut Keys</SheetTitle>
        <SheetDescription>For master key systems</SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-5">
        <div className="h-40 rounded-md bg-amber-100/40 flex items-center justify-center">
          <KeyRound className="h-20 w-20 text-amber-600/80" />
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          All keys are cut to your specific master key system code. Each key type opens a different level of your system hierarchy.
        </p>
        <div className="rounded-md border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">What it opens</th><th className="text-right px-3 py-2">Price</th></tr>
            </thead>
            <tbody>
              {KEY_TYPES.map(k => {
                const v = variantByCode.get(k.code);
                return (
                  <tr key={k.code} className="border-t">
                    <td className="px-3 py-2 font-medium">{k.label}</td>
                    <td className="px-3 py-2 text-muted-foreground">{k.opens}</td>
                    <td className="px-3 py-2 text-right font-mono">£{(v ? Number(v.price_gbp) : k.price).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
          2 standard keys are included with every cylinder ordered.
        </div>
        <p className="text-[11px] text-muted-foreground">Additional keys can be ordered per cylinder in the system builder.</p>
        <UseInBuilderButton systems={systems} onPick={onUseInBuilder} fullWidth />
      </div>
    </>
  );
}
