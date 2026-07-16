import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/contexts/CartContext";
import { logAction } from "@/lib/audit";
import { findNode, findParent, updateNode, addChild, assignNextDiffers, newId } from "@/lib/keytree";
import type { TNode, TreeData } from "@/lib/keytree";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Search, Key, RefreshCw, Loader2 } from "lucide-react";

interface CylinderRow {
  nodeId: string;
  label: string;
  differRef: string;
  cylinder_type: string;
  lockType: string | null;
  lockFunction: string | null;
  finish: string | null;
  size: string | null;
  systemId: string;
  systemName: string;
  systemRef: string | null;
  isFulfilled: boolean;
}

interface ConfirmState {
  open: boolean;
  mode: "key" | "cylinder";
  row: CylinderRow | null;
  reason: "faulty" | "lost_key";
  quantity: number;
  differKeyCode: string | null;
  differKeyPrice: number;
}

export default function QuickOrder() {
  const { orgRole } = useAuth();
  const { add: addToCart } = useCart();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterSystem, setFilterSystem] = useState("");
  const [filterLockType, setFilterLockType] = useState("");
  const [filterFinish, setFilterFinish] = useState("");
  const [cylinders, setCylinders] = useState<CylinderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, mode: "key", row: null, reason: "faulty", quantity: 1, differKeyCode: null, differKeyPrice: 12 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: systems }, { data: prods }] = await Promise.all([
        supabase.from("key_systems").select("id, name, reference, tree_data, is_fulfilled"),
        supabase.from("products").select("*").eq("is_active", true),
      ]);
      setProducts(prods ?? []);
      const rows: CylinderRow[] = [];
      for (const sys of systems ?? []) {
        const tree = sys.tree_data as any as TreeData;
        const walk = (n: TNode) => {
          if (n.type === "CYL" && !n.decommissioned_at && n.cylinder_type) {
            const prod = (prods ?? []).find((p: any) => p.code === n.cylinder_type);
            rows.push({
              nodeId: n.id,
              label: n.label,
              differRef: `D${String(n.differ ?? 0).padStart(3, "0")}`,
              cylinder_type: n.cylinder_type,
              lockType: prod?.cylinder_type ?? null,
              lockFunction: (prod as any)?.cylinder_profile ?? null,
              finish: n.finish ?? null,
              size: n.size ?? null,
              systemId: sys.id,
              systemName: sys.name,
              systemRef: (sys as any).reference ?? null,
              isFulfilled: !!(sys as any).is_fulfilled,
            });
          }
          (n.children ?? []).forEach(walk);
        };
        if (tree?.root) walk(tree.root);
      }
      rows.sort((a, b) => a.systemName.localeCompare(b.systemName) || a.label.localeCompare(b.label));
      setCylinders(rows);
      setLoading(false);
    };
    load();
  }, []);

  const systemOptions = useMemo(() => [...new Set(cylinders.map(r => r.systemId))].map(id => cylinders.find(r => r.systemId === id)!).map(r => ({ id: r.systemId, name: r.systemName })), [cylinders]);
  const lockTypeOptions = useMemo(() => [...new Set(cylinders.map(r => r.lockType).filter(Boolean))] as string[], [cylinders]);
  const finishOptions = useMemo(() => [...new Set(cylinders.map(r => r.finish).filter(Boolean))] as string[], [cylinders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cylinders.filter(r => {
      if (filterSystem && r.systemId !== filterSystem) return false;
      if (filterLockType && r.lockType !== filterLockType) return false;
      if (filterFinish && r.finish !== filterFinish) return false;
      if (q && !(
        r.label.toLowerCase().includes(q) ||
        r.differRef.toLowerCase().includes(q) ||
        r.systemName.toLowerCase().includes(q) ||
        (r.systemRef ?? "").toLowerCase().includes(q)
      )) return false;
      return true;
    });
  }, [cylinders, search, filterSystem, filterLockType, filterFinish]);

  const openConfirm = (row: CylinderRow, mode: "key" | "cylinder") => {
    const differKeyProd = products.find((p: any) =>
      p.cylinder_type === "Key" && (
        (p.code ?? "").toUpperCase().includes("REP") ||
        (p.cylinder_profile ?? "").toUpperCase().includes("REP")
      ) && (p.cylinder_profile ?? "").toUpperCase().includes("DIFFER")
    );
    setConfirm({
      open: true, mode, row, reason: "faulty", quantity: 1,
      differKeyCode: differKeyProd?.code ?? null,
      differKeyPrice: differKeyProd ? Number(differKeyProd.price_gbp) : 12,
    });
  };

  const handleConfirm = async () => {
    const { row, mode, reason } = confirm;
    if (!row) return;
    setSubmitting(true);
    try {
      const prod = products.find((p: any) => p.code === row.cylinder_type);
      if (mode === "key") {
        const differKeyProd = products.find((p: any) =>
          p.cylinder_type === "Key" && (
            (p.code ?? "").toUpperCase().includes("REP") ||
            (p.cylinder_profile ?? "").toUpperCase().includes("REP")
          ) && (p.cylinder_profile ?? "").toUpperCase().includes("DIFFER")
        );
        addToCart({
          kind: "key",
          key_reference: `Spare key — ${row.label} (${row.differRef})`,
          product_code: differKeyProd?.code ?? undefined,
          image_url: differKeyProd?.image_url ?? undefined,
          room_label: row.label,
          differ_ref: row.differRef,
          quantity: confirm.quantity,
          unit_price: confirm.differKeyPrice,
          system_id: row.systemId,
          system_name: row.systemName,
          system_reference: row.systemRef,
        });
        logAction({
          system_id: row.systemId,
          action: "key_quick_ordered",
          node_type: "CYL",
          node_label: row.label,
          metadata: { differ_ref: row.differRef, source: "quick_order" },
        });
        toast.success(`Spare key for ${row.label} added to basket`);
      } else {
        const { data: sys } = await supabase.from("key_systems").select("*").eq("id", row.systemId).single();
        if (!sys) throw new Error("System not found");
        let tree = (sys as any).tree_data as TreeData;
        const original = findNode(tree.root, row.nodeId);
        const parent = original ? findParent(tree.root, row.nodeId) : null;
        if (!original || !parent) throw new Error("Cylinder not found in system");

        if (reason === "faulty") {
          tree = { ...tree, root: updateNode(tree.root, row.nodeId, { is_new: true }) } as TreeData;
          logAction({
            system_id: row.systemId,
            action: "cylinder_replaced",
            node_type: "CYL",
            node_label: original.label,
            metadata: { reason, old_differ: original.differ, new_differ: original.differ, source: "quick_order" },
          });
        } else {
          const newNodeId = newId();
          const replacement: TNode = {
            id: newNodeId,
            type: "CYL",
            label: original.label,
            cylinder_type: original.cylinder_type,
            finish: original.finish,
            size: original.size,
            quantity: original.quantity ?? 1,
            extra_keys: 0,
            is_new: true,
            children: [],
          };
          const decommRoot = updateNode(tree.root, row.nodeId, {
            decommissioned_at: new Date().toISOString(),
            decommissioned_reason: reason,
            replaced_by_node_id: newNodeId,
          });
          const newRoot = addChild(decommRoot, parent.id, replacement);
          tree = assignNextDiffers({ ...tree, root: newRoot });
          logAction({
            system_id: row.systemId,
            action: "cylinder_replaced",
            node_type: "CYL",
            node_label: original.label,
            metadata: { reason, old_differ: original.differ, source: "quick_order" },
          });
        }

        await supabase.from("key_systems").update({
          tree_data: tree as any,
          next_differ: tree.next_differ,
          updated_at: new Date().toISOString(),
        }).eq("id", row.systemId);

        addToCart({
          kind: "cylinder",
          product_code: row.cylinder_type,
          product_name: (prod as any)?.product_description ?? prod?.name,
          cylinder_type: prod?.cylinder_type,
          cylinder_profile: (prod as any)?.cylinder_profile ?? undefined,
          finish: row.finish ?? undefined,
          size: row.size ?? undefined,
          image_url: prod?.image_url ?? undefined,
          room_label: row.label,
          differ_ref: row.differRef,
          quantity: confirm.quantity,
          unit_price: prod ? Number(prod.price_gbp) : 0,
          system_id: row.systemId,
          system_name: row.systemName,
          system_reference: row.systemRef,
        });
        toast.success(`Replacement cylinder for ${row.label} added to basket`);

        setCylinders(prev => reason === "lost_key"
          ? prev.filter(c => !(c.systemId === row.systemId && c.nodeId === row.nodeId))
          : prev
        );
      }
      setConfirm({ open: false, mode: "key", row: null, reason: "faulty", quantity: 1, differKeyCode: null, differKeyPrice: 12 });
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, CylinderRow[]>();
    filtered.forEach(r => {
      const key = r.systemId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return map;
  }, [filtered]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Quick Order</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Order a spare key or replacement cylinder for any door across your systems.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search door or differ ref…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <select value={filterSystem} onChange={e => setFilterSystem(e.target.value)} className="text-sm border rounded-md px-3 py-2 bg-background min-w-[160px]">
            <option value="">All systems</option>
            {systemOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={filterLockType} onChange={e => setFilterLockType(e.target.value)} className="text-sm border rounded-md px-3 py-2 bg-background min-w-[160px]">
            <option value="">All lock types</option>
            {lockTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterFinish} onChange={e => setFilterFinish(e.target.value)} className="text-sm border rounded-md px-3 py-2 bg-background min-w-[140px]">
            <option value="">All finishes</option>
            {finishOptions.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading cylinders…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8">
            No cylinders found{search ? " matching your search" : ""}.
          </p>
        ) : (
          <div className="space-y-6">
            {[...grouped.entries()].map(([systemId, rows]) => (
              <div key={systemId} className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 flex items-center gap-2">
                  <span className="font-medium">{rows[0].systemName}</span>
                  {rows[0].systemRef && <Badge variant="outline">{rows[0].systemRef}</Badge>}
                </div>
                <div className="divide-y">
                  {rows.map(row => (
                    <div key={`${row.systemId}-${row.nodeId}`} className="flex items-center justify-between px-4 py-3 gap-4">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{row.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono">{row.differRef}</span>
                          {row.lockType && ` · ${row.lockType}`}
                          {row.lockFunction && ` · ${row.lockFunction}`}
                          {row.finish && ` · ${row.finish}`}
                          {row.size && ` · ${row.size}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => openConfirm(row, "key")}>
                          <Key className="h-3.5 w-3.5 mr-1" /> Extra key
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openConfirm(row, "cylinder")}>
                          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Extra cylinder
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={confirm.open} onOpenChange={(o) => !submitting && setConfirm(c => ({ ...c, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm.mode === "key" ? "Order extra key" : "Order extra cylinder"}
            </DialogTitle>
          </DialogHeader>
          {confirm.row && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Door</span><span>{confirm.row.label}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Differ ref</span><span className="font-mono">{confirm.row.differRef}</span></div>
                {confirm.row.lockFunction && <div className="flex justify-between"><span className="text-muted-foreground">Lock profile</span><span>{confirm.row.lockFunction}</span></div>}
                {confirm.row.lockType && <div className="flex justify-between"><span className="text-muted-foreground">Lock function</span><span>{confirm.row.lockType}</span></div>}
                {confirm.row.finish && <div className="flex justify-between"><span className="text-muted-foreground">Finish</span><span>{confirm.row.finish}</span></div>}
                {confirm.row.size && <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span>{confirm.row.size}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Product code</span><span className="font-mono text-xs">{confirm.mode === "key" ? (confirm.differKeyCode ?? "—") : confirm.row.cylinder_type}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">System</span><span>{confirm.row.systemName}</span></div>
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-sm">Quantity</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setConfirm(c => ({ ...c, quantity: Math.max(1, c.quantity - 1) }))}>−</Button>
                  <span className="w-8 text-center text-sm font-medium">{confirm.quantity}</span>
                  <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setConfirm(c => ({ ...c, quantity: c.quantity + 1 }))}>+</Button>
                </div>
              </div>
              {confirm.mode === "cylinder" && (
                <div className="space-y-2">
                  <Label>Reason for replacement</Label>
                  <RadioGroup value={confirm.reason} onValueChange={(v) => setConfirm(c => ({ ...c, reason: v as "faulty" | "lost_key" }))}>
                    <div className="flex items-start gap-2 border rounded-md p-3">
                      <RadioGroupItem value="faulty" id="r-faulty" className="mt-0.5" />
                      <Label htmlFor="r-faulty" className="font-normal cursor-pointer flex-1">
                        <div className="font-medium">Faulty cylinder</div>
                        <p className="text-xs text-muted-foreground">Same differ number retained. Door reference unchanged.</p>
                      </Label>
                    </div>
                    <div className="flex items-start gap-2 border rounded-md p-3">
                      <RadioGroupItem value="lost_key" id="r-lost" className="mt-0.5" />
                      <Label htmlFor="r-lost" className="font-normal cursor-pointer flex-1">
                        <div className="font-medium">Lost key</div>
                        <p className="text-xs text-muted-foreground">New differ number issued. Original cylinder decommissioned.</p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(c => ({ ...c, open: false }))} disabled={submitting}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding…</> : "Add to basket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
