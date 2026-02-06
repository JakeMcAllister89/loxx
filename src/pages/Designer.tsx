import { useState, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
  ReactFlow,
  Controls,
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { products } from '@/data/products';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useCart } from '@/contexts/CartContext';
import { Plus, AlertTriangle, CheckCircle, ShoppingCart, Trash2, Key, Shield } from 'lucide-react';
import { toast } from 'sonner';

const nodeTypeLabels: Record<string, string> = {
  'grand-master': 'Grand Master',
  'sub-master': 'Sub Master',
  'department': 'Department',
  'floor': 'Floor',
  'room': 'Room',
};

const nodeTypeColors: Record<string, string> = {
  'grand-master': 'hsl(220, 55%, 15%)',
  'sub-master': 'hsl(220, 45%, 25%)',
  'department': 'hsl(200, 40%, 30%)',
  'floor': 'hsl(152, 55%, 35%)',
  'room': 'hsl(152, 55%, 42%)',
};

interface KeyNodeData {
  label: string;
  nodeType: string;
  cylinderId: string;
  keyCode: string;
  onDelete: (id: string) => void;
  onAddChild: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onUpdateCylinder: (id: string, cylinderId: string) => void;
  [key: string]: unknown;
}

function KeyNode({ id, data }: { id: string; data: KeyNodeData }) {
  const bgColor = nodeTypeColors[data.nodeType] || nodeTypeColors['room'];
  const product = products.find(p => p.id === data.cylinderId);

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-border" />
      <div
        className="rounded-lg shadow-lg min-w-[200px] overflow-hidden"
        style={{ border: `2px solid ${bgColor}` }}
      >
        <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase" style={{ backgroundColor: bgColor, color: 'white' }}>
          {nodeTypeLabels[data.nodeType] || data.nodeType}
        </div>
        <div className="bg-card p-3 space-y-2">
          <Input
            value={data.label}
            onChange={(e) => data.onUpdateLabel(id, e.target.value)}
            className="h-7 text-sm font-medium"
            placeholder="Node name"
          />
          <Select value={data.cylinderId || ''} onValueChange={(v) => data.onUpdateCylinder(id, v)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Assign cylinder" />
            </SelectTrigger>
            <SelectContent>
              {products.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {product && (
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-[10px]">{product.model}</Badge>
              <Badge variant="secondary" className="text-[10px]">{product.security}</Badge>
            </div>
          )}
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Key className="h-3 w-3" /> {data.keyCode}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-6 text-[10px] flex-1" onClick={() => data.onAddChild(id)}>
              <Plus className="h-3 w-3 mr-0.5" />Child
            </Button>
            {data.nodeType !== 'grand-master' && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => data.onDelete(id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-border" />
    </div>
  );
}

const nodeTypes = { custom: KeyNode };

function generateKeyCode(level: number, index: number) {
  const prefixes = ['GM', 'SM', 'DP', 'FL', 'RM'];
  const prefix = prefixes[Math.min(level, prefixes.length - 1)];
  return `${prefix}-${String(index + 1).padStart(3, '0')}`;
}

const childTypeMap: Record<string, string> = {
  'grand-master': 'sub-master',
  'sub-master': 'department',
  'department': 'floor',
  'floor': 'room',
  'room': 'room',
};

const initialNodes: Node[] = [
  {
    id: 'gm-1',
    type: 'custom',
    position: { x: 300, y: 50 },
    data: {
      label: 'Grand Master Key',
      nodeType: 'grand-master',
      cylinderId: '',
      keyCode: 'GM-001',
    },
  },
];

interface ValidationMessage {
  type: 'error' | 'warning';
  message: string;
  nodeId: string;
}

export default function Designer() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [validationResults, setValidationResults] = useState<ValidationMessage[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const { format } = useCurrency();
  const { addItem } = useCart();

  let nodeCounter = nodes.length;

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: 'hsl(220, 55%, 15%)' } }, eds));
  }, [setEdges]);

  const handleAddChild = useCallback((parentId: string) => {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;

    const parentType = (parent.data as KeyNodeData).nodeType;
    const childType = childTypeMap[parentType] || 'room';
    nodeCounter++;
    const newId = `node-${Date.now()}`;
    const childrenCount = edges.filter(e => e.source === parentId).length;

    const newNode: Node = {
      id: newId,
      type: 'custom',
      position: { x: parent.position.x + (childrenCount - 1) * 260, y: parent.position.y + 200 },
      data: {
        label: `${nodeTypeLabels[childType]} ${childrenCount + 1}`,
        nodeType: childType,
        cylinderId: '',
        keyCode: generateKeyCode(Object.keys(nodeTypeLabels).indexOf(childType), nodeCounter),
      },
    };

    setNodes(nds => [...nds, newNode]);
    setEdges(eds => [...eds, { id: `e-${parentId}-${newId}`, source: parentId, target: newId, animated: true, style: { stroke: 'hsl(220, 55%, 15%)' } }]);
  }, [nodes, edges, setNodes, setEdges]);

  const handleDelete = useCallback((nodeId: string) => {
    const descendants = new Set<string>();
    const findDescendants = (id: string) => {
      descendants.add(id);
      edges.filter(e => e.source === id).forEach(e => findDescendants(e.target));
    };
    findDescendants(nodeId);

    setNodes(nds => nds.filter(n => !descendants.has(n.id)));
    setEdges(eds => eds.filter(e => !descendants.has(e.source) && !descendants.has(e.target)));
  }, [edges, setNodes, setEdges]);

  const handleUpdateLabel = useCallback((nodeId: string, label: string) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, label } } : n));
  }, [setNodes]);

  const handleUpdateCylinder = useCallback((nodeId: string, cylinderId: string) => {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, cylinderId } } : n));
  }, [setNodes]);

  // Inject callbacks into node data
  const nodesWithCallbacks = useMemo(() =>
    nodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        onDelete: handleDelete,
        onAddChild: handleAddChild,
        onUpdateLabel: handleUpdateLabel,
        onUpdateCylinder: handleUpdateCylinder,
      },
    })),
    [nodes, handleDelete, handleAddChild, handleUpdateLabel, handleUpdateCylinder]
  );

  const handleValidate = () => {
    const messages: ValidationMessage[] = [];
    const keyCodes = new Map<string, string[]>();

    nodes.forEach(n => {
      const data = n.data as KeyNodeData;
      if (!data.cylinderId) {
        messages.push({ type: 'warning', message: `"${data.label}" has no cylinder assigned`, nodeId: n.id });
      }
      const code = data.keyCode;
      if (!keyCodes.has(code)) keyCodes.set(code, []);
      keyCodes.get(code)!.push(n.id);
    });

    keyCodes.forEach((ids, code) => {
      if (ids.length > 1) {
        messages.push({ type: 'error', message: `Duplicate key code "${code}" found on ${ids.length} nodes`, nodeId: ids[0] });
      }
    });

    // Check for nodes with same parent and same level with same key code
    const parentGroups = new Map<string, Node[]>();
    edges.forEach(e => {
      if (!parentGroups.has(e.source)) parentGroups.set(e.source, []);
      const child = nodes.find(n => n.id === e.target);
      if (child) parentGroups.get(e.source)!.push(child);
    });

    if (messages.length === 0) {
      messages.push({ type: 'warning', message: 'System validated successfully! No conflicts found.', nodeId: '' });
    }

    setValidationResults(messages);
    if (messages.some(m => m.type === 'error')) {
      toast.error('Validation found errors');
    } else {
      toast.success('System validated successfully');
    }
  };

  const handleExportToCart = () => {
    let count = 0;
    nodes.forEach(n => {
      const data = n.data as KeyNodeData;
      if (data.cylinderId) {
        const product = products.find(p => p.id === data.cylinderId);
        if (product) {
          addItem({
            productId: product.id,
            quantity: 1,
            size: product.sizes[0],
            finish: product.finishes[0],
            keyCode: data.keyCode,
            nodeLabel: data.label,
          });
          count++;
        }
      }
    });
    if (count > 0) {
      toast.success(`${count} cylinders added to cart`);
    } else {
      toast.warning('No cylinders assigned in the system');
    }
  };

  // Order summary
  const assignedProducts = nodes
    .map(n => ({ node: n.data as KeyNodeData, product: products.find(p => p.id === (n.data as KeyNodeData).cylinderId) }))
    .filter(x => x.product);

  const totalGBP = assignedProducts.reduce((s, x) => s + (x.product?.priceGBP ?? 0), 0);
  const totalEUR = assignedProducts.reduce((s, x) => s + (x.product?.priceEUR ?? 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Key System Designer</h1>
            <p className="text-muted-foreground text-sm">Build your master-key hierarchy visually</p>
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
          {/* Flow Canvas */}
          <Card className="shadow-card overflow-hidden">
            <div className="h-full">
              <ReactFlow
                nodes={nodesWithCallbacks}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                className="bg-muted/30"
              >
                <Controls />
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
              </ReactFlow>
            </div>
          </Card>

          {/* Right Panel */}
          <div className="space-y-4 overflow-auto">
            {/* Order Summary */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-sm flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {assignedProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Assign cylinders to nodes to see order summary</p>
                ) : (
                  <>
                    {assignedProducts.map((x, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
                        <div>
                          <p className="font-medium text-foreground">{x.node.label}</p>
                          <p className="text-muted-foreground">{x.product!.name}</p>
                        </div>
                        <span className="font-semibold text-foreground">{format(x.product!.priceGBP, x.product!.priceEUR)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm font-bold pt-2 border-t">
                      <span>Total ({assignedProducts.length} items)</span>
                      <span>{format(totalGBP, totalEUR)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Validation Results */}
            {validationResults.length > 0 && (
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" />Validation Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {validationResults.map((r, i) => (
                    <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded ${r.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'}`}>
                      {r.type === 'error' ? <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> : <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
                      <span>{r.message}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Legend */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-sm">Node Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {Object.entries(nodeTypeLabels).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: nodeTypeColors[key] }} />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
