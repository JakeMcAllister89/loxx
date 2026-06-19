export type NodeType = "GMK" | "SMK" | "CK" | "CYL";

export interface TNode {
  id: string;
  type: NodeType;
  label: string;
  differ?: number;            // CYL only
  cylinder_type?: string;     // CYL only — product code
  finish?: string;            // CYL only
  size?: string;              // CYL only — e.g. "35/35"
  quantity?: number;          // CYL only — units required at this door (default 1)
  extra_keys?: number;        // CYL only — additional keys beyond the 2 included
  keys?: number;              // GMK/SMK/CK — copies of the key at this level
  children: TNode[];
}

export interface TreeData {
  root: TNode | null;
  next_differ: number;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const newId = () =>
  `n_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

export const emptyTree = (): TreeData => ({ root: null, next_differ: 1 });

export function createGMK(label = "Grand Master"): TNode {
  return { id: newId(), type: "GMK", label, keys: 3, children: [] };
}
export function makeChild(parentType: NodeType, index: number): TNode {
  if (parentType === "GMK") {
    return { id: newId(), type: "SMK", label: `Sub-master ${ALPHABET[index] ?? index + 1}`, keys: 2, children: [] };
  }
  if (parentType === "SMK") {
    return { id: newId(), type: "CK", label: `Door Group ${index + 1}`, keys: 1, children: [] };
  }
  if (parentType === "CK") {
    return { id: newId(), type: "CYL", label: `Door ${index + 1}`, children: [] };
  }
  return { id: newId(), type: "CYL", label: `Door ${index + 1}`, children: [] };
}

export function childTypeOf(t: NodeType): NodeType | null {
  if (t === "GMK") return "SMK";
  if (t === "SMK") return "CK";
  if (t === "CK") return "CYL";
  return null;
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
    if (x.type === "CYL") n++;
    x.children.forEach(w);
  };
  w(root);
  return n;
}

export function assignNextDiffers(tree: TreeData): TreeData {
  if (!tree.root) return tree;
  let next = Math.max(1, tree.next_differ ?? 1);
  const used = new Set<number>();
  const w = (n: TNode) => {
    if (n.type === "CYL" && n.differ != null) used.add(n.differ);
    n.children.forEach(w);
  };
  w(tree.root);
  const assigned = mapTree(tree.root, (n) => {
    if (n.type === "CYL" && (n.differ === undefined || n.differ === null)) {
      while (used.has(next)) next++;
      used.add(next);
      return { ...n, differ: next++ };
    }
    return n;
  });
  return { root: assigned, next_differ: next };
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

  let hasCK = false;
  const walk = (n: TNode) => {
    // duplicate sibling labels
    const seen = new Map<string, number>();
    n.children.forEach((c) => seen.set(c.label.trim().toLowerCase(), (seen.get(c.label.trim().toLowerCase()) ?? 0) + 1));
    n.children.forEach((c) => {
      if ((seen.get(c.label.trim().toLowerCase()) ?? 0) > 1) {
        out.push({ level: "error", nodeId: c.id, message: `Duplicate label "${c.label}" under "${n.label}"` });
      }
    });

    if (n.type === "SMK" && n.children.length === 0) {
      out.push({ level: "warning", nodeId: n.id, message: `Sub-master "${n.label}" has no door groups` });
    }
    if (n.type === "CK") {
      hasCK = true;
      if (n.children.length === 0) {
        out.push({ level: "error", nodeId: n.id, message: `Door group "${n.label}" has no cylinder assigned` });
      }
    }
    if (n.type === "CYL") {
      if (!n.cylinder_type) {
        out.push({ level: "error", nodeId: n.id, message: `Cylinder "${n.label}" has no product selected` });
      }
      if (!n.label.trim()) {
        out.push({ level: "error", nodeId: n.id, message: `Unnamed cylinder` });
      }
    }
    n.children.forEach(walk);
  };
  walk(tree.root);

  if (!hasCK) out.push({ level: "warning", message: "No door groups defined yet" });
  if (countDoors(tree.root) > 500)
    out.push({ level: "warning", message: "System is very large (>500 doors) — please double-check" });

  return out;
}
