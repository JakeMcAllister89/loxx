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
}

export default function QuickOrder() {
  const { orgRole } = useAuth();
  const { add: addToCart } = useCart();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [cylinders, setCylinders] = useState<CylinderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, mode: "key", row: null, reason: "faulty" });
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
            rows.push({
              nodeId: n.id,
              label: n.label,
              differRef: `D${String(n.differ ?? 0).padStart(3, "0")}`,
              cylinder_type: n.cylinder_type,
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cylinders;
    return cylinders.filter(r =>
      r.label.toLowerCase().includes(q) ||
      r.differRef.toLowerCase().includes(q) ||
      r.systemName.toLowerCase().includes(q) ||
      (r.systemRef ?? "").toLowerCase().includes(q)
    );
  }, [cylinders, search]);

  const openConfirm = (row: CylinderRow, mode: "key" | "cylinder") => {
    setConfirm({ open: true, mode, row, reason: "faulty" });
  };

  const handleConfirm = async () => {
    const { row, mode, reason } = confirm;
    if (!row) return;
    setSubmitting(true);
    try {
      const prod = products.find((p: any) => p.code === row.cylinder_type);
      if (mode === "key") {
        const differKeyProd = products.find((p: any) =>
          p.cylinder_type === "Key" && (p.cylinder_profile ?? "").toUpperCase().includes("DIFFER")
        );
        addToCart({
          kind: "key",
          key_reference: `Spare key — ${row.label} (${row.differRef})`,
          product_code: differKeyProd?.code ?? undefined,
          image_url: differKeyProd?.image_url ?? undefined,
          room_label: row.label,
          differ_ref: row.differRef,
          quantity: 1,
          unit_price: differKeyProd ? Number(differKeyProd.price_gbp) : 12,
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
          quantity: 1,
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
      setConfirm({ open: false, mode: "key", row: null, reason: "faulty" });
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by door, differ, or system…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
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
                        <div className="text-xs text-muted-foreground">
                          {row.differRef}
                          {row.finish && ` · ${row.finish}`}
                          {row.size && ` · ${row.size}`}
                          {row.cylinder_type && ` · ${row.cylinder_type}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => openConfirm(row, "key")}>
                          <Key className="h-3.5 w-3.5 mr-1.5" /> Spare key
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openConfirm(row, "cylinder")}>
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Replace cylinder
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
              {confirm.mode === "key" ? "Order spare key" : "Order replacement cylinder"}
            </DialogTitle>
          </DialogHeader>
          {confirm.row && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Door</span><span>{confirm.row.label}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Differ ref</span><span>{confirm.row.differRef}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Product</span><span>{confirm.row.cylinder_type}</span></div>
                {confirm.row.finish && <div className="flex justify-between"><span className="text-muted-foreground">Finish</span><span>{confirm.row.finish}</span></div>}
                {confirm.row.size && <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span>{confirm.row.size}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">System</span><span>{confirm.row.systemName}</span></div>
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
