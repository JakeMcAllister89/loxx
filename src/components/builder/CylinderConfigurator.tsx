import { useMemo } from "react";
import { TNode } from "@/lib/keytree";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { colorForFinish, FINISH_BORDER } from "@/lib/finishes";

export interface ProductFull {
  id: string;
  code: string;
  name: string;
  cylinder_type: string;
  pin_count: number | null;
  finish: string | null;
  size: string | null;
  price_gbp: number;
  bs_en_1303: boolean | null;
  description: string | null;
  image_url: string | null;
}

interface Props {
  node: TNode;
  products: ProductFull[];
  onPatch: (p: Partial<TNode>) => void;
}

export function CylinderConfigurator({ node, products, onPatch }: Props) {
  // Group products by family (cylinder_type, e.g. "Single", "Double", "Oval")
  const families = useMemo(() => {
    const set = new Map<string, ProductFull[]>();
    for (const p of products) {
      const arr = set.get(p.cylinder_type) ?? [];
      arr.push(p);
      set.set(p.cylinder_type, arr);
    }
    return set;
  }, [products]);

  // Currently selected product (matched by code)
  const selected = useMemo(
    () => products.find((p) => p.code === node.cylinder_type) ?? null,
    [products, node.cylinder_type],
  );

  // Active family — drives the available variants below
  const activeFamily = selected?.cylinder_type ?? "";
  const variants = activeFamily ? families.get(activeFamily) ?? [] : [];

  const finishesForFamily = useMemo(
    () => Array.from(new Set(variants.map((v) => v.finish).filter(Boolean))) as string[],
    [variants],
  );
  const sizesForFamily = useMemo(
    () => Array.from(new Set(variants.map((v) => v.size).filter(Boolean))) as string[],
    [variants],
  );

  /** Resolve a variant within the current family by finish/size and update the node. */
  const setFinish = (finish: string) => {
    if (!activeFamily) return;
    const desiredSize = node.size ?? selected?.size ?? sizesForFamily[0];
    const match =
      variants.find((v) => v.finish === finish && v.size === desiredSize) ??
      variants.find((v) => v.finish === finish);
    if (match) onPatch({ cylinder_type: match.code, finish: match.finish ?? finish, size: match.size ?? desiredSize });
    else onPatch({ finish });
  };

  const setSize = (size: string) => {
    if (!activeFamily) return;
    const desiredFinish = node.finish ?? selected?.finish ?? finishesForFamily[0];
    const match =
      variants.find((v) => v.size === size && v.finish === desiredFinish) ??
      variants.find((v) => v.size === size);
    if (match) onPatch({ cylinder_type: match.code, size: match.size ?? size, finish: match.finish ?? desiredFinish });
    else onPatch({ size });
  };

  const setFamily = (familyCode: string) => {
    const fam = families.get(familyCode);
    if (!fam || fam.length === 0) return;
    const first = fam[0];
    onPatch({
      cylinder_type: first.code,
      finish: first.finish ?? undefined,
      size: first.size ?? undefined,
    });
  };

  const activeFinish = node.finish ?? selected?.finish ?? null;
  const activeSize = node.size ?? selected?.size ?? null;

  return (
    <div className="space-y-4">
      {/* Family / type selector — card-style */}
      <div>
        <Label className="text-xs">Cylinder type</Label>
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          {Array.from(families.keys()).map((fam) => {
            const isActive = fam === activeFamily;
            const exemplar = families.get(fam)![0];
            return (
              <button
                key={fam}
                onClick={() => setFamily(fam)}
                className={`text-left rounded-[10px] border p-2.5 transition-colors ${
                  isActive ? "border-primary bg-accent-light" : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded bg-muted overflow-hidden shrink-0">
                    {exemplar.image_url && <img src={exemplar.image_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{fam}</div>
                    <div className="text-[10px] text-muted-foreground">from £{Math.min(...families.get(fam)!.map((p) => Number(p.price_gbp))).toFixed(2)}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected product card */}
      {selected && (
        <div className="rounded-[10px] border bg-card p-3 shadow-card">
          <div className="flex gap-3">
            <div className="h-20 w-20 rounded bg-muted overflow-hidden shrink-0">
              {selected.image_url && <img src={selected.image_url} alt={selected.name} className="h-full w-full object-cover" loading="lazy" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-tight">{selected.name}</div>
              <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{selected.code}</div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {selected.pin_count != null && <Badge variant="secondary" className="text-[10px]">{selected.pin_count}-pin</Badge>}
                {selected.size && <Badge variant="secondary" className="text-[10px] font-mono">{selected.size}</Badge>}
                {selected.bs_en_1303 && (
                  <Badge variant="outline" className="text-[10px] gap-1 border-success text-success">
                    <ShieldCheck className="h-3 w-3" /> BS EN 1303
                  </Badge>
                )}
              </div>
              <div className="text-lg font-bold text-[hsl(var(--node-cyl))] mt-1.5">£{Number(selected.price_gbp).toFixed(2)}</div>
            </div>
          </div>
          {selected.description && (
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{selected.description}</p>
          )}
        </div>
      )}

      {/* Finish circles */}
      {finishesForFamily.length > 0 && (
        <div>
          <Label className="text-xs">Finish {activeFinish && <span className="text-muted-foreground font-normal ml-1">· {activeFinish}</span>}</Label>
          <div className="flex items-center gap-2 mt-1.5">
            {finishesForFamily.map((f) => {
              const isActive = activeFinish === f;
              return (
                <button
                  key={f}
                  onClick={() => setFinish(f)}
                  title={f}
                  className={`h-9 w-9 rounded-full border-2 transition-all hover:scale-105 ${
                    isActive ? "ring-2 ring-primary ring-offset-2" : ""
                  }`}
                  style={{ background: colorForFinish(f), borderColor: FINISH_BORDER[f] ?? "hsl(var(--border))" }}
                  aria-label={f}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Size pills */}
      {sizesForFamily.length > 0 && (
        <div>
          <Label className="text-xs">Size</Label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {sizesForFamily.map((s) => {
              const isActive = activeSize === s;
              return (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`px-3 py-1 rounded-full text-xs font-mono border transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:border-primary/50"
                  }`}
                >{s}</button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantity */}
      <div>
        <Label className="text-xs">Quantity at this door</Label>
        <div className="flex items-center gap-2 mt-1.5">
          <Button size="sm" variant="outline" className="h-9 w-9 p-0" onClick={() => onPatch({ quantity: Math.max(1, (node.quantity ?? 1) - 1) })}>−</Button>
          <Input
            type="number" min={1} max={20}
            value={node.quantity ?? 1}
            onChange={(e) => onPatch({ quantity: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
            className="h-9 w-16 text-center font-mono"
          />
          <Button size="sm" variant="outline" className="h-9 w-9 p-0" onClick={() => onPatch({ quantity: Math.min(20, (node.quantity ?? 1) + 1) })}>+</Button>
          <span className="text-[11px] text-muted-foreground ml-1">Double doors usually need 2</span>
        </div>
      </div>

      {/* Additional keys */}
      <div className="pt-3 border-t">
        <Label className="text-xs">Additional keys</Label>
        <p className="text-[11px] text-muted-foreground mt-0.5">2 keys are included as standard with every cylinder.</p>
        <div className="mt-2">
          <Label htmlFor="extra-keys" className="text-[11px] text-muted-foreground">Extra keys required</Label>
          <Input
            id="extra-keys"
            type="number" min={0} max={50}
            value={node.extra_keys ?? 0}
            onChange={(e) => onPatch({ extra_keys: Math.max(0, Math.min(50, Number(e.target.value) || 0)) })}
            className="h-9 w-24 font-mono mt-1"
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Total keys for this cylinder: <span className="font-mono font-semibold text-foreground">{2 + (node.extra_keys ?? 0)}</span>
        </p>
      </div>
    </div>
  );
}
