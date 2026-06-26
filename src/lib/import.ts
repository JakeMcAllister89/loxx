import * as XLSX from "xlsx";
import { TreeData, TNode, NodeType, newId, assignNextDiffers } from "./keytree";

export interface ParsedNode {
  level: NodeType;
  label: string;
  location?: string | null;
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
  mk: "MK", "master": "MK", "master key": "MK", "building": "MK",
  smk: "SMK", "sub master": "SMK", "sub-master": "SMK", "sub master key": "SMK",
  cyl: "CYL", cylinder: "CYL",
};

export function normalizeLevel(raw: string): NodeType | null {
  if (!raw) return null;
  const k = raw.trim().toLowerCase();
  if (LEVEL_ALIASES[k]) return LEVEL_ALIASES[k];
  // Legacy CK / change key / door group rows are silently mapped to SMK so their
  // CYL children attach directly to the nearest non-CK ancestor downstream.
  if (k === "ck" || k === "change key" || k === "door group") return "SMK";
  const up = raw.trim().toUpperCase();
  if (["GMK", "MK", "SMK", "CYL"].includes(up)) return up as NodeType;
  return null;
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
    if ((r.level === "MK" || r.level === "SMK") && r.location) {
      node.location = r.location;
    }
    if (r.level === "CYL") {
      if (r.cylinder_type) node.cylinder_type = r.cylinder_type;
      if (r.finish) node.finish = r.finish;
    }
    if (r.level === "SMK" && r.key_qty != null) {
      node.keys = r.key_qty;
    }

    parent.children.push(node);
    byLabel.set(label.toLowerCase(), node);
  }

  const tree = assignNextDiffers({ root, next_differ: 1 });
  return { tree, warnings };
}

export function countByType(tree: TreeData): Record<NodeType, number> {
  const counts: Record<NodeType, number> = { GMK: 0, MK: 0, SMK: 0, CYL: 0 };
  const walk = (n: TNode | null) => {
    if (!n) return;
    if (counts[n.type] != null) counts[n.type]++;
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

export const CSV_TEMPLATE = `level,label,location,parent_label,cylinder_type,finish,room_name,key_ref,key_qty
GMK,Grand Master Key,,,,,,GMK,10
MK,Main Building,Block A,Grand Master Key,,,,MK-A,4
SMK,Ground Floor,Rooms 101-120,Main Building,,,,SMK-GF,2
CYL,,,Ground Floor,EKZ-12,N.P,Room 101,,
CYL,,,Ground Floor,EKZ-12,N.P,Room 102,,
SMK,First Floor,Rooms 201-240,Main Building,,,,SMK-FF,2
CYL,,,First Floor,C-KDZ36K36,N.P,Server Room,,
`;

export function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "loxx-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
