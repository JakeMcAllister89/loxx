import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  Handle,
  Position,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { products } from '@/data/products';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useCart } from '@/contexts/CartContext';
import { Plus, AlertTriangle, CheckCircle, ShoppingCart, Trash2, Key, Shield, Pencil, Package, CircleDot } from 'lucide-react';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
type NodeLevel = 'grand-master' | 'sub-master' | 'department' | 'floor' | 'room';

const NODE_LABELS: Record<NodeLevel, string> = {
  'grand-master': 'Grand Master',
  'sub-master': 'Sub Master',
  department: 'Department',
  floor: 'Floor',
  room: 'Room',
};

const NODE_COLORS: Record<NodeLevel, { bg: string; text: string; border: string; ring: string }> = {
  'grand-master': { bg: '#1a2744', text: '#ffffff', border: '#1a2744', ring: '#1a274460' },
  'sub-master':   { bg: '#2d4a7a', text: '#ffffff', border: '#2d4a7a', ring: '#2d4a7a50' },
  department:     { bg: '#4a90c4', text: '#ffffff', border: '#4a90c4', ring: '#4a90c440' },
  floor:          { bg: '#7ab8e0', text: '#1a2744', border: '#7ab8e0', ring: '#7ab8e040' },
  room:           { bg: '#d1dde8', text: '#1a2744', border: '#b0c4d8', ring: '#d1dde860' },
};

const CHILD_TYPE: Record<NodeLevel, NodeLevel> = {
  'grand-master': 'sub-master',
  'sub-master': 'department',
  department: 'floor',
  floor: 'room',
  room: 'room',
};

interface KeyNodeData {
  label: string;
  nodeType: NodeLevel;
  cylinderId: string;
  keyCode: string;
  hasError?: boolean;
  [key: string]: unknown;
}

// ── Context menu state (module-level so the custom node can set it) ──────────
type CtxMenuState = { x: number; y: number; nodeId: string } | null;
let _setCtxMenu: React.Dispatch<React.SetStateAction<CtxMenuState>> = () => {};
let _openEditDialog: (id: string) => void = () => {};
let _openCylinderDialog: (id: string) => void = () => {};
let _handleAddChild: (id: string) => void = () => {};
let _handleDelete: (id: string) => void = () => {};

// ── Custom Node ──────────────────────────────────────────────────────────────
function KeyNode({ id, data }: NodeProps<Node<KeyNodeData>>) {
  const d = data as KeyNodeData;
  const colors = NODE_COLORS[d.nodeType] || NODE_COLORS.room;
  const product = products.find(p => p.id === d.cylinderId);
  const hasError = d.hasError;

  const onCtx = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    _setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: id });
  };

  return (
    <>
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !rounded-full !border-2" style={{ background: colors.bg, borderColor: colors.border }} />
      <div
        onContextMenu={onCtx}
        className="cursor-grab active:cursor-grabbing select-none"
        style={{
          minWidth: 190,
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: hasError
            ? '0 0 0 3px hsl(0,84%,60%), 0 4px 20px -4px hsl(0,84%,60%,0.35)'
            : `0 0 0 2px ${colors.ring}, 0 4px 20px -4px rgba(0,0,0,0.12)`,
          transition: 'box-shadow .2s',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3.5 py-2"
          style={{ background: colors.bg, color: colors.text }}
        >
          <CircleDot className="h-3.5 w-3.5 opacity-70" />
          <span className="text-[11px] font-bold tracking-wider uppercase">{NODE_LABELS[d.nodeType]}</span>
        </div>

        {/* Body */}
        <div className="bg-card px-3.5 py-3 space-y-1.5">
          <p className="text-sm font-semibold text-foreground truncate">{d.label}</p>

          {product ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[10px] font-medium">{product.model}</Badge>
              <Badge variant="secondary" className="text-[10px]">{product.security}</Badge>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">No cylinder assigned</p>
          )}

          <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
            <Key className="h-3 w-3" />
            <span className="font-mono">{d.keyCode}</span>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !rounded-full !border-2" style={{ background: colors.bg, borderColor: colors.border }} />
    </>
  );
}

const nodeTypes = { keyNode: KeyNode };

// ── Helpers ──────────────────────────────────────────────────────────────────
let _counter = 1;
function nextKeyCode(level: NodeLevel) {
  const prefixes: Record<NodeLevel, string> = { 'grand-master': 'GM', 'sub-master': 'SM', department: 'DP', floor: 'FL', room: 'RM' };
  _counter++;
  return `${prefixes[level]}-${String(_counter).padStart(3, '0')}`;
}

const EDGE_STYLE = { stroke: '#2d4a7a', strokeWidth: 2 };

const initialNodes: Node<KeyNodeData>[] = [
  {
    id: 'gm-1',
    type: 'keyNode',
    position: { x: 350, y: 40 },
    data: { label: 'Grand Master Key', nodeType: 'grand-master', cylinderId: '', keyCode: 'GM-001' },
  },
];

// ── Designer Inner (needs ReactFlowProvider above) ───────────────────────────
function DesignerInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<KeyNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState>(null);
  const [editDialog, setEditDialog] = useState<{ id: string; label: string } | null>(null);
  const [cylinderDialog, setCylinderDialog] = useState<{ id: string; cylinderId: string } | null>(null);
  const [validationResults, setValidationResults] = useState<{ type: 'error' | 'warning' | 'success'; message: string; nodeId: string }[]>([]);
  const { format } = useCurrency();
  const { addItem } = useCart();
  const reactFlow = useReactFlow();

  // Expose setters to module-level so the custom node component can reach them
  useEffect(() => {
    _setCtxMenu = setCtxMenu;
    _openEditDialog = (id: string) => {
      const n = nodes.find(n => n.id === id);
      if (n) setEditDialog({ id, label: (n.data as KeyNodeData).label });
    };
    _openCylinderDialog = (id: string) => {
      const n = nodes.find(n => n.id === id);
      if (n) setCylinderDialog({ id, cylinderId: (n.data as KeyNodeData).cylinderId });
    };
    _handleAddChild = addChild;
    _handleDelete = deleteNode;
  });

  // ── Node operations ─────────
  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({ ...params, style: EDGE_STYLE, type: 'smoothstep' }, eds));
  }, [setEdges]);

  function addChild(parentId: string) {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;
    const pData = parent.data as KeyNodeData;
    const childType = CHILD_TYPE[pData.nodeType];
    const siblings = edges.filter(e => e.source === parentId).length;
    const newId = `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const newNode: Node<KeyNodeData> = {
      id: newId,
      type: 'keyNode',
      position: { x: parent.position.x + (siblings - 1) * 240, y: parent.position.y + 180 },
      data: {
        label: `${NODE_LABELS[childType]} ${siblings + 1}`,
        nodeType: childType,
        cylinderId: '',
        keyCode: nextKeyCode(childType),
      },
    };

    setNodes(nds => [...nds, newNode]);
    setEdges(eds => [...eds, { id: `e-${parentId}-${newId}`, source: parentId, target: newId, style: EDGE_STYLE, type: 'smoothstep' }]);
  }

  function deleteNode(nodeId: string) {
    const desc = new Set<string>();
    const walk = (id: string) => { desc.add(id); edges.filter(e => e.source === id).forEach(e => walk(e.target)); };
    walk(nodeId);
    setNodes(nds => nds.filter(n => !desc.has(n.id)));
    setEdges(eds => eds.filter(e => !desc.has(e.source) && !desc.has(e.target)));
  }

  // ── Validation ─────────
  const handleValidate = useCallback(() => {
    const msgs: typeof validationResults = [];
    const codeMap = new Map<string, string[]>();

    nodes.forEach(n => {
      const d = n.data as KeyNodeData;
      if (!d.cylinderId) msgs.push({ type: 'warning', message: `"${d.label}" has no cylinder assigned`, nodeId: n.id });
      if (!codeMap.has(d.keyCode)) codeMap.set(d.keyCode, []);
      codeMap.get(d.keyCode)!.push(n.id);
    });

    codeMap.forEach((ids, code) => {
      if (ids.length > 1) ids.forEach(id => msgs.push({ type: 'error', message: `Duplicate key code "${code}"`, nodeId: id }));
    });

    // Orphan check (nodes without parent that aren't root)
    const targets = new Set(edges.map(e => e.target));
    nodes.forEach(n => {
      const d = n.data as KeyNodeData;
      if (d.nodeType !== 'grand-master' && !targets.has(n.id)) {
        msgs.push({ type: 'error', message: `"${d.label}" is disconnected from the hierarchy`, nodeId: n.id });
      }
    });

    // Mark error nodes
    const errorIds = new Set(msgs.filter(m => m.type === 'error').map(m => m.nodeId));
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, hasError: errorIds.has(n.id) } })));

    if (msgs.filter(m => m.type === 'error').length === 0 && msgs.filter(m => m.type === 'warning').length === 0) {
      msgs.push({ type: 'success', message: 'All clear – no conflicts found!', nodeId: '' });
    }

    setValidationResults(msgs);
    toast[msgs.some(m => m.type === 'error') ? 'error' : 'success'](
      msgs.some(m => m.type === 'error') ? 'Validation found errors' : 'System validated successfully'
    );
  }, [nodes, edges, setNodes]);

  // Clear error highlights when nodes change
  const clearErrors = useCallback(() => {
    if (validationResults.length > 0) {
      setValidationResults([]);
      setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, hasError: false } })));
    }
  }, [validationResults, setNodes]);

  // ── Export to cart ─────────
  const handleExportToCart = () => {
    let count = 0;
    nodes.forEach(n => {
      const d = n.data as KeyNodeData;
      if (d.cylinderId) {
        const p = products.find(p => p.id === d.cylinderId);
        if (p) { addItem({ productId: p.id, quantity: 1, size: p.sizes[0], finish: p.finishes[0], keyCode: d.keyCode, nodeLabel: d.label }); count++; }
      }
    });
    toast[count > 0 ? 'success' : 'warning'](count > 0 ? `${count} cylinders added to cart` : 'No cylinders assigned');
  };

  // ── Order summary calc ─────────
  const assignedProducts = useMemo(() =>
    nodes.map(n => ({ data: n.data as KeyNodeData, product: products.find(p => p.id === (n.data as KeyNodeData).cylinderId) })).filter(x => x.product),
    [nodes]
  );
  const totalGBP = assignedProducts.reduce((s, x) => s + (x.product?.priceGBP ?? 0), 0);
  const totalEUR = assignedProducts.reduce((s, x) => s + (x.product?.priceEUR ?? 0), 0);

  // ── Close context menu on click anywhere ─────────
  useEffect(() => {
    const close = () => setCtxMenu(null);
    if (ctxMenu) window.addEventListener('click', close, { once: true });
    return () => window.removeEventListener('click', close);
  }, [ctxMenu]);

  // Minimap node color
  const minimapColor = (n: Node) => {
    const d = n.data as KeyNodeData;
    return NODE_COLORS[d.nodeType]?.bg || '#ccc';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Key System Designer</h1>
          <p className="text-muted-foreground text-sm">Right-click any node to edit · Drag to reorder · Scroll to zoom</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleValidate}>
            <Shield className="h-4 w-4 mr-2" />Validate System
          </Button>
          <Button variant="hero" onClick={handleExportToCart}>
            <ShoppingCart className="h-4 w-4 mr-2" />Export to Cart
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4 h-[calc(100vh-220px)]">
        {/* ── Canvas ── */}
        <Card className="shadow-card overflow-hidden relative rounded-2xl border">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={(changes) => { clearErrors(); onNodesChange(changes); }}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.2}
            maxZoom={2}
            defaultEdgeOptions={{ style: EDGE_STYLE, type: 'smoothstep' }}
            proOptions={{ hideAttribution: true }}
            className="!bg-muted/20"
          >
            <Controls className="!rounded-xl !border !shadow-card" />
            <MiniMap
              nodeColor={minimapColor}
              maskColor="hsl(220,20%,97%,0.85)"
              className="!rounded-xl !border !shadow-card"
              pannable
              zoomable
            />
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="hsl(220,15%,82%)" />
          </ReactFlow>

          {/* ── Context menu ── */}
          {ctxMenu && (
            <div
              className="fixed z-50 bg-card rounded-xl border shadow-elevated py-1.5 min-w-[180px] animate-in fade-in zoom-in-95"
              style={{ top: ctxMenu.y, left: ctxMenu.x }}
            >
              <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-muted transition-colors text-foreground" onClick={() => { _openEditDialog(ctxMenu.nodeId); setCtxMenu(null); }}>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />Edit Label
              </button>
              <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-muted transition-colors text-foreground" onClick={() => { _openCylinderDialog(ctxMenu.nodeId); setCtxMenu(null); }}>
                <Package className="h-3.5 w-3.5 text-muted-foreground" />Change Cylinder
              </button>
              <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-muted transition-colors text-foreground" onClick={() => { addChild(ctxMenu.nodeId); setCtxMenu(null); }}>
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />Add Child Node
              </button>
              {(nodes.find(n => n.id === ctxMenu.nodeId)?.data as KeyNodeData)?.nodeType !== 'grand-master' && (
                <>
                  <div className="border-t my-1" />
                  <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-destructive/10 transition-colors text-destructive" onClick={() => { deleteNode(ctxMenu.nodeId); setCtxMenu(null); }}>
                    <Trash2 className="h-3.5 w-3.5" />Delete Node
                  </button>
                </>
              )}
            </div>
          )}
        </Card>

        {/* ── Right Panel ── */}
        <div className="space-y-4 overflow-auto">
          {/* Order Summary */}
          <Card className="shadow-card rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {assignedProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground">Assign cylinders to nodes to build your order</p>
              ) : (
                <>
                  {assignedProducts.map((x, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
                      <div>
                        <p className="font-medium text-foreground">{x.data.label}</p>
                        <p className="text-muted-foreground">{x.product!.name}</p>
                      </div>
                      <span className="font-semibold text-foreground">{format(x.product!.priceGBP, x.product!.priceEUR)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm font-bold pt-2 border-t">
                    <span>Total ({assignedProducts.length})</span>
                    <span>{format(totalGBP, totalEUR)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Validation Results */}
          {validationResults.length > 0 && (
            <Card className="shadow-card rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />Validation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {validationResults.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 text-xs p-2.5 rounded-lg ${
                      r.type === 'error' ? 'bg-destructive/10 text-destructive' :
                      r.type === 'success' ? 'bg-success/10 text-success' :
                      'bg-warning/10 text-warning'
                    }`}
                  >
                    {r.type === 'error' ? <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> :
                     r.type === 'success' ? <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> :
                     <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
                    <span>{r.message}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Legend */}
          <Card className="shadow-card rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-sm">Hierarchy Levels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(Object.keys(NODE_LABELS) as NodeLevel[]).map(key => (
                <div key={key} className="flex items-center gap-2.5 text-xs">
                  <div className="w-4 h-4 rounded-md" style={{ backgroundColor: NODE_COLORS[key].bg }} />
                  <span className="text-muted-foreground font-medium">{NODE_LABELS[key]}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Edit Label Dialog ── */}
      <Dialog open={!!editDialog} onOpenChange={(o) => !o && setEditDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Node Label</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Label</Label>
            <Input
              value={editDialog?.label ?? ''}
              onChange={e => setEditDialog(prev => prev ? { ...prev, label: e.target.value } : null)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button onClick={() => {
              if (editDialog) {
                setNodes(nds => nds.map(n => n.id === editDialog.id ? { ...n, data: { ...n.data, label: editDialog.label } } : n));
                setEditDialog(null);
              }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change Cylinder Dialog ── */}
      <Dialog open={!!cylinderDialog} onOpenChange={(o) => !o && setCylinderDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Assign Cylinder</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>DOM-UK Cylinder</Label>
            <Select
              value={cylinderDialog?.cylinderId || 'none'}
              onValueChange={v => setCylinderDialog(prev => prev ? { ...prev, cylinderId: v === 'none' ? '' : v } : null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a cylinder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <span>{p.name}</span>
                      <span className="text-muted-foreground">({p.security})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cylinderDialog?.cylinderId && (() => {
              const p = products.find(x => x.id === cylinderDialog.cylinderId);
              if (!p) return null;
              return (
                <div className="bg-muted rounded-lg p-3 space-y-1.5 text-xs">
                  <p className="font-semibold text-foreground">{p.name}</p>
                  <p className="text-muted-foreground">{p.description}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {p.features.map(f => <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>)}
                  </div>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCylinderDialog(null)}>Cancel</Button>
            <Button onClick={() => {
              if (cylinderDialog) {
                setNodes(nds => nds.map(n => n.id === cylinderDialog.id ? { ...n, data: { ...n.data, cylinderId: cylinderDialog.cylinderId } } : n));
                setCylinderDialog(null);
              }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Exported page (wraps with provider) ──────────────────────────────────────
export default function Designer() {
  return (
    <DashboardLayout>
      <ReactFlowProvider>
        <DesignerInner />
      </ReactFlowProvider>
    </DashboardLayout>
  );
}
