import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Check, RotateCw, FileText, RefreshCw, ArrowRight, Lock, Replace, ShieldAlert, History, BookOpen, Undo2, Copy,
  ChevronsDownUp, ChevronsUpDown,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { BuilderCanvas, CanvasProduct } from "@/components/builder/BuilderCanvas";
import { CylinderConfigurator, ProductFull } from "@/components/builder/CylinderConfigurator";
import {
  TNode, TreeData, NodeType, KeyEntry,
  emptyTree, createGMK, makeChild, childTypeOf, validChildTypes, newId,
  findNode, findParent, updateNode, addChild, removeNode, insertSiblingAfter,
  countDoors, assignNextDiffers, assignNextZRefs, pathOf, validate, ValidationIssue,
  hasLegacyCK, flattenCK, normaliseKeys, countKeys,
  filterDecommissioned, parentsWithDecommissionedChildren,
  collectCENodes, nextSubZRef, nextTopLevelZRef, mapTree,
} from "@/lib/keytree";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { logAction } from "@/lib/audit";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { stashQuoteDraft, treeToQuoteItems } from "@/lib/quote";
import { useAuth, useIsAdmin } from "@/lib/auth";
import { createSystem } from "@/lib/createSystem";
import { useOrgProductPrices } from "@/hooks/useOrgProductPrices";

const TYPE_META: Record<NodeType, { label: string; color: string; pill: string; description: string }> = {
  GMK: { label: "Grand Master Key", color: "hsl(var(--node-gmk))", pill: "bg-[hsl(245_70%_96%)] text-[hsl(var(--node-gmk))] border-[hsl(var(--node-gmk))]/30", description: "The master key that opens every door in the building — held by senior management." },
  MK:  { label: "Master Key",       color: "hsl(var(--node-mk))",  pill: "bg-[hsl(178_70%_94%)] text-[hsl(var(--node-mk))] border-[hsl(var(--node-mk))]/30",   description: "Opens all doors in one building or section — one per area or wing." },
  SMK: { label: "Sub Master Key",   color: "hsl(var(--node-smk))", pill: "bg-[hsl(154_60%_95%)] text-[hsl(var(--node-smk))] border-[hsl(var(--node-smk))]/30", description: "Opens all doors in one floor or zone — e.g. Ground Floor, IT Department." },
  CYL: { label: "Cylinder",         color: "hsl(var(--node-cyl))", pill: "bg-[hsl(36_94%_95%)] text-[hsl(var(--node-cyl))] border-[hsl(var(--node-cyl))]/30",  description: "The physical lock cylinder on a single door. Its differ key opens only this door — but Sub-Master, Master, and Grand Master keys above it can also open this lock." },
  CE:  { label: "Common Entrance",  color: "hsl(var(--node-ce))",  pill: "bg-[hsl(199_85%_94%)] text-[hsl(var(--node-ce))] border-[hsl(var(--node-ce))]/30",   description: "A shared entrance opened by every differ key in the group below it — no individual differ key is issued for it." },
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
  CE:  "",
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
      <DashboardLayout noScroll>
        <BuilderEmptyState />
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout noScroll>
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
      <p className="text-sm text-muted-foreground mt-2">Start building your master key system from scratch.</p>
      <div className="flex gap-3 mt-6">
        <Button size="lg" onClick={onNew} disabled={creating || !user} className="bg-amber-500 hover:bg-amber-600 text-white">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} New system
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
  const { priceFor: orgPriceFor } = useOrgProductPrices();
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
  const [printProjectName, setPrintProjectName] = React.useState<string>(() => {
    const v = localStorage.getItem("loxx_print_project_name") ?? "";
    if (v) localStorage.removeItem("loxx_print_project_name");
    return v;
  });
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
  const isFulfilledRef = useRef(false);
  const [issueCounts, setIssueCounts] = useState<Map<string, { issued: number; lost: number }>>(new Map());
  const loadIssueCounts = useCallback(async () => {
    if (readOnly) return;
    const { data } = await supabase
      .from("key_issues")
      .select("node_id,status,quantity")
      .eq("system_id", systemId)
      .in("status", ["issued", "lost"]);
    const m = new Map<string, { issued: number; lost: number }>();
    (data ?? []).forEach((r: any) => {
      const cur = m.get(r.node_id) ?? { issued: 0, lost: 0 };
      const qty = r.quantity ?? 1;
      if (r.status === "issued") cur.issued += qty;
      else if (r.status === "lost") cur.lost += qty;
      m.set(r.node_id, cur);
    });
    setIssueCounts(m);
  }, [systemId, readOnly]);
  useEffect(() => { loadIssueCounts(); }, [loadIssueCounts]);
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
  const [copySpecState, setCopySpecState] = useState<{
    open: boolean;
    sourceId: string;
    newLabel: string;
    step: "differ-choice" | "name";
    keyedAlike: boolean;
  }>({ open: false, sourceId: "", newLabel: "", step: "differ-choice", keyedAlike: false });
  const [ceModalState, setCeModalState] = useState<
    | { open: false }
    | { open: true; parentId: string; existingCEs: { id: string; label: string; z_ref: string }[]; defaultGroupZRef?: string }
  >({ open: false });
  // Beginner guide drawer
  const [guideOpen, setGuideOpen] = useState(false);
  const dirtyRef = useRef(false);
  const savedNameRef = useRef<string>("");
  const fitViewRef = useRef<(() => void) | null>(null);
  const panToNodeRef = useRef<((id: string) => void) | null>(null);

  const newNodeIdsRef = useRef<Set<string>>(new Set());

  // Undo history
  const undoStack = useRef<TreeData[]>([]);
  const MAX_UNDO = 20;
  const [canUndo, setCanUndo] = useState(false);
  const pushUndo = useCallback((snapshot: TreeData) => {
    undoStack.current = [snapshot, ...undoStack.current].slice(0, MAX_UNDO);
    setCanUndo(true);
  }, []);
  const handleUndo = useCallback(() => {
    const prev = undoStack.current[0];
    if (!prev) return;
    undoStack.current = undoStack.current.slice(1);
    setCanUndo(undoStack.current.length > 0);
    setTree(prev);
    setSelectedId(null);
    dirtyRef.current = true;
    toast.info("Undone");
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo]);

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
    products.forEach((p) => m.set(p.code, {
      code: p.code,
      name: (p as any).product_description ?? p.name,
      image_url: p.image_url,
      finish_colour: (p as any).finish_colour ?? null,
      finish: (p as any).finish ?? null,
      size: (p as any).size ?? null,
      price_gbp: (p as any).price_gbp ?? null,
      effective_price: orgPriceFor(p.code, (p as any).price_gbp ?? null),
    }));
    return m;
  }, [products, orgPriceFor]);

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
      isFulfilledRef.current = !!(data as any).is_fulfilled;
      setIsFulfilled(!!(data as any).is_fulfilled);
      setPartnerId((data as any).partner_id ?? null);
      setCommissionPct((data as any).commission_pct ?? "");
      const raw = (data.tree_data as unknown as TreeData) ?? emptyTree();
      const loaded = raw?.root !== undefined ? raw : emptyTree();
      setLegacyCKDetected(hasLegacyCK(loaded.root));
      setTree(loaded.root ? assignNextDiffers(loaded) : loaded);
      setLoading(false);
    });
    supabase.from("products").select("id,code,name,product_description,cylinder_type,cylinder_profile,pin_count,finish,finish_colour,size,price_gbp,bs_en_1303,description,image_url").eq("is_active", true).order("price_gbp").then(({ data }) => setProducts((data ?? []) as any));
    supabase.from("partners").select("id, name, company, partner_type, default_commission_pct").eq("is_active", true).order("name")
      .then(({ data }) => setPartners((data as any) ?? []));
  }, [systemId, navigate]);

  // Auto-collapse to SMK level for large systems on initial load
  useEffect(() => {
    if (!tree.root) return;
    let cylCount = 0;
    const count = (n: TNode) => { if (n.type === "CYL") cylCount++; n.children.forEach(count); };
    count(tree.root);
    if (cylCount > 30) {
      const toCollapse = new Set<string>();
      const walk = (n: TNode) => {
        if (n.type === "SMK") { toCollapse.add(n.id); return; }
        n.children.forEach(walk);
      };
      walk(tree.root);
      setCollapsed(toCollapse);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree.root?.id]);


  // Flush pending debounced audits when selectedId changes
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevSelectedRef.current;
    if (prev && prev !== selectedId) {
      if (labelAuditRef.current && labelAuditRef.current.nodeId === prev) flushLabelAudit();
      if (locationAuditRef.current && locationAuditRef.current.nodeId === prev) flushLocationAudit();
      if (cylConfigRef.current && cylConfigRef.current.nodeId === prev) flushCylConfig();
    }
    // Start a config session when switching to a CYL node
    if (selectedId) {
      const node = findNode(tree.root, selectedId);
      if (node && node.type === "CYL" && (!cylConfigRef.current || cylConfigRef.current.nodeId !== selectedId)) {
        cylConfigRef.current = { nodeId: selectedId, originalLabel: node.label };
      }
    }
    prevSelectedRef.current = selectedId;
  }, [selectedId, flushLabelAudit, flushLocationAudit, flushCylConfig, tree.root]);

  const mutate = (updater: (t: TreeData) => TreeData) => {
    setTree((prev) => { const next = updater(prev); dirtyRef.current = true; return next; });
  };
  const addRoot = () => { pushUndo(tree); mutate((t) => ({ ...t, root: createGMK(), next_differ: 1 })); };

  const handleAddChild = useCallback((parentId: string, childType?: NodeType) => {
    if (childType === "CE") {
      const existingCEs = collectCENodes(tree.root)
        .filter((n) => n.z_ref && !n.z_ref.includes("."))
        .map((n) => ({ id: n.id, label: n.label, z_ref: n.z_ref! }));
      if (existingCEs.length > 0) {
        setCeModalState({ open: true, parentId, existingCEs });
        return;
      }
    }
    setTree((prev) => {
      pushUndo(prev);
      const parent = findNode(prev.root, parentId);
      if (!parent) return prev;
      const valid = validChildTypes(parent.type);
      if (valid.length === 0) return prev;
      const desiredType: NodeType = childType && valid.includes(childType) ? childType : valid[0];
      const sameTypeCount = parent.children.filter((c) => c.type === desiredType).length;
      const child = makeChild(parent.type, sameTypeCount, desiredType, parent.label);

      const newChild = isFulfilledRef.current ? { ...child, is_new: true } : child;
      const root = addChild(prev.root, parentId, newChild);
      let next: TreeData = { ...prev, root };
      if (child.type === "CYL") next = assignNextDiffers(next);
      if (child.type === "CE") next = { ...next, root: assignNextZRefs(next.root) };
      dirtyRef.current = true;
      setSelectedId(child.id);
      setCollapsed((c) => { const n = new Set(c); n.delete(parentId); return n; });
      logAction({ system_id: systemId, action: "node_added", node_type: child.type, node_label: child.label });
      if (child.type === "CYL" || child.type === "CE") {
        cylConfigRef.current = { nodeId: child.id, originalLabel: child.label };
      }
      return next;
    });
  }, [systemId, tree.root, isFulfilled]);

  const handleCEModalConfirm = useCallback((
    parentId: string,
    choice: "new" | "existing",
    groupZRef?: string,
  ) => {
    setCeModalState({ open: false });
    setTree((prev) => {
      pushUndo(prev);
      const allZRefs = collectCENodes(prev.root).map((n) => n.z_ref).filter(Boolean) as string[];
      if (choice === "existing" && groupZRef) {
        // Add sub-CE as a child of the group CE node (e.g. Z1), not the GMK
        const groupCENode = collectCENodes(prev.root).find(n => n.z_ref === groupZRef);
        if (!groupCENode) return prev;
        const z_ref = nextSubZRef(groupZRef, allZRefs);
        const child: TNode = { id: newId(), type: "CE", label: "Common Entrance", children: [], z_ref };
        const root = addChild(prev.root, groupCENode.id, child);
        dirtyRef.current = true;
        setSelectedId(child.id);
        setCollapsed((c) => { const n = new Set(c); n.delete(groupCENode.id); return n; });
        logAction({ system_id: systemId, action: "node_added", node_type: "CE", node_label: child.label });
        cylConfigRef.current = { nodeId: child.id, originalLabel: child.label };
        return { ...prev, root };
      } else {
        // New building — must attach to GMK/MK ancestor, not a CE node.
        // Walk up from parentId until we find a non-CE node (GMK or MK).
        let attachId = parentId;
        let attachNode = findNode(prev.root, attachId);
        while (attachNode && attachNode.type === "CE") {
          const p = findParent(prev.root, attachId);
          if (!p) break;
          attachId = p.id;
          attachNode = p;
        }
        if (!attachNode) return prev;
        const z_ref = nextTopLevelZRef(allZRefs);
        const child: TNode = { id: newId(), type: "CE", label: "Common Entrance", children: [], z_ref };
        const root = addChild(prev.root, attachId, child);
        dirtyRef.current = true;
        setSelectedId(child.id);
        setCollapsed((c) => { const n = new Set(c); n.delete(attachId); return n; });
        logAction({ system_id: systemId, action: "node_added", node_type: "CE", node_label: child.label });
        cylConfigRef.current = { nodeId: child.id, originalLabel: child.label };
        return { ...prev, root };
      }
    });
  }, [systemId]);

  const handleDelete = useCallback((nodeId: string) => {
    setTree((prev) => {
      pushUndo(prev);
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

  const handleCopySpec = useCallback((sourceId: string, newLabel: string, keyedAlike: boolean) => {
    setTree((prev) => {
      pushUndo(prev);
      const source = findNode(prev.root, sourceId);
      if (!source || source.type !== "CYL") return prev;
      const parent = findParent(prev.root, sourceId);
      if (!parent) return prev;
      const siblingCount = parent.children.length;
      const assignedDiffer = keyedAlike ? source.differ : prev.next_differ;
      const newNode: TNode = {
        id: newId(),
        type: "CYL",
        label: newLabel.trim() || `Door ${siblingCount + 1}`,
        differ: assignedDiffer,
        ...(keyedAlike ? { keyed_alike_source_differ: source.differ } : {}),
        cylinder_type: source.cylinder_type,
        finish: source.finish,
        size: source.size,
        quantity: source.quantity ?? 1,
        extra_keys: source.extra_keys ?? 0,
        
        children: [],
      };
      const finalNewNode = isFulfilledRef.current ? { ...newNode, is_new: true } : newNode;
      const newRoot = addChild(prev.root, parent.id, finalNewNode);
      dirtyRef.current = true;
      return assignNextDiffers({ ...prev, root: newRoot });
    });
    setCopySpecState({ open: false, sourceId: "", newLabel: "", step: "differ-choice", keyedAlike: false });
    setSelectedId(null);
  }, [pushUndo]);

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
        // In-place — no structural change, but a replacement cylinder still needs to be ordered.
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
        if (isFulfilledRef.current) {
          const markedRoot = updateNode(prev.root, targetId, { is_new: true });
          return { ...prev, root: markedRoot };
        }
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
        ...(isFulfilledRef.current ? { is_new: true } : {}),
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
    if (n.type === "CYL") {
      // Persist on the node so it reflects in basket re-exports
      setTree((prev) => ({ ...prev, root: updateNode(prev.root, targetId, { extra_keys: (n.extra_keys ?? 0) + quantity }) }));
    } else {
      // GMK/MK/SMK: persist as a pending additional-keys count so the quote can pick it up too
      setTree((prev) => ({ ...prev, root: updateNode(prev.root, targetId, { pending_additional_keys: (n.pending_additional_keys ?? 0) + quantity }) }));
    }
    dirtyRef.current = true;
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
      const differRef = n.differ != null ? `d${String(n.differ).padStart(3, "0")}` : "";
      const productName = n.cylinder_type ? (productsByCode[n.cylinder_type]?.name ?? "").toLowerCase() : "";
      if (
        n.label.toLowerCase().includes(q) ||
        (n.location ?? "").toLowerCase().includes(q) ||
        n.cylinder_type?.toLowerCase().includes(q) ||
        differRef.includes(q) ||
        productName.includes(q)
      ) s.add(n.id);
      n.children.forEach(walk);
    };
    walk(tree.root);
    return s;
  }, [search, tree, productsByCode]);

  const systemStats = useMemo(() => {
    const counts = { MK: 0, SMK: 0, CE: 0, CYL: 0 };
    if (!tree.root) return counts;
    const walk = (n: TNode) => {
      if (n.type === "MK") counts.MK++;
      else if (n.type === "SMK") counts.SMK++;
      else if (n.type === "CE") counts.CE++;
      else if (n.type === "CYL" && !n.decommissioned_at) counts.CYL++;
      n.children.forEach(walk);
    };
    walk(tree.root);
    return counts;
  }, [tree]);

  useEffect(() => {
    if (searchMatch.size === 1) {
      const id = [...searchMatch][0];
      setTimeout(() => panToNodeRef.current?.(id), 100);
    }
  }, [searchMatch]);


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
    if (labelAuditRef.current) flushLabelAudit();
    if (locationAuditRef.current) flushLocationAudit();
    if (cylConfigRef.current) flushCylConfig();
    const errs = validate(tree).filter((i) => i.level === "error");
    if (errs.length) { toast.error("Fix validation errors before exporting"); setIssues(validate(tree)); setValidateOpen(true); return; }
    const productByCode = new Map(products.map((p) => [p.code, p]));
    // Look up new-system key products by cylinder_type = "Key" and cylinder_profile
    // Exclude replacement products (code or profile contains "REP" or "REPLACEMENT")
    const allKeyProducts = products.filter((p: any) =>
      p.cylinder_type === "Key" &&
      !p.code?.toUpperCase().includes("REP") &&
      !p.cylinder_profile?.toUpperCase().includes("REP") &&
      !p.cylinder_profile?.toUpperCase().includes("REPLACEMENT")
    );
    const keyProductForNode = (nodeType: string) => {
      const levelHint = nodeType === "CYL" ? "DIFFER"
        : nodeType === "GMK" ? "GMK"
        : nodeType === "MK"  ? "MK"
        : nodeType === "SMK" ? "SMK"
        : "";
      if (!levelHint) return null;
      return allKeyProducts.find((p: any) => {
        const profile = p.cylinder_profile?.toUpperCase() ?? "";
        if (levelHint === "MK") return profile.includes("MK") && !profile.includes("SMK") && !profile.includes("GMK");
        return profile.includes(levelHint);
      }) ?? null;
    };
    const lines: import("@/contexts/CartContext").CartLine[] = [];
    let total = 0;
    const sys = { system_id: systemId, system_name: name, system_reference: reference };
    const walk = (n: TNode, ancestors: TNode[]) => {
      // Collect MK/SMK ancestor refs for hierarchy display
      const hierarchy_refs = ancestors.filter(a => a.type === "MK" || a.type === "SMK").map(a => a.label);
      if (!isFulfilled && (n.type === "GMK" || n.type === "MK" || n.type === "SMK")) {
        normaliseKeys(n).forEach((k) => {
          if (k.qty > 0) {
            const keyProd = keyProductForNode(n.type);
            const keyPrice = keyProd ? orgPriceFor((keyProd as any).code, (keyProd as any).price_gbp) : 12;
            lines.push({
              kind: "key",
              key_reference: n.label && n.label !== k.ref ? `${k.ref} — ${n.label}` : k.ref,
              product_code: (keyProd as any)?.code ?? undefined,
              image_url: (keyProd as any)?.image_url ?? undefined,
              node_type: n.type,
              key_type_label: KEY_TYPE_LABEL[n.type],
              location: (n.type === "MK" || n.type === "SMK") ? (n.location ?? undefined) : undefined,
              room_label: n.location || n.label,
              hierarchy_refs: [...hierarchy_refs.filter(r => r !== n.label), n.label],
              quantity: k.qty,
              unit_price: keyPrice,
              ...sys,
            });
            total += keyPrice * k.qty;
          }
        });
      }
      if (n.type === "CYL" && n.cylinder_type && (!isFulfilled || n.is_new)) {
        const p = productByCode.get(n.cylinder_type);
        const unit = orgPriceFor(n.cylinder_type, p?.price_gbp);
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
          const differKeyProd = keyProductForNode("CYL");
          const differKeyPrice = differKeyProd ? orgPriceFor((differKeyProd as any).code, (differKeyProd as any).price_gbp) : 12;
          lines.push({
            kind: "key",
            key_reference: `Extra Differ Keys — ${n.label} (${differRef})`,
            product_code: (differKeyProd as any)?.code ?? undefined,
            image_url: (differKeyProd as any)?.image_url ?? undefined,
            room_label: n.label,
            differ_ref: differRef,
            is_extra_key: true,
            hierarchy_refs,
            quantity: extra,
            unit_price: differKeyPrice,
            ...sys,
          });
          total += differKeyPrice * extra;
        }
      }
      if (n.type === "CE" && n.cylinder_type && (!isFulfilled || n.is_new)) {
        const p = productByCode.get(n.cylinder_type);
        const unit = orgPriceFor(n.cylinder_type, p?.price_gbp);
        const qty = n.quantity ?? 1;
        const mkAnc  = ancestors.find(a => a.type === "MK");
        const smkAnc = ancestors.find(a => a.type === "SMK");
        const gmkAnc = ancestors.find(a => a.type === "GMK");
        const ceHierarchyRefs: string[] = [
          ...(mkAnc  ? [mkAnc.label]  : (gmkAnc ? [gmkAnc.label] : [])),
          ...(smkAnc ? [smkAnc.label] : []),
        ];
        lines.push({
          kind: "cylinder",
          product_code: n.cylinder_type,
          product_name: (p as any)?.product_description ?? p?.name,
          cylinder_type: p?.cylinder_type,
          cylinder_profile: (p as any)?.cylinder_profile ?? "Common Entrance",
          finish: n.finish ?? p?.finish ?? undefined,
          size: p?.size ?? undefined,
          image_url: p?.image_url ?? undefined,
          room_label: n.label,
          differ_ref: n.z_ref ?? "CE",
          hierarchy_refs: ceHierarchyRefs,
          quantity: qty,
          unit_price: unit,
          ...sys,
        });
        total += unit * qty;
      }
      n.children.forEach((c) => walk(c, [...ancestors, n]));
    };
    walk(tree.root, []);

    if (isFulfilled) {
      // Fulfilled system — add new lines individually, preserving previously added new items
      lines.forEach((l) => addToCart(l));
    } else {
      replaceBySystem(systemId, lines);
    }
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
    <div className="flex flex-col flex-1 min-h-0">
      {/* Top bar */}
      <div className="border-b bg-card px-4 py-3 flex items-center gap-2 no-print">
        <Input value={name} onChange={(e) => { setName(e.target.value); dirtyRef.current = true; }} className="max-w-xs font-semibold" />
        {reference && (
          <span className="text-xs font-medium text-foreground bg-muted px-2.5 py-1 rounded-full whitespace-nowrap">
            {reference}
          </span>
        )}
        <span className="text-xs text-foreground/60 whitespace-nowrap">
          {countDoors(tree.root)} {countDoors(tree.root) !== 1 ? "doors" : "door"}
        </span>

        <div className="ml-4 relative flex items-center gap-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search doors & zones…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-64 h-9" />
          {search.trim() && (
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {searchMatch.size === 0 ? "No matches" : `${searchMatch.size} match${searchMatch.size !== 1 ? "es" : ""} highlighted`}
            </span>
          )}
        </div>

        <div className="flex-1" />
        
        <Button variant="outline" size="sm" onClick={() => fitViewRef.current?.()} title="Fit view"><Maximize2 className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" title="Collapse all" onClick={() => {
          const toCollapse = new Set<string>();
          const walk = (n: TNode) => {
            if (n.children.length > 0 && n.type !== "CYL") { toCollapse.add(n.id); n.children.forEach(walk); }
          };
          if (tree.root) walk(tree.root);
          setCollapsed(toCollapse);
          setTimeout(() => fitViewRef.current?.(), 200);
        }}>
          <ChevronsDownUp className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" title="Expand all" onClick={() => { setCollapsed(new Set()); setTimeout(() => fitViewRef.current?.(), 200); }}>
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleUndo} disabled={!canUndo} title="Undo last action (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={runValidate} title="Validate"><ShieldCheck className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={() => setGuideOpen(v => !v)} title="Guide"><BookOpen className="h-4 w-4" /></Button>
        {hasAnyDecomm && (
          <Button
            variant={showAllDecomm ? "default" : "outline"}
            onClick={() => { setShowAllDecomm((v) => { if (v) setRevealedDecomm(new Set()); return !v; }); }}
            title="Toggle visibility of decommissioned (replaced) cylinders across the whole tree"
          >
            <History className="h-4 w-4" /> {showAllDecomm ? "Hide replaced" : "Show replaced cylinders"}
          </Button>
        )}
        <SaveStatusIndicator status={saveStatus} lastSavedAt={lastSavedAt} onRetry={save} />
        {!readOnly && (
          <Button variant="outline" size="sm" asChild title="View issued keys and key holders for this system">
            <Link to={`/builder/${systemId}/keys`}><KeyRound className="h-4 w-4" /> Key Log</Link>
          </Button>
        )}
        <Button variant="outline" size="sm" title="Download this system as a PDF" onClick={() => {
          try {
            const raw = localStorage.getItem("loxx_cart_meta_v1");
            const cartMeta = raw ? JSON.parse(raw) : null;
            const pn = cartMeta?.projectName ?? "";
            if (pn) setPrintProjectName(pn);
          } catch {}
          setTimeout(() => window.print(), 50);
        }}><Printer className="h-4 w-4" /> Export PDF</Button>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={() => {
            if (!tree.root) { toast.error("Nothing to quote"); return; }
            const items = treeToQuoteItems(tree, products as any, { system_id: systemId, system_name: name, system_reference: reference }, isFulfilled);
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
              className="border-[hsl(36_94%_52%)] text-[hsl(36_94%_42%)] hover:bg-[hsl(36_94%_95%)] hover:text-[hsl(36_94%_42%)]"
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
        {printProjectName && (
          <div className="text-base text-muted-foreground mt-0.5">{printProjectName}</div>
        )}
        <div className="text-sm text-muted-foreground mt-1">
          {reference && <span>{reference} · </span>}
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
              highlightIds={showOnlyUnassigned ? unassignedIds : (search.trim() ? searchMatch : undefined)}
              productsByCode={productsByCode}
              onSelect={setSelectedId}
              onAddChild={handleAddChild}
              onPaneClick={() => setSelectedId(null)}
              registerFitView={(fn) => { fitViewRef.current = fn; }}
              registerPanToNode={(fn) => { panToNodeRef.current = fn; }}

              parentsWithDecomm={decommParents}
              revealedDecomm={revealedDecomm}
              onToggleReveal={toggleRevealParent}
              getExtraAddActions={getExtraAddActions}
              readOnly={readOnly}
              collapsed={collapsed}
              onToggleCollapsed={(id) => {
                setCollapsed((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id); else next.add(id);
                  return next;
                });
              }}
              issueCounts={issueCounts}
              onOpenIssues={(nodeId, filter) => navigate(`/builder/${systemId}/keys?nodeId=${nodeId}${filter === "lost" ? "&tab=lost" : ""}`)}
            />
          )}
        </div>


        {/* Print-only export — key schedule + cylinder schedule grouped by zone */}
        <div className="print-only px-6 mt-6">
          {/* KEY SCHEDULE */}
          {(() => {
            const keyRows: { ref: string; label: string; type: string; qty: number }[] = [];
            const walkKeys = (n: TNode) => {
              if (n.type !== "CYL" && n.type !== "CE") {
                const typeLabel = n.type === "GMK" ? "Grand Master Key" : n.type === "MK" ? "Master Key" : "Sub-Master Key";
                normaliseKeys(n).forEach((k) => keyRows.push({ ref: k.ref, label: n.label, type: typeLabel, qty: k.qty }));
              }
              n.children.forEach(walkKeys);
            };
            if (tree.root) walkKeys(tree.root);
            if (keyRows.length === 0) return null;
            return (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-2">Key schedule</h2>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 px-2">Key ref</th>
                      <th className="text-left py-1 px-2">Description</th>
                      <th className="text-left py-1 px-2">Level</th>
                      <th className="text-right py-1 px-2">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keyRows.map((r, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-1 px-2 font-medium text-amber-700">{r.ref}</td>
                        <td className="py-1 px-2">{r.label}</td>
                        <td className="py-1 px-2">{r.type}</td>
                        <td className="py-1 px-2 text-right">{r.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* CYLINDER SCHEDULE — mirrors PO format, no pricing */}
          {(() => {
            // Build a map of differ ref → hierarchy (GMK/MK/SMK labels)
            const hierarchyMap: Record<string, { gmk: string; mk: string; smk: string }> = {};
            const buildHierarchy = (n: TNode, trail: TNode[]) => {
              if (n.type === "CYL" && n.differ != null) {
                const ref = `D${String(n.differ).padStart(3, "0")}`;
                hierarchyMap[ref] = {
                  gmk: trail.find(t => t.type === "GMK") ? "GMK" : "—",
                  mk:  trail.find(t => t.type === "MK")?.label  ?? "—",
                  smk: trail.find(t => t.type === "SMK")?.label ?? "—",
                };
              }
              if (n.type === "CE" && n.z_ref) {
                hierarchyMap[n.z_ref] = {
                  gmk: trail.find(t => t.type === "GMK") ? "GMK" : "—",
                  mk:  trail.find(t => t.type === "MK")?.label  ?? "—",
                  smk: trail.find(t => t.type === "SMK")?.label ?? "—",
                };
              }
              n.children.forEach(c => buildHierarchy(c, [...trail, n]));
            };
            if (tree.root) buildHierarchy(tree.root, []);

            const groups: { zoneLabel: string; zoneRef: string; rows: TNode[] }[] = [];
            const walkZones = (n: TNode, currentZone?: { zoneLabel: string; zoneRef: string }) => {
              if (n.type === "CYL" || n.type === "CE") {
                const zone = currentZone ?? { zoneLabel: "General", zoneRef: "ungrouped" };
                const g = groups.find(g => g.zoneRef === zone.zoneRef);
                if (g) g.rows.push(n);
                else groups.push({ ...zone, rows: [n] });
                if (n.type === "CE") n.children.forEach(c => walkZones(c, currentZone));
              } else {
                const zone = (n.type === "GMK" || n.type === "MK" || n.type === "SMK")
                  ? { zoneLabel: n.location?.trim() || n.label, zoneRef: n.label }
                  : currentZone;
                n.children.forEach(c => walkZones(c, zone));
              }
            };
            if (tree.root) walkZones(tree.root);
            if (groups.length === 0) return null;

            return (
              <div>
                <h2 className="text-lg font-semibold mb-2">Cylinder schedule</h2>
                {groups.map((group) => (
                  <div key={group.zoneRef} className="mb-5">
                    {groups.length > 1 && (
                      <div className="text-sm font-semibold mb-1 pb-1 border-b">{group.zoneLabel}</div>
                    )}
                    <table className="w-full border-collapse" style={{ fontSize: "10px" }}>
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1 px-1">Differ</th>
                          <th className="text-left py-1 px-1">Room / Door</th>
                          <th className="text-left py-1 px-1">GMK</th>
                          <th className="text-left py-1 px-1">MK</th>
                          <th className="text-left py-1 px-1">SMK</th>
                          <th className="text-left py-1 px-1">Product code</th>
                          <th className="text-left py-1 px-1">Lock type</th>
                          <th className="text-left py-1 px-1">Lock function</th>
                          <th className="text-left py-1 px-1">Finish</th>
                          <th className="text-left py-1 px-1">Size</th>
                          <th className="text-right py-1 px-1">Qty</th>
                          <th className="text-right py-1 px-1">Keys inc.</th>
                          <th className="text-right py-1 px-1">Extra keys</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((c) => {
                          const isCE = c.type === "CE";
                          const differRef = isCE
                            ? (c.z_ref ?? "CE")
                            : `D${String(c.differ ?? 0).padStart(3, "0")}`;
                          const h = hierarchyMap[differRef] ?? { gmk: "—", mk: "—", smk: "—" };
                          const prod = c.cylinder_type ? products.find(p => p.code === c.cylinder_type) : null;
                          const extraKeys = c.extra_keys ?? 0;
                          let ceNote: React.ReactNode = null;
                          if (isCE && tree.root) {
                            const siblingDiffers: string[] = [];
                            const findParentNode = (root: TNode, id: string): TNode | null => {
                              for (const ch of root.children) {
                                if (ch.id === id) return root;
                                const found = findParentNode(ch, id);
                                if (found) return found;
                              }
                              return null;
                            };
                            const isSubCE = c.z_ref?.includes(".");
                            if (isSubCE) {
                              // Sub-CE (Z1.1, Z1.2): operated by all CYL differs that are its own children
                              const collectCylsFromSubCE = (node: TNode) => {
                                node.children.forEach(ch => {
                                  if (ch.type === "CYL" && ch.differ != null) {
                                    siblingDiffers.push(`D${String(ch.differ).padStart(3, "0")}`);
                                  } else if (ch.type === "CE") {
                                    collectCylsFromSubCE(ch);
                                  }
                                });
                              };
                              collectCylsFromSubCE(c);
                            }
                            else {
                              // Primary CE (Z1/Z2): collect CYL differs from own children AND sub-CE children recursively
                              const collectCyls = (node: TNode) => {
                                node.children.forEach(ch => {
                                  if (ch.type === "CYL" && ch.differ != null) {
                                    siblingDiffers.push(`D${String(ch.differ).padStart(3, "0")}`);
                                  } else if (ch.type === "CE") {
                                    collectCyls(ch);
                                  }
                                });
                              };
                              collectCyls(c);
                            }
                            if (siblingDiffers.length > 0) {
                              ceNote = (
                                <tr key={`${c.id}-note`}>
                                  <td colSpan={13} className="py-0.5 px-1 text-[10px] text-muted-foreground italic border-b">
                                    Operated by differ keys: {siblingDiffers.join(", ")}
                                  </td>
                                </tr>
                              );
                            }
                          }
                          return (
                            <React.Fragment key={c.id}>
                              <tr className="border-b">
                                <td className={`py-1 px-1 font-medium ${isCE ? "text-sky-700" : "text-amber-700"}`}>{differRef}</td>
                                <td className="py-1 px-1">{c.label}</td>
                                <td className="py-1 px-1 text-muted-foreground">{h.gmk}</td>
                                <td className="py-1 px-1 text-muted-foreground">{h.mk}</td>
                                <td className="py-1 px-1 text-muted-foreground">{h.smk}</td>
                                <td className="py-1 px-1 text-muted-foreground font-mono text-[10px]">{c.cylinder_type ?? "—"}</td>
                                <td className="py-1 px-1">{(prod as any)?.cylinder_type ?? "—"}</td>
                                <td className="py-1 px-1">{(prod as any)?.cylinder_profile ?? "—"}</td>
                                <td className="py-1 px-1">{c.finish ?? "—"}</td>
                                <td className="py-1 px-1">{c.size ?? "—"}</td>
                                <td className="py-1 px-1 text-right">{c.quantity ?? 1}</td>
                                <td className="py-1 px-1 text-right">{isCE ? "—" : 2 + extraKeys}</td>
                                <td className="py-1 px-1 text-right">{isCE ? "—" : (extraKeys > 0 ? extraKeys : "—")}</td>
                              </tr>
                              {ceNote}
                            </React.Fragment>
                          );
                        })}

                      </tbody>
                    </table>
                  </div>
                ))}
                {/* Cylinder summary */}
                {(() => {
                  const totalQty = groups.flatMap(g => g.rows).reduce((sum, c) => sum + (c.quantity ?? 1), 0);
                  const specMap = new Map<string, { label: string; qty: number }>();
                  groups.flatMap(g => g.rows).forEach(c => {
                    const prod = c.cylinder_type ? products.find(p => p.code === c.cylinder_type) : null;
                    const specParts = [
                      (prod as any)?.cylinder_type ?? c.cylinder_type ?? "Unknown",
                      (prod as any)?.cylinder_profile ?? null,
                      c.finish ?? (prod as any)?.finish ?? null,
                      c.size ?? (prod as any)?.size ?? null,
                    ].filter(Boolean);
                    const specKey = specParts.join(" · ");
                    const existing = specMap.get(specKey);
                    if (existing) existing.qty += (c.quantity ?? 1);
                    else specMap.set(specKey, { label: specKey, qty: c.quantity ?? 1 });
                  });
                  return (
                    <div className="mt-6 pt-4 border-t">
                      <h2 className="text-base font-semibold mb-2">Cylinder summary</h2>
                      <table className="w-full text-xs border-collapse mb-2">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1 px-1">Specification</th>
                            <th className="text-right py-1 px-1">Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from(specMap.values()).map((s, i) => (
                            <tr key={i} className="border-b">
                              <td className="py-1 px-1">{s.label}</td>
                              <td className="py-1 px-1 text-right font-medium">{s.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2">
                            <td className="py-1 px-1 font-semibold">Total cylinders</td>
                            <td className="py-1 px-1 text-right font-bold text-amber-700">{totalQty}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* Footer */}
          <div className="mt-10 pt-4 border-t text-center text-[10px] text-muted-foreground">
            LOXX — Master key systems made simple · myloxx.co.uk
          </div>
        </div>



        {/* Right detail panel */}
        <aside className="w-full md:w-[360px] md:shrink-0 border-t md:border-t-0 md:border-l bg-card overflow-auto no-print max-h-[60vh] md:max-h-none md:h-full">
          {!selected ? (
            <div className="p-6 text-sm text-muted-foreground">
              <h3 className="text-base font-semibold text-foreground mb-1">Details</h3>
              <p>Click any row to edit its properties, or hover and tap <kbd className="px-1 rounded bg-muted text-xs">+</kbd> to add a child.</p>

              <div className="mt-6 rounded-lg border bg-muted/40 p-4 space-y-2">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">System overview</h4>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>Grand Master Key</span><span className="font-medium text-foreground">1</span></div>
                  {systemStats.MK > 0 && <div className="flex justify-between"><span>Master {systemStats.MK !== 1 ? "Keys" : "Key"}</span><span className="font-medium text-foreground">{systemStats.MK}</span></div>}
                  {systemStats.SMK > 0 && <div className="flex justify-between"><span>Sub Master {systemStats.SMK !== 1 ? "Keys" : "Key"}</span><span className="font-medium text-foreground">{systemStats.SMK}</span></div>}
                  {systemStats.CE > 0 && <div className="flex justify-between"><span>Common {systemStats.CE !== 1 ? "Entrances" : "Entrance"}</span><span className="font-medium text-foreground">{systemStats.CE}</span></div>}
                  <div className="flex justify-between border-t pt-1.5 mt-1.5"><span>Total cylinders</span><span className="font-semibold text-foreground">{systemStats.CYL}</span></div>
                </div>
              </div>

              <div className="mt-6 space-y-2 text-xs">
                <Legend type="GMK" /><Legend type="MK" /><Legend type="SMK" /><Legend type="CYL" /><Legend type="CE" />
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
              onCopySpec={() => setCopySpecState({ open: true, sourceId: selected.id, newLabel: "", step: "differ-choice", keyedAlike: false })}
              onAddCE={selected.type === "CE" ? () => {
                const parent = findParent(tree.root, selected.id);
                if (parent) {
                  const existingCEs = collectCENodes(tree.root)
                    .filter(n => n.z_ref && !n.z_ref.includes("."))
                    .map(n => ({ id: n.id, label: n.label, z_ref: n.z_ref! }));
                  if (existingCEs.length > 0) {
                    const currentTopLevel = selected.z_ref?.includes(".")
                      ? selected.z_ref.split(".")[0]
                      : selected.z_ref;
                    setCeModalState({
                      open: true,
                      parentId: parent.id,
                      existingCEs,
                      defaultGroupZRef: currentTopLevel ?? existingCEs[0]?.z_ref,
                    });
                  } else {
                    handleAddChild(parent.id, "CE");
                  }
                }
              } : undefined}
              readOnly={readOnly}
              issueCounts={issueCounts}
              systemId={systemId}
            />
          )}
        </aside>
      </div>

      {/* Validation drawer */}
      <Sheet open={validateOpen} onOpenChange={setValidateOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {issues.length === 0 ? "✅ System looks good!" : issues.some(i => i.level === "error") ? "⚠️ A few things need attention" : "📋 A few suggestions"}
            </SheetTitle>
            <SheetDescription>
              {issues.length === 0
                ? "No issues found — your system is ready to order."
                : issues.some(i => i.level === "error")
                  ? `${issues.filter(i => i.level === "error").length} thing${issues.filter(i => i.level === "error").length !== 1 ? "s" : ""} to fix before ordering, plus ${issues.filter(i => i.level === "warning").length} suggestion${issues.filter(i => i.level === "warning").length !== 1 ? "s" : ""} to review.`
                  : `${issues.filter(i => i.level === "warning").length} suggestion${issues.filter(i => i.level === "warning").length !== 1 ? "s" : ""} to review — nothing blocking your order.`
              }
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
                      <span className="w-8 text-center font-medium">{addKeysState.quantity}</span>
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

      {/* Copy spec modal */}
      <Dialog
        open={copySpecState.open}
        onOpenChange={(o) => !o && setCopySpecState({ open: false, sourceId: "", newLabel: "", step: "differ-choice", keyedAlike: false })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy door spec</DialogTitle>
            <DialogDescription asChild>
              <div>
                {(() => {
                  const src = findNode(tree.root, copySpecState.sourceId);
                  if (!src) return null;
                  const parts = [src.cylinder_type, src.finish, src.size].filter(Boolean);
                  return (
                    <>
                      <div>Creates a new door with the same spec as <span className="font-medium text-foreground">{src.label}</span>.</div>
                      {parts.length > 0 && (
                        <div className="mt-1 text-xs">
                          {parts.join(" · ")}
                          {(src.quantity ?? 1) > 1 && ` · Qty ${src.quantity}`}
                          {(src.extra_keys ?? 0) > 0 && ` · +${src.extra_keys} extra keys`}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </DialogDescription>
          </DialogHeader>
          {copySpecState.step === "differ-choice" ? (
            <div className="space-y-3">
              <Label>How should this door's lock relate to <span className="font-medium">{findNode(tree.root, copySpecState.sourceId)?.label}</span>?</Label>
              <div className="grid gap-3 mt-1">
                <button
                  onClick={() => setCopySpecState(s => ({ ...s, keyedAlike: false, step: "name" }))}
                  className="w-full text-left rounded-lg border-2 border-border hover:border-amber-400 hover:bg-amber-50 p-4 transition-colors"
                >
                  <div className="font-semibold text-sm">New differ key</div>
                  <div className="text-xs text-muted-foreground mt-1">This door gets its own unique key that opens only this door. Same product spec, different key.</div>
                </button>
                <button
                  onClick={() => setCopySpecState(s => ({ ...s, keyedAlike: true, step: "name" }))}
                  className="w-full text-left rounded-lg border-2 border-border hover:border-amber-400 hover:bg-amber-50 p-4 transition-colors"
                >
                  <div className="font-semibold text-sm">Keyed alike <span className="ml-1.5 text-[11px] font-normal px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">Same differ key</span></div>
                  <div className="text-xs text-muted-foreground mt-1">This door will be opened by the exact same differ key as <span className="font-medium">{findNode(tree.root, copySpecState.sourceId)?.label}</span>. Useful for matching doors on a suite or set of identical locks.</div>
                </button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCopySpecState({ open: false, sourceId: "", newLabel: "", step: "differ-choice", keyedAlike: false })}>
                  Cancel
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              {copySpecState.keyedAlike && (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                  <span className="font-semibold">Keyed alike:</span> the same differ key will open both this door and <span className="font-medium">{findNode(tree.root, copySpecState.sourceId)?.label}</span>.
                </div>
              )}
              <div>
                <Label htmlFor="copy-spec-label">New room / door name</Label>
                <Input
                  id="copy-spec-label"
                  autoFocus
                  placeholder="e.g. Director's Office"
                  value={copySpecState.newLabel}
                  onChange={(e) => setCopySpecState((s) => ({ ...s, newLabel: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && copySpecState.newLabel.trim()) {
                      handleCopySpec(copySpecState.sourceId, copySpecState.newLabel, copySpecState.keyedAlike);
                    }
                  }}
                  className="mt-1.5"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCopySpecState(s => ({ ...s, step: "differ-choice", newLabel: "" }))}>
                  Back
                </Button>
                <Button onClick={() => handleCopySpec(copySpecState.sourceId, copySpecState.newLabel, copySpecState.keyedAlike)}>
                  Add door
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {ceModalState.open && (
        <CEBuildingModal
          existingCEs={ceModalState.existingCEs}
          parentId={ceModalState.parentId}
          defaultGroupZRef={ceModalState.open ? ceModalState.defaultGroupZRef : undefined}
          onConfirm={handleCEModalConfirm}
          onCancel={() => setCeModalState({ open: false })}
        />
      )}
    </div>
  );
}

function CEBuildingModal({
  existingCEs,
  parentId,
  onConfirm,
  onCancel,
  defaultGroupZRef,
}: {
  existingCEs: { id: string; label: string; z_ref: string }[];
  parentId: string;
  defaultGroupZRef?: string;
  onConfirm: (parentId: string, choice: "new" | "existing", groupZRef?: string) => void;
  onCancel: () => void;
}) {
  const [ceChoice, setCeChoice] = useState<"new" | "existing">(defaultGroupZRef ? "existing" : "new");
  const [selectedGroup, setSelectedGroup] = useState(defaultGroupZRef ?? existingCEs[0]?.z_ref ?? "");
  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Common Entrance</DialogTitle>
          <DialogDescription>
            Is this common entrance cylinder part of an existing building or a new building?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setCeChoice("existing")}
            className={`w-full text-left rounded-md border p-3 text-sm transition-colors ${ceChoice === "existing" ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
          >
            <div className="font-semibold">Existing building</div>
            <div className="text-xs text-muted-foreground mt-0.5">Add to a building that already has a common entrance</div>
          </button>
          <button
            type="button"
            onClick={() => setCeChoice("new")}
            className={`w-full text-left rounded-md border p-3 text-sm transition-colors ${ceChoice === "new" ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
          >
            <div className="font-semibold">New building</div>
            <div className="text-xs text-muted-foreground mt-0.5">Start a new building group with its own Z reference</div>
          </button>
          {ceChoice === "existing" && (
            <div className="space-y-1.5">
              <Label>Which building?</Label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {existingCEs.map((ce) => (
                  <option key={ce.id} value={ce.z_ref}>
                    {ce.z_ref} — {ce.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={() => onConfirm(parentId, ceChoice, ceChoice === "existing" ? selectedGroup : undefined)}
          >
            Add common entrance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
          <span className="text-[11px] text-muted-foreground">· D{String(node.differ).padStart(3, "0")}</span>
        )}
        {node.type === "CYL" && !node.cylinder_type && (
          <span className="text-[11px] text-destructive">· no product</span>
        )}
        {(node.type === "MK" || node.type === "SMK") && node.keys != null && (() => {
          const total = countKeys(node);
          return (
            <span className="text-[11px] text-muted-foreground">· {total} key{total !== 1 ? "s" : ""}</span>
          );
        })()}

        <div className="flex-1" />

        {/* type pill */}
        <span className={`text-[10px] font-sans uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.pill}`}>
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
  CE:  "shared entrance",
};

function Legend({ type }: { type: NodeType }) {
  const m = TYPE_META[type];
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
      <span className="font-sans uppercase text-[10px] tracking-wider text-muted-foreground">{type}</span>
      <span>{m.label}</span>
      <span className="text-muted-foreground">— {LEGEND_DESC[type]}</span>
    </div>
  );
}


function DetailPanel({
  node, parent, trail, products, onPatch, addOptions, onAddChildType, onDelete, isRoot, onClose,
  isFulfilled, onReplace, onCopySpec, onAddCE, readOnly = false, issueCounts, systemId,
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
  onCopySpec?: () => void;
  onAddCE?: () => void;
  readOnly?: boolean;
  issueCounts?: Map<string, { issued: number; lost: number }>;
  systemId?: string;
}) {
  const meta = TYPE_META[node.type];
  const isCyl = node.type === "CYL";
  const isCE = node.type === "CE";
  const isMk = node.type === "MK";
  const isSmk = node.type === "SMK";
  const isMkOrSmk = isMk || isSmk;
  const nodeCounts = issueCounts?.get(node.id) ?? { issued: 0, lost: 0 };

  const displayName = (isMkOrSmk && node.location?.trim()) ? node.location.trim() : node.label;

  const nameFieldLabel = isCyl
    ? "Room / door name"
    : isCE
      ? "Door / entrance name"
      : isMk
        ? "Building / location name"
        : isSmk
          ? "Zone / area name"
          : "Label";
  const namePlaceholder = isCyl
    ? "e.g. Director's Office"
    : isCE
      ? "e.g. Block A Entrance"
      : isMk
        ? "e.g. Main Building"
        : isSmk
          ? "e.g. Ground Floor"
          : "";

  const MK_SUGGESTIONS = [
    "Main Building", "North Wing", "South Wing", "East Wing", "West Wing",
    "Annexe", "Warehouse", "Tower Block", "Sports Hall", "Residential Block",
  ];
  const SMK_SUGGESTIONS = [
    "Ground Floor", "First Floor", "Second Floor", "Third Floor",
    "Reception", "Offices", "Server Room", "Plant Room", "Car Park",
    "IT Department", "HR Department", "Finance", "History Department",
    "Science Block", "Staff Room", "Ward A", "Ward B", "ICU",
    "Kitchen", "Laundry", "Maintenance", "Store Room",
  ];
  const suggestions = isMk ? MK_SUGGESTIONS : isSmk ? SMK_SUGGESTIONS : [];

  const addButtonLabel = (t: NodeType) =>
    t === "MK"  ? "+ Add a building or wing (Master Key)"
  : t === "SMK" ? "+ Add a floor or department (Sub-Master)"
  : t === "CYL" ? "+ Add a door (Cylinder)"
  : t === "CE"  ? "+ Add a common entrance"
  : "+ Add child";

  const NEXT_STEP: Record<NodeType, string> = {
    GMK: "Add a Master Key for each building or major section of your site.",
    MK:  "Add Sub-Masters for each floor or zone — or add Cylinders directly for simpler sites.",
    SMK: "Add a Cylinder for each door this zone covers.",
    CYL: "Give this door a name and choose a cylinder type from the options above.",
    CE:  "Give this entrance a name and select the cylinder type, finish and size.",
  };
  const showNextStepHint = (isCyl || isCE) ? !node.cylinder_type : node.children.length === 0;

  // Build the access trail for CYL nodes (chain of keys that can open this door).
  // trail includes the selected node itself, so slice it to ancestors only.
  const ancestors = trail.slice(0, Math.max(0, trail.length - 1));
  const accessTrail = isCyl
    ? [
        ...ancestors
          .filter((t) => t.type !== "CE")
          .map((t) => ({
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
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{meta.label}</span>
        {isMkOrSmk && node.location?.trim() && (
          <span className="text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded bg-[hsl(36_94%_95%)] text-[hsl(var(--node-cyl))] border border-[hsl(var(--node-cyl))]/30">
            {node.label}
          </span>
        )}
        {isCyl && node.differ != null && (
          <Badge className="ml-auto font-sans font-semibold bg-[hsl(36_94%_95%)] text-[hsl(var(--node-cyl))] border border-[hsl(var(--node-cyl))]/30">
            D{String(node.differ).padStart(3, "0")}
          </Badge>
        )}
        {isCE && node.z_ref && (
          <Badge className="ml-auto font-sans font-semibold bg-[hsl(var(--node-ce))]/15 text-[hsl(var(--node-ce))] border border-[hsl(var(--node-ce))]/30">
            {node.z_ref}
          </Badge>
        )}
        <button
          onClick={onClose}
          className={`${(isCyl && node.differ != null) || (isCE && node.z_ref) ? "" : "ml-auto"} h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors`}
          aria-label="Close panel"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {(nodeCounts.issued > 0 || nodeCounts.lost > 0) && (
        <div className="flex items-center gap-3 px-4 pb-3 text-xs">
          {nodeCounts.issued > 0 && (
            <span className="text-muted-foreground">
              <KeyRound className="h-3 w-3 inline mr-1 text-amber-500" />
              {nodeCounts.issued} issued
            </span>
          )}
          {nodeCounts.lost > 0 && (
            <span className="text-amber-600 font-medium">
              ⚠ {nodeCounts.lost} lost
            </span>
          )}
          {systemId && (
            <Link
              to={`/builder/${systemId}/keys?nodeId=${node.id}`}
              className="ml-auto text-amber-600 hover:underline text-[11px]"
            >
              View in Key Log →
            </Link>
          )}
        </div>
      )}
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
                className="mt-1 px-2.5 py-1.5 rounded-md bg-muted/40 text-sm font-medium text-[hsl(var(--node-cyl))] select-all"
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


        {(isCyl || isCE) && (
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


        {isCE && (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs font-semibold mb-1">🔑 Who can open this door?</div>
            <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
              This is a common entrance. It has no individual differ key — it is opened by every differ key in the group below it, plus all master keys above.
            </p>
            <div className="space-y-1">
              {ancestors.map((t, i) => {
                const dot = ({
                  GMK: "hsl(var(--node-gmk))",
                  MK:  "hsl(var(--node-mk))",
                  SMK: "hsl(var(--node-smk))",
                } as Record<string, string>)[t.type] ?? "hsl(var(--node-ce))";
                const suffix = ({
                  GMK: "— every door in the system",
                  MK:  "— all doors in this section",
                  SMK: "— all doors in this zone",
                } as Record<string, string>)[t.type] ?? "";
                const keyLabel = t.type === "GMK" ? "Grand Master key"
                  : t.type === "MK" ? "Master key"
                  : "Sub-Master key";
                const label = (t.type === "MK" || t.type === "SMK") && t.location?.trim()
                  ? t.location.trim()
                  : t.label;
                return (
                  <div key={t.id} className="flex items-start gap-2 text-[11px]">
                    <div className="flex flex-col items-center pt-1">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: dot }} />
                      {i < ancestors.length - 1 && (
                        <span className="w-px flex-1 bg-border mt-1" style={{ minHeight: 12 }} />
                      )}
                    </div>
                    <div className="flex-1 leading-relaxed">
                      <span className="font-medium text-foreground">{label}</span>
                      <span className="text-muted-foreground"> ({keyLabel})</span>
                      <span className="text-muted-foreground"> {suffix}</span>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-start gap-2 text-[11px] mt-1">
                <span className="h-2 w-2 rounded-full shrink-0 mt-1" style={{ background: "hsl(var(--node-cyl))" }} />
                <div className="flex-1 leading-relaxed">
                  <span className="font-medium text-foreground">All differ keys in this group</span>
                  <span className="text-muted-foreground"> — each one also opens this entrance</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
              This is the only door in the system where keys lower in the tree also have access. Residents or occupants use their individual key — no separate common entrance key is issued.
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
                      className="w-full"
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
          {!readOnly && isCyl && node.cylinder_type && onCopySpec && (
            <Button variant="outline" onClick={onCopySpec} className="w-full">
              <Copy className="h-4 w-4" /> Copy spec to new door
            </Button>
          )}
          {!readOnly && isCE && onAddCE && (
            <Button variant="outline" onClick={onAddCE} className="w-full">
              <Plus className="h-4 w-4" /> Add another common entrance
            </Button>
          )}
          {!readOnly && !isRoot && (
            <Button variant="outline" onClick={onDelete} className="text-destructive hover:text-destructive">
              <X className="h-4 w-4" /> Remove from system
            </Button>
          )}
        </div>

        {systemId && (isCyl || isCE || node.type === "GMK" || node.type === "MK" || node.type === "SMK") && (() => {
          const differRef = isCyl
            ? (node.differ != null ? `D${String(node.differ).padStart(3, "0")}` : null)
            : isCE
              ? (node.z_ref ?? null)
              : (node.label ?? null);
          return differRef ? (
            <OrderHistorySection systemId={systemId} differRef={differRef} />
          ) : null;
        })()}





        {(node.type === "GMK" || node.type === "MK" || node.type === "SMK") && (() => {
          const doors: Array<{ ref: string; label: string }> = [];
          const walk = (x: any) => {
            if (x.decommissioned_at) return;
            if (x.type === "CYL") {
              const ref = x.differ != null ? `D${String(x.differ).padStart(3, "0")}` : "";
              if (ref) doors.push({ ref, label: x.label ?? "" });
            } else if (x.type === "CE") {
              if (x.z_ref) doors.push({ ref: x.z_ref, label: x.label ?? "" });
            }
            (x.children ?? []).forEach(walk);
          };
          (node.children ?? []).forEach(walk);
          return (
            <div className="pt-3 border-t">
              <div className="text-sm font-medium">What does this key open?</div>
              <div className="text-xs text-muted-foreground mb-2">
                This key opens every door listed below, plus all doors in any sub-groups.
              </div>
              {doors.length === 0 ? (
                <div className="text-xs text-muted-foreground">No doors yet.</div>
              ) : (
                <div className="text-xs space-y-0.5">
                  {doors.map((d, i) => (
                    <div key={i}>
                      <span className="font-mono text-[hsl(var(--node-cyl))]">{d.ref}</span>
                      {d.label && <> — {d.label}</>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

/* ------------------------- Order History Section ------------------------- */

type OrderHistoryRow = {
  quantity: number;
  differ_ref: string | null;
  orders: {
    id: string;
    created_at: string;
    customer_name: string | null;
    customer_email: string | null;
    status: string | null;
    system_id: string | null;
    purchase_order_ref: string | null;
  } | null;
};

function OrderHistorySection({ systemId, differRef }: { systemId: string; differRef: string }) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<OrderHistoryRow[]>([]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      // Step 1: get order IDs for this system
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id, created_at, customer_name, customer_email, status, system_id, purchase_order_ref")
        .eq("system_id", systemId);

      

      const orderIds = orderData.map((o: any) => o.id);

      if (orderIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      // Step 2: get items for this differ ref within those orders
      const { data: itemData, error: itemError } = await supabase
        .from("order_items")
        .select("quantity, differ_ref, order_id")
        .in("order_id", orderIds)
        .eq("differ_ref", differRef)
        .eq("item_type", "cylinder");

      

      // Merge: one entry per order, summing quantities
      const seen = new Map<string, any>();
      const orderMap = new Map((orderData ?? []).map((o: any) => [o.id, o]));
      for (const item of (itemData ?? [])) {
        const o = orderMap.get(item.order_id);
        if (!o) continue;
        const existing = seen.get(item.order_id);
        if (existing) {
          existing.quantity += Number(item.quantity || 0);
        } else {
          seen.set(item.order_id, { quantity: Number(item.quantity || 0), orders: o });
        }
      }

      
      setRows(Array.from(seen.values()).sort((a, b) =>
        new Date(b.orders.created_at).getTime() - new Date(a.orders.created_at).getTime()
      ));
      setLoading(false);
    })();
  }, [systemId, differRef]);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const statusPill = (status: string | null) => {
    const s = (status ?? "").toLowerCase();
    if (s === "pending_bacs") return { label: "Awaiting payment", cls: "bg-amber-100 text-amber-800 border-amber-200" };
    if (s === "paid" || s === "confirmed") return { label: "Confirmed", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    if (s === "fulfilled" || s === "delivered") return { label: "Delivered", cls: "bg-sky-100 text-sky-800 border-sky-200" };
    if (s === "cancelled") return { label: "Cancelled", cls: "bg-red-100 text-red-800 border-red-200" };
    return { label: status || "pending", cls: "bg-muted text-muted-foreground border-border" };
  };

  return (
    <div className="pt-3 mt-3 border-t">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-sm font-medium mb-2"
      >
        <span>Order history</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2">No order history</div>
          ) : (
            <ul className="space-y-2">
              {rows.map((r, i) => {
                const o = r.orders;
                if (!o) return null;
                const who = o.customer_name || o.customer_email || "Unknown";
                const ref = o.id.slice(0, 8).toUpperCase();
                const pill = statusPill(o.status);
                return (
                  <li key={i} className="rounded-md border p-2 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{fmtDate(o.created_at)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${pill.cls}`}>{pill.label}</span>
                    </div>
                    <div className="text-muted-foreground">{who}</div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <div>
                        <span className="font-mono">{ref}</span>
                        {o.purchase_order_ref && (
                          <div className="text-muted-foreground">PO: {o.purchase_order_ref}</div>
                        )}
                      </div>
                      <span>Qty {r.quantity}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------- Save Status Indicator ------------------------- */


function SaveStatusIndicator({
  status,
  lastSavedAt,
  onRetry,
}: {
  status: "idle" | "pending" | "saving" | "saved" | "error";
  lastSavedAt: number | null;
  onRetry: () => void;
}) {
  const [, forceUpdate] = useState(0);
  // Re-render every 30s so the "X minutes ago" stays current
  useEffect(() => {
    const t = setInterval(() => forceUpdate(n => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const timeAgo = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 10) return "just now";
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  };

  if (status === "pending") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2" title="Saving changes…">
        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
        Saving…
      </div>
    );
  }
  if (status === "saving") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        Saving…
      </div>
    );
  }
  if (status === "error") {
    return (
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs text-destructive px-2 hover:underline"
        title="Retry save"
      >
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        Save failed — retry
        <RotateCw className="h-3.5 w-3.5" />
      </button>
    );
  }

  // idle or saved — show last saved time if available
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 whitespace-nowrap" title={lastSavedAt ? `Last saved ${timeAgo(lastSavedAt)}` : "All changes are saved automatically"}>
      <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
      {lastSavedAt ? `Saved ${timeAgo(lastSavedAt)}` : "All changes saved"}
    </div>
  );
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
      <TooltipProvider>
        <div className="flex items-center gap-1.5 mb-2">
          <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Keys</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="p-0.5 hover:bg-muted rounded-full">
                <Info className="h-3 w-3 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[220px] text-xs">
              These keys open every door in this group and all the groups below it. 
              Order as many copies as the key-holders who need this level of access.
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
        This is the key that opens all doors in this group. Set how many copies you need — 
        2 is standard for most sites.
      </p>

      <div className="flex flex-col gap-2">
        {entries.map((entry, i) => (
          <div key={i}>
            <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
              <KeyRound className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <input
                className="flex-1 min-w-0 text-xs font-mono bg-transparent border-none outline-none text-amber-700 font-medium"
                value={entry.ref}
                onChange={(e) => updateRef(i, e.target.value)}
                placeholder="e.g. Main Building Master"
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
    {
      step: "5",
      color: "hsl(var(--node-ce))",
      title: "Common Entrance",
      desc: "A shared door opened by every key in the group below it — no separate entrance key is issued. Residents use their own flat or office key to access the shared entrance.",
      tip: "Example: 'Block A Entrance', 'Main Gate', 'Car Park Barrier'",
    },
  ];

  return (
    <aside className="w-72 shrink-0 border-r bg-card p-5 overflow-auto no-print h-full">
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

      <div className="my-5 border-t" />

      <div className="space-y-3">
        <div className="text-xs font-semibold flex items-center gap-1">
          <span>🔑</span> How access works
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Every door has its own differ key — it only opens that one door. But every key above it in your tree can also open it. Common entrances are the exception: they have no differ key of their own and are opened by all keys in the group below them.
        </p>
        <div className="space-y-2">
          {[
            { color: "hsl(var(--node-cyl))", label: "Differ key", desc: "Opens this door only" },
            { color: "hsl(var(--node-smk))", label: "Sub-Master key", desc: "Opens all doors in its zone" },
            { color: "hsl(var(--node-mk))",  label: "Master key",     desc: "Opens all doors in its section" },
            { color: "hsl(var(--node-gmk))", label: "Grand Master key", desc: "Opens every door in the system" },
            { color: "hsl(var(--node-ce))",  label: "Common entrance", desc: "Opened by all differ keys below it, and all master keys above" },
          ].map(({ color, label, desc }) => (
            <div key={label} className="flex items-center gap-2 text-[10px]">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
              <span className="font-medium text-foreground">{label}</span>
              <span className="text-muted-foreground">— {desc}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed mt-3">
          Common entrance doors are unique — every differ key in the group below also opens them, alongside all master keys above. There is no individual differ key for a common entrance.
        </p>
        <p className="text-[11px] italic text-muted-foreground leading-relaxed">
          Example: the cleaner holds a Sub-Master key for Ground Floor — 
          they can open every ground floor door, but not the floors above.
        </p>
      </div>

      <div className="mt-5 rounded-md border border-amber-300 bg-amber-50 p-3">
        <p className="text-[11px] text-amber-900 leading-relaxed">
          Not sure where to start? Click the orange + button below any node on the canvas to add the next level down.
        </p>
      </div>
    </aside>
  );
}
