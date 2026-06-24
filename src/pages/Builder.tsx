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
  Check, RotateCw, FileText, RefreshCw, ArrowRight, Lock, Replace, ShieldAlert, History, BookOpen,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { BuilderCanvas, CanvasProduct } from "@/components/builder/BuilderCanvas";
import { CylinderConfigurator, ProductFull } from "@/components/builder/CylinderConfigurator";
import {
  TNode, TreeData, NodeType, KeyEntry,
  emptyTree, createGMK, makeChild, childTypeOf, validChildTypes, newId,
  findNode, findParent, updateNode, addChild, removeNode, insertSiblingAfter,
  countDoors, assignNextDiffers, pathOf, validate, ValidationIssue,
  hasLegacyCK, flattenCK, normaliseKeys, countKeys,
  filterDecommissioned, parentsWithDecommissionedChildren,
} from "@/lib/keytree";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { logAction } from "@/lib/audit";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { stashQuoteDraft, treeToQuoteItems } from "@/lib/quote";
import { useAuth, useIsAdmin } from "@/lib/auth";
import { createSystem } from "@/lib/createSystem";

const TYPE_META: Record<NodeType, { label: string; color: string; pill: string; description: string }> = {
  GMK: { label: "Grand Master Key", color: "hsl(var(--node-gmk))", pill: "bg-[hsl(245_70%_96%)] text-[hsl(var(--node-gmk))] border-[hsl(var(--node-gmk))]/30", description: "The master key that opens every door in the building — held by senior management." },
  MK:  { label: "Master Key",       color: "hsl(var(--node-mk))",  pill: "bg-[hsl(178_70%_94%)] text-[hsl(var(--node-mk))] border-[hsl(var(--node-mk))]/30",   description: "Opens all doors in one building or section — one per area or wing." },
  SMK: { label: "Sub Master Key",   color: "hsl(var(--node-smk))", pill: "bg-[hsl(154_60%_95%)] text-[hsl(var(--node-smk))] border-[hsl(var(--node-smk))]/30", description: "Opens all doors in one floor or zone — e.g. Ground Floor, IT Department." },
  CYL: { label: "Cylinder",         color: "hsl(var(--node-cyl))", pill: "bg-[hsl(36_94%_95%)] text-[hsl(var(--node-cyl))] border-[hsl(var(--node-cyl))]/30",  description: "The physical lock cylinder on a single door. Its differ key opens only this door — but Sub-Master, Master, and Grand Master keys above it can also open this lock." },
};

const KEY_TYPE_LABEL: Record<string, string> = {
  GMK: "Grand Master Key",
  MK:  "Master Key",
  SMK: "Sub Master Key",
};

const CHILD_LABEL: Record<NodeType, string> = {
  GMK: "Master Key",
  MK:  "Sub Master Key",
  SMK: "Cylinder",
  CYL: "",
};


interface Product extends ProductFull {}

/** Human-friendly label for audit entries: "Main Building (MK-A)" or just "MK-A". */
function auditLabel(n: TNode): string {
  if ((n.type === "MK" || n.type === "SMK") && n.location?.trim()) {
    return `${n.location.trim()} (${n.label})`;
  }
  return n.label;
}

export default function Builder() {
  const { id } = useParams();
  if (!id) {
    return (
      <DashboardLayout>
        <BuilderEmptyState />
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout>
      <BuilderInner systemId={id} />
    </DashboardLayout>
  );
}

function BuilderEmptyState() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const onNew = async () => {
    if (creating) return;
    if (!user) { toast.error("Please sign in"); return; }
    setCreating(true);
    try {
      const newId = await createSystem(user.id);
      if (newId) {
        navigate(`/builder/${newId}`);
      } else {
        toast.error("Failed to create system — please try again");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to create system — please try again");
    } finally {
      setCreating(false);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-20 max-w-xl mx-auto">
      <KeyRound className="h-12 w-12 text-amber-500" strokeWidth={2.2} />
      <h2 className="text-2xl font-semibold mt-5">Build your master key system</h2>
      <p className="text-sm text-muted-foreground mt-2">Start from scratch or import your existing lockchart</p>
      <div className="flex gap-3 mt-6">
        <Button size="lg" onClick={onNew} disabled={creating || !user} className="bg-amber-500 hover:bg-amber-600 text-white">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} New system
        </Button>
        <Button size="lg" variant="outline" onClick={() => navigate("/import")}>
          <Upload className="h-4 w-4" /> Import existing
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-4">Or select a system from the sidebar</p>
    </div>
  );
}


function BuilderInner({ systemId }: { systemId: string }) {
  const { orgRole } = useAuth();
  const isAdmin = useIsAdmin();
  const readOnly = orgRole === "view_only";
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const imported = searchParams.get("imported") === "1";
  const reorderInitial = searchParams.get("reorder") === "1";
  const [reorderBanner, setReorderBanner] = useState(reorderInitial);

  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(false);
  const { add: addToCart, replaceBySystem } = useCart();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [exportedAt, setExportedAt] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [commissionPct, setCommissionPct] = useState<number | "">("");
  const [partners, setPartners] = useState<{ id: string; name: string; company: string; partner_type: string; default_commission_pct: number }[]>([]);
  const [tree, setTree] = useState<TreeData>(emptyTree());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [validateOpen, setValidateOpen] = useState(false);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [legacyCKDetected, setLegacyCKDetected] = useState(false);
  const [isFulfilled, setIsFulfilled] = useState(false);
  // Replace-cylinder modal state: target node id + current step + draft note
  const [replaceState, setReplaceState] = useState<
    | { open: false }
    | { open: true; nodeId: string; step: "reason" | "lost_warning" | "note"; reason?: "lost_key" | "faulty"; note: string }
  >({ open: false });
  // Additional-keys modal state
  const [addKeysState, setAddKeysState] = useState<
    | { open: false }
    | { open: true; nodeId: string; step: "why" | "lost_warning" | "order"; quantity: number; authorised: boolean }
  >({ open: false });
  // Global toggle to reveal all decommissioned nodes
  const [showAllDecomm, setShowAllDecomm] = useState(false);
  // Per-SMK reveal of decommissioned children
  const [revealedDecomm, setRevealedDecomm] = useState<Set<string>>(new Set());
  // Beginner guide drawer
  const [guideOpen, setGuideOpen] = useState(false);
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
  const locationAuditRef = useRef<{
    nodeId: string;
    original: string;
    nodeType: string;
    nodeLabel: string;
    timer: ReturnType<typeof setTimeout>;
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

  const flushLocationAudit = useCallback(() => {
    const p = locationAuditRef.current;
    if (!p) return;
    clearTimeout(p.timer);
    locationAuditRef.current = null;
    setTree((cur) => {
      const n = findNode(cur.root, p.nodeId);
      const newLoc = n?.location ?? "";
      if (n && newLoc !== p.original) {
        logAction({
          system_id: systemId,
          action: "node_renamed",
          node_type: p.nodeType,
          node_label: p.nodeLabel,
          old_value: p.original,
          new_value: newLoc,
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
        const productName = (prod as any)?.product_description ?? prod?.name ?? null;
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
    products.forEach((p) => m.set(p.code, { code: p.code, name: (p as any).product_description ?? p.name, image_url: p.image_url }));
    return m;
  }, [products]);

  useEffect(() => {
    setLoading(true);
    setExportedAt(null);
    setLastSavedAt(null);
    labelAuditRef.current && clearTimeout(labelAuditRef.current.timer);
    labelAuditRef.current = null;
    locationAuditRef.current && clearTimeout(locationAuditRef.current.timer);
    locationAuditRef.current = null;
    cylConfigRef.current = null;
    supabase.from("key_systems").select("*").eq("id", systemId).single().then(({ data, error }) => {
      if (error || !data) { toast.error("System not found"); navigate("/dashboard"); return; }
      setName(data.name);
      savedNameRef.current = data.name;
      setReference(data.reference);
      setPartnerId((data as any).partner_id ?? null);
      setCommissionPct((data as any).commission_pct ?? "");
      const raw = (data.tree_data as unknown as TreeData) ?? emptyTree();
      const loaded = raw?.root !== undefined ? raw : emptyTree();
      setLegacyCKDetected(hasLegacyCK(loaded.root));
      setTree(loaded.root ? assignNextDiffers(loaded) : loaded);
      setLoading(false);
    });
    supabase.from("products").select("id,code,name,product_description,cylinder_type,cylinder_profile,pin_count,finish,size,price_gbp,bs_en_1303,description,image_url").eq("is_active", true).order("price_gbp").then(({ data }) => setProducts((data ?? []) as any));
    // Determine if this system has been supplied/delivered — enables the "Replace cylinder" action.
    supabase.from("orders").select("status").eq("system_id", systemId).then(({ data }) => {
      const fulfilledStatuses = new Set(["delivered", "fulfilled", "shipped", "complete", "completed"]);
      setIsFulfilled((data ?? []).some((o: any) => fulfilledStatuses.has(String(o.status).toLowerCase())));
    });
    supabase.from("partners").select("id, name, company, partner_type, default_commission_pct").eq("is_active", true).order("name")
      .then(({ data }) => setPartners((data as any) ?? []));
  }, [systemId, navigate]);

  // Flush pending debounced audits when selectedId changes
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevSelectedRef.current;
    if (prev && prev !== selectedId) {
      if (labelAuditRef.current && labelAuditRef.current.nodeId === prev) flushLabelAudit();
      if (locationAuditRef.current && locationAuditRef.current.nodeId === prev) flushLocationAudit();
      if (cylConfigRef.current && cylConfigRef.current.nodeId === prev) flushCylConfig();
    }
    prevSelectedRef.current = selectedId;
  }, [selectedId, flushLabelAudit, flushLocationAudit, flushCylConfig]);

  const mutate = (updater: (t: TreeData) => TreeData) => {
    setTree((prev) => { const next = updater(prev); dirtyRef.current = true; return next; });
  };
  const addRoot = () => mutate((t) => ({ ...t, root: createGMK(), next_differ: 1 }));

  const handleAddChild = useCallback((parentId: string, childType?: NodeType) => {
    setTree((prev) => {
      const parent = findNode(prev.root, parentId);
      if (!parent) return prev;
      const valid = validChildTypes(parent.type);
      if (valid.length === 0) return prev;
      const desiredType: NodeType = childType && valid.includes(childType) ? childType : valid[0];
      const sameTypeCount = parent.children.filter((c) => c.type === desiredType).length;
      const child = makeChild(parent.type, sameTypeCount, desiredType, parent.label);
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
      if (target) logAction({ system_id: systemId, action: "node_deleted", node_type: target.type, node_label: auditLabel(target) });
      dirtyRef.current = true;
      return assignNextDiffers({ ...prev, root: removeNode(prev.root, nodeId) });
    });
    if (labelAuditRef.current?.nodeId === nodeId) { clearTimeout(labelAuditRef.current.timer); labelAuditRef.current = null; }
    if (locationAuditRef.current?.nodeId === nodeId) { clearTimeout(locationAuditRef.current.timer); locationAuditRef.current = null; }
    if (cylConfigRef.current?.nodeId === nodeId) cylConfigRef.current = null;
    setSelectedId((s) => (s === nodeId ? null : s));
  }, [systemId]);

  /** Open the "Replace cylinder" flow for a CYL node. */
  const openReplaceFlow = useCallback((nodeId: string) => {
    setReplaceState({ open: true, nodeId, step: "reason", note: "" });
  }, []);

  /**
   * Commit a replacement.
   *  - reason="lost_key": clone original as new sibling, mark original decommissioned, new differ.
   *  - reason="faulty":   in-place — keep same differ, room name, all properties. No decommission, no REPLACED badge.
   */
  const commitReplacement = useCallback((targetId: string, reason: "lost_key" | "faulty", note: string) => {
    setTree((prev) => {
      const original = findNode(prev.root, targetId);
      const parent = findParent(prev.root, targetId);
      if (!original || !parent || original.type !== "CYL") return prev;

      if (reason === "faulty") {
        // In-place — no structural change. Log only.
        dirtyRef.current = true;
        logAction({
          system_id: systemId,
          action: "cylinder_replaced",
          node_type: "CYL",
          node_label: original.label,
          metadata: {
            reason,
            old_differ: original.differ,
            new_differ: original.differ,
            note: note || undefined,
          },
        });
        return prev;
      }

      // lost_key: clone as new sibling, decommission original
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
        is_common_entrance: original.is_common_entrance,
        children: [],
      };
      const decommissionedRoot = updateNode(prev.root, targetId, {
        decommissioned_at: new Date().toISOString(),
        decommissioned_reason: reason,
        replaced_by_node_id: newNodeId,
      });
      const withSibling = insertSiblingAfter(decommissionedRoot, targetId, replacement);
      const next = assignNextDiffers({ ...prev, root: withSibling });
      const newDiffer = findNode(next.root, newNodeId)?.differ;
      const finalRoot = updateNode(next.root, targetId, { replaced_by_differ: newDiffer });
      dirtyRef.current = true;
      logAction({
        system_id: systemId,
        action: "cylinder_replaced",
        node_type: "CYL",
        node_label: original.label,
        metadata: {
          reason,
          old_differ: original.differ,
          new_differ: newDiffer,
          note: note || undefined,
        },
      });
      setSelectedId(newNodeId);
      return { ...next, root: finalRoot };
    });
    setReplaceState({ open: false });
    toast.success(reason === "faulty"
      ? "Faulty replacement logged — same differ retained"
      : "Cylinder replaced — review specs in the right panel");
  }, [systemId]);

  /** "Order replacement key only" — bump extra_keys by 1 on the original, no new differ. */
  const orderReplacementKey = useCallback((targetId: string) => {
    setTree((prev) => {
      const original = findNode(prev.root, targetId);
      if (!original || original.type !== "CYL") return prev;
      const root = updateNode(prev.root, targetId, { extra_keys: (original.extra_keys ?? 0) + 1 });
      dirtyRef.current = true;
      logAction({
        system_id: systemId,
        action: "replacement_key_ordered",
        node_type: "CYL",
        node_label: original.label,
        metadata: { differ: original.differ },
      });
      return { ...prev, root };
    });
    setReplaceState({ open: false });
    toast.success("Replacement key added — export to basket when ready");
  }, [systemId]);

  /** Open the "Order additional keys" flow for any GMK/MK/SMK/CYL node. */
  const openAddKeysFlow = useCallback((nodeId: string) => {
    setAddKeysState({ open: true, nodeId, step: "why", quantity: 1, authorised: false });
  }, []);

  /** Commit additional-keys order: push a key line to the basket and log. */
  const commitAdditionalKeys = useCallback((targetId: string, quantity: number) => {
    const n = findNode(tree.root, targetId);
    if (!n) return;
    const sys = { system_id: systemId, system_name: name, system_reference: reference };
    const ref = n.type === "CYL"
      ? `D${String(n.differ ?? 0).padStart(3, "0")}`
      : n.label;
    const roomLabel = (n.type === "MK" || n.type === "SMK") ? (n.location || n.label) : n.label;
    addToCart({
      kind: "key",
      key_reference: n.type === "CYL" ? `Additional keys — ${n.label} (${ref})` : ref,
      node_type: n.type,
      key_type_label: KEY_TYPE_LABEL[n.type as string],
      room_label: roomLabel,
      differ_ref: n.type === "CYL" ? ref : undefined,
      is_extra_key: true,
      quantity,
      unit_price: 12,
      ...sys,
    });
    logAction({
      system_id: systemId,
      action: "additional_keys_ordered",
      node_type: n.type,
      node_label: n.label,
      metadata: { quantity, key_reference: ref },
    });
    setAddKeysState({ open: false });
    toast.success(`${quantity} × ${ref} added to basket`);
  }, [tree, systemId, name, reference, addToCart]);




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
        if (patch.keys !== undefined) {
          const oldTotal = countKeys(before);
          const newEntries = typeof patch.keys === "number"
            ? [{ ref: before.label, qty: patch.keys }]
            : (patch.keys ?? []);
          const newTotal = newEntries.reduce((s, k) => s + k.qty, 0);
          if (oldTotal !== newTotal) {
            logAction({ system_id: systemId, action: "keys_count_changed", node_type: before.type, node_label: auditLabel(before), old_value: String(oldTotal), new_value: String(newTotal) });
          }
        }
        if (patch.location !== undefined && patch.location !== before.location && (before.type === "MK" || before.type === "SMK")) {
          const existing = locationAuditRef.current;
          if (existing && existing.nodeId === selectedId) {
            clearTimeout(existing.timer);
            existing.timer = setTimeout(() => flushLocationAudit(), 2000);
          } else {
            if (existing) flushLocationAudit();
            const original = before.location ?? "";
            const nodeType = before.type;
            const nodeLabel = before.label;
            const timer = setTimeout(() => flushLocationAudit(), 2000);
            locationAuditRef.current = { nodeId: selectedId, original, nodeType, nodeLabel, timer };
          }
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
    if (locationAuditRef.current) flushLocationAudit();
    if (cylConfigRef.current) flushCylConfig();
    const errs = validate(tree).filter((i) => i.level === "error");
    if (errs.length) { toast.error("Fix validation errors before exporting"); setIssues(validate(tree)); setValidateOpen(true); return; }
    const productByCode = new Map(products.map((p) => [p.code, p]));
    const lines: import("@/contexts/CartContext").CartLine[] = [];
    let total = 0;
    const sys = { system_id: systemId, system_name: name, system_reference: reference };
    const walk = (n: TNode, ancestors: TNode[]) => {
      // Collect MK/SMK ancestor refs for hierarchy display
      const hierarchy_refs = ancestors.filter(a => a.type === "MK" || a.type === "SMK").map(a => a.label);
      if (n.type === "GMK" || n.type === "MK" || n.type === "SMK") {
        normaliseKeys(n).forEach((k) => {
          if (k.qty > 0) {
            lines.push({
              kind: "key",
              key_reference: k.ref,
              node_type: n.type,
              key_type_label: KEY_TYPE_LABEL[n.type],
              location: (n.type === "MK" || n.type === "SMK") ? (n.location ?? undefined) : undefined,
              room_label: n.location || n.label,
              hierarchy_refs: [...hierarchy_refs.filter(r => r !== n.label), n.label],
              quantity: k.qty,
              unit_price: 12,
              ...sys,
            });
            total += 12 * k.qty;
          }
        });
      }
      if (n.type === "CYL" && n.cylinder_type) {
        const p = productByCode.get(n.cylinder_type);
        const unit = Number(p?.price_gbp ?? 0);
        const qty = n.quantity ?? 1;
        const differRef = `D${String(n.differ ?? 0).padStart(3, "0")}`;
        lines.push({
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
          hierarchy_refs,
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
            is_extra_key: true,
            hierarchy_refs,
            quantity: extra,
            unit_price: 12,
            ...sys,
          });
          total += 12 * extra;
        }
      }
      n.children.forEach((c) => walk(c, [...ancestors, n]));
    };
    walk(tree.root, []);

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

  // Build filtered view-tree for the canvas: hide decommissioned by default
  const decommParents = useMemo(() => parentsWithDecommissionedChildren(tree.root), [tree]);
  const hasAnyDecomm = decommParents.size > 0;
  const viewTree: TreeData = useMemo(() => ({
    ...tree,
    root: filterDecommissioned(tree.root, { showAll: showAllDecomm, revealParentIds: revealedDecomm }),
  }), [tree, showAllDecomm, revealedDecomm]);

  const toggleRevealParent = useCallback((id: string) => {
    setRevealedDecomm((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const getExtraAddActions = useCallback((n: TNode) => {
    if (readOnly) return [];
    if (!isFulfilled) return [];
    return [{
      id: "order-additional-keys",
      label: "Order additional keys",
      onClick: () => openAddKeysFlow(n.id),
    }];
  }, [isFulfilled, openAddKeysFlow, readOnly]);

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
        <Button variant="outline" onClick={() => setGuideOpen(v => !v)} className="gap-1.5">
          <BookOpen className="h-4 w-4" />
          Guide
        </Button>
        {hasAnyDecomm && (
          <Button
            variant={showAllDecomm ? "default" : "outline"}
            onClick={() => setShowAllDecomm((v) => !v)}
            title="Toggle visibility of decommissioned (replaced) cylinders across the whole tree"
          >
            <History className="h-4 w-4" /> {showAllDecomm ? "Hide replaced" : "Show replaced cylinders"}
          </Button>
        )}
        <SaveStatusIndicator status={saveStatus} onRetry={save} />
        <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Export PDF</Button>
        {!readOnly && (
          <Button variant="outline" onClick={() => {
            if (!tree.root) { toast.error("Nothing to quote"); return; }
            const items = treeToQuoteItems(tree, products as any, { system_id: systemId, system_name: name, system_reference: reference });
            if (items.length === 0) { toast.error("Add at least one configured cylinder before requesting a quote."); return; }
            stashQuoteDraft({ system_id: systemId, system_name: name, system_reference: reference, tree_snapshot: tree, items });
            navigate("/quotes/new");
          }}>
            <FileText className="h-4 w-4" /> Get quote
          </Button>
        )}
        {!readOnly && (() => {
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

      {readOnly && (
        <div className="border-b border-amber-300 bg-amber-50 px-6 py-2.5 flex items-center gap-2 no-print">
          <Lock className="h-4 w-4 text-amber-700" />
          <span className="text-sm text-amber-900">You have view-only access to this system.</span>
        </div>
      )}


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

      {/* Re-order banner */}
      {reorderBanner && (
        <div className="border-b bg-blue-50 border-blue-200 px-6 py-3 flex items-center gap-3 no-print">
          <Info className="h-4 w-4 text-blue-600" />
          <div className="text-sm flex-1 text-blue-900">
            This system was loaded from a previous order. Review specifications and quantities before placing a new order.
          </div>
          <Button size="sm" variant="ghost" onClick={() => { setReorderBanner(false); searchParams.delete("reorder"); setSearchParams(searchParams); }}>
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
        {/* Guide drawer (left) */}
        {guideOpen && <GuidePanel onClose={() => setGuideOpen(false)} />}
        {/* Canvas */}
        <div className="flex-1 min-h-[400px] relative bg-muted/30 no-print">
          {!tree.root ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-sm">
                <div className="inline-flex h-14 w-14 rounded-full bg-accent-light items-center justify-center mb-4">
                  <KeyRound className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Start your hierarchy</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Think of this like drawing a family tree for your keys.
                </p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Start with your Grand Master Key — the one key that opens everything — then add sections, floors, and individual doors beneath it.
                </p>
                <Button onClick={addRoot} className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4" /> Start building →
                </Button>
                <div>
                  <button
                    onClick={() => setGuideOpen(true)}
                    className="mt-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    Not sure? Read the guide first
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <BuilderCanvas
              tree={viewTree}
              selectedId={selectedId}
              errorIds={errorIds}
              highlightIds={showOnlyUnassigned ? unassignedIds : undefined}
              productsByCode={productsByCode}
              onSelect={setSelectedId}
              onAddChild={handleAddChild}
              onPaneClick={() => setSelectedId(null)}
              registerFitView={(fn) => { fitViewRef.current = fn; }}
              parentsWithDecomm={decommParents}
              revealedDecomm={revealedDecomm}
              onToggleReveal={toggleRevealParent}
              getExtraAddActions={getExtraAddActions}
              readOnly={readOnly}
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
              {isAdmin && (
              <div className="mt-8 pt-5 border-t">
                <h4 className="text-sm font-semibold text-foreground mb-2">Partner attribution</h4>
                <div className="space-y-2">
                  <select
                    value={partnerId ?? ""}
                    onChange={async (e) => {
                      const newId = e.target.value || null;
                      setPartnerId(newId);
                      const p = partners.find((x) => x.id === newId);
                      const newPct = p ? Number(p.default_commission_pct) : null;
                      setCommissionPct(newPct ?? "");
                      await supabase.from("key_systems").update({ partner_id: newId, commission_pct: newPct }).eq("id", systemId);
                    }}
                    className="w-full text-xs border rounded-md px-2 py-2 bg-background"
                  >
                    <option value="">— No partner —</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.company} ({p.partner_type})
                      </option>
                    ))}
                  </select>
                  {partnerId && (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-muted-foreground flex-1">Commission %</label>
                        <input
                          type="number" step="0.01" min="0" max="100"
                          value={commissionPct}
                          onChange={(e) => setCommissionPct(e.target.value === "" ? "" : Number(e.target.value))}
                          onBlur={async () => {
                            const val = commissionPct === "" ? null : Number(commissionPct);
                            await supabase.from("key_systems").update({ commission_pct: val }).eq("id", systemId);
                          }}
                          className="w-20 text-xs font-mono border rounded-md px-2 py-1 bg-background"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">This rate is locked per order at checkout.</p>
                    </>
                  )}
                </div>
              </div>
              )}
              {!readOnly && (
                <div className="mt-8 pt-5 border-t">
                  <h4 className="text-sm font-semibold text-foreground mb-1">Activity</h4>
                  <p className="text-[11px] text-muted-foreground mb-3">Last 20 actions on this system.</p>
                  <ActivityTimeline systemId={systemId} showClear />
                </div>
              )}
            </div>
          ) : (
            <DetailPanel
              node={selected}
              parent={selectedParent}
              trail={trail}
              products={products}
              onPatch={patchSelected}
              addOptions={readOnly ? [] : validChildTypes(selected.type)}
              onAddChildType={(t) => handleAddChild(selected.id, t)}
              onDelete={() => handleDelete(selected.id)}
              isRoot={tree.root?.id === selected.id}
              onClose={() => setSelectedId(null)}
              isFulfilled={isFulfilled}
              onReplace={() => openReplaceFlow(selected.id)}
              readOnly={readOnly}
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

      {/* Replace cylinder modal — reason → (lost warning →) note → commit */}
      <AlertDialog
        open={replaceState.open}
        onOpenChange={(o) => { if (!o) setReplaceState({ open: false }); }}
      >
        <AlertDialogContent>
          {replaceState.open && replaceState.step === "reason" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Why are you replacing this cylinder?</AlertDialogTitle>
                <AlertDialogDescription>
                  Choose the reason so we can recommend the right course of action.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-2 my-2">
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={() => setReplaceState((s) => s.open ? { ...s, step: "lost_warning" } : s)}
                >
                  <KeyRound className="h-4 w-4 mr-2 shrink-0" />
                  <span className="text-left">A key has been lost or not returned</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={() => setReplaceState((s) => s.open ? { ...s, step: "note", reason: "faulty" } : s)}
                >
                  <AlertTriangle className="h-4 w-4 mr-2 shrink-0" />
                  <span className="text-left">The cylinder is faulty or damaged</span>
                </Button>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          )}
          {replaceState.open && replaceState.step === "lost_warning" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive" /> Security risk
                </AlertDialogTitle>
                <AlertDialogDescription>
                  The security of this door may be compromised. We strongly recommend replacing the cylinder under a new differ to prevent unauthorised access with the lost key.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-2 my-2">
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => setReplaceState((s) => s.open ? { ...s, step: "note", reason: "lost_key" } : s)}
                >
                  <Replace className="h-4 w-4 mr-2" /> Replace with new differ (recommended)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => replaceState.open && orderReplacementKey(replaceState.nodeId)}
                >
                  <KeyRound className="h-4 w-4 mr-2" /> Order replacement key only (I understand the risk)
                </Button>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          )}
          {replaceState.open && replaceState.step === "note" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Add a note (optional)</AlertDialogTitle>
                <AlertDialogDescription>
                  Captured against this replacement event for the audit trail.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Textarea
                value={replaceState.note}
                onChange={(e) =>
                  setReplaceState((s) => s.open ? { ...s, note: e.target.value } : s)
                }
                placeholder="e.g. Key lost by John Smith, reported 23 Jun 2026"
                rows={3}
                className="my-2"
              />
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => replaceState.open && replaceState.reason && commitReplacement(replaceState.nodeId, replaceState.reason, replaceState.note)}
                >
                  Confirm replacement
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Additional keys modal */}
      <AlertDialog
        open={addKeysState.open}
        onOpenChange={(o) => { if (!o) setAddKeysState({ open: false }); }}
      >
        <AlertDialogContent>
          {addKeysState.open && (() => {
            const node = findNode(tree.root, addKeysState.nodeId);
            const ref = node?.type === "CYL"
              ? `D${String(node.differ ?? 0).padStart(3, "0")}`
              : node?.label ?? "";
            const isHighLevel = node?.type === "GMK" || node?.type === "MK";
            if (addKeysState.step === "why") {
              return (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Why do you need additional keys?</AlertDialogTitle>
                    <AlertDialogDescription>
                      For {KEY_TYPE_LABEL[node?.type as string] ?? "this node"} — {ref}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex flex-col gap-2 my-2">
                    <Button
                      variant="outline"
                      className="justify-start h-auto py-3"
                      onClick={() => setAddKeysState((s) => s.open ? { ...s, step: "order" } : s)}
                    >
                      <Plus className="h-4 w-4 mr-2 shrink-0" />
                      <span className="text-left">I need more copies</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start h-auto py-3"
                      onClick={() => setAddKeysState((s) => s.open ? { ...s, step: "lost_warning" } : s)}
                    >
                      <ShieldAlert className="h-4 w-4 mr-2 shrink-0" />
                      <span className="text-left">A key has been lost or not returned</span>
                    </Button>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                  </AlertDialogFooter>
                </>
              );
            }
            if (addKeysState.step === "lost_warning") {
              return (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-destructive" /> Security risk
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      A lost key means unauthorised access to all areas this key opens.{" "}
                      {isHighLevel && <strong>This is a {node?.type} key — it opens multiple zones, so the risk is elevated.</strong>}{" "}
                      We strongly recommend replacing the affected cylinder(s) under a new differ rather than ordering a replacement key.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex flex-col gap-2 my-2">
                    {node?.type === "CYL" && (
                      <Button
                        className="bg-primary hover:bg-primary/90"
                        onClick={() => {
                          const id = addKeysState.nodeId;
                          setAddKeysState({ open: false });
                          openReplaceFlow(id);
                        }}
                      >
                        <Replace className="h-4 w-4 mr-2" /> Replace cylinder(s) with new differ (recommended)
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setAddKeysState((s) => s.open ? { ...s, step: "order" } : s)}
                    >
                      <KeyRound className="h-4 w-4 mr-2" /> Order replacement key only (I understand the risk)
                    </Button>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                  </AlertDialogFooter>
                </>
              );
            }
            // step === "order"
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>Order additional keys — {ref}</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ordering additional keys increases the number of people with access to this area. Please ensure this request has been authorised by the appropriate person responsible for site security.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 my-2">
                  <div className="flex items-center gap-3">
                    <Label className="text-sm w-24">Quantity</Label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAddKeysState((s) => s.open ? { ...s, quantity: Math.max(1, s.quantity - 1) } : s)}
                        className="h-8 w-8 rounded border hover:bg-muted"
                      >−</button>
                      <span className="font-mono w-8 text-center">{addKeysState.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setAddKeysState((s) => s.open ? { ...s, quantity: s.quantity + 1 } : s)}
                        className="h-8 w-8 rounded border hover:bg-muted"
                      >+</button>
                    </div>
                  </div>
                  <label className="flex items-start gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={addKeysState.authorised}
                      onCheckedChange={(v) =>
                        setAddKeysState((s) => s.open ? { ...s, authorised: !!v } : s)
                      }
                    />
                    <span>I confirm this key order has been authorised</span>
                  </label>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button
                    disabled={!addKeysState.authorised}
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => commitAdditionalKeys(addKeysState.nodeId, addKeysState.quantity)}
                  >
                    Add to basket
                  </Button>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>
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
          isSelected ? "bg-primary/15 ring-1 ring-primary/40" : isMatch ? "bg-warning/10" : "hover:bg-muted/40"
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
        {(node.type === "MK" || node.type === "SMK") && node.keys != null && (() => {
          const total = countKeys(node);
          return (
            <span className="text-[11px] font-mono text-muted-foreground">· {total} key{total !== 1 ? "s" : ""}</span>
          );
        })()}

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

const LEGEND_DESC: Record<NodeType, string> = {
  GMK: "opens all",
  MK:  "opens one building",
  SMK: "opens a zone",
  CYL: "physical hardware",
};

function Legend({ type }: { type: NodeType }) {
  const m = TYPE_META[type];
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
      <span className="font-mono uppercase text-[10px] tracking-wider text-muted-foreground">{type}</span>
      <span>{m.label}</span>
      <span className="text-muted-foreground">— {LEGEND_DESC[type]}</span>
    </div>
  );
}


function DetailPanel({
  node, parent, trail, products, onPatch, addOptions, onAddChildType, onDelete, isRoot, onClose,
  isFulfilled, onReplace, readOnly = false,
}: {
  node: TNode; parent: TNode | null; trail: TNode[]; products: Product[];
  onPatch: (p: Partial<TNode>) => void;
  addOptions: NodeType[];
  onAddChildType: (t: NodeType) => void;
  onDelete: () => void;
  isRoot: boolean;
  onClose: () => void;
  isFulfilled: boolean;
  onReplace: () => void;
  readOnly?: boolean;
}) {
  const meta = TYPE_META[node.type];
  const isCyl = node.type === "CYL";
  const isMk = node.type === "MK";
  const isSmk = node.type === "SMK";
  const isMkOrSmk = isMk || isSmk;

  const displayName = (isMkOrSmk && node.location?.trim()) ? node.location.trim() : node.label;

  const nameFieldLabel = isCyl
    ? "Room / door name"
    : isMk
      ? "Building / location name"
      : isSmk
        ? "Zone / area name"
        : "Label";
  const namePlaceholder = isCyl
    ? "e.g. Director's Office"
    : isMk
      ? "e.g. Main Building"
      : isSmk
        ? "e.g. Ground Floor"
        : "";

  const MK_SUGGESTIONS  = ["Main Building", "North Campus", "Tower Block", "Annexe", "Warehouse"];
  const SMK_SUGGESTIONS = ["Ground Floor", "First Floor", "Reception", "Offices", "Plant Room", "Car Park", "Server Room"];
  const suggestions = isMk ? MK_SUGGESTIONS : isSmk ? SMK_SUGGESTIONS : [];

  const addButtonLabel = (t: NodeType) =>
    t === "MK"  ? "+ Add a section (Master Key)"
  : t === "SMK" ? "+ Add a zone (Sub-Master)"
  : t === "CYL" ? "+ Add a door (Cylinder)"
  : "+ Add child";

  const NEXT_STEP: Record<NodeType, string> = {
    GMK: "Add a Master Key for each building or major section of your site.",
    MK:  "Add Sub-Masters for each floor or zone — or add Cylinders directly for simpler sites.",
    SMK: "Add a Cylinder for each door this zone covers.",
    CYL: "Give this door a name and choose a cylinder type from the options below.",
  };
  const showNextStepHint = isCyl ? !node.cylinder_type : node.children.length === 0;

  // Build the access trail for CYL nodes (chain of keys that can open this door).
  // trail includes the selected node itself, so slice it to ancestors only.
  const ancestors = trail.slice(0, Math.max(0, trail.length - 1));
  const accessTrail = isCyl
    ? [
        ...ancestors.map((t) => ({
          node: t,
          label: (t.type === "MK" || t.type === "SMK") && t.location?.trim() ? t.location.trim() : t.label,
        })),
        { node, label: node.label || "This door" },
      ]
    : [];

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2 flex-wrap">
        {trail.map((t, i) => {
          const label = ((t.type === "MK" || t.type === "SMK") && t.location?.trim()) ? t.location.trim() : t.label;
          return (
            <span key={t.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <span className="truncate max-w-[80px]">{label}</span>
            </span>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
        <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{meta.label}</span>
        {isMkOrSmk && node.location?.trim() && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(36_94%_95%)] text-[hsl(var(--node-cyl))] border border-[hsl(var(--node-cyl))]/30">
            {node.label}
          </span>
        )}
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
      <h3 className="text-lg font-semibold mt-1 truncate" title={displayName}>{displayName || "Unnamed"}</h3>
      <p className="text-[11px] text-muted-foreground mt-1">{meta.description}</p>




      <div className="mt-5 space-y-4">
        {isMkOrSmk ? (
          <>
            <div>
              <Label className="text-xs flex items-center gap-1.5">
                Key reference
                <Lock className="h-3 w-3 text-muted-foreground" />
              </Label>
              <div
                className="mt-1 px-2.5 py-1.5 rounded-md bg-muted/40 font-mono text-sm text-[hsl(var(--node-cyl))] select-all"
                title="Auto-assigned reference code — cannot be edited"
              >
                {node.label}
              </div>
            </div>
            <div>
              <Label className="text-xs">{nameFieldLabel}</Label>
              <Input
                value={node.location ?? ""}
                onChange={(e) => onPatch({ location: e.target.value })}
                placeholder={namePlaceholder}
                disabled={readOnly}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Optional — helps identify this zone in large systems
              </p>
              {suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onPatch({ location: s })}
                      className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div>
            <Label className="text-xs">{nameFieldLabel}</Label>
            <Input
              value={node.label}
              onChange={(e) => onPatch({ label: e.target.value })}
              placeholder={namePlaceholder}
              className={isCyl ? "text-base font-medium" : ""}
              disabled={readOnly}
            />
          </div>
        )}

        {(node.type === "GMK" || node.type === "MK" || node.type === "SMK") && (
          <KeyManager node={node} onPatch={onPatch} />
        )}


        {isCyl && (
          <CylinderConfigurator node={node} products={products} onPatch={onPatch} />
        )}


        {isCyl && accessTrail.length > 0 && (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs font-semibold mb-1">🔑 Who can open this door?</div>
            <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
              Keys higher up the tree automatically have access to all doors below them.
            </p>
            <div className="space-y-1">
              {accessTrail.map((entry, i) => {
                const isThisDoor = i === accessTrail.length - 1;
                const dot = ({
                  GMK: "hsl(var(--node-gmk))",
                  MK:  "hsl(var(--node-mk))",
                  SMK: "hsl(var(--node-smk))",
                  CYL: "hsl(var(--node-cyl))",
                } as Record<NodeType, string>)[entry.node.type];
                const suffix = ({
                  GMK: "— every door in the system",
                  MK:  "— all doors in this section",
                  SMK: "— all doors in this zone",
                  CYL: "— this door only",
                } as Record<NodeType, string>)[entry.node.type];
                const keyLabel = entry.node.type === "GMK" ? "Grand Master key"
                  : entry.node.type === "MK" ? "Master key"
                  : entry.node.type === "SMK" ? "Sub-Master key"
                  : isThisDoor ? `Differ key (D${String(node.differ ?? 0).padStart(3, "0")})` : "Differ key";
                return (
                  <div key={entry.node.id} className="flex items-start gap-2 text-[11px]">
                    <div className="flex flex-col items-center pt-1">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: dot }} />
                      {i < accessTrail.length - 1 && <span className="w-px flex-1 bg-border mt-1" style={{ minHeight: 12 }} />}
                    </div>
                    <div className="flex-1 leading-relaxed">
                      <span className="font-medium text-foreground">{entry.label}</span>
                      <span className="text-muted-foreground"> ({keyLabel})</span>
                      <span className="text-muted-foreground"> {suffix}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
              The differ key only opens this one door. Every key above it in the tree can also open this lock — plus all other doors in their group.
            </p>
          </div>
        )}

        {showNextStepHint && !readOnly && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-2.5 flex items-start gap-2">
            <span className="text-base leading-none">💡</span>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              <span className="font-semibold">Next step:</span> {NEXT_STEP[node.type]}
            </p>
          </div>
        )}

        <div className="pt-3 border-t flex flex-col gap-2">
          {!readOnly && addOptions.map((t, idx) => (
            <Button
              key={t}
              variant={idx === 0 ? "default" : "outline"}
              onClick={() => onAddChildType(t)}
              className={idx === 0 ? "bg-primary hover:bg-primary/90" : ""}
            >
              <Plus className="h-4 w-4" /> {addButtonLabel(t)}
            </Button>
          ))}
          <Button onClick={onClose} variant="outline" className="w-full">
            <Check className="h-4 w-4" /> Done
          </Button>
          {!readOnly && isCyl && !node.decommissioned_at && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={isFulfilled ? "" : "cursor-not-allowed"}>
                    <Button
                      variant="outline"
                      onClick={isFulfilled ? onReplace : undefined}
                      disabled={!isFulfilled}
                      className="w-full text-muted-foreground hover:text-foreground"
                    >
                      <Replace className="h-4 w-4" /> Replace cylinder
                    </Button>
                  </span>
                </TooltipTrigger>
                {!isFulfilled && (
                  <TooltipContent>Available once your system has been supplied.</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
          {!readOnly && !isRoot && (
            <Button variant="outline" onClick={onDelete} className="text-destructive hover:text-destructive">
              <X className="h-4 w-4" /> Remove from system
            </Button>
          )}
        </div>




        {(node.type === "GMK" || node.type === "MK" || node.type === "SMK") && node.children.length > 0 && (
          <div className="pt-3 border-t">
            <div className="text-xs font-medium text-muted-foreground mb-2">Contains</div>
            <ul className="text-sm space-y-1">
              {node.children.map((c) => {
                const isMkOrSmkChild = c.type === "MK" || c.type === "SMK";
                const main = isMkOrSmkChild && c.location?.trim() ? c.location.trim() : c.label;
                const showRef = isMkOrSmkChild && !!c.location?.trim();
                return (
                  <li key={c.id} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: TYPE_META[c.type].color }} />
                    <span className="truncate">{main}</span>
                    {showRef && <span className="text-[11px] text-[hsl(var(--node-cyl))] font-mono">· {c.label}</span>}
                  </li>
                );
              })}
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

/* ------------------------- Key Manager ------------------------- */

function KeyManager({ node, onPatch }: { node: TNode; onPatch: (p: Partial<TNode>) => void }) {
  const entries = normaliseKeys(node);
  const update = (next: KeyEntry[]) => onPatch({ keys: next });

  const updateRef = (i: number, ref: string) =>
    update(entries.map((e, idx) => (idx === i ? { ...e, ref } : e)));

  const updateQty = (i: number, delta: number) =>
    update(entries.map((e, idx) => (idx === i ? { ...e, qty: Math.max(0, e.qty + delta) } : e)));

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">Keys</span>
      </div>
      <div className="flex flex-col gap-2">
        {entries.map((entry, i) => (
          <div key={i}>
            <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
              <KeyRound className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <input
                className="flex-1 min-w-0 text-xs font-mono bg-transparent border-none outline-none text-amber-700 font-medium"
                value={entry.ref}
                onChange={(e) => updateRef(i, e.target.value)}
                placeholder="Key reference"
              />
              <button
                type="button"
                onClick={() => updateQty(i, -1)}
                className="w-6 h-6 rounded border text-xs flex items-center justify-center hover:bg-muted"
                aria-label="Decrease"
              >−</button>
              <span className={`text-xs font-mono w-5 text-center ${entry.qty === 0 ? "text-muted-foreground" : ""}`}>{entry.qty}</span>
              <button
                type="button"
                onClick={() => updateQty(i, 1)}
                className="w-6 h-6 rounded border text-xs flex items-center justify-center hover:bg-muted"
                aria-label="Increase"
              >+</button>
            </div>
            {entry.qty === 0 && (
              <p className="text-[11px] text-amber-700/70 mt-1 pl-1">
                0 keys — none will be ordered
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------- Beginner Guide Panel ------------------------- */

function GuidePanel({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      step: "1",
      color: "hsl(var(--node-gmk))",
      title: "Grand Master Key",
      desc: "The top-level key. One key that can open every single door in the system. Usually held by the building manager or security team.",
      tip: "You only ever have one Grand Master Key per system.",
    },
    {
      step: "2",
      color: "hsl(var(--node-mk))",
      title: "Master Keys",
      desc: "Add one Master Key per building, wing, or major section. A Master Key opens all the doors within its section.",
      tip: "Example: 'Main Building', 'Annexe', 'Warehouse'",
    },
    {
      step: "3",
      color: "hsl(var(--node-smk))",
      title: "Sub-Master Keys",
      desc: "Add one Sub-Master per floor or department within a section. Useful for large buildings with many areas.",
      tip: "Example: 'Ground Floor', 'IT Department', 'Reception'",
    },
    {
      step: "4",
      color: "hsl(var(--node-cyl))",
      title: "Cylinders (Doors)",
      desc: "Each cylinder represents one physical door lock. Add a cylinder for every door that needs to be part of the system.",
      tip: "Example: 'Server Room', 'Director's Office', 'Room 14'",
    },
  ];

  return (
    <aside className="w-72 shrink-0 border-r bg-card p-5 overflow-auto no-print">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">How to build your system</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close guide"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
        A master key system is like a family tree of keys. The key at the top opens everything.
        Keys further down open fewer doors. Cylinders are the actual locks on the doors.
      </p>

      <div className="space-y-4">
        {steps.map(({ step, color, title, desc, tip }) => (
          <div key={step} className="flex items-start gap-3">
            <div
              className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0"
              style={{ background: color }}
            >
              {step}
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold">{title}</div>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
              <p className="text-[11px] italic text-muted-foreground mt-1">{tip}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-md border border-amber-300 bg-amber-50 p-3">
        <p className="text-[11px] text-amber-900 leading-relaxed">
          Not sure where to start? Click the orange + button below any node on the canvas to add the next level down.
        </p>
      </div>
    </aside>
  );
}
