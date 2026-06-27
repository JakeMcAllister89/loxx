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
  size?: string | null;
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
      if ((r as any).extra_keys != null) node.extra_keys = (r as any).extra_keys;
      if ((r as any).size != null) node.size = (r as any).size as string;
      if ((r as any).dom_hint) (node as any).dom_hint = (r as any).dom_hint;
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

export interface DomXlParseResult {
  systemName: string;
  nodes: ParsedNode[];
  warnings: string[];
}

export function parseDomXl(buffer: ArrayBuffer): DomXlParseResult {
  const warnings: string[] = [];
  const wb = XLSX.read(buffer, { type: "array", cellText: false, cellDates: true });

  if (!wb.SheetNames.includes("S-Plan")) {
    throw new Error("This doesn't look like a DOM-XL file — 'S-Plan' sheet not found.");
  }

  let systemName = "Imported system";
  try {
    const startWs = wb.Sheets["Start"];
    const startData = XLSX.utils.sheet_to_json<any[]>(startWs, { header: 1, defval: null });
    const startRow = startData[17];
    const objectName = startRow?.[6];
    const customerName = startRow?.[3];
    if (objectName) systemName = String(objectName).trim();
    else if (customerName) systemName = String(customerName).trim();
  } catch {
    warnings.push("Could not read system name from Start sheet — using default.");
  }

  const sWs = wb.Sheets["S-Plan"];
  const raw: any[][] = XLSX.utils.sheet_to_json(sWs, { header: 1, defval: null });

  // ── Colour lookup (Farbe sheet): code → human name ──
  const colourMap: Record<string, string> = {
    "01": "S.N.",
    "04": "S.C.",
    "05": "P.B.",
    "06": "P.B.",
    "00": "S.S.",
  };
  try {
    const farbeWs = wb.Sheets["Farbe"];
    if (farbeWs) {
      const farbe: any[][] = XLSX.utils.sheet_to_json(farbeWs, { header: 1, defval: null });
      for (const row of farbe.slice(1)) {
        const num = row[1] ? String(row[1]).trim().padStart(2, "0") : null;
        const name = row[2] ? String(row[2]).trim() : null;
        if (num && name && !colourMap[num]) colourMap[num] = name;
      }
    }
  } catch { /* ignore */ }

  // ── Design/function lookup (Ausf sheet): code → LOXX cylinder_profile label ──
  const designToProfile: Record<string, string> = {
    "K1": "Thumb Turn",
    "K2": "Thumb Turn",
    "K3": "Thumb Turn",
    "K4": "Thumb Turn",
    "K6": "Thumb Turn",
    "T":  "Double",
    "TB": "Double",
    "B":  "Double",
  };

  // ── Tipo lookup: cylinder body type → LOXX cylinder_type family label ──
  const tipoToFamily: Record<string, string> = {
    "333":    "Euro Profile Cylinder",
    "333M":   "Euro Profile Cylinder",
    "333H":   "Half Cylinder",
    "333HM":  "Half Cylinder",
    "333K6":  "Oval Cylinder",
    "333K6M": "Oval Cylinder",
  };

  const zoneCols: Map<number, { type: "GMK" | "SMK"; label: string }> = new Map();
  const typeRow = raw[2] ?? [];
  const markingRow = raw[6] ?? [];
  const mkNumberRow = raw[7] ?? [];

  for (let col = 26; col < (raw[2]?.length ?? 40); col++) {
    const typeVal = typeRow[col];
    const mkNum = mkNumberRow[col];
    const marking = markingRow[col];
    if (!typeVal && !mkNum) continue;
    if (String(typeVal).trim().toUpperCase() === "GMK" || String(mkNum).trim().toUpperCase() === "GMK") {
      zoneCols.set(col, { type: "GMK", label: "Grand Master Key" });
    } else if (String(typeVal).trim().toUpperCase() === "MK") {
      const label = marking ? String(marking).trim() : (mkNum ? String(mkNum).trim() : `Zone ${col}`);
      zoneCols.set(col, { type: "SMK", label });
    }
  }

  if (zoneCols.size === 0) {
    throw new Error("No key hierarchy columns found in S-Plan sheet. Is this a valid DOM-XL file?");
  }

  const nodes: ParsedNode[] = [];

  nodes.push({
    level: "GMK",
    label: "Grand Master Key",
    parent_label: null,
    key_ref: "GMK",
  });

  const smkZones = Array.from(zoneCols.entries()).filter(([, z]) => z.type === "SMK");
  for (const [, zone] of smkZones) {
    nodes.push({
      level: "SMK",
      label: zone.label,
      parent_label: "Grand Master Key",
    });
  }

  for (let i = 10; i < raw.length; i++) {
    const row = raw[i];
    if (!row) continue;
    const keyNo = row[4];
    if (!keyNo || !String(keyNo).includes("/")) continue;
    const roomDesc = row[3] ? String(row[3]).trim() : null;
    if (!roomDesc) continue;
    const cylType = row[8] ? String(row[8]).trim() : null;
    const lengthRaw = row[10] ? String(row[10]).trim() : null;
    const keyQty = row[6] != null ? Number(row[6]) : null;

    let parentLabel = "Grand Master Key";
    for (const [col, zone] of zoneCols.entries()) {
      // Skip GMK column — its X mark means the GMK key opens this door, not that the door belongs directly to the GMK
      if (zone.type === "GMK") continue;
      if (zone.type === "SMK" && row[col] === "X") {
        parentLabel = zone.label;
        break;
      }
    }

    const rawDesign = row[9] ? String(row[9]).trim() : null;
    const rawColour = row[11] ? String(row[11]).trim() : null;
    const rawTipo = cylType;
    const size = lengthRaw;

    const finish = rawColour ? (colourMap[rawColour] ?? rawColour) : null;
    const cylinderProfile = rawDesign ? (designToProfile[rawDesign] ?? null) : null;
    const cylinderFamily = rawTipo ? (tipoToFamily[rawTipo] ?? rawTipo) : null;
    const decodedLabel = [cylinderFamily, cylinderProfile].filter(Boolean).join(" / ") || rawTipo || "Unknown";
    const extraKeys = keyQty != null ? Math.max(0, keyQty - 2) : 0;

    nodes.push({
      level: "CYL",
      label: roomDesc,
      parent_label: parentLabel,
      room_name: roomDesc,
      cylinder_type: undefined,
      finish: finish ?? undefined,
      extra_keys: extraKeys,
      size: size ?? undefined,
      dom_hint: decodedLabel,
    } as any);
  }

  if (nodes.filter(n => n.level === "CYL").length === 0) {
    warnings.push("No cylinder rows found — the file may be empty or unrecognised.");
  }

  return { systemName, nodes, warnings };
}
