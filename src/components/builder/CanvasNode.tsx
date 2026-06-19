import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { AlertCircle, Plus } from "lucide-react";
import { NodeType, TNode, countDoors } from "@/lib/keytree";
import { colorForFinish } from "@/lib/finishes";

export interface CanvasNodeData {
  node: TNode;
  selected: boolean;
  hasError: boolean;
  product?: { name: string; image_url: string | null } | null;
  childKeyCount?: number; // for SMK
  childCount?: number;    // for SMK (change-keys count)
  rootDoorCount?: number; // for GMK
  highlight?: boolean;    // amber outline for unassigned
  onAddChild?: () => void;
  canAddChild?: boolean;
}

const TYPE_META: Record<NodeType, { label: string; tone: string; dot: string; border: string }> = {
  GMK: { label: "Grand Master", tone: "text-[hsl(var(--node-gmk))]", dot: "hsl(var(--node-gmk))", border: "hsl(var(--node-gmk))" },
  SMK: { label: "Sub Master",   tone: "text-[hsl(var(--node-smk))]", dot: "hsl(var(--node-smk))", border: "hsl(var(--node-smk))" },
  CK:  { label: "Change Key",   tone: "text-[hsl(var(--node-ck))]",  dot: "hsl(var(--node-ck))",  border: "hsl(var(--node-ck))" },
  CYL: { label: "Cylinder",     tone: "text-[hsl(var(--node-cyl))]", dot: "hsl(var(--node-cyl))", border: "hsl(var(--node-cyl))" },
};

export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 104;

function CanvasNodeImpl(props: NodeProps) {
  const d = props.data as unknown as CanvasNodeData;
  const selected = props.selected ?? d.selected;
  const { node, hasError, product, highlight, onAddChild, canAddChild } = d;
  const meta = TYPE_META[node.type];
  const noProduct = node.type === "CYL" && !node.cylinder_type;

  const ringClass = highlight
    ? "ring-2 ring-[hsl(var(--node-cyl))]"
    : selected
      ? "ring-2 ring-primary"
      : hasError
        ? "ring-2 ring-destructive/60"
        : "ring-1 ring-border";

  return (
    <div
      className={`relative bg-card rounded-[10px] shadow-card hover:shadow-elevated transition-shadow ${ringClass}`}
      style={{ width: NODE_WIDTH, minHeight: NODE_HEIGHT, borderLeft: `4px solid ${meta.border}` }}
    >
      {node.type !== "GMK" && <Handle type="target" position={Position.Top} className="!bg-border !w-2 !h-2" />}
      {node.type !== "CYL" && <Handle type="source" position={Position.Bottom} className="!bg-border !w-2 !h-2" />}

      <div className="px-3 py-2">
        {/* Top row: dot + type */}
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: meta.dot }} />
          <span className={`text-[10px] font-mono uppercase tracking-wider ${meta.tone}`}>{meta.label}</span>
          {node.type === "CYL" && node.differ != null && (
            <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(36_94%_95%)] text-[hsl(var(--node-cyl))]">
              D{String(node.differ).padStart(3, "0")}
            </span>
          )}
          {hasError && <AlertCircle className="h-3 w-3 text-destructive ml-auto" />}
        </div>

        {/* Label */}
        <div className="font-semibold text-[13px] leading-tight mt-1 truncate">
          {node.label || <span className="italic text-muted-foreground">Unnamed</span>}
        </div>

        {/* Type-specific footer */}
        {node.type === "GMK" && (
          <div className="text-[11px] text-muted-foreground mt-1.5">
            {d.rootDoorCount ?? 0} door{(d.rootDoorCount ?? 0) !== 1 ? "s" : ""} in system
          </div>
        )}

        {node.type === "SMK" && (
          <div className="text-[11px] text-muted-foreground mt-1.5">
            {d.childCount ?? 0} change key{(d.childCount ?? 0) !== 1 ? "s" : ""}
          </div>
        )}

        {node.type === "CK" && (
          <div className="text-[11px] text-muted-foreground mt-1.5 font-mono">
            {d.childCount ?? 0} cyl · {node.keys ?? 1} key{(node.keys ?? 1) !== 1 ? "s" : ""}
          </div>
        )}

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

      {/* Add child button */}
      {canAddChild && (
        <button
          onClick={(e) => { e.stopPropagation(); onAddChild?.(); }}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 opacity-0 hover:opacity-100 nodrag"
          title="Add child"
          style={{ opacity: selected ? 1 : undefined }}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export const CanvasNode = memo(CanvasNodeImpl);
