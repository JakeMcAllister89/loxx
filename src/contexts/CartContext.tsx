import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CartLine {
  kind: "cylinder" | "key";
  // Product info
  product_code?: string;
  product_name?: string;
  cylinder_type?: string;     // family e.g. "Double"
  cylinder_profile?: string;  // e.g. "Euro"
  finish?: string;
  size?: string;
  image_url?: string | null;
  // Door / differ
  differ_ref?: string;
  room_label?: string;
  // Key-only
  key_reference?: string;
  node_type?: string;          // "GMK" | "MK" | "SMK" — for keys
  key_type_label?: string;     // "Grand Master Key" / "Master Key" / "Sub Master Key"
  location?: string;           // MK/SMK location/zone
  is_extra_key?: boolean;      // distinguishes extra keys from level keys
  // Hierarchy
  hierarchy_refs?: string[];   // e.g. ["MK-A", "SMK-A1"]
  // System grouping
  system_id?: string | null;
  system_name?: string | null;
  system_reference?: string | null;
  // Pricing
  quantity: number;
  unit_price: number;
}


export interface DeliveryAddress {
  company_name: string;
  contact_name: string;
  contact_phone: string;
  line1: string;
  line2: string;
  city: string;
  county: string;
  postcode: string;
}


interface OrderMeta {
  customerPoRef: string;
  companyName: string;
  projectName: string;
  notes: string;
  delivery: DeliveryAddress;
}

interface CartCtx {
  items: CartLine[];
  add: (l: CartLine) => void;
  remove: (i: number) => void;
  updateQty: (i: number, q: number) => void;
  clear: () => void;
  replace: (items: CartLine[]) => void;
  replaceBySystem: (systemId: string, newItems: CartLine[]) => void;
  meta: OrderMeta;
  setMeta: (m: Partial<OrderMeta>) => void;
  subtotal: number;
  cylindersSubtotal: number;
  keysSubtotal: number;
  deliveryCharge: number;
  vat: number;
  total: number;
  count: number;
}

const Ctx = createContext<CartCtx | undefined>(undefined);
const KEY = "loxx_cart_v1";
const META_KEY = "loxx_cart_meta_v1";

const blankMeta = (): OrderMeta => ({
  customerPoRef: "",
  companyName: "",
  projectName: "",
  notes: "",
  delivery: { company_name: "", contact_name: "", contact_phone: "", line1: "", line2: "", city: "", county: "", postcode: "" },
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(() => {
    try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [meta, setMetaState] = useState<OrderMeta>(() => {
    try { const s = localStorage.getItem(META_KEY); return s ? { ...blankMeta(), ...JSON.parse(s) } : blankMeta(); } catch { return blankMeta(); }
  });
  const [deliveryRates, setDeliveryRates] = useState<{ keys: number; cylinders: number }>({ keys: 7.50, cylinders: 9.50 });

  useEffect(() => {
    supabase.from("admin_settings")
      .select("key,value")
      .in("key", ["delivery_charge_keys_only", "delivery_charge_with_cylinders"])
      .then(({ data }) => {
        const m: Record<string, string> = {};
        (data ?? []).forEach((r: any) => (m[r.key] = r.value));
        setDeliveryRates({
          keys: parseFloat(m["delivery_charge_keys_only"] ?? "7.50"),
          cylinders: parseFloat(m["delivery_charge_with_cylinders"] ?? "9.50"),
        });
      });
  }, []);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem(META_KEY, JSON.stringify(meta)); }, [meta]);

  const add = (l: CartLine) => setItems((p) => [...p, l]);
  const remove = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  const updateQty = (i: number, q: number) =>
    setItems((p) => p.map((it, idx) => (idx === i ? { ...it, quantity: Math.max(1, q) } : it)));
  const clear = () => { setItems([]); setMetaState(blankMeta()); };
  const replace = (next: CartLine[]) => setItems(next);
  const replaceBySystem = (systemId: string, newItems: CartLine[]) =>
    setItems((prev) => [...prev.filter((item) => item.system_id !== systemId), ...newItems]);
  const setMeta = (m: Partial<OrderMeta>) => setMetaState((prev) => ({ ...prev, ...m, delivery: { ...prev.delivery, ...(m.delivery ?? {}) } }));

  const cylindersSubtotal = items.filter(i => i.kind === "cylinder").reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const keysSubtotal = items.filter(i => i.kind === "key").reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const subtotal = cylindersSubtotal + keysSubtotal;
  const deliveryCharge = items.length === 0 ? 0 : cylindersSubtotal > 0 ? deliveryRates.cylinders : deliveryRates.keys;
  const vat = +((subtotal + deliveryCharge) * 0.2).toFixed(2);
  const total = +(subtotal + deliveryCharge + vat).toFixed(2);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <Ctx.Provider value={{ items, add, remove, updateQty, clear, replace, replaceBySystem, meta, setMeta, subtotal, cylindersSubtotal, keysSubtotal, deliveryCharge, vat, total, count }}>

      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
};
