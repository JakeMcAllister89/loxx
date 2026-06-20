import type { CartLine } from "@/contexts/CartContext";
import type { TNode, TreeData } from "@/lib/keytree";
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
  const walk = (n: TNode) => {
    if (n.type === "CYL" && n.cylinder_type) {
      const p = productByCode.get(n.cylinder_type);
      const unit = Number(p?.price_gbp ?? 0);
      const qty = n.quantity ?? 1;
      const differRef = `D${String(n.differ ?? 0).padStart(3, "0")}`;
      out.push({
        kind: "cylinder",
        product_code: n.cylinder_type,
        product_name: p?.name,
        cylinder_type: p?.cylinder_type,
        cylinder_profile: (p as any)?.cylinder_profile ?? undefined,
        finish: n.finish ?? p?.finish ?? undefined,
        size: p?.size ?? undefined,
        image_url: p?.image_url ?? undefined,
        room_label: n.label,
        differ_ref: differRef,
        quantity: qty,
        unit_price: unit,
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
          ...sys,
        });
      }
    }
    n.children.forEach(walk);
  };
  if (tree.root) walk(tree.root);
  return out;
}

export function stashQuoteDraft(d: QuoteDraftContext) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* */ }
}

export function popQuoteDraft(): QuoteDraftContext | null {
  try {
    const s = sessionStorage.getItem(DRAFT_KEY);
    if (!s) return null;
    sessionStorage.removeItem(DRAFT_KEY);
    return JSON.parse(s);
  } catch { return null; }
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
