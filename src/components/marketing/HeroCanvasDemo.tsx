import { useEffect, useState, useMemo } from "react";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CanvasNode, NODE_WIDTH, NODE_HEIGHT } from "@/components/builder/CanvasNode";
import { TNode, NodeType } from "@/lib/keytree";

const nodeTypes = { keynode: CanvasNode };

interface DemoProduct {
  name: string;
  code: string;
  finish: string;
  finish_colour: string;
  size: string;
  image_url: string | null;
  price_gbp: number | null;
}

interface DemoNodeSpec {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  revealAt: number;
  childMkCount?: number;
  childSmkCount?: number;
  childCylCount?: number;
  product?: DemoProduct;
}

const CYL_PRODUCT: DemoProduct = {
  name: "Euro Cylinder",
  code: "333K130235",
  finish: "Satin Nickel",
  finish_colour: "#C7C7C7",
  size: "35x35mm",
  image_url: null,
  price_gbp: null,
};

const NODES: DemoNodeSpec[] = [
  { id: "demo-gmk",   type: "GMK", label: "Grand Master Key", x: 260, y: 0,   revealAt: 1, childMkCount: 2, childCylCount: 4 },
  { id: "demo-mk-1",  type: "MK",  label: "West Wing",        x: 80,  y: 140, revealAt: 2, childSmkCount: 1, childCylCount: 2 },
  { id: "demo-mk-2",  type: "MK",  label: "East Wing",        x: 440, y: 140, revealAt: 2, childSmkCount: 1, childCylCount: 2 },
  { id: "demo-smk-1", type: "SMK", label: "History",          x: 80,  y: 280, revealAt: 3, childCylCount: 2 },
  { id: "demo-smk-2", type: "SMK", label: "English",          x: 440, y: 280, revealAt: 3, childCylCount: 2 },
  { id: "demo-cyl-1", type: "CYL", label: "History Room 01",  x: 20,  y: 420, revealAt: 4, product: CYL_PRODUCT },
  { id: "demo-cyl-2", type: "CYL", label: "History Room 02",  x: 224, y: 420, revealAt: 4, product: CYL_PRODUCT },
  { id: "demo-cyl-3", type: "CYL", label: "English Room 01",  x: 444, y: 420, revealAt: 4, product: CYL_PRODUCT },
  { id: "demo-cyl-4", type: "CYL", label: "English Room 02",  x: 648, y: 420, revealAt: 4, product: CYL_PRODUCT },
];

const EDGES: Array<{ id: string; source: string; target: string; revealAt: number }> = [
  { id: "e-gmk-mk1",   source: "demo-gmk",   target: "demo-mk-1",  revealAt: 2 },
  { id: "e-gmk-mk2",   source: "demo-gmk",   target: "demo-mk-2",  revealAt: 2 },
  { id: "e-mk1-smk1",  source: "demo-mk-1",  target: "demo-smk-1", revealAt: 3 },
  { id: "e-mk2-smk2",  source: "demo-mk-2",  target: "demo-smk-2", revealAt: 3 },
  { id: "e-smk1-cyl1", source: "demo-smk-1", target: "demo-cyl-1", revealAt: 4 },
  { id: "e-smk1-cyl2", source: "demo-smk-1", target: "demo-cyl-2", revealAt: 4 },
  { id: "e-smk2-cyl3", source: "demo-smk-2", target: "demo-cyl-3", revealAt: 4 },
  { id: "e-smk2-cyl4", source: "demo-smk-2", target: "demo-cyl-4", revealAt: 4 },
];

function buildTNode(spec: DemoNodeSpec): TNode {
  return { id: spec.id, type: spec.type, label: spec.label, children: [] } as TNode;
}

function HeroCanvasDemoInner() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      setStage((s) => {
        const next = s >= 4 ? 0 : s + 1;
        timer = setTimeout(tick, next === 4 ? 2500 : 700);
        return next;
      });
    };
    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, []);

  const rfNodes = useMemo(
    () =>
      NODES.map((n) => {
        const visible = n.revealAt <= stage;
        return {
          id: n.id,
          type: "keynode",
          position: { x: n.x, y: n.y },
          draggable: false,
          selectable: false,
          data: {
            node: buildTNode(n),
            selected: false,
            hasError: false,
            addOptions:
              n.type === "GMK"
                ? ["MK"]
                : n.type === "MK"
                ? ["SMK"]
                : n.type === "SMK"
                ? ["CYL"]
                : [],
            onAddChildType: () => {},
            highlight: false,
            childMkCount: n.childMkCount,
            childSmkCount: n.childSmkCount,
            childCylCount: n.childCylCount,
            product: n.product ?? null,
          },
          style: {
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            opacity: visible ? 1 : 0,
            transition: "opacity 400ms ease-out",
            pointerEvents: "none" as const,
          },
        };
      }),
    [stage],
  );

  const rfEdges = useMemo(
    () =>
      EDGES.filter((e) => e.revealAt <= stage).map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        style: { stroke: "hsl(var(--border))", strokeWidth: 1.5 },
      })),
    [stage],
  );

  return (
    <div className="w-full h-[440px] rounded-lg overflow-hidden" style={{ backgroundColor: "#fafafa" }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        defaultViewport={{ x: 0, y: 10, zoom: 0.72 }}
        minZoom={0.72}
        maxZoom={0.72}
      >
      </ReactFlow>
    </div>
  );
}

export function HeroCanvasDemo() {
  return (
    <ReactFlowProvider>
      <HeroCanvasDemoInner />
    </ReactFlowProvider>
  );
}
