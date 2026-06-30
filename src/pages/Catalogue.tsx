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
import { Lock, Info, X, KeyRound } from "lucide-react";

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
    const finishColours: Record<string, string> = {};
    variants.forEach(v => {
      if (v.finish && v.finish_colour) finishColours[v.finish] = v.finish_colour;
    });
    return {
      type,
      variants,
      finishes,
      sizes,
      profile: profiles.length === 1 ? (profiles[0] as string) : null,
      image: variants.find(v => v.image_url)?.image_url ?? null,
      description: first.product_description ?? first.description ?? "",
      features: variants.find(v => v.product_features)?.product_features ?? null,
      finishColours,
      minPrice: Math.min(...variants.map(v => Number(v.price_gbp))),
    };
  });
}

export default function Catalogue() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("all");
  const [finish, setFinish] = useState<string>("all");
  const [size, setSize] = useState<string>("all");
  const [detail, setDetail] = useState<Family | null>(null);

  useEffect(() => {
    supabase.from("products").select("*").eq("is_active", true).order("price_gbp").then(({ data }) => setProducts((data ?? []) as Product[]));
  }, []);

  const families = useMemo(() => buildFamilies(products), [products]);

  const types = useMemo(() => Array.from(new Set(families.map(f => f.type))).sort(), [families]);
  const allFinishes = useMemo(() => Array.from(new Set(products.map(p => p.finish).filter(Boolean))).sort() as string[], [products]);
  const allSizes = useMemo(() => Array.from(new Set(products.map(p => p.size).filter(Boolean))).sort() as string[], [products]);

  const filtered = useMemo(() => {
    const out = families.filter(f => {
      if (q && !(f.type + " " + f.description + " " + f.variants.map(v => v.code).join(" ")).toLowerCase().includes(q.toLowerCase())) return false;
      if (type !== "all" && f.type !== type) return false;
      if (finish !== "all" && !f.finishes.includes(finish)) return false;
      if (size !== "all" && !f.sizes.includes(size)) return false;
      return true;
    });
    return out.sort((a, b) => a.minPrice - b.minPrice);
  }, [families, q, type, finish, size]);

  const clearFilters = () => { setQ(""); setType("all"); setFinish("all"); setSize("all"); };
  const filtersActive = q || type !== "all" || finish !== "all" || size !== "all";

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
          {filtersActive && (
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" /> Clear filters
              </Button>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground mt-3">
          {filtered.length} of {families.length} famil{families.length !== 1 ? "ies" : "y"}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-3">
          {filtered.map((fam) => (
            fam.type === "Key" ? (
              <KeysFamilyCard key={fam.type} fam={fam} onDetails={() => setDetail(fam)} />
            ) : (
              <FamilyCard key={fam.type} fam={fam} onDetails={() => setDetail(fam)} />
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
            ? <KeysDetailDrawer fam={detail} />
            : <DetailDrawer fam={detail} />
          )}
        </SheetContent>
      </Sheet>

    </DashboardLayout>
  );
}

function FamilyCard({ fam, onDetails }: {
  fam: Family; onDetails: () => void;
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
      <button onClick={onDetails} className="h-36 bg-white flex items-center justify-center hover:bg-muted/10 transition-colors">
        {fam.image
          ? <img src={fam.image} alt={fam.type} className="h-full w-full object-contain p-3" />
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
                  style={{ background: fam.finishColours[f] ?? "#888888" }}
                />
              ))}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">{selFinish}</div>
          </div>
        ) : fam.finishes.length === 1 ? (
          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border" style={{ background: fam.finishColours[fam.finishes[0]] ?? "#888888" }} />
            {fam.finishes[0]}
          </div>
        ) : null}

        {fam.sizes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {fam.sizes.filter(s => sizesForFinish.has(s)).map(s => {
              const active = selSize === s;
              return (
                <button
                  key={s}
                  onClick={() => setSelSize(s)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:border-primary/50"
                  }`}
                >{s}</button>
              );
            })}
          </div>
        )}

        {fam.profile && (
          <Badge variant="secondary" className="text-[10px] self-start">{fam.profile} profile</Badge>
        )}

        {fam.features && (
          <ul className="space-y-0.5">
            {fam.features.split(/\n|·/).map(f => f.trim()).filter(Boolean).slice(0, 4).map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <span className="text-primary mt-0.5 shrink-0">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="text-2xl font-semibold text-amber-600 mt-auto">{priceDisplay}</div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="w-full" onClick={onDetails}><Info className="h-3.5 w-3.5" /> Details</Button>
        </div>
      </div>
    </div>
  );
}



function DetailDrawer({ fam }: {
  fam: Family;
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
        <div className="h-40 rounded-md bg-white border flex items-center justify-center overflow-hidden">
          {fam.image ? <img src={fam.image} alt={fam.type} className="h-full w-full object-contain p-4" /> : <Lock className="h-16 w-16 text-primary/60" />}
        </div>

        {fam.finishes.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {fam.finishes.map(f => (
              <button
                key={f}
                onClick={() => setSelFinish(f)}
                title={f}
                className={`h-7 w-7 rounded-full border-2 ${selFinish === f ? "ring-2 ring-primary ring-offset-1" : "border-border"}`}
                style={{ background: fam.finishColours[f] ?? "#888888" }}
              />
            ))}
          </div>
        )}

        {fam.sizes.length > 0 && (() => {
          const sizesForFinish = new Set(
            fam.variants.filter(v => !selFinish || v.finish === selFinish).map(v => v.size).filter(Boolean) as string[]
          );
          return (
            <div className="flex flex-wrap gap-1.5">
              {fam.sizes.filter(s => sizesForFinish.has(s)).map(s => (
                <button
                  key={s}
                  onClick={() => setSelSize(s)}
                  className={`px-2.5 py-1 rounded-full text-xs border ${selSize === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}
                >{s}</button>
              ))}
            </div>
          );
        })()}

        <div className="text-3xl font-semibold text-amber-600">£{Number(selected.price_gbp).toFixed(2)}</div>

        <dl className="text-sm grid grid-cols-2 gap-x-4 gap-y-2">
          {selected.cylinder_profile && (<><dt className="text-muted-foreground">Profile</dt><dd>{selected.cylinder_profile}</dd></>)}
          <dt className="text-muted-foreground">Type</dt><dd>{selected.cylinder_type}</dd>
          {selected.finish && (<><dt className="text-muted-foreground">Finish</dt><dd>{selected.finish}</dd></>)}
          {selected.size && (<><dt className="text-muted-foreground">Size</dt><dd>{selected.size}</dd></>)}
          <dt className="text-muted-foreground">Product code</dt><dd className="font-mono">{selected.code}</dd>
        </dl>

        {fam.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{fam.description}</p>
        )}

        {fam.features && (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Product features</div>
            <ul className="space-y-1">
              {fam.features.split(/\n|·/).map(f => f.trim()).filter(Boolean).map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Cylinders are ordered through your system builder. Assign this product to a door in your system and it will be included in your order automatically.
        </p>

        <UseInBuilderButton systems={systems} onPick={onUseInBuilder} fullWidth />
      </div>
    </>
  );
}

/* -------------------- KEYS family card -------------------- */

function KeysFamilyCard({ fam, systems, onDetails, onUseInBuilder }: {
  fam: Family; systems: KeySystem[]; onDetails: () => void; onUseInBuilder: (sysId: string | null) => void;
}) {
  const keyVariants = [...fam.variants].sort((a, b) => Number(a.price_gbp) - Number(b.price_gbp));
  const [selCode, setSelCode] = useState<string>(keyVariants[0]?.code ?? "");
  const selected = fam.variants.find(v => v.code === selCode) ?? keyVariants[0];
  if (!selected) return null;
  return (
    <div className="rounded-[10px] border bg-card shadow-card overflow-hidden flex flex-col">
      <button onClick={onDetails} className="h-36 bg-white flex items-center justify-center hover:bg-muted/10 transition-colors">
        {fam.image
          ? <img src={fam.image} alt={fam.type} className="h-full w-full object-contain p-3" />
          : <KeyRound className="h-14 w-14 text-primary/60" />}
      </button>
      <div className="p-5 flex-1 flex flex-col gap-3">
        <div>
          <h3 className="font-semibold leading-tight text-lg">{fam.type}</h3>
          {fam.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{fam.description}</p>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {keyVariants.map(k => {
            const active = selCode === k.code;
            return (
              <button
                key={k.code}
                onClick={() => setSelCode(k.code)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-primary/50"
                }`}
              >{k.product_description ?? k.name ?? k.code}</button>
            );
          })}
        </div>
        {(selected as any).product_features && (
          <ul className="space-y-0.5">
            {(selected as any).product_features.split(/\n|·/).map((f: string) => f.trim()).filter(Boolean).slice(0, 3).map((f: string, i: number) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <span className="text-primary mt-0.5 shrink-0">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="text-2xl font-semibold text-amber-600 mt-auto">
          £{Number(selected.price_gbp).toFixed(2)}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={onDetails}>
            <Info className="h-3.5 w-3.5" /> Details
          </Button>
          <UseInBuilderButton systems={systems} onPick={onUseInBuilder} />
        </div>
      </div>
    </div>
  );
}

function KeysDetailDrawer({ fam, systems, onUseInBuilder }: {
  fam: Family; systems: KeySystem[]; onUseInBuilder: (sysId: string | null) => void;
}) {
  const keyVariants = [...fam.variants].sort((a, b) => Number(a.price_gbp) - Number(b.price_gbp));
  const [selCode, setSelCode] = useState<string>(keyVariants[0]?.code ?? "");
  const selected = fam.variants.find(v => v.code === selCode) ?? keyVariants[0];
  if (!selected) return null;
  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <SheetTitle>{fam.type}</SheetTitle>
        </div>
        <SheetDescription>{fam.variants.length} variant{fam.variants.length !== 1 ? "s" : ""} available</SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-5">
        <div className="h-40 rounded-md bg-white border flex items-center justify-center overflow-hidden">
          {fam.image
            ? <img src={fam.image} alt={fam.type} className="h-full w-full object-contain p-4" />
            : <KeyRound className="h-16 w-16 text-primary/60" />}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {keyVariants.map(k => {
            const active = selCode === k.code;
            return (
              <button
                key={k.code}
                onClick={() => setSelCode(k.code)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-primary/50"
                }`}
              >{k.product_description ?? k.name ?? k.code}</button>
            );
          })}
        </div>
        <div className="text-3xl font-semibold text-amber-600">
          £{Number(selected.price_gbp).toFixed(2)}
        </div>
        <dl className="text-sm grid grid-cols-2 gap-x-4 gap-y-2">
          <dt className="text-muted-foreground">Type</dt>
          <dd>{selected.product_description ?? selected.name ?? selected.code}</dd>
          <dt className="text-muted-foreground">Product code</dt>
          <dd className="font-mono">{selected.code}</dd>
        </dl>
        {fam.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{fam.description}</p>
        )}
        {(selected as any).product_features && (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Product features</div>
            <ul className="space-y-1">
              {(selected as any).product_features.split(/\n|·/).map((f: string) => f.trim()).filter(Boolean).map((f: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Keys are cut to your specific master key system. 2 standard keys are included with every cylinder ordered.
        </p>
        <UseInBuilderButton systems={systems} onPick={onUseInBuilder} fullWidth />
      </div>
    </>
  );
}

