import { TreeData, TNode, NodeType, newId, assignNextDiffers } from "./keytree";

export interface ParsedNode {
  level: NodeType;
  label: string;
  parent_label?: string | null;
  cylinder_type?: string | null;
  finish?: string | null;
  room_name?: string | null;
  key_ref?: string | null;
  key_qty?: number | null;
}

export interface BuildResult {
  tree: TreeData;
  warnings: string[];
}

const LEVEL_ALIASES: Record<string, NodeType> = {
  gmk: "GMK", "grand master": "GMK", "grand master key": "GMK",
  smk: "SMK", "sub master": "SMK", "sub-master": "SMK", "sub master key": "SMK",
  ck: "CK", "change key": "CK",
  cyl: "CYL", cylinder: "CYL",
};

export function normalizeLevel(raw: string): NodeType | null {
  if (!raw) return null;
  const k = raw.trim().toLowerCase();
  return LEVEL_ALIASES[k] ?? (["GMK", "SMK", "CK", "CYL"].includes(raw.trim().toUpperCase()) ? (raw.trim().toUpperCase() as NodeType) : null);
}

/** Build a TreeData from a flat list of parsed nodes. */
export function buildTreeFromParsed(nodes: ParsedNode[]): BuildResult {
  const warnings: string[] = [];
  const rows = nodes
    .map((n) => ({ ...n, level: normalizeLevel(n.level as unknown as string) as NodeType | null }))
    .filter((n) => {
      if (!n.level) { warnings.push(`Skipped row with unknown level "${(n as any).level}"`); return false; }
      return true;
    }) as (ParsedNode & { level: NodeType })[];

  // Ensure a GMK exists
  let gmkRow = rows.find((r) => r.level === "GMK");
  if (!gmkRow) {
    gmkRow = { level: "GMK", label: "Grand Master Key" };
    rows.unshift(gmkRow);
    warnings.push("No GMK row found — created 'Grand Master Key' at the root");
  }

  // Build node map keyed by deduped label-per-level
  const root: TNode = { id: newId(), type: "GMK", label: gmkRow.label || "Grand Master Key", children: [] };
  // labelKey -> node for lookup as parent_label
  const byLabel = new Map<string, TNode>();
  byLabel.set(gmkRow.label.toLowerCase(), root);

  for (const r of rows) {
    if (r === gmkRow) continue;

    const labelRaw = r.level === "CYL" ? (r.room_name || r.label || "Cylinder") : (r.label || `${r.level}`);
    let label = labelRaw;

    // Find parent
    let parent: TNode | undefined;
    if (r.parent_label) {
      parent = byLabel.get(r.parent_label.toLowerCase());
    }
    if (!parent) {
      parent = root;
      if (r.parent_label) warnings.push(`Parent "${r.parent_label}" not found for "${label}" — attached to root`);
    }

    // Dedupe siblings
    const seen = new Set(parent.children.map((c) => c.label.toLowerCase()));
    if (seen.has(label.toLowerCase())) {
      let i = 2;
      while (seen.has(`${label} (${i})`.toLowerCase())) i++;
      const renamed = `${label} (${i})`;
      warnings.push(`Duplicate label "${label}" renamed to "${renamed}"`);
      label = renamed;
    }

    const node: TNode = {
      id: newId(),
      type: r.level,
      label,
      children: [],
    };
    if (r.level === "CYL") {
      if (r.cylinder_type) node.cylinder_type = r.cylinder_type;
      if (r.finish) node.finish = r.finish;
    }
    if (r.level === "CK") {
      node.keys = r.key_qty ?? 1;
    }

    parent.children.push(node);
    byLabel.set(label.toLowerCase(), node);
  }

  const tree = assignNextDiffers({ root, next_differ: 1 });
  return { tree, warnings };
}

export function countByType(tree: TreeData): Record<NodeType, number> {
  const counts: Record<NodeType, number> = { GMK: 0, SMK: 0, CK: 0, CYL: 0 };
  const walk = (n: TNode | null) => {
    if (!n) return;
    counts[n.type]++;
    n.children.forEach(walk);
  };
  walk(tree.root);
  return counts;
}

/** Best-effort map of free-text cylinder code to a known product code. */
export function normalizeCylinderCode(raw: string, knownCodes: string[]): { matched: string | null; original: string } {
  if (!raw) return { matched: null, original: raw };
  const norm = raw.trim().toUpperCase().replace(/\s+/g, "-");
  const direct = knownCodes.find((c) => c.toUpperCase() === norm);
  if (direct) return { matched: direct, original: raw };
  const partial = knownCodes.find((c) => c.toUpperCase().replace(/[-\s]/g, "") === norm.replace(/[-\s]/g, ""));
  return { matched: partial ?? null, original: raw };
}

export const CSV_TEMPLATE = `level,label,parent_label,cylinder_type,finish,room_name,key_ref,key_qty
GMK,Grand Master Key,,,,,GMK,10
SMK,Floor 1,Grand Master Key,,,,SUB-F1,4
SMK,Floor 2,Grand Master Key,,,,SUB-F2,4
CK,Office 101,Floor 1,,,Office 101,CK-101,2
CYL,,Office 101,EKZ-12,N.P,Room 101A,,
CYL,,Office 101,EKZ-12,N.P,Room 101B,,
CK,Server Room,Floor 1,,,Server Room,CK-SR,1
CYL,,Server Room,C-KDZ36K36,S.C,Server Room Main Door,,
`;

export function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "loxx-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
