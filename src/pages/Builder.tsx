import { useParams, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import {
  Plus, X, Save, ShieldCheck, ShoppingCart, Search, Loader2,
  AlertCircle, AlertTriangle, ChevronRight, KeyRound,
} from "lucide-react";
import {
  TNode, TreeData, NodeType,
  emptyTree, createGMK, makeChild, childTypeOf,
  findNode, findParent, updateNode, addChild, removeNode,
  countDoors, assignNextDiffers, pathOf, validate, ValidationIssue,
} from "@/lib/keytree";

/* ------------------------- Layout (dagre) ------------------------- */

const NODE_W = 220;
const NODE_H = 78;

function buildFlow(
  tree: TreeData,
  opts: { selectedId?: string | null; errorIds: Set<string>; searchMatch: Set<string>; onAdd: (id: string) => void; onDelete: (id: string) => void; },
): { nodes: Node[]; edges: Edge[] } {
  if (!tree.root) return { nodes: [], edges: [] };
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 36, ranksep: 60 });
  g.setDefaultEdgeLabel(() => ({}));

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const walk = (n: TNode, parent?: TNode) => {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
    if (parent) {
      g.setEdge(parent.id, n.id);
      edges.push({ id: `${parent.id}->${n.id}`, source: parent.id, target: n.id, type: "smoothstep" });
    }
    n.children.forEach((c) => walk(c, n));
  };
  walk(tree.root);
  dagre.layout(g);

  const collect = (n: TNode) => {
    const p = g.node(n.id);
    nodes.push({
      id: n.id,
      type: "key",
      position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 },
      data: {
        node: n,
        selected: opts.selectedId === n.id,
        hasError: opts.errorIds.has(n.id),
        searchMatch: opts.searchMatch.has(n.id),
        canAddChild: childTypeOf(n.type) !== null,
        onAdd: opts.onAdd,
        onDelete: opts.onDelete,
        isRoot: tree.root?.id === n.id,
      },
    });
    n.children.forEach(collect);
  };
  collect(tree.root);

  return { nodes, edges };
}

/* ------------------------- Custom node ------------------------- */

const TYPE_META: Record<NodeType, { label: string; color: string; bg: string; ring: string }> = {
  GMK: { label: "Grand Master",  color: "hsl(var(--node-gmk))", bg: "hsl(245 70% 96%)",  ring: "hsl(var(--node-gmk))" },
  SMK: { label: "Sub-master",    color: "hsl(var(--node-smk))", bg: "hsl(154 60% 95%)",  ring: "hsl(var(--node-smk))" },
  CK:  { label: "Change Key",    color: "hsl(var(--node-ck))",  bg: "hsl(210 75% 96%)",  ring: "hsl(var(--node-ck))"  },
  CYL: { label: "Cylinder",      color: "hsl(var(--node-cyl))", bg: "hsl(36 94% 95%)",   ring: "hsl(var(--node-cyl))" },
};

function KeyNodeView({ data }: NodeProps) {
  const n = data.node as TNode;
  const meta = TYPE_META[n.type];
  const hasError = data.hasError as boolean;
  const isSelected = data.selected as boolean;
  const match = data.searchMatch as boolean;

  return (
    <div
      className="group relative rounded-lg border bg-card transition-all"
      style={{
        width: NODE_W, height: NODE_H,
        backgroundColor: meta.bg,
        borderColor: hasError ? "hsl(var(--destructive))" : isSelected ? meta.ring : "hsl(var(--border))",
        boxShadow: isSelected ? `0 0 0 2px ${meta.ring}` : match ? `0 0 0 2px hsl(var(--warning))` : "var(--shadow-card)",
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="p-2.5 h-full flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: meta.color }} />
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{meta.label}</span>
          {n.type === "CYL" && n.differ && (
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">D{String(n.differ).padStart(3, "0")}</span>
          )}
        </div>
        <div className="mt-1 text-sm font-semibold text-foreground leading-tight truncate">{n.label || <span className="text-muted-foreground italic">Unnamed</span>}</div>
        <div className="mt-auto flex items-center justify-between text-[11px] text-muted-foreground">
          {n.type === "CK" && <span>{n.keys ?? 1} key{(n.keys ?? 1) !== 1 ? "s" : ""}</span>}
          {n.type === "CYL" && <span className="truncate">{n.cylinder_type ?? <span className="text-destructive">No product</span>}</span>}
          {(n.type === "GMK" || n.type === "SMK") && <span>{n.children.length} branch{n.children.length !== 1 ? "es" : ""}</span>}
          {hasError && <AlertCircle className="h-3 w-3 text-destructive" />}
        </div>
      </div>

      {/* hover actions */}
      <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {data.canAddChild && (
          <button
            onClick={(e) => { e.stopPropagation(); (data.onAdd as (id: string) => void)(n.id); }}
            className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-card hover:bg-primary/90"
            title="Add child"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
        {!data.isRoot && (
          <button
            onClick={(e) => { e.stopPropagation(); (data.onDelete as (id: string) => void)(n.id); }}
            className="h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-card hover:opacity-90"
            title="Delete"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { key: KeyNodeView };

/* ------------------------- Builder page ------------------------- */

interface Product { id: string; code: string; name: string; cylinder_type: string; finish: string | null; price_gbp: number }

export default function Builder() {
  const { id } = useParams();

  if (!id) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center max-w-md mx-auto mt-24">
          <KeyRound className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold mt-4">Open a system to start building</h2>
          <p className="text-sm text-muted-foreground mt-1">Select a system from the sidebar or click <em>New System</em>.</p>
        </div>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout>
      <ReactFlowProvider>
        <BuilderInner systemId={id} />
      </ReactFlowProvider>
    </DashboardLayout>
  );
}

function BuilderInner({ systemId }: { systemId: string }) {
  const navigate = useNavigate();
  const { add: addToCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeData>(emptyTree());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [validateOpen, setValidateOpen] = useState(false);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const dirtyRef = useRef(false);

  /* ---------- load ---------- */
  useEffect(() => {
    setLoading(true);
    supabase.from("key_systems").select("*").eq("id", systemId).single().then(({ data, error }) => {
      if (error || !data) { toast.error("System not found"); navigate("/dashboard"); return; }
      setName(data.name);
      setReference(data.reference);
      const t = (data.tree_data as unknown as TreeData) ?? emptyTree();
      setTree(t?.root !== undefined ? t : emptyTree());
      setLoading(false);
    });
    supabase.from("products").select("id,code,name,cylinder_type,finish,price_gbp").order("price_gbp").then(({ data }) => setProducts((data ?? []) as Product[]));
  }, [systemId, navigate]);

  /* ---------- mutations ---------- */
  const mutate = (updater: (t: TreeData) => TreeData) => {
    setTree((prev) => {
      const next = updater(prev);
      dirtyRef.current = true;
      return next;
    });
  };

  const addRoot = () => mutate((t) => ({ ...t, root: createGMK() }));

  const handleAddChild = useCallback((parentId: string) => {
    setTree((prev) => {
      const parent = findNode(prev.root, parentId);
      if (!parent) return prev;
      const childT = childTypeOf(parent.type);
      if (!childT) return prev;
      const child = makeChild(parent.type, parent.children.length);
      const root = addChild(prev.root, parentId, child);
      let next: TreeData = { ...prev, root };
      if (child.type === "CYL") next = assignNextDiffers(next);
      dirtyRef.current = true;
      setSelectedId(child.id);
      return next;
    });
  }, []);

  const handleDelete = useCallback((nodeId: string) => {
    setTree((prev) => {
      const root = removeNode(prev.root, nodeId);
      dirtyRef.current = true;
      return { ...prev, root };
    });
    setSelectedId((s) => (s === nodeId ? null : s));
  }, []);

  const patchSelected = (patch: Partial<TNode>) => {
    if (!selectedId) return;
    mutate((t) => ({ ...t, root: updateNode(t.root, selectedId, patch) }));
  };

  /* ---------- search & validation ---------- */
  const searchMatch = useMemo(() => {
    const s = new Set<string>();
    if (!search.trim() || !tree.root) return s;
    const q = search.trim().toLowerCase();
    const walk = (n: TNode) => {
      if (n.label.toLowerCase().includes(q) || n.cylinder_type?.toLowerCase().includes(q)) s.add(n.id);
      n.children.forEach(walk);
    };
    walk(tree.root);
    return s;
  }, [search, tree]);

  const errorIds = useMemo(() => new Set(issues.filter((i) => i.level === "error" && i.nodeId).map((i) => i.nodeId!)), [issues]);

  const runValidate = () => {
    const next = validate(tree);
    setIssues(next);
    setValidateOpen(true);
    if (next.filter((i) => i.level === "error").length === 0) toast.success("Validation passed");
    else toast.error(`${next.filter((i) => i.level === "error").length} error(s) found`);
  };

  /* ---------- save ---------- */
  const save = async () => {
    setSaving(true);
    const doors = countDoors(tree.root);
    const { error } = await supabase
      .from("key_systems")
      .update({ name, tree_data: tree as any, door_count: doors, next_differ: tree.next_differ })
      .eq("id", systemId);
    setSaving(false);
    if (error) { toast.error("Failed to save"); return; }
    dirtyRef.current = false;
    toast.success("System saved");
  };

  /* ---------- export to cart ---------- */
  const exportToCart = () => {
    if (!tree.root) { toast.error("Nothing to export"); return; }
    const errs = validate(tree).filter((i) => i.level === "error");
    if (errs.length) { toast.error("Fix validation errors before exporting"); setIssues(validate(tree)); setValidateOpen(true); return; }
    const productByCode = new Map(products.map((p) => [p.code, p]));
    let lines = 0;
    const walk = (n: TNode) => {
      if (n.type === "CYL" && n.cylinder_type) {
        const p = productByCode.get(n.cylinder_type);
        addToCart({
          kind: "cylinder",
          product_code: n.cylinder_type,
          cylinder_type: p?.cylinder_type,
          finish: n.finish ?? p?.finish ?? undefined,
          room_label: n.label,
          differ_ref: `D${String(n.differ ?? 0).padStart(3, "0")}`,
          quantity: 1,
          unit_price: Number(p?.price_gbp ?? 0),
        });
        lines++;
      }
      if (n.type === "CK") {
        addToCart({
          kind: "key",
          key_reference: n.label,
          quantity: n.keys ?? 1,
          unit_price: 12,
        });
        lines++;
      }
      n.children.forEach(walk);
    };
    walk(tree.root);
    toast.success(`Added ${lines} line(s) to cart`);
    navigate("/cart");
  };

  /* ---------- flow data ---------- */
  const { nodes, edges } = useMemo(
    () => buildFlow(tree, { selectedId, errorIds, searchMatch, onAdd: handleAddChild, onDelete: handleDelete }),
    [tree, selectedId, errorIds, searchMatch, handleAddChild, handleDelete],
  );

  const selected = selectedId ? findNode(tree.root, selectedId) : null;
  const selectedParent = selected ? findParent(tree.root, selected.id) : null;
  const trail = selected ? pathOf(tree.root, selected.id) : [];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="border-b bg-card px-6 py-3 flex items-center gap-3">
        <Input
          value={name}
          onChange={(e) => { setName(e.target.value); dirtyRef.current = true; }}
          className="max-w-xs font-semibold"
        />
        {reference && <Badge variant="secondary" className="font-mono">{reference}</Badge>}
        <Badge variant="outline" className="font-mono">{countDoors(tree.root)} door{countDoors(tree.root) !== 1 ? "s" : ""}</Badge>

        <div className="ml-4 relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-56 h-9"
          />
        </div>

        <div className="flex-1" />
        <Button variant="outline" onClick={runValidate}><ShieldCheck className="h-4 w-4" /> Validate</Button>
        <Button variant="outline" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </Button>
        <Button onClick={exportToCart} className="bg-primary hover:bg-primary/90">
          <ShoppingCart className="h-4 w-4" /> Export to order
        </Button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Canvas */}
        <div className="flex-1 relative">
          {!tree.root ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center max-w-sm">
                <div className="inline-flex h-14 w-14 rounded-full bg-accent-light items-center justify-center mb-4">
                  <KeyRound className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Start your hierarchy</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Every master-key system begins with a Grand Master Key. Add one to start branching into sub-masters, change keys and cylinders.
                </p>
                <Button onClick={addRoot} className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4" /> Add Grand Master
                </Button>
              </div>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodeClick={(_, n) => setSelectedId(n.id)}
              onPaneClick={() => setSelectedId(null)}
              fitView
              fitViewOptions={{ padding: 0.2, maxZoom: 1.1 }}
              proOptions={{ hideAttribution: true }}
              nodesDraggable={false}
            >
              <Background gap={20} size={1} color="hsl(var(--border))" />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable nodeColor={(n) => {
                const t = (n.data?.node as TNode | undefined)?.type;
                return t ? TYPE_META[t].color : "#ccc";
              }} />
            </ReactFlow>
          )}
        </div>

        {/* Right detail panel */}
        <aside className="w-[340px] shrink-0 border-l bg-card overflow-auto">
          {!selected ? (
            <div className="p-6 text-sm text-muted-foreground">
              <h3 className="text-base font-semibold text-foreground mb-1">Details</h3>
              <p>Click any node to edit its properties, or hover and tap <kbd className="px-1 rounded bg-muted text-xs">+</kbd> to add a child.</p>
              <div className="mt-6 space-y-2 text-xs">
                <Legend type="GMK" />
                <Legend type="SMK" />
                <Legend type="CK" />
                <Legend type="CYL" />
              </div>
            </div>
          ) : (
            <DetailPanel
              node={selected}
              parent={selectedParent}
              trail={trail}
              products={products}
              onPatch={patchSelected}
              onAddChild={() => handleAddChild(selected.id)}
              onDelete={() => handleDelete(selected.id)}
              canAddChild={childTypeOf(selected.type) !== null}
              isRoot={tree.root?.id === selected.id}
            />
          )}
        </aside>
      </div>

      {/* Validation drawer */}
      <Sheet open={validateOpen} onOpenChange={setValidateOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Validation report</SheetTitle>
            <SheetDescription>
              {issues.filter((i) => i.level === "error").length} error(s), {issues.filter((i) => i.level === "warning").length} warning(s)
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {issues.length === 0 && (
              <div className="text-sm text-success flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> All checks passed.</div>
            )}
            {issues.map((i, idx) => (
              <button
                key={idx}
                onClick={() => i.nodeId && setSelectedId(i.nodeId)}
                className="w-full text-left flex gap-2 p-2.5 rounded-md border hover:bg-muted/50"
              >
                {i.level === "error"
                  ? <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  : <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />}
                <div className="text-sm">{i.message}</div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ------------------------- Detail Panel ------------------------- */

function Legend({ type }: { type: NodeType }) {
  const m = TYPE_META[type];
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
      <span className="font-mono uppercase text-[10px] tracking-wider text-muted-foreground">{type}</span>
      <span>{m.label}</span>
    </div>
  );
}

function DetailPanel({
  node, parent, trail, products, onPatch, onAddChild, onDelete, canAddChild, isRoot,
}: {
  node: TNode;
  parent: TNode | null;
  trail: TNode[];
  products: Product[];
  onPatch: (p: Partial<TNode>) => void;
  onAddChild: () => void;
  onDelete: () => void;
  canAddChild: boolean;
  isRoot: boolean;
}) {
  const meta = TYPE_META[node.type];
  return (
    <div className="p-5">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2 flex-wrap">
        {trail.map((t, i) => (
          <span key={t.id} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            <span className="truncate max-w-[80px]">{t.label}</span>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{meta.label}</span>
      </div>
      <h3 className="text-lg font-semibold mt-1">{node.label || "Unnamed"}</h3>

      <div className="mt-5 space-y-4">
        <div>
          <Label className="text-xs">Label</Label>
          <Input value={node.label} onChange={(e) => onPatch({ label: e.target.value })} />
        </div>

        {node.type === "CK" && (
          <div>
            <Label className="text-xs">Number of keys (copies)</Label>
            <Input
              type="number" min={1} max={50}
              value={node.keys ?? 1}
              onChange={(e) => onPatch({ keys: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>
        )}

        {node.type === "CYL" && (
          <>
            <div>
              <Label className="text-xs">Cylinder product</Label>
              <Select value={node.cylinder_type ?? ""} onValueChange={(v) => onPatch({ cylinder_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select a cylinder…" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.code}>
                      {p.code} — {p.name} · £{Number(p.price_gbp).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Finish</Label>
              <Input value={node.finish ?? ""} onChange={(e) => onPatch({ finish: e.target.value })} placeholder="e.g. Satin chrome" />
            </div>
            {node.differ != null && (
              <div className="text-xs text-muted-foreground">
                Differ ref: <span className="font-mono text-foreground">D{String(node.differ).padStart(3, "0")}</span>
              </div>
            )}
          </>
        )}

        <div className="pt-3 border-t flex flex-col gap-2">
          {canAddChild && (
            <Button variant="outline" onClick={onAddChild}>
              <Plus className="h-4 w-4" /> Add {childTypeOf(node.type)} child
            </Button>
          )}
          {!isRoot && (
            <Button variant="outline" onClick={onDelete} className="text-destructive hover:text-destructive">
              <X className="h-4 w-4" /> Delete node
            </Button>
          )}
        </div>

        {(node.type === "GMK" || node.type === "SMK" || node.type === "CK") && node.children.length > 0 && (
          <div className="pt-3 border-t">
            <div className="text-xs font-medium text-muted-foreground mb-2">Contains</div>
            <ul className="text-sm space-y-1">
              {node.children.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: TYPE_META[c.type].color }} />
                  <span className="truncate">{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
