export type NodeType = "GMK" | "MK" | "SMK" | "CYL" | "CE";

export interface KeyEntry {
  ref: string;
  qty: number;
}

export interface TNode {
  id: string;
  type: NodeType;
  label: string;
  location?: string;          // MK/SMK only — optional reference e.g. "Block B", "Floors 1-3"
  differ?: number;            // CYL only
  z_ref?: string;             // CE only — DOM Z reference e.g. "Z1", "Z2", "ZG"
  cylinder_type?: string;     // CYL only — product code
  finish?: string;            // CYL only
  size?: string;              // CYL only — e.g. "35/35"
  quantity?: number;          // CYL only — units required at this door (default 1)
  extra_keys?: number;        // CYL only — additional keys beyond the 2 included
  
  keyed_alike_source_differ?: number;  // if set, this node shares a differ with another cylinder
  // Decommissioned cylinder fields — once a cylinder is replaced, the original is preserved in-tree
  decommissioned_at?: string;            // ISO date
  decommissioned_reason?: "lost_key" | "faulty";
  replaced_by_differ?: number;           // differ of the replacement cylinder
  replaced_by_node_id?: string;          // id of the replacement node
  /** GMK/MK/SMK — copies of the key(s) at this level.
   *  Legacy: a single number meant "n copies of one key labelled by node.label".
   *  Current: an array of KeyEntry — multiple key refs each with their own qty. */
  keys?: number | KeyEntry[];
  children: TNode[];
}

export interface TreeData {
  root: TNode | null;
  next_differ: number;
}

/** Normalise a node's keys field to an array of KeyEntry, handling legacy number form. */
export function normaliseKeys(node: TNode): KeyEntry[] {
  if (node.keys == null) {
    return [{ ref: node.label, qty: 2 }];
  }
  if (typeof node.keys === "number") {
    return [{ ref: node.label, qty: node.keys }];
  }
  return node.keys.length > 0 ? node.keys : [{ ref: node.label, qty: 2 }];
}

/** Total key qty across all entries at this level. */
export function countKeys(node: TNode): number {
  return normaliseKeys(node).reduce((s, k) => s + k.qty, 0);
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const newId = () =>
  `n_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

export const emptyTree = (): TreeData => ({ root: null, next_differ: 1 });

export function createGMK(label = "Grand Master Key"): TNode {
  return { id: newId(), type: "GMK", label, keys: [{ ref: "GMK", qty: 2 }], children: [] };
}

/**
 * Valid child types for a given parent. Cylinders may be attached at any
 * non-leaf level (e.g. a shared estate gate keyed to the GMK).
 */
export function validChildTypes(parentType: NodeType): NodeType[] {
  if (parentType === "GMK") return ["MK", "CYL", "CE"];
  if (parentType === "MK")  return ["SMK", "CYL", "CE"];
  if (parentType === "SMK") return ["CYL", "CE"];
  if (parentType === "CE")  return ["CYL"];
  return [];
}

export function makeChild(parentType: NodeType, index: number, childType?: NodeType, parentLabel?: string): TNode {
  const t: NodeType = childType ?? (validChildTypes(parentType)[0] ?? "CYL");
  if (t === "MK") {
    const label = `MK-${index + 1}`;
    return { id: newId(), type: "MK", label, keys: [{ ref: label, qty: 2 }], children: [] };
  }
  if (t === "SMK") {
    const parentNum = parentLabel?.startsWith("MK-")
      ? parentLabel.slice(3)
      : "1";
    const label = `SMK-${parentNum}-${index + 1}`;
    return { id: newId(), type: "SMK", label, keys: [{ ref: label, qty: 2 }], children: [] };
  }
  if (t === "CE") {
    return { id: newId(), type: "CE", label: "Common Entrance", children: [] };
  }
  return { id: newId(), type: "CYL", label: `Door ${index + 1}`, children: [] };
}

/** Primary (first) child type — kept for backwards compatibility. */
export function childTypeOf(t: NodeType): NodeType | null {
  return validChildTypes(t)[0] ?? null;
}

/** Immutable traversal helpers */
export function findNode(root: TNode | null, id: string): TNode | null {
  if (!root) return null;
  if (root.id === id) return root;
  for (const c of root.children) {
    const r = findNode(c, id);
    if (r) return r;
  }
  return null;
}

export function findParent(root: TNode | null, id: string): TNode | null {
  if (!root) return null;
  for (const c of root.children) {
    if (c.id === id) return root;
    const r = findParent(c, id);
    if (r) return r;
  }
  return null;
}

export function mapTree(root: TNode | null, fn: (n: TNode) => TNode): TNode | null {
  if (!root) return null;
  const next = fn({ ...root });
  return { ...next, children: next.children.map((c) => mapTree(c, fn)!) };
}

export function updateNode(root: TNode | null, id: string, patch: Partial<TNode>): TNode | null {
  return mapTree(root, (n) => (n.id === id ? { ...n, ...patch } : n));
}

export function addChild(root: TNode | null, parentId: string, child: TNode): TNode | null {
  return mapTree(root, (n) => (n.id === parentId ? { ...n, children: [...n.children, child] } : n));
}

/** Insert a new node as a sibling immediately after the node with id `afterId`. */
export function insertSiblingAfter(root: TNode | null, afterId: string, sibling: TNode): TNode | null {
  return mapTree(root, (n) => {
    const idx = n.children.findIndex((c) => c.id === afterId);
    if (idx < 0) return n;
    const next = [...n.children];
    next.splice(idx + 1, 0, sibling);
    return { ...n, children: next };
  });
}

export function removeNode(root: TNode | null, id: string): TNode | null {
  if (!root) return null;
  if (root.id === id) return null;
  const recurse = (n: TNode): TNode => ({
    ...n,
    children: n.children.filter((c) => c.id !== id).map(recurse),
  });
  return recurse(root);
}

export function reorderSiblings(root: TNode | null, parentId: string, ids: string[]): TNode | null {
  return mapTree(root, (n) => {
    if (n.id !== parentId) return n;
    const map = new Map(n.children.map((c) => [c.id, c]));
    return { ...n, children: ids.map((id) => map.get(id)!).filter(Boolean) };
  });
}

export function pathOf(root: TNode | null, id: string): TNode[] {
  if (!root) return [];
  const walk = (n: TNode, trail: TNode[]): TNode[] | null => {
    const next = [...trail, n];
    if (n.id === id) return next;
    for (const c of n.children) {
      const r = walk(c, next);
      if (r) return r;
    }
    return null;
  };
  return walk(root, []) ?? [];
}

export function countDoors(root: TNode | null): number {
  if (!root) return 0;
  let n = 0;
  const w = (x: TNode) => {
    if (x.type === "CYL" || x.type === "CE") n++;
    x.children.forEach(w);
  };
  w(root);
  return n;
}

/**
 * Renumber active cylinders. Decommissioned cylinders permanently retain their
 * original differ number — that number is treated as "used" and never reassigned
 * or reused. Active cylinders take the next available numbers from 1 upward,
 * skipping any number occupied by a decommissioned cylinder.
 */
export function assignNextDiffers(tree: TreeData): TreeData {
  if (!tree.root) return { root: null, next_differ: 1 };
  const used = new Set<number>();
  // Pass 1: collect ALL numbers already in use so we never hand them out
  const collectUsed = (n: TNode) => {
    if (n.type === "CYL") {
      // Decommissioned nodes reserve their differ permanently
      if (n.decommissioned_at && n.differ != null) used.add(n.differ);
      // Active nodes with an assigned differ keep it — reserve it
      if (!n.decommissioned_at && n.differ != null) used.add(n.differ);
      // Keyed alike nodes declare which differ they must share
      if (!n.decommissioned_at && n.keyed_alike_source_differ != null) used.add(n.keyed_alike_source_differ);
    }
    n.children.forEach(collectUsed);
  };
  collectUsed(tree.root);
  let counter = 1;
  const nextFree = () => {
    while (used.has(counter)) counter++;
    const v = counter;
    used.add(v);
    counter++;
    return v;
  };
  // Pass 2: assign differs — preserve existing, pin keyed alike, assign fresh only where null
  const assigned = mapTree(tree.root, (n) => {
    // CE (Common Entrance) nodes intentionally receive no differ number —
    // they are opened by all keys in their parent group, not by an individual differ key.
    if (n.type === "CYL" && !n.decommissioned_at) {
      // Keyed alike: always use the pinned source differ
      if (n.keyed_alike_source_differ != null) {
        return { ...n, differ: n.keyed_alike_source_differ };
      }
      // Already has a differ: keep it
      if (n.differ != null) {
        return n;
      }
      // Brand new node with no differ yet: assign next free
      return { ...n, differ: nextFree() };
    }
    return n;
  });
  const max = Math.max(counter - 1, ...Array.from(used), 0);
  return { root: assigned, next_differ: max + 1 };
}

export function assignNextZRefs(root: TNode | null): TNode | null {
  if (!root) return null;
  const used = new Set<string>();
  const collectUsed = (n: TNode) => {
    if (n.type === "CE" && n.z_ref) used.add(n.z_ref);
    n.children.forEach(collectUsed);
  };
  collectUsed(root);
  let counter = 1;
  const nextFree = (): string => {
    let candidate = `Z${counter}`;
    while (used.has(candidate)) { counter++; candidate = `Z${counter}`; }
    used.add(candidate);
    counter++;
    return candidate;
  };
  return mapTree(root, (n) => {
    if (n.type === "CE" && !n.z_ref) {
      return { ...n, z_ref: nextFree() };
    }
    return n;
  });
}

export function collectCENodes(root: TNode | null): TNode[] {
  if (!root) return [];
  const result: TNode[] = [];
  const walk = (n: TNode) => {
    if (n.type === "CE") result.push(n);
    n.children.forEach(walk);
  };
  walk(root);
  return result;
}

// Given a parent Z ref (e.g. "Z1") and all existing z_refs in the tree,
// returns the next available sub-ref e.g. "Z1.1", "Z1.2" etc.
export function nextSubZRef(parentZRef: string, existingZRefs: string[]): string {
  let i = 1;
  while (existingZRefs.includes(`${parentZRef}.${i}`)) i++;
  return `${parentZRef}.${i}`;
}

// Returns the next available top-level Z ref (Z1, Z2, Z3...) not already in use
export function nextTopLevelZRef(existingZRefs: string[]): string {
  const topLevel = existingZRefs.filter((r) => !r.includes("."));
  let i = 1;
  while (topLevel.includes(`Z${i}`)) i++;
  return `Z${i}`;
}



/** Returns a new tree with decommissioned cylinders filtered out, optionally keeping those whose parent SMK is in `revealSmkIds`. */
export function filterDecommissioned(
  root: TNode | null,
  opts: { showAll?: boolean; revealParentIds?: Set<string> } = {},
): TNode | null {
  if (!root) return null;
  const walk = (n: TNode): TNode => {
    const keepChild = (c: TNode): boolean => {
      if (c.type !== "CYL" || !c.decommissioned_at) return true;
      if (opts.showAll) return true;
      if (opts.revealParentIds?.has(n.id)) return true;
      return false;
    };
    return { ...n, children: n.children.filter(keepChild).map(walk) };
  };
  return walk(root);
}

/** Returns set of parent node ids that have at least one decommissioned CYL child. */
export function parentsWithDecommissionedChildren(root: TNode | null): Set<string> {
  const out = new Set<string>();
  if (!root) return out;
  const walk = (n: TNode) => {
    if (n.children.some((c) => c.type === "CYL" && c.decommissioned_at)) out.add(n.id);
    n.children.forEach(walk);
  };
  walk(root);
  return out;
}


/* ---------------- Legacy CK support ---------------- */

/** True if the tree still contains legacy CK ("Door Group") nodes. */
export function hasLegacyCK(root: TNode | null): boolean {
  if (!root) return false;
  if ((root.type as string) === "CK") return true;
  return root.children.some(hasLegacyCK);
}

/**
 * Remove legacy CK nodes and re-parent their CYL children up to the nearest
 * non-CK ancestor. Other node types are preserved verbatim.
 */
export function flattenCK(root: TNode | null): TNode | null {
  if (!root) return null;
  const walk = (n: TNode): TNode => {
    const flatChildren: TNode[] = [];
    for (const c of n.children) {
      const wc = walk(c);
      if ((wc.type as string) === "CK") {
        // Splice CK's (already-flattened) children into the parent's children
        flatChildren.push(...wc.children);
      } else {
        flatChildren.push(wc);
      }
    }
    return { ...n, children: flatChildren };
  };
  // The root itself is never CK in practice; if it somehow is, replace with first child.
  if ((root.type as string) === "CK") {
    const flat = walk(root);
    return flat.children[0] ?? null;
  }
  return walk(root);
}

/* ---------------- Validation ---------------- */

export type ValidationIssue = {
  level: "error" | "warning";
  nodeId?: string;
  message: string;
};

export function validate(tree: TreeData): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  if (!tree.root) {
    out.push({ level: "warning", message: "System is empty — add a Grand Master to start." });
    return out;
  }

  let hasCyl = false;
  const walk = (n: TNode) => {
    const seen = new Map<string, number>();
    const effectiveName = (c: TNode) =>
      (c.type === "MK" || c.type === "SMK") && c.location?.trim()
        ? c.location.trim()
        : c.label.trim();

    n.children.forEach((c) => {
      const key = effectiveName(c).toLowerCase();
      seen.set(key, (seen.get(key) ?? 0) + 1);
    });
    n.children.forEach((c) => {
      if ((seen.get(effectiveName(c).toLowerCase()) ?? 0) > 1) {
        out.push({
          level: "error",
          nodeId: c.id,
          message: `"${effectiveName(c)}" appears more than once under "${n.label}" — each door or zone needs a unique name`,
        });
      }
    });

    if (n.type === "GMK" && n.children.length === 0) {
      out.push({ level: "warning", nodeId: n.id, message: "Grand Master Key has no sections or doors added yet" });
    }
    if (n.type === "MK" && n.children.length === 0) {
      out.push({ level: "warning", nodeId: n.id, message: `"${n.location?.trim() || n.label}" has no zones or doors assigned — add at least one` });
    }
    if (n.type === "SMK" && !n.children.some((c) => c.type === "CYL")) {
      out.push({ level: "warning", nodeId: n.id, message: `"${n.location?.trim() || n.label}" has no door cylinders assigned — add at least one cylinder` });
    }
    if (n.type === "CYL") {
      hasCyl = true;
      if (!n.cylinder_type) {
        out.push({ level: "error", nodeId: n.id, message: `"${n.label || "Unnamed door"}" needs a cylinder type selected before it can be ordered` });
      }
      if (!n.label.trim()) {
        out.push({ level: "error", nodeId: n.id, message: "One of your doors has no name — give it a room or door name" });
      }
    }
    n.children.forEach(walk);
  };
  walk(tree.root);

  if (!hasCyl) out.push({ level: "warning", message: "No door cylinders added yet — add at least one cylinder to complete your system" });
  if (countDoors(tree.root) > 500)
    out.push({ level: "warning", message: "Your system has over 500 doors — that's a large system, please double-check everything looks right" });

  return out;
}
