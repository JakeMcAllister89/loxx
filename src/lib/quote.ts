import type { CartLine } from "@/contexts/CartContext";
import { normaliseKeys, type TNode, type TreeData } from "@/lib/keytree";
import type { ProductFull } from "@/components/builder/CylinderConfigurator";

export interface QuoteDraftContext {
  system_id: string;
  system_name: string;
  system_reference: string | null;
  tree_snapshot: TreeData;
  items: CartLine[];
}

const DRAFT_KEY = "loxx_quote_draft_v1";

/** Build CartLine[] from a tree of cylinders using the product catalogue. */
export function treeToQuoteItems(
  tree: TreeData,
  products: ProductFull[],
  sys: { system_id: string; system_name: string; system_reference: string | null },
): CartLine[] {
  const productByCode = new Map(products.map((p) => [p.code, p]));
  const out: CartLine[] = [];
  const walk = (n: TNode, trail: TNode[]) => {
    if (n.type === "GMK" || n.type === "MK" || n.type === "SMK") {
      normaliseKeys(n).forEach((k) => {
        if (k.qty > 0) {
          out.push({
            kind: "key",
            key_reference: k.ref,
            room_label: n.location || n.label,
            quantity: k.qty,
            unit_price: 12,
            location: n.type,
            ...sys,
          });
        }
      });
    }
    if (n.type === "CYL" && n.cylinder_type) {
      const p = productByCode.get(n.cylinder_type);
      const unit = Number(p?.price_gbp ?? 0);
      const qty = n.quantity ?? 1;
      const differRef = `D${String(n.differ ?? 0).padStart(3, "0")}`;
      const mkNode  = trail.find(t => t.type === "MK");
      const smkNode = trail.find(t => t.type === "SMK");
      const hierarchyRefs: string[] = [
        ...(mkNode  ? [mkNode.label]  : []),
        ...(smkNode ? [smkNode.label] : []),
      ];
      const zoneNode = smkNode ?? mkNode;
      const zoneLabel = zoneNode ? (zoneNode.location?.trim() || zoneNode.label) : undefined;
      const zoneRef   = zoneNode?.label;
      out.push({
        kind: "cylinder",
        product_code: n.cylinder_type,
        product_name: (p as any)?.product_description ?? p?.name,
        cylinder_type: p?.cylinder_type,
        cylinder_profile: (p as any)?.cylinder_profile ?? undefined,
        finish: n.finish ?? p?.finish ?? undefined,
        size: p?.size ?? undefined,
        image_url: p?.image_url ?? undefined,
        room_label: n.label,
        differ_ref: differRef,
        quantity: qty,
        unit_price: unit,
        hierarchy_refs: hierarchyRefs,
        location: zoneLabel,
        ...sys,
      });
      const extra = n.extra_keys ?? 0;
      if (extra > 0) {
        out.push({
          kind: "key",
          key_reference: `Extra keys — ${n.label} (${differRef})`,
          room_label: n.label,
          differ_ref: differRef,
          quantity: extra,
          unit_price: 12,
          location: "extra",
          hierarchy_refs: zoneRef ? [zoneRef] : [],
          ...sys,
        });
      }
    }
    n.children.forEach(c => walk(c, [...trail, n]));
  };
  if (tree.root) walk(tree.root, []);
  return out;
}

export function stashQuoteDraft(d: QuoteDraftContext) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* */ }
}

export function popQuoteDraft(): QuoteDraftContext | null {
  try {
    const s = localStorage.getItem(DRAFT_KEY);
    if (!s) return null;
    localStorage.removeItem(DRAFT_KEY);
    return JSON.parse(s);
  } catch { return null; }
}

/** Read the draft without consuming it. */
export function peekQuoteDraft(): QuoteDraftContext | null {
  try {
    const s = localStorage.getItem(DRAFT_KEY);
    if (!s) return null;
    return JSON.parse(s);
  } catch { return null; }
}

/** Explicitly remove the draft once it has been loaded into state. */
export function clearQuoteDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* */ }
}

export function totals(items: CartLine[]) {
  const cylSub = items.filter((i) => i.kind === "cylinder").reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const keySub = items.filter((i) => i.kind === "key").reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const subtotal = cylSub + keySub;
  const vat = +(subtotal * 0.2).toFixed(2);
  const total = +(subtotal + vat).toFixed(2);
  return { cylSub, keySub, subtotal, vat, total };
}

export const STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-info/15 text-info border-info/30",
  accepted: "bg-success/15 text-success border-success/30",
  declined: "bg-destructive/15 text-destructive border-destructive/30",
  converted: "bg-amber-100 text-amber-900 border-amber-200",
  expired: "bg-muted text-muted-foreground/60 border-border",
};

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  converted: "Converted to order",
  expired: "Expired",
};
