import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface CartLine {
  kind: "cylinder" | "key";
  product_code?: string;
  differ_ref?: string;
  room_label?: string;
  cylinder_type?: string;
  finish?: string;
  key_reference?: string;
  quantity: number;
  unit_price: number;
}

interface CartCtx {
  items: CartLine[];
  add: (l: CartLine) => void;
  remove: (i: number) => void;
  updateQty: (i: number, q: number) => void;
  clear: () => void;
  replace: (items: CartLine[]) => void;
  subtotal: number;
  vat: number;
  total: number;
  count: number;
}

const Ctx = createContext<CartCtx | undefined>(undefined);
const KEY = "loxx_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(() => {
    try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)); }, [items]);

  const add = (l: CartLine) => setItems((p) => [...p, l]);
  const remove = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  const updateQty = (i: number, q: number) =>
    setItems((p) => p.map((it, idx) => (idx === i ? { ...it, quantity: Math.max(1, q) } : it)));
  const clear = () => setItems([]);
  const replace = (next: CartLine[]) => setItems(next);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const vat = +(subtotal * 0.2).toFixed(2);
  const total = +(subtotal + vat).toFixed(2);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return <Ctx.Provider value={{ items, add, remove, updateQty, clear, replace, subtotal, vat, total, count }}>{children}</Ctx.Provider>;
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
};
