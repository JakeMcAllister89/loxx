import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  useReactFlow, Node, Edge, useNodesState, useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TNode, TreeData, NodeType, countDoors } from "@/lib/keytree";
import { CanvasNode, NODE_WIDTH, NODE_HEIGHT } from "./CanvasNode";

export interface CanvasProduct {
  code: string;
  name: string;
  image_url: string | null;
}

interface Props {
  tree: TreeData;
  selectedId: string | null;
  errorIds: Set<string>;
  highlightIds?: Set<string>;
  productsByCode: Map<string, CanvasProduct>;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onPaneClick?: () => void;
  registerFitView?: (fn: () => void) => void;
}

const nodeTypes = { keynode: CanvasNode };

const HGAP = 32;
const VGAP = 80;

interface Laid {
  id: string;
  x: number;
  y: number;
  node: TNode;
}

/** Tidy tree layout: post-order width assignment, parents centred over children. */
function layout(root: TNode): { laid: Laid[]; width: number; height: number } {
  const laid: Laid[] = [];

  const measure = (n: TNode): { w: number } => {
    if (n.children.length === 0) return { w: NODE_WIDTH };
    const childW = n.children.reduce((sum, c, i) => sum + measure(c).w + (i > 0 ? HGAP : 0), 0);
    return { w: Math.max(NODE_WIDTH, childW) };
  };

  const place = (n: TNode, x: number, depth: number): { x: number; w: number } => {
    const subW = measure(n).w;
    if (n.children.length === 0) {
      laid.push({ id: n.id, node: n, x, y: depth * (NODE_HEIGHT + VGAP) });
      return { x: x + NODE_WIDTH / 2, w: NODE_WIDTH };
    }
    let cursor = x;
    let firstCenter = 0;
    let lastCenter = 0;
    n.children.forEach((c, i) => {
      const r = place(c, cursor, depth + 1);
      if (i === 0) firstCenter = r.x;
      lastCenter = r.x;
      cursor += r.w + HGAP;
    });
    const centerX = (firstCenter + lastCenter) / 2;
    laid.push({ id: n.id, node: n, x: centerX - NODE_WIDTH / 2, y: depth * (NODE_HEIGHT + VGAP) });
    return { x: centerX, w: subW };
  };

  place(root, 0, 0);
  const maxX = Math.max(...laid.map((l) => l.x + NODE_WIDTH));
  const maxY = Math.max(...laid.map((l) => l.y + NODE_HEIGHT));
  return { laid, width: maxX, height: maxY };
}

function CanvasInner({ tree, selectedId, errorIds, highlightIds, productsByCode, onSelect, onAddChild, registerFitView }: Props) {
  const { fitView, setCenter } = useReactFlow();
  const lastNodeCount = useRef(0);

  const { nodes, edges } = useMemo(() => {
    if (!tree.root) return { nodes: [] as Node[], edges: [] as Edge[] };
    const { laid } = layout(tree.root);

    const childCountByParent = new Map<string, number>();
    const findParent = (n: TNode, target: string, parent: TNode | null = null): TNode | null => {
      if (n.id === target) return parent;
      for (const c of n.children) {
        const r = findParent(c, target, n);
        if (r) return r;
      }
      return null;
    };

    const totalDoors = countDoors(tree.root);

    const nodes: Node[] = laid.map((l) => {
      const product = l.node.type === "CYL" && l.node.cylinder_type
        ? productsByCode.get(l.node.cylinder_type) ?? null
        : null;
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
          childCount: l.node.children.length,
          rootDoorCount: l.node.type === "GMK" ? totalDoors : undefined,
          canAddChild: l.node.type !== "CYL",
          onAddChild: () => onAddChild(l.id),
        },
      };
    });

    const edges: Edge[] = [];
    const collectEdges = (n: TNode) => {
      for (const c of n.children) {
        edges.push({
          id: `${n.id}->${c.id}`,
          source: n.id,
          target: c.id,
          type: "smoothstep",
          style: { stroke: "hsl(var(--border))", strokeWidth: 1.5 },
        });
        collectEdges(c);
      }
    };
    if (tree.root) collectEdges(tree.root);
    return { nodes, edges };
  }, [tree, selectedId, errorIds, highlightIds, productsByCode, onAddChild]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(nodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(edges);

  useEffect(() => { setRfNodes(nodes); }, [nodes, setRfNodes]);
  useEffect(() => { setRfEdges(edges); }, [edges, setRfEdges]);

  // Register a "fit view" trigger for the topbar button
  useEffect(() => {
    if (registerFitView) registerFitView(() => fitView({ padding: 0.2, duration: 400 }));
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

  // Fit on first mount with content
  useEffect(() => {
    if (nodes.length > 0) {
      const t = setTimeout(() => fitView({ padding: 0.2, duration: 0 }), 50);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNodeClick = useCallback((_: unknown, n: Node) => onSelect(n.id), [onSelect]);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      panOnScroll
      minZoom={0.3}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
      fitView
      fitViewOptions={{ padding: 0.2 }}
    >
      <Background gap={20} size={1} color="hsl(var(--border))" />
      <Controls showInteractive={false} className="!shadow-card !rounded-[10px] !border" />
      <MiniMap
        pannable zoomable
        className="!rounded-[10px] !border !shadow-card"
        nodeColor={(n) => {
          const t = (n.data as any)?.node?.type as NodeType | undefined;
          if (!t) return "hsl(var(--border))";
          if (t === "GMK") return "hsl(var(--node-gmk))";
          if (t === "SMK") return "hsl(var(--node-smk))";
          if (t === "CK")  return "hsl(var(--node-ck))";
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
