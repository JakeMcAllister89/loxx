import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { AlertCircle, Plus, Key } from "lucide-react";
import { NodeType, TNode } from "@/lib/keytree";
import { colorForFinish } from "@/lib/finishes";

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
}

const TYPE_META: Record<NodeType, { label: string; tone: string; dot: string; border: string }> = {
  GMK: { label: "Grand Master", tone: "text-[hsl(var(--node-gmk))]", dot: "hsl(var(--node-gmk))", border: "hsl(var(--node-gmk))" },
  MK:  { label: "Master Key",   tone: "text-[hsl(var(--node-mk))]",  dot: "hsl(var(--node-mk))",  border: "hsl(var(--node-mk))" },
  SMK: { label: "Sub Master",   tone: "text-[hsl(var(--node-smk))]", dot: "hsl(var(--node-smk))", border: "hsl(var(--node-smk))" },
  CYL: { label: "Cylinder",     tone: "text-[hsl(var(--node-cyl))]", dot: "hsl(var(--node-cyl))", border: "hsl(var(--node-cyl))" },
};

const ADD_LABEL: Record<NodeType, string> = {
  GMK: "Add grand master",
  MK:  "Add master key",
  SMK: "Add sub-master",
  CYL: "Add cylinder",
};

export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 104;

function CanvasNodeImpl(props: NodeProps) {
  const d = props.data as unknown as CanvasNodeData;
  const selected = props.selected ?? d.selected;
  const { node, hasError, product, highlight, addOptions, onAddChildType } = d;
  const meta = TYPE_META[node.type] ?? TYPE_META.SMK;
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setPopoverOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [popoverOpen]);

  const ringClass = highlight
    ? "ring-2 ring-[hsl(var(--node-cyl))]"
    : selected
      ? "ring-2 ring-primary"
      : hasError
        ? "ring-2 ring-destructive/60"
        : "ring-1 ring-border";

  const canAdd = (addOptions?.length ?? 0) > 0;
  const showLocation = (node.type === "MK" || node.type === "SMK") && node.location;

  // Build sub-label per type
  const mkN = d.childMkCount ?? 0;
  const smkN = d.childSmkCount ?? 0;
  const cylN = d.childCylCount ?? 0;

  let footer: React.ReactNode = null;
  if (node.type === "GMK") {
    const parts: string[] = [];
    if (mkN > 0) parts.push(`${mkN} building${mkN !== 1 ? "s" : ""}`);
    if (cylN > 0) parts.push(`${cylN} cylinder${cylN !== 1 ? "s" : ""}`);
    const total = d.rootDoorCount ?? 0;
    if (parts.length === 0) parts.push(`${total} door${total !== 1 ? "s" : ""}`);
    parts.push(`${node.keys ?? 3} key${(node.keys ?? 3) !== 1 ? "s" : ""}`);
    footer = parts.join(" · ");
  } else if (node.type === "MK") {
    const parts: string[] = [`${smkN} zone${smkN !== 1 ? "s" : ""}`];
    if (cylN > 0) parts.push(`${cylN} cylinder${cylN !== 1 ? "s" : ""}`);
    parts.push(`${node.keys ?? 2} key${(node.keys ?? 2) !== 1 ? "s" : ""}`);
    footer = parts.join(" · ");
  } else if (node.type === "SMK") {
    footer = `${cylN} cylinder${cylN !== 1 ? "s" : ""} · ${node.keys ?? 2} key${(node.keys ?? 2) !== 1 ? "s" : ""}`;
  }

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!addOptions || addOptions.length === 0) return;
    if (addOptions.length === 1) {
      onAddChildType?.(addOptions[0]);
    } else {
      setPopoverOpen((v) => !v);
    }
  };

  return (
    <div
      className={`relative bg-card rounded-[10px] shadow-card hover:shadow-elevated transition-shadow ${ringClass}`}
      style={{ width: NODE_WIDTH, minHeight: NODE_HEIGHT, borderLeft: `4px solid ${meta.border}` }}
    >
      {node.type !== "GMK" && <Handle type="target" position={Position.Top} className="!bg-border !w-2 !h-2" />}
      {node.type !== "CYL" && <Handle type="source" position={Position.Bottom} className="!bg-border !w-2 !h-2" />}

      <div className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: meta.dot }} />
          <span className={`text-[10px] font-mono uppercase tracking-wider ${meta.tone}`}>{meta.label}</span>
          {node.type === "CYL" && (node.extra_keys ?? 0) > 0 && (
            <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(36_94%_95%)] text-[hsl(var(--node-cyl))]" title={`${node.extra_keys} extra key(s)`}>
              <Key className="h-2.5 w-2.5" />+{node.extra_keys}
            </span>
          )}
          {node.type === "CYL" && node.differ != null && (
            <span className={`${(node.extra_keys ?? 0) > 0 ? "" : "ml-auto"} text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(36_94%_95%)] text-[hsl(var(--node-cyl))]`}>
              D{String(node.differ).padStart(3, "0")}
            </span>
          )}
          {hasError && <AlertCircle className="h-3 w-3 text-destructive ml-auto" />}
        </div>

        <div className="font-semibold text-[13px] leading-tight mt-1 truncate">
          {node.label || <span className="italic text-muted-foreground">Unnamed</span>}
        </div>
        {showLocation && (
          <div className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">{node.location}</div>
        )}

        {footer && <div className="text-[11px] text-muted-foreground mt-1.5">{footer}</div>}

        {node.type === "CYL" && (
          <div className="mt-1.5 flex items-center gap-2">
            {product ? (
              <>
                <div className="h-5 w-5 rounded bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                  {product.image_url
                    ? <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                    : <div className="h-full w-full bg-muted" />}
                </div>
                <span className="text-[11px] truncate flex-1" title={product.name}>{product.name}</span>
                {node.finish && (
                  <span
                    className="h-3 w-3 rounded-full shrink-0 border"
                    style={{ background: colorForFinish(node.finish), borderColor: "hsl(var(--border))" }}
                    title={node.finish}
                  />
                )}
              </>
            ) : (
              <span className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/30">
                No product
              </span>
            )}
          </div>
        )}
      </div>

      {canAdd && (
        <div ref={popRef} className="absolute -bottom-3 left-1/2 -translate-x-1/2 nodrag">
          <button
            onClick={handlePlusClick}
            className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 opacity-0 hover:opacity-100 transition-opacity"
            title="Add child"
            style={{ opacity: selected || popoverOpen ? 1 : undefined }}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {popoverOpen && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-card border rounded-md shadow-elevated py-1 min-w-[160px] z-10">
              {addOptions!.map((t) => (
                <button
                  key={t}
                  onClick={(e) => { e.stopPropagation(); setPopoverOpen(false); onAddChildType?.(t); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted text-left"
                >
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: TYPE_META[t].dot }} />
                  <span>{ADD_LABEL[t]}</span>
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
