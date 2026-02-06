import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Clock, Truck, CheckCircle, RotateCcw } from 'lucide-react';

const mockOrders = [
  {
    id: 'ORD-001',
    date: '2026-01-28',
    items: 12,
    total: '£547.20',
    status: 'shipped' as const,
    system: 'Main Building Master Key',
  },
  {
    id: 'ORD-002',
    date: '2026-01-15',
    items: 6,
    total: '£234.00',
    status: 'delivered' as const,
    system: 'East Wing Expansion',
  },
];

const statusConfig = {
  paid: { label: 'Paid', icon: Clock, className: 'bg-warning text-warning-foreground' },
  processing: { label: 'Processing', icon: Package, className: 'bg-primary text-primary-foreground' },
  shipped: { label: 'Shipped', icon: Truck, className: 'bg-accent text-accent-foreground' },
  delivered: { label: 'Delivered', icon: CheckCircle, className: 'bg-success text-success-foreground' },
};

export default function Orders() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">My Orders</h1>
          <p className="text-muted-foreground text-sm">Track and manage your cylinder orders</p>
        </div>

        {mockOrders.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-display font-bold text-foreground mb-2">No Orders Yet</h2>
            <p className="text-muted-foreground">Your orders will appear here after checkout.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {mockOrders.map(order => {
              const status = statusConfig[order.status];
              return (
                <Card key={order.id} className="shadow-card">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-display font-bold text-foreground">{order.id}</h3>
                          <Badge className={status.className}>
                            <status.icon className="h-3 w-3 mr-1" />{status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{order.system}</p>
                        <p className="text-xs text-muted-foreground">{order.date} · {order.items} items</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-bold font-display text-foreground">{order.total}</span>
                        <Button variant="outline" size="sm">
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Re-order
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
