import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { AlertCircle, Plus, Key, History, KeyRound, ChevronDown, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NodeType, TNode } from "@/lib/keytree";
import { colorForFinish } from "@/lib/finishes";

export interface ExtraAddAction {
  id: string;
  label: string;
  onClick: () => void;
}

export interface CanvasNodeData {
  node: TNode;
  selected: boolean;
  hasError: boolean;
  product?: { name: string; image_url: string | null } | null;
  childMkCount?: number;
  childSmkCount?: number;
  childCylCount?: number;
  rootDoorCount?: number;
  highlight?: boolean;
  /** Valid child types this node can spawn — drives the +-button popover */
  addOptions?: NodeType[];
  onAddChildType?: (t: NodeType) => void;
  /** Extra non-type actions appended to the +-popover (e.g. "Order additional keys") */
  extraAddActions?: ExtraAddAction[];
  /** SMK only — whether any direct CYL child is decommissioned */
  hasDecommissionedChildren?: boolean;
  /** SMK only — whether the per-branch reveal is on */
  revealDecommissioned?: boolean;
  onToggleRevealDecommissioned?: () => void;
  isCollapsed?: boolean;
  hasChildren?: boolean;
  onToggleCollapsed?: () => void;
}

const TYPE_META: Record<NodeType, { label: string; tone: string; dot: string; border: string; tintHsl: string; description: string }> = {
  GMK: { label: "Grand Master Key", tone: "text-[hsl(var(--node-gmk))]", dot: "hsl(var(--node-gmk))", border: "hsl(var(--node-gmk))", tintHsl: "var(--node-gmk)", description: "The master key that opens every door — held by senior management." },
  MK:  { label: "Master Key",       tone: "text-[hsl(var(--node-mk))]",  dot: "hsl(var(--node-mk))",  border: "hsl(var(--node-mk))",  tintHsl: "var(--node-mk)",  description: "Opens all doors in one building or section." },
  SMK: { label: "Sub Master Key",   tone: "text-[hsl(var(--node-smk))]", dot: "hsl(var(--node-smk))", border: "hsl(var(--node-smk))", tintHsl: "var(--node-smk)", description: "Opens all doors in one floor or zone." },
  CYL: { label: "Cylinder",         tone: "text-[hsl(var(--node-cyl))]", dot: "hsl(var(--node-cyl))", border: "hsl(var(--node-cyl))", tintHsl: "var(--node-cyl)", description: "The physical lock cylinder on a single door. Has its own differ key, but Sub-Master, Master and Grand Master keys above it can also open this lock." },
};

const ADD_LABEL: Record<NodeType, string> = {
  GMK: "Add grand master key",
  MK:  "Add a building or wing",
  SMK: "Add a floor or department",
  CYL: "Add a door",
};

const NODE_ADD_HINT: Partial<Record<NodeType, string>> = {
  GMK: "Add a building, wing or door",
  MK:  "Add a floor, department or door",
  SMK: "Add a door",
};


/** Layout/Sizing — kept compact so medium systems fit on screen. */
export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 72;

function CanvasNodeImpl(props: NodeProps) {
  const d = props.data as unknown as CanvasNodeData;
  const selected = d.selected;
  const {
    node, hasError, product, highlight, addOptions, onAddChildType,
    extraAddActions, hasDecommissionedChildren, revealDecommissioned, onToggleRevealDecommissioned,
  } = d;
  const meta = TYPE_META[node.type] ?? TYPE_META.SMK;
  const isCyl = node.type === "CYL";
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popoverOpen) return;
    let active = true;
    let mouseHandler: ((e: MouseEvent) => void) | null = null;
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopoverOpen(false);
    };
    const t = setTimeout(() => {
      if (!active) return;
      mouseHandler = (e: MouseEvent) => {
        if (popRef.current && !popRef.current.contains(e.target as Node)) {
          setPopoverOpen(false);
        }
      };
      document.addEventListener("mousedown", mouseHandler);
    }, 0);
    document.addEventListener("keydown", keyHandler);
    return () => {
      active = false;
      clearTimeout(t);
      document.removeEventListener("keydown", keyHandler);
      if (mouseHandler) document.removeEventListener("mousedown", mouseHandler);
    };
  }, [popoverOpen]);




  const ringClass = highlight
    ? "ring-2 ring-primary/60"
    : selected
      ? "ring-2 ring-primary"
      : hasError
        ? "ring-2 ring-destructive/60"
        : "ring-1 ring-border";

  const hasExtras = (extraAddActions?.length ?? 0) > 0;
  const canAdd = (addOptions?.length ?? 0) > 0 || hasExtras;
  const isMkOrSmk = node.type === "MK" || node.type === "SMK";
  const hasLocation = isMkOrSmk && !!node.location?.trim();
  const mainLabel = hasLocation ? node.location!.trim() : node.label;
  const showRefSubLabel = hasLocation;

  // Total keys (supports both legacy number and KeyEntry[] formats)
  const totalKeys: number = typeof node.keys === "number"
    ? node.keys
    : Array.isArray(node.keys)
      ? node.keys.reduce((s: number, k: any) => s + (k?.qty ?? 0), 0)
      : (node.type === "GMK" ? 3 : 2);

  // Build sub-label per type
  const mkN = d.childMkCount ?? 0;
  const smkN = d.childSmkCount ?? 0;
  const cylN = d.childCylCount ?? 0;

  let footer: React.ReactNode = null;
  if (node.type === "GMK") {
    const parts: string[] = [];
    if (mkN > 0) parts.push(`${mkN} building${mkN !== 1 ? "s" : ""}`);
    if (cylN > 0) parts.push(`${cylN} cyl${cylN !== 1 ? "s" : ""}`);
    if (parts.length === 0) {
      const total = d.rootDoorCount ?? 0;
      parts.push(`${total} door${total !== 1 ? "s" : ""}`);
    }
    parts.push(`${totalKeys} key${totalKeys !== 1 ? "s" : ""}`);
    footer = parts.join(" · ");
  } else if (node.type === "MK") {
    const parts: string[] = [`${smkN} zone${smkN !== 1 ? "s" : ""}`];
    if (cylN > 0) parts.push(`${cylN} cyl${cylN !== 1 ? "s" : ""}`);
    parts.push(`${totalKeys} key${totalKeys !== 1 ? "s" : ""}`);
    footer = parts.join(" · ");
  } else if (node.type === "SMK") {
    footer = `${cylN} cylinder${cylN !== 1 ? "s" : ""}`;
  }

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const total = (addOptions?.length ?? 0) + (extraAddActions?.length ?? 0);
    if (total === 1 && (addOptions?.length ?? 0) === 1) {
      onAddChildType?.(addOptions![0]);
      setPopoverOpen(false);
    }
  };

  const cardWidth = isCyl ? 160 : 180;
  const padding = isCyl ? "px-2.5 py-2" : "px-3 py-2";
  const isDecommissioned = isCyl && !!node.decommissioned_at;
  const decommTooltip = isDecommissioned
    ? `This differ was decommissioned on ${new Date(node.decommissioned_at!).toLocaleDateString("en-GB")}${
        node.replaced_by_differ != null ? ` — replaced by D${String(node.replaced_by_differ).padStart(3, "0")}` : ""
      } due to ${node.decommissioned_reason === "lost_key" ? "lost key" : "faulty cylinder"}`
    : undefined;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={decommTooltip}
      className={`relative rounded-lg cursor-pointer transition-[box-shadow,background-color] duration-150 ${ringClass} ${
        isDecommissioned ? "bg-muted/60 opacity-80" : "bg-card"
      }`}
      style={{
        width: cardWidth,
        borderLeft: `3px solid ${isDecommissioned ? "hsl(var(--muted-foreground))" : meta.border}`,
        boxShadow: hovered || selected || highlight ? "0 4px 14px rgba(0,0,0,0.10)" : "0 1px 2px rgba(0,0,0,0.04)",
        background: isDecommissioned ? undefined
          : selected ? `hsl(${meta.tintHsl} / 0.18)`
          : hovered || highlight ? `hsl(${meta.tintHsl} / 0.10)`
          : undefined,
      }}
    >
      {node.type !== "GMK" && <Handle type="target" position={Position.Top} className="!bg-border !w-2 !h-2" />}
      {node.type !== "CYL" && <Handle type="source" position={Position.Bottom} className="!bg-border !w-2 !h-2" />}

      <div className={`${padding} text-center`}>
        {/* Row 1 — type label */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`font-mono uppercase ${meta.tone} cursor-help inline-block`}
                style={{ fontSize: 9, letterSpacing: "0.08em", marginBottom: 3 }}
              >
                {meta.label}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[200px]">
              {meta.description}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Row 2 — main label */}
        <div
          className="font-semibold leading-tight truncate"
          style={{ fontSize: 13, maxWidth: "100%" }}
          title={mainLabel}
        >
          {mainLabel || <span className="italic text-muted-foreground">Unnamed</span>}
        </div>

        {/* Row 3 — reference code (MK/SMK only, when location set) */}
        {showRefSubLabel && (
          <div className="font-mono text-[hsl(var(--node-cyl))] truncate" style={{ fontSize: 10, marginTop: 1 }}>
            {node.label}
          </div>
        )}

        {/* Row 3 — CYL differ + extras badges, inline centred */}
        {isCyl && (node.differ != null || (node.extra_keys ?? 0) > 0 || isDecommissioned) && (
          <div className="flex items-center justify-center gap-1 mt-1">
            {node.differ != null && (
              <span
                className={`font-mono px-1.5 py-0.5 rounded ${
                  isDecommissioned
                    ? "bg-destructive/10 text-destructive line-through"
                    : "bg-[hsl(36_94%_95%)] text-[hsl(var(--node-cyl))]"
                }`}
                style={{ fontSize: 9 }}
              >
                D{String(node.differ).padStart(3, "0")}
              </span>
            )}
            {isDecommissioned && (
              <span
                className="font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground"
                style={{ fontSize: 8, letterSpacing: "0.08em" }}
              >
                Replaced
              </span>
            )}
            {!isDecommissioned && (node.extra_keys ?? 0) > 0 && (
              <span
                className="inline-flex items-center gap-0.5 font-mono px-1.5 py-0.5 rounded bg-[hsl(36_94%_95%)] text-[hsl(var(--node-cyl))]"
                style={{ fontSize: 9 }}
                title={`${node.extra_keys} extra key(s)`}
              >
                <Key className="h-2 w-2" />+{node.extra_keys}
              </span>
            )}
          </div>
        )}

        {/* Row 4 — sub-label / stats (non-CYL) */}
        {!isCyl && footer && (
          <div className="text-muted-foreground" style={{ fontSize: 10, marginTop: 2 }}>{footer}</div>
        )}

        {/* Row 4 — CYL product or NO PRODUCT warning */}
        {isCyl && (
          <div className="mt-1 flex items-center justify-center gap-1.5">
            {product ? (
              <>
                {node.finish && (
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0 border"
                    style={{ background: colorForFinish(node.finish), borderColor: "hsl(var(--border))" }}
                    title={node.finish}
                  />
                )}
                <span className="text-muted-foreground truncate" style={{ fontSize: 10 }} title={product.name}>
                  {product.name}
                </span>
              </>
            ) : (
              <span className="font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/30" style={{ fontSize: 9 }}>
                No product
              </span>
            )}
          </div>
        )}

        {hasError && (
          <AlertCircle className="absolute top-1 right-1 h-3 w-3 text-destructive" />
        )}

        {hasDecommissionedChildren && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleRevealDecommissioned?.(); }}
            title={revealDecommissioned ? "Hide replaced cylinders" : "Show replaced cylinders"}
            className={`nodrag absolute top-1 right-1 h-5 w-5 rounded-full flex items-center justify-center border ${
              revealDecommissioned ? "bg-destructive/10 border-destructive/40 text-destructive" : "bg-muted border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-3 w-3" />
          </button>
        )}

        {d.isCollapsed && d.node.children.length > 0 && (
          <div className="mt-1 text-center text-[10px] text-muted-foreground">
            {d.node.children.length} hidden
          </div>
        )}
      </div>

      {d.hasChildren && (
        <button
          onClick={(e) => { e.stopPropagation(); d.onToggleCollapsed?.(); }}
          className="absolute bottom-1 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-muted/80 transition-colors z-10"
          title={d.isCollapsed ? "Expand" : "Collapse"}
        >
          {d.isCollapsed
            ? <ChevronRight className="h-3 w-3 text-muted-foreground" />
            : <ChevronDown className="h-3 w-3 text-muted-foreground" />
          }
        </button>
      )}

      {canAdd && (
        <div
          ref={popRef}
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 nodrag group/add"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              if ((addOptions?.length ?? 0) + (extraAddActions?.length ?? 0) > 1) {
                setPopoverOpen((v) => !v);
              } else {
                handlePlusClick(e);
              }
            }}
            className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90"
            aria-label="Add child"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {!popoverOpen && (
            <div className="pointer-events-none absolute top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground text-background text-[10px] font-medium px-1.5 py-0.5 opacity-0 group-hover/add:opacity-100 transition-opacity shadow-md">
              {(addOptions?.length ?? 0) + (extraAddActions?.length ?? 0) === 1 && addOptions?.length === 1
                ? ADD_LABEL[addOptions[0]]
                : NODE_ADD_HINT[node.type] ?? "Add…"}
            </div>
          )}
          {popoverOpen && (
            <div
              className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-card border rounded-md shadow-elevated py-1 min-w-[200px] z-50"
              onKeyDown={(e) => { if (e.key === "Escape") setPopoverOpen(false); }}
            >
              {addOptions?.map((t) => (
                <button
                  key={t}
                  onClick={(e) => { e.stopPropagation(); setPopoverOpen(false); onAddChildType?.(t); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted text-left"
                >
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: TYPE_META[t].dot }} />
                  <span>{ADD_LABEL[t]}</span>
                </button>
              ))}
              {hasExtras && (addOptions?.length ?? 0) > 0 && <div className="my-1 border-t" />}
              {extraAddActions?.map((a) => (
                <button
                  key={a.id}
                  onClick={(e) => { e.stopPropagation(); setPopoverOpen(false); a.onClick(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted text-left"
                >
                  <KeyRound className="h-3 w-3 shrink-0 text-amber-600" />
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const CanvasNode = memo(CanvasNodeImpl);
