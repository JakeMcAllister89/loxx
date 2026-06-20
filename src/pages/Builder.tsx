import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  AlertCircle, AlertTriangle, ChevronRight, ChevronDown, KeyRound, Printer, Upload, Info, Maximize2,
  Check, RotateCw, FileText, RefreshCw, ArrowRight,
} from "lucide-react";
import { BuilderCanvas, CanvasProduct } from "@/components/builder/BuilderCanvas";
import { CylinderConfigurator, ProductFull } from "@/components/builder/CylinderConfigurator";
import {
  TNode, TreeData, NodeType,
  emptyTree, createGMK, makeChild, childTypeOf, validChildTypes,
  findNode, findParent, updateNode, addChild, removeNode,
  countDoors, assignNextDiffers, pathOf, validate, ValidationIssue,
  hasLegacyCK, flattenCK,
} from "@/lib/keytree";
import { logAction } from "@/lib/audit";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { stashQuoteDraft, treeToQuoteItems } from "@/lib/quote";

const TYPE_META: Record<NodeType, { label: string; color: string; pill: string }> = {
  GMK: { label: "Grand Master",  color: "hsl(var(--node-gmk))", pill: "bg-[hsl(245_70%_96%)] text-[hsl(var(--node-gmk))] border-[hsl(var(--node-gmk))]/30" },
  MK:  { label: "Master Key",    color: "hsl(var(--node-mk))",  pill: "bg-[hsl(178_70%_94%)] text-[hsl(var(--node-mk))] border-[hsl(var(--node-mk))]/30" },
  SMK: { label: "Sub-master",    color: "hsl(var(--node-smk))", pill: "bg-[hsl(154_60%_95%)] text-[hsl(var(--node-smk))] border-[hsl(var(--node-smk))]/30" },
  CYL: { label: "Cylinder",      color: "hsl(var(--node-cyl))", pill: "bg-[hsl(36_94%_95%)] text-[hsl(var(--node-cyl))] border-[hsl(var(--node-cyl))]/30" },
};

const CHILD_LABEL: Record<NodeType, string> = {
  GMK: "Master Key",
  MK:  "Sub-master",
  SMK: "Cylinder",
  CYL: "",
};

interface Product extends ProductFull {}

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
      <BuilderInner systemId={id} />
    </DashboardLayout>
  );
}

function BuilderInner({ systemId }: { systemId: string }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const imported = searchParams.get("imported") === "1";
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(false);
  const { add: addToCart, replaceBySystem } = useCart();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [exportedAt, setExportedAt] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeData>(emptyTree());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [validateOpen, setValidateOpen] = useState(false);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [legacyCKDetected, setLegacyCKDetected] = useState(false);
  const dirtyRef = useRef(false);
  const savedNameRef = useRef<string>("");
  const fitViewRef = useRef<(() => void) | null>(null);

  // Debounced audit refs
  const labelAuditRef = useRef<{
    nodeId: string;
    original: string;
    nodeType: string;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const cylConfigRef = useRef<{
    nodeId: string;
    originalLabel: string;
  } | null>(null);

  const flushLabelAudit = useCallback(() => {
    const p = labelAuditRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    labelAuditRef.current = null;
    // Read latest label from tree via state setter trick
    setTree((cur) => {
      const n = findNode(cur.root, p.nodeId);
      if (n && n.label !== p.original) {
        logAction({
          system_id: systemId,
          action: "node_renamed",
          node_type: p.nodeType,
          node_label: n.label,
          old_value: p.original,
          new_value: n.label,
        });
      }
      return cur;
    });
  }, [systemId]);

  const productsRef = useRef<Product[]>([]);
  useEffect(() => { productsRef.current = products; }, [products]);

  const flushCylConfig = useCallback(() => {
    const c = cylConfigRef.current;
    if (!c) return;
    cylConfigRef.current = null;
    setTree((cur) => {
      const n = findNode(cur.root, c.nodeId);
      if (n && n.type === "CYL") {
        const prod = productsRef.current.find((p) => p.code === n.cylinder_type);
        const profile = (prod as any)?.cylinder_profile ?? null;
        const size = n.size ?? (prod as any)?.size ?? null;
        const productName = prod?.name ?? null;
        const differRef = `D${String(n.differ ?? 0).padStart(3, "0")}`;
        const specParts = [n.cylinder_type, profile, n.finish, size].filter(Boolean);
        logAction({
          system_id: systemId,
          action: "cylinder_configured",
          node_type: "CYL",
          node_label: n.label,
          new_value: specParts.join(" · "),
          metadata: {
            differ_ref: differRef,
            room_name: n.label,
            product: n.cylinder_type ?? null,
            product_name: productName,
            profile,
            finish: n.finish ?? null,
            size,
            extra_keys: n.extra_keys ?? 0,
            quantity: 1,
          },
        });
      }
      return cur;
    });
  }, [systemId]);

  const productsByCode = useMemo(() => {
    const m = new Map<string, CanvasProduct>();
    products.forEach((p) => m.set(p.code, { code: p.code, name: p.name, image_url: p.image_url }));
    return m;
  }, [products]);

  useEffect(() => {
    setLoading(true);
    setExportedAt(null);
    setLastSavedAt(null);
    labelAuditRef.current && clearTimeout(labelAuditRef.current.timer);
    labelAuditRef.current = null;
    cylConfigRef.current = null;
    supabase.from("key_systems").select("*").eq("id", systemId).single().then(({ data, error }) => {
      if (error || !data) { toast.error("System not found"); navigate("/dashboard"); return; }
      setName(data.name);
      savedNameRef.current = data.name;
      setReference(data.reference);
      const raw = (data.tree_data as unknown as TreeData) ?? emptyTree();
      const loaded = raw?.root !== undefined ? raw : emptyTree();
      setLegacyCKDetected(hasLegacyCK(loaded.root));
      setTree(loaded.root ? assignNextDiffers(loaded) : loaded);
      setLoading(false);
    });
    supabase.from("products").select("id,code,name,cylinder_type,cylinder_profile,pin_count,finish,size,price_gbp,bs_en_1303,description,image_url").eq("is_active", true).order("price_gbp").then(({ data }) => setProducts((data ?? []) as any));
  }, [systemId, navigate]);

  // Flush pending debounced audits when selectedId changes
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevSelectedRef.current;
    if (prev && prev !== selectedId) {
      if (labelAuditRef.current && labelAuditRef.current.nodeId === prev) flushLabelAudit();
      if (cylConfigRef.current && cylConfigRef.current.nodeId === prev) flushCylConfig();
    }
    prevSelectedRef.current = selectedId;
  }, [selectedId, flushLabelAudit, flushCylConfig]);

  const mutate = (updater: (t: TreeData) => TreeData) => {
    setTree((prev) => { const next = updater(prev); dirtyRef.current = true; return next; });
  };
  const addRoot = () => mutate((t) => ({ ...t, root: createGMK() }));

  const handleAddChild = useCallback((parentId: string, childType?: NodeType) => {
    setTree((prev) => {
      const parent = findNode(prev.root, parentId);
      if (!parent) return prev;
      const valid = validChildTypes(parent.type);
      if (valid.length === 0) return prev;
      const desiredType: NodeType = childType && valid.includes(childType) ? childType : valid[0];
      const sameTypeCount = parent.children.filter((c) => c.type === desiredType).length;
      const child = makeChild(parent.type, sameTypeCount, desiredType);
      const root = addChild(prev.root, parentId, child);
      let next: TreeData = { ...prev, root };
      if (child.type === "CYL") next = assignNextDiffers(next);
      dirtyRef.current = true;
      setSelectedId(child.id);
      setCollapsed((c) => { const n = new Set(c); n.delete(parentId); return n; });
      logAction({ system_id: systemId, action: "node_added", node_type: child.type, node_label: child.label });
      if (child.type === "CYL") {
        cylConfigRef.current = { nodeId: child.id, originalLabel: child.label };
      }
      return next;
    });
  }, [systemId]);

  const handleDelete = useCallback((nodeId: string) => {
    setTree((prev) => {
      const target = findNode(prev.root, nodeId);
      if (target) logAction({ system_id: systemId, action: "node_deleted", node_type: target.type, node_label: target.label });
      dirtyRef.current = true;
      return { ...prev, root: removeNode(prev.root, nodeId) };
    });
    if (labelAuditRef.current?.nodeId === nodeId) { clearTimeout(labelAuditRef.current.timer); labelAuditRef.current = null; }
    if (cylConfigRef.current?.nodeId === nodeId) cylConfigRef.current = null;
    setSelectedId((s) => (s === nodeId ? null : s));
  }, [systemId]);

  const patchSelected = (patch: Partial<TNode>) => {
    if (!selectedId) return;
    const inCylConfig = cylConfigRef.current?.nodeId === selectedId;
    setTree((prev) => {
      const before = findNode(prev.root, selectedId);
      const root = updateNode(prev.root, selectedId, patch);
      dirtyRef.current = true;
      if (before) {
        // Label edits: debounce; suppress entirely while configuring a CYL
        if (patch.label !== undefined && patch.label !== before.label && !inCylConfig) {
          const existing = labelAuditRef.current;
          if (existing && existing.nodeId === selectedId) {
            clearTimeout(existing.timer);
            existing.timer = setTimeout(() => flushLabelAudit(), 2000);
          } else {
            if (existing) flushLabelAudit();
            const original = before.label;
            const nodeType = before.type;
            const timer = setTimeout(() => flushLabelAudit(), 2000);
            labelAuditRef.current = { nodeId: selectedId, original, nodeType, timer };
          }
        }
        // Cylinder configuration fields: suppress individual entries while in config session
        if (!inCylConfig) {
          if (patch.cylinder_type !== undefined && patch.cylinder_type !== before.cylinder_type) {
            logAction({ system_id: systemId, action: "cylinder_assigned", node_type: "CYL", node_label: before.label, old_value: before.cylinder_type ?? "", new_value: patch.cylinder_type ?? "" });
          }
          if (patch.finish !== undefined && patch.finish !== before.finish) {
            logAction({ system_id: systemId, action: "cylinder_finish_changed", node_type: "CYL", node_label: before.label, old_value: before.finish ?? "", new_value: patch.finish ?? "" });
          }
        }
        if (patch.keys !== undefined && patch.keys !== before.keys) {
          logAction({ system_id: systemId, action: "keys_count_changed", node_type: before.type, node_label: before.label, old_value: String(before.keys ?? 1), new_value: String(patch.keys) });
        }
      }
      return { ...prev, root };
    });
  };

  const toggleCollapse = (id: string) => setCollapsed((c) => {
    const n = new Set(c); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

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
    const errors = next.filter((i) => i.level === "error").length;
    const warnings = next.filter((i) => i.level === "warning").length;
    logAction({ system_id: systemId, action: "validation_run", metadata: { errors, warnings } });
    if (errors === 0) toast.success("Validation passed");
    else toast.error(`${errors} error(s) found`);
  };

  const saveCore = useCallback(async (opts: { auto: boolean }) => {
    setSaving(true);
    setSaveStatus("saving");
    const doors = countDoors(tree.root);
    const { error } = await supabase.from("key_systems")
      .update({ name, tree_data: tree as any, door_count: doors, next_differ: tree.next_differ })
      .eq("id", systemId);
    setSaving(false);
    if (error) {
      setSaveStatus("error");
      if (!opts.auto) toast.error("Failed to save");
      return;
    }
    if (savedNameRef.current && savedNameRef.current !== name) {
      logAction({ system_id: systemId, action: "system_renamed", old_value: savedNameRef.current, new_value: name });
    }
    savedNameRef.current = name;
    logAction({ system_id: systemId, action: opts.auto ? "system_autosaved" : "system_saved", metadata: { door_count: doors } });
    dirtyRef.current = false;
    setSaveStatus("saved");
    setLastSavedAt(Date.now());
    if (!opts.auto) toast.success("System saved");
  }, [name, tree, systemId]);

  const save = useCallback(() => saveCore({ auto: false }), [saveCore]);

  // Auto-save: debounce 1.5s after any change to tree or name
  const firstAutosaveSkip = useRef(true);
  useEffect(() => {
    if (loading) return;
    if (firstAutosaveSkip.current) { firstAutosaveSkip.current = false; return; }
    setSaveStatus("pending");
    const handle = setTimeout(() => { saveCore({ auto: true }); }, 1500);
    return () => clearTimeout(handle);
  }, [tree, name, loading, saveCore]);

  // Fade "saved" indicator after 2s
  useEffect(() => {
    if (saveStatus !== "saved") return;
    const t = setTimeout(() => setSaveStatus("idle"), 2000);
    return () => clearTimeout(t);
  }, [saveStatus]);

  // Warn on unload if there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveStatus === "pending" || saveStatus === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveStatus]);

  const exportToCart = () => {
    if (!tree.root) { toast.error("Nothing to export"); return; }
    // Flush pending audits so room name / cylinder config is captured before export
    if (labelAuditRef.current) flushLabelAudit();
    if (cylConfigRef.current) flushCylConfig();
    const errs = validate(tree).filter((i) => i.level === "error");
    if (errs.length) { toast.error("Fix validation errors before exporting"); setIssues(validate(tree)); setValidateOpen(true); return; }
    const productByCode = new Map(products.map((p) => [p.code, p]));
    const lines: import("@/contexts/CartContext").CartLine[] = [];
    let total = 0;
    const sys = { system_id: systemId, system_name: name, system_reference: reference };
    const walk = (n: TNode) => {
      if (n.type === "CYL" && n.cylinder_type) {
        const p = productByCode.get(n.cylinder_type);
        const unit = Number(p?.price_gbp ?? 0);
        const qty = n.quantity ?? 1;
        const differRef = `D${String(n.differ ?? 0).padStart(3, "0")}`;
        lines.push({
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
        total += unit * qty;
        const extra = n.extra_keys ?? 0;
        if (extra > 0) {
          lines.push({
            kind: "key",
            key_reference: `Extra keys — ${n.label} (${differRef})`,
            room_label: n.label,
            differ_ref: differRef,
            quantity: extra,
            unit_price: 12,
            ...sys,
          });
          total += 12 * extra;
        }
      }
      n.children.forEach(walk);
    };
    walk(tree.root);
    replaceBySystem(systemId, lines);
    logAction({ system_id: systemId, action: "exported_to_cart", metadata: { line_count: lines.length, total_value: total } });
    setExportedAt(Date.now());
    toast.success(`Basket updated — ${lines.length} item${lines.length !== 1 ? "s" : ""} from ${name}`);
  };


  const selected = selectedId ? findNode(tree.root, selectedId) : null;
  const selectedParent = selected ? findParent(tree.root, selected.id) : null;
  const trail = selected ? pathOf(tree.root, selected.id) : [];

  // Flatten all CYL nodes for print schedule + import progress
  const allCyls = useMemo(() => {
    const out: TNode[] = [];
    const w = (n: TNode | null) => { if (!n) return; if (n.type === "CYL") out.push(n); n.children.forEach(w); };
    w(tree.root);
    return out;
  }, [tree]);
  const confirmedCount = allCyls.filter((c) => !!c.cylinder_type).length;
  const unassignedIds = useMemo(() => new Set(allCyls.filter((c) => !c.cylinder_type).map((c) => c.id)), [allCyls]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="border-b bg-card px-6 py-3 flex items-center gap-3 no-print">
        <Input value={name} onChange={(e) => { setName(e.target.value); dirtyRef.current = true; }} className="max-w-xs font-semibold" />
        {reference && <Badge variant="secondary" className="font-mono">{reference}</Badge>}
        <Badge variant="outline" className="font-mono">{countDoors(tree.root)} door{countDoors(tree.root) !== 1 ? "s" : ""}</Badge>

        <div className="ml-4 relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search nodes…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-56 h-9" />
        </div>

        <div className="flex-1" />
        <Button variant="outline" asChild><Link to="/import"><Upload className="h-4 w-4" /> Import</Link></Button>
        <Button variant="outline" onClick={() => fitViewRef.current?.()}><Maximize2 className="h-4 w-4" /> Fit view</Button>
        <Button variant="outline" onClick={runValidate}><ShieldCheck className="h-4 w-4" /> Validate</Button>
        <SaveStatusIndicator status={saveStatus} onRetry={save} />
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Export PDF</Button>
        <Button variant="outline" onClick={() => {
          if (!tree.root) { toast.error("Nothing to quote"); return; }
          const items = treeToQuoteItems(tree, products as any, { system_id: systemId, system_name: name, system_reference: reference });
          if (items.length === 0) { toast.error("Add at least one configured cylinder before requesting a quote."); return; }
          stashQuoteDraft({ system_id: systemId, system_name: name, system_reference: reference, tree_snapshot: tree, items });
          navigate("/quotes/new");
        }}>
          <FileText className="h-4 w-4" /> Get quote
        </Button>
        {(() => {
          const amber = "bg-[hsl(36_94%_52%)] hover:bg-[hsl(36_94%_46%)] text-white";
          if (exportedAt == null) {
            return (
              <Button onClick={exportToCart} className={amber}>
                <ShoppingCart className="h-4 w-4" /> Add to basket
              </Button>
            );
          }
          const stale = lastSavedAt != null && lastSavedAt > exportedAt;
          if (stale) {
            return (
              <Button onClick={exportToCart} className={amber}>
                <RefreshCw className="h-4 w-4" /> Update basket
              </Button>
            );
          }
          return (
            <Button
              variant="outline"
              onClick={() => navigate("/cart")}
              className="border-[hsl(36_94%_52%)] text-[hsl(36_94%_42%)] hover:bg-[hsl(36_94%_95%)]"
            >
              View basket <ArrowRight className="h-4 w-4" />
            </Button>
          );
        })()}
      </div>

      {/* Import banner */}
      {imported && allCyls.length > 0 && (
        <div className={`border-b px-6 py-3 flex items-center gap-3 no-print ${
          unassignedIds.size === 0 ? "bg-success/10 border-success/30" : "bg-info/10 border-info/30"
        }`}>
          <Info className={`h-4 w-4 ${unassignedIds.size === 0 ? "text-success" : "text-info"}`} />
          <div className="text-sm">
            {unassignedIds.size === 0
              ? <span className="font-medium text-success">All cylinders confirmed — ready to order</span>
              : <>
                  <span className="font-medium">This system was imported from your existing lockchart.</span>{" "}
                  Review each cylinder to confirm the product type and finish before placing an order.
                </>}
            <div className="text-xs text-muted-foreground mt-0.5">
              {confirmedCount} of {allCyls.length} cylinders confirmed
            </div>
          </div>
          <div className="flex-1" />
          {unassignedIds.size > 0 && (
            <Button size="sm" variant="outline" onClick={() => setShowOnlyUnassigned((v) => !v)}>
              {showOnlyUnassigned ? "Show all" : "Review cylinders"}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => { searchParams.delete("imported"); setSearchParams(searchParams); }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Legacy CK migration banner */}
      {legacyCKDetected && (
        <div className="border-b border-warning/40 bg-warning/10 px-6 py-3 flex items-start gap-3 no-print">
          <Info className="h-4 w-4 text-warning mt-0.5" />
          <div className="text-sm flex-1">
            <span className="font-medium">This system was built with an older structure.</span>{" "}
            Door Group nodes are no longer used — your cylinders now sit directly under their Sub Master zones. Your system still works correctly.
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setTree((cur) => {
                const next = { ...cur, root: flattenCK(cur.root) };
                dirtyRef.current = true;
                return next;
              });
              setLegacyCKDetected(false);
              toast.success("Structure flattened — cylinders re-parented to their Sub Masters");
            }}
          >
            Flatten structure
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setLegacyCKDetected(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Print header */}
      <div className="print-only px-2 py-4">
        <div className="text-2xl font-semibold">{name}</div>
        <div className="text-sm text-muted-foreground mt-1">
          {reference && <span className="font-mono">{reference} · </span>}
          {countDoors(tree.root)} doors · Printed {new Date().toLocaleDateString("en-GB")}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Canvas */}
        <div className="flex-1 min-h-[400px] relative bg-muted/30 no-print">
          {!tree.root ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-sm">
                <div className="inline-flex h-14 w-14 rounded-full bg-accent-light items-center justify-center mb-4">
                  <KeyRound className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Start your hierarchy</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Every master-key system begins with a Grand Master Key. Add one to start branching into master keys, sub-masters and cylinders.
                </p>
                <Button onClick={addRoot} className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4" /> Add Grand Master
                </Button>
              </div>
            </div>
          ) : (
            <BuilderCanvas
              tree={tree}
              selectedId={selectedId}
              errorIds={errorIds}
              highlightIds={showOnlyUnassigned ? unassignedIds : undefined}
              productsByCode={productsByCode}
              onSelect={setSelectedId}
              onAddChild={handleAddChild}
              onPaneClick={() => setSelectedId(null)}
              registerFitView={(fn) => { fitViewRef.current = fn; }}
            />
          )}
        </div>

        {/* Print-only hierarchy + schedule */}
        <div className="print-only px-6">
          <div className="text-sm text-muted-foreground">See cylinder schedule below.</div>
        </div>

        {/* Print cylinder schedule */}
        {allCyls.length > 0 && (
          <div className="print-only mt-8 px-6">
            <h2 className="text-lg font-semibold mb-2">Cylinder schedule</h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 px-2">Differ</th>
                  <th className="text-left py-1 px-2">Room / Door</th>
                  <th className="text-left py-1 px-2">Type</th>
                  <th className="text-left py-1 px-2">Finish</th>
                  <th className="text-left py-1 px-2">Qty</th>
                </tr>
              </thead>
              <tbody>
                {allCyls.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="py-1 px-2 font-mono">D{String(c.differ ?? 0).padStart(3, "0")}</td>
                    <td className="py-1 px-2">{c.label}</td>
                    <td className="py-1 px-2 font-mono">{c.cylinder_type ?? "—"}</td>
                    <td className="py-1 px-2">{c.finish ?? "—"}</td>
                    <td className="py-1 px-2 font-mono">{c.quantity ?? 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}


        {/* Right detail panel */}
        <aside className="w-full md:w-[360px] md:shrink-0 border-t md:border-t-0 md:border-l bg-card overflow-auto no-print max-h-[60vh] md:max-h-none">
          {!selected ? (
            <div className="p-6 text-sm text-muted-foreground">
              <h3 className="text-base font-semibold text-foreground mb-1">Details</h3>
              <p>Click any row to edit its properties, or hover and tap <kbd className="px-1 rounded bg-muted text-xs">+</kbd> to add a child.</p>
              <div className="mt-6 space-y-2 text-xs">
                <Legend type="GMK" /><Legend type="MK" /><Legend type="SMK" /><Legend type="CYL" />
              </div>
              <div className="mt-8 pt-5 border-t">
                <h4 className="text-sm font-semibold text-foreground mb-1">Activity</h4>
                <p className="text-[11px] text-muted-foreground mb-3">Last 20 actions on this system.</p>
                <ActivityTimeline systemId={systemId} showClear />
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
              onClose={() => setSelectedId(null)}
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
              <button key={idx} onClick={() => i.nodeId && setSelectedId(i.nodeId)} className="w-full text-left flex gap-2 p-2.5 rounded-md border hover:bg-muted/50">
                {i.level === "error" ? <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />}
                <div className="text-sm">{i.message}</div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ------------------------- Tree Row ------------------------- */

function TreeRow({
  node, depth, selectedId, collapsed, errorIds, searchMatch, highlightIds,
  onSelect, onToggle, onAdd, onDelete, isRoot,
}: {
  node: TNode; depth: number;
  selectedId: string | null;
  collapsed: Set<string>;
  errorIds: Set<string>;
  searchMatch: Set<string>;
  highlightIds?: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onAdd: (id: string) => void;
  onDelete: (id: string) => void;
  isRoot?: boolean;
}) {
  const meta = TYPE_META[node.type];
  const isCollapsed = collapsed.has(node.id);
  const isSelected = selectedId === node.id;
  const hasError = errorIds.has(node.id);
  const isMatch = searchMatch.has(node.id);
  const isHighlighted = highlightIds?.has(node.id) ?? false;
  const hasChildren = node.children.length > 0;
  const canAdd = childTypeOf(node.type) !== null;

  return (
    <div>
      <div
        onClick={() => onSelect(node.id)}
        className={`group row flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors ${
          isHighlighted ? "bg-primary/15 ring-1 ring-primary/40" :
          isSelected ? "bg-accent-light" : isMatch ? "bg-warning/10" : "hover:bg-muted/40"
        } ${hasError ? "ring-1 ring-destructive/40" : ""}`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {/* indent guide */}
        {depth > 0 && (
          <div className="absolute -ml-3 h-full border-l border-border" aria-hidden />
        )}

        {/* chevron */}
        <button
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(node.id); }}
          className={`h-5 w-5 flex items-center justify-center rounded hover:bg-muted ${!hasChildren ? "invisible" : ""}`}
          aria-label="toggle"
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {/* coloured dot */}
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: meta.color }} />

        {/* label */}
        <span className="text-sm font-medium truncate">
          {node.label || <span className="text-muted-foreground italic">Unnamed</span>}
        </span>

        {/* differ for CYL */}
        {node.type === "CYL" && node.differ != null && (
          <span className="text-[11px] font-mono text-muted-foreground">· D{String(node.differ).padStart(3, "0")}</span>
        )}
        {node.type === "CYL" && !node.cylinder_type && (
          <span className="text-[11px] text-destructive">· no product</span>
        )}
        {(node.type === "MK" || node.type === "SMK") && node.keys != null && (
          <span className="text-[11px] font-mono text-muted-foreground">· {node.keys} key{node.keys !== 1 ? "s" : ""}</span>
        )}

        <div className="flex-1" />

        {/* type pill */}
        <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.pill}`}>
          {node.type}
        </span>

        {hasError && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}

        {/* hover actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-print">
          {canAdd && (
            <button onClick={(e) => { e.stopPropagation(); onAdd(node.id); }}
              className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90" title="Add child">
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          {!isRoot && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
              className="h-6 w-6 rounded bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90" title="Delete">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && hasChildren && (
        <div>
          {node.children.map((c) => (
            <TreeRow key={c.id} node={c} depth={depth + 1}
              selectedId={selectedId} collapsed={collapsed} errorIds={errorIds} searchMatch={searchMatch}
              highlightIds={highlightIds}
              onSelect={onSelect} onToggle={onToggle} onAdd={onAdd} onDelete={onDelete} />
          ))}
        </div>
      )}
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
  node, parent, trail, products, onPatch, onAddChild, onDelete, canAddChild, isRoot, onClose,
}: {
  node: TNode; parent: TNode | null; trail: TNode[]; products: Product[];
  onPatch: (p: Partial<TNode>) => void;
  onAddChild: () => void; onDelete: () => void;
  canAddChild: boolean; isRoot: boolean;
  onClose: () => void;
}) {
  const meta = TYPE_META[node.type];
  const isCyl = node.type === "CYL";

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
        {isCyl && node.differ != null && (
          <Badge className="ml-auto font-mono bg-[hsl(36_94%_95%)] text-[hsl(var(--node-cyl))] border border-[hsl(var(--node-cyl))]/30">
            D{String(node.differ).padStart(3, "0")}
          </Badge>
        )}
        <button
          onClick={onClose}
          className={`${isCyl && node.differ != null ? "" : "ml-auto"} h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors`}
          aria-label="Close panel"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <h3 className="text-lg font-semibold mt-1">{node.label || "Unnamed"}</h3>


      <div className="mt-5 space-y-4">
        <div>
          <Label className="text-xs">{isCyl ? "Room / door name" : "Label"}</Label>
          <Input
            value={node.label}
            onChange={(e) => onPatch({ label: e.target.value })}
            placeholder={isCyl ? "e.g. Director's Office" : ""}
            className={isCyl ? "text-base font-medium" : ""}
          />
        </div>

        {(node.type === "GMK" || node.type === "SMK") && (
          <div>
            <Label className="text-xs">Keys issued</Label>
            <Input
              type="number" min={1} max={50}
              value={node.keys ?? (node.type === "GMK" ? 3 : 2)}
              onChange={(e) => onPatch({ keys: Math.max(1, Number(e.target.value) || 1) })}
            />
            <p className="text-[11px] text-muted-foreground mt-1">How many copies of this master key are required</p>
          </div>
        )}


        {isCyl && (
          <CylinderConfigurator node={node} products={products} onPatch={onPatch} />
        )}


        <div className="pt-3 border-t flex flex-col gap-2">
          {canAddChild && (
            <Button variant="outline" onClick={onAddChild}>
              <Plus className="h-4 w-4" /> Add {CHILD_LABEL[node.type]}
            </Button>
          )}
          <Button onClick={onClose} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full">
            <Check className="h-4 w-4" /> Done
          </Button>
          {!isRoot && (
            <Button variant="outline" onClick={onDelete} className="text-destructive hover:text-destructive">
              <X className="h-4 w-4" /> Delete node
            </Button>
          )}
        </div>


        {(node.type === "GMK" || node.type === "MK" || node.type === "SMK") && node.children.length > 0 && (
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

/* ------------------------- Save Status Indicator ------------------------- */

function SaveStatusIndicator({
  status,
  onRetry,
}: {
  status: "idle" | "pending" | "saving" | "saved" | "error";
  onRetry: () => void;
}) {
  if (status === "pending") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-2" title="Unsaved changes">
        <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
        Unsaved changes
      </div>
    );
  }
  if (status === "saving") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </div>
    );
  }
  if (status === "saved") {
    return (
      <div className="flex items-center gap-2 text-xs text-success px-2 transition-opacity">
        <Check className="h-3.5 w-3.5" />
        Saved
      </div>
    );
  }
  if (status === "error") {
    return (
      <button
        onClick={onRetry}
        className="flex items-center gap-2 text-xs text-destructive px-2 hover:underline"
        title="Retry save"
      >
        <AlertCircle className="h-3.5 w-3.5" />
        Save failed — retry
        <RotateCw className="h-3.5 w-3.5" />
      </button>
    );
  }
  return <div className="w-[88px]" aria-hidden />;
}
