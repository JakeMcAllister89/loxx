import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  useReactFlow, Node, Edge, EdgeProps, useNodesState, useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { TNode, TreeData, NodeType, countDoors, validChildTypes, collectCENodes } from "@/lib/keytree";
import { CanvasNode, NODE_WIDTH, NODE_HEIGHT } from "./CanvasNode";

export interface CanvasProduct {
  code: string;
  name: string;
  image_url: string | null;
  finish_colour?: string | null;
  finish?: string | null;
  size?: string | null;
  price_gbp?: number | null;
  /** Customer-specific effective price (falls back to price_gbp if unset). */
  effective_price?: number | null;
}

interface Props {
  tree: TreeData;
  selectedId: string | null;
  errorIds: Set<string>;
  highlightIds?: Set<string>;
  productsByCode: Map<string, CanvasProduct>;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string, childType?: NodeType) => void;
  onPaneClick?: () => void;
  registerFitView?: (fn: () => void) => void;
  /** Parent ids known to have decommissioned CYL children (e.g. SMK). */
  parentsWithDecomm?: Set<string>;
  /** Parent ids whose decommissioned children are currently revealed. */
  revealedDecomm?: Set<string>;
  onToggleReveal?: (parentId: string) => void;
  /** Returns extra non-type actions to append to a node's +-popover. */
  getExtraAddActions?: (node: TNode) => { id: string; label: string; onClick: () => void }[];
  /** When true: disable add popovers / extra actions (view-only mode). */
  readOnly?: boolean;
  collapsed?: Set<string>;
  onToggleCollapsed?: (id: string) => void;
  issueCounts?: Map<string, { issued: number; lost: number }>;
  onOpenIssues?: (nodeId: string, filter: "issued" | "lost") => void;
}

const nodeTypes = { keynode: CanvasNode };

function TreeEdge({ sourceX, sourceY, targetX, targetY, style }: EdgeProps) {
  const isAligned = Math.abs(sourceX - targetX) < 1;
  const path = isAligned
    ? `M${sourceX},${sourceY} L${targetX},${targetY}`
    : (() => {
        const midY = sourceY + (targetY - sourceY) / 2;
        return `M${sourceX},${sourceY} L${sourceX},${midY} L${targetX},${midY} L${targetX},${targetY}`;
      })();
  return <path d={path} fill="none" style={style} />;
}

const edgeTypes = { tree: TreeEdge };

const HGAP = 20;
const VGAP = 60;

interface Laid {
  id: string;
  x: number;
  y: number;
  node: TNode;
}

/** Tidy tree layout: post-order width assignment, parents centred over children.
 *  Special case: when a CE node has sub-CE children (Z1.1, Z1.2), they stack
 *  vertically below the primary CE, and CYL children sit below the whole CE stack.
 */
function layout(root: TNode, collapsed: Set<string> = new Set()): { laid: Laid[]; width: number; height: number } {
  const laid: Laid[] = [];

  const measure = (n: TNode): number => {
    if (n.children.length === 0 || collapsed.has(n.id)) return NODE_WIDTH;
    if (n.type === "CE") {
      return NODE_WIDTH;
    }


    return Math.max(
      NODE_WIDTH,
      n.children.reduce((s, c, i) => s + measure(c) + (i > 0 ? HGAP : 0), 0)
    );
  };

  const place = (n: TNode, x: number, depth: number): { cx: number } => {
    const isCollapsed = collapsed.has(n.id);
    if (n.children.length === 0 || isCollapsed) {
      laid.push({ id: n.id, node: n, x, y: depth * (NODE_HEIGHT + VGAP) });
      return { cx: x + NODE_WIDTH / 2 };
    }

    if (n.type === "CE") {
      // Separate top-level CEs (Z1, Z2 — direct GMK/MK children) from sub-CEs (Z1.1:1, Z1.2)
      const subCEs = n.children.filter(c => c.type === "CE" && c.z_ref?.includes("."));
      const cyls   = n.children.filter(c => c.type === "CYL" && !c.decommissioned_at);

      // Place this CE node
      laid.push({ id: n.id, node: n, x, y: depth * (NODE_HEIGHT + VGAP) });

      // Stack sub-CEs vertically below in same column
      subCEs.forEach((sub, i) => {
        const subDepth = depth + 1 + i;
        laid.push({ id: sub.id, node: sub, x, y: subDepth * (NODE_HEIGHT + VGAP) });
        const subCyls = sub.children.filter(c => c.type === "CYL" && !c.decommissioned_at);
        const subCylStart = subDepth + 1;
        subCyls.forEach((c, j) => {
          laid.push({ id: c.id, node: c, x, y: (subCylStart + j) * (NODE_HEIGHT + VGAP) });
        });
      });

      const maxSubCEDepth = subCEs.length > 0
        ? depth + 1 + subCEs.length - 1 + Math.max(0, ...subCEs.map(s => s.children.filter(c => c.type === "CYL").length))
        : depth;

      const cylStartDepth = maxSubCEDepth + 1;

      const cylY = cylStartDepth * (NODE_HEIGHT + VGAP);

      const totalCylWidth = cyls.length * NODE_WIDTH + (cyls.length - 1) * HGAP;

      const cylStartX = x + NODE_WIDTH / 2 - totalCylWidth / 2;

      cyls.forEach((c, i) => {
        laid.push({ id: c.id, node: c, x: cylStartX + i * (NODE_WIDTH + HGAP), y: cylY });
      });

      return { cx: x + NODE_WIDTH / 2 };
    }

    // Standard horizontal layout
    let cursor = x;
    let firstCX = 0;
    let lastCX = 0;
    n.children.forEach((c, i) => {
      const w = measure(c);
      const r = place(c, cursor, depth + 1);
      if (i === 0) firstCX = r.cx;
      lastCX = r.cx;
      cursor += w + HGAP;
    });
    const cx = (firstCX + lastCX) / 2;
    laid.push({ id: n.id, node: n, x: cx - NODE_WIDTH / 2, y: depth * (NODE_HEIGHT + VGAP) });
    return { cx };
  };

  place(root, 0, 0);

  const maxX = Math.max(...laid.map((l) => l.x + NODE_WIDTH));
  const maxY = Math.max(...laid.map((l) => l.y + NODE_HEIGHT));
  return { laid, width: maxX, height: maxY };
}

function CanvasInner({
  tree, selectedId, errorIds, highlightIds, productsByCode, onSelect, onAddChild, onPaneClick, registerFitView,
  parentsWithDecomm, revealedDecomm, onToggleReveal, getExtraAddActions, readOnly,
  collapsed, onToggleCollapsed, issueCounts, onOpenIssues,
}: Props) {
  const { fitView, setCenter } = useReactFlow();
  const lastNodeCount = useRef(0);

  const { nodes, edges } = useMemo(() => {
    if (!tree.root) return { nodes: [] as Node[], edges: [] as Edge[] };
    const collapsedSet = collapsed ?? new Set<string>();
    const { laid } = layout(tree.root, collapsedSet);

    const totalDoors = countDoors(tree.root);

    const nodes: Node[] = laid.map((l) => {
      const product = (l.node.type === "CYL" || l.node.type === "CE") && l.node.cylinder_type
        ? productsByCode.get(l.node.cylinder_type) ?? null
        : null;
      const kids = l.node.children;
      const isSubCE = l.node.type === "CE" && typeof l.node.z_ref === "string" && l.node.z_ref.includes(".");
      const addOptions = readOnly || isSubCE ? [] : validChildTypes(l.node.type);
      return {
        id: l.id,
        type: "keynode",
        position: { x: l.x, y: l.y },
        draggable: false,
        selectable: true,
        data: {
          node: l.node,
          selected: selectedId === l.id,
          hasError: errorIds.has(l.id),
          highlight: highlightIds?.has(l.id) ?? false,
          product,
          childMkCount:  kids.filter((c) => c.type === "MK").length,
          childSmkCount: kids.filter((c) => c.type === "SMK").length,
          childCylCount: kids.filter((c) => c.type === "CYL" && !c.decommissioned_at).length,
          rootDoorCount: l.node.type === "GMK" ? totalDoors : undefined,
          addOptions,
          onAddChildType: (t: NodeType) => onAddChild(l.id, t),
          extraAddActions: readOnly ? [] : (getExtraAddActions?.(l.node) ?? []),
          hasDecommissionedChildren: parentsWithDecomm?.has(l.id) ?? false,
          revealDecommissioned: revealedDecomm?.has(l.id) ?? false,
          onToggleRevealDecommissioned: () => onToggleReveal?.(l.id),
          isCollapsed: collapsedSet.has(l.id),
          hasChildren: l.node.children.length > 0 && !isSubCE,
          onToggleCollapsed: () => onToggleCollapsed?.(l.id),
          issuedCount: issueCounts?.get(l.id)?.issued ?? 0,
          lostCount: issueCounts?.get(l.id)?.lost ?? 0,
          onOpenIssuedKeys: () => onOpenIssues?.(l.id, "issued"),
          onOpenLostKeys: () => onOpenIssues?.(l.id, "lost"),
        },
      };
    });

    const edges: Edge[] = [];
    const collectEdges = (n: TNode) => {
      if (collapsedSet.has(n.id)) return;
      for (const c of n.children) {
        edges.push({
          id: `${n.id}->${c.id}`,
          source: n.id,
          target: c.id,
          type: "tree",
          style: { stroke: "hsl(var(--border))", strokeWidth: 1.5 },
        });
        collectEdges(c);
      }
    };
    if (tree.root) collectEdges(tree.root);


    return { nodes, edges };
  }, [tree, selectedId, errorIds, highlightIds, productsByCode, onAddChild, parentsWithDecomm, revealedDecomm, onToggleReveal, getExtraAddActions, readOnly, collapsed, onToggleCollapsed, issueCounts, onOpenIssues]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(nodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(edges);

  useEffect(() => { setRfNodes(nodes); }, [nodes, setRfNodes]);
  useEffect(() => { setRfEdges(edges); }, [edges, setRfEdges]);

  // Register a "fit view" trigger for the topbar button
  useEffect(() => {
    if (registerFitView) registerFitView(() => fitView({ padding: 0.25, duration: 400 }));
  }, [registerFitView, fitView]);

  // Auto-pan to newly added nodes
  useEffect(() => {
    if (nodes.length > lastNodeCount.current && lastNodeCount.current > 0) {
      const newest = nodes[nodes.length - 1];
      if (newest?.position) {
        setCenter(newest.position.x + NODE_WIDTH / 2, newest.position.y + NODE_HEIGHT / 2, { zoom: 1, duration: 500 });
      }
    }
    lastNodeCount.current = nodes.length;
  }, [nodes, setCenter]);

  // Fit when node count changes (mount, new system, add/remove)
  useEffect(() => {
    if (nodes.length === 0) return;
    const t = setTimeout(() => fitView({ padding: 0.25, duration: 300 }), 150);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  const handleNodeClick = useCallback((_: unknown, n: Node) => onSelect(n.id), [onSelect]);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      panOnScroll
      minZoom={0.3}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} size={1} color="hsl(var(--border))" />
      <Controls
        showInteractive={false}
        showFitView={true}
        fitViewOptions={{ padding: 0.25, duration: 400 }}
        className="!shadow-card !rounded-[10px] !border"
      />
      <MiniMap
        pannable
        zoomable
        className="!rounded-[10px] !border !shadow-card [&_.react-flow__minimap-zoom]:bg-background [&_.react-flow__minimap-zoom]:border [&_.react-flow__minimap-zoom]:rounded [&_.react-flow__minimap-zoom]:shadow-sm [&_.react-flow__minimap-zoom]:w-6 [&_.react-flow__minimap-zoom]:h-6 [&_.react-flow__minimap-zoom]:flex [&_.react-flow__minimap-zoom]:items-center [&_.react-flow__minimap-zoom]:justify-center [&_.react-flow__minimap-zoom]:text-foreground [&_.react-flow__minimap-zoom]:cursor-pointer [&_.react-flow__minimap-zoom:hover]:bg-muted"
        nodeColor={(n) => {
          const t = (n.data as any)?.node?.type as NodeType | undefined;
          if (!t) return "hsl(var(--border))";
          if (t === "GMK") return "hsl(var(--node-gmk))";
          if (t === "MK")  return "hsl(var(--node-mk))";
          if (t === "SMK") return "hsl(var(--node-smk))";
          return "hsl(var(--node-cyl))";
        }}
        maskColor="hsl(var(--background) / 0.6)"
      />
    </ReactFlow>
  );
}

export function BuilderCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
