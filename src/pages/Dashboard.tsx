import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingCart, DollarSign, Activity, GitBranch, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';

const stats = [
  { label: 'Total Cylinders', value: '0', icon: Package, change: 'In your systems' },
  { label: 'Pending Orders', value: '0', icon: ShoppingCart, change: 'Awaiting dispatch' },
  { label: 'Total Spend', valueGBP: '£0.00', valueEUR: '€0.00', icon: DollarSign, change: 'Lifetime' },
  { label: 'Active Systems', value: '0', icon: GitBranch, change: 'Key hierarchies' },
];

const recentActivity = [
  { text: 'Welcome to DOM-UK Master Key Platform! Start by browsing the product catalog or designing your first key system.', time: 'Just now', icon: Activity },
];

export default function Dashboard() {
  const { currency } = useCurrency();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Welcome back! Here's your master-key system overview.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map(s => (
            <Card key={s.label} className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-display font-bold text-foreground">
                  {s.valueGBP ? (currency === 'GBP' ? s.valueGBP : s.valueEUR) : s.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{s.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/designer"><GitBranch className="mr-2 h-4 w-4" />Create New Key System</Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/catalog"><Package className="mr-2 h-4 w-4" />Browse Product Catalog</Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/orders"><ShoppingCart className="mr-2 h-4 w-4" />View Orders</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.map((a, i) => (
                <div key={i} className="flex gap-3 py-3 border-b last:border-0">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <a.icon className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground">{a.text}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Clock className="h-3 w-3" />{a.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
