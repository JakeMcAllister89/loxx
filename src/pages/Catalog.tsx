import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { products } from '@/data/products';
import { Product } from '@/data/types';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useCart } from '@/contexts/CartContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Shield, Plus, Filter, Package } from 'lucide-react';
import { toast } from 'sonner';

export default function Catalog() {
  const { format } = useCurrency();
  const { addItem } = useCart();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [securityFilter, setSecurityFilter] = useState<string>('all');
  const [pinsFilter, setPinsFilter] = useState<string>('all');

  const filtered = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.model.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (securityFilter !== 'all' && p.security !== securityFilter) return false;
    if (pinsFilter !== 'all' && p.pins !== Number(pinsFilter)) return false;
    return true;
  });

  const handleAddToSystem = (product: Product) => {
    addItem({
      productId: product.id,
      quantity: 1,
      size: product.sizes[0],
      finish: product.finishes[0],
    });
    toast.success(`${product.name} added to cart`);
  };

  const securityColor = (s: string) => {
    if (s === 'ultra') return 'bg-accent text-accent-foreground';
    if (s === 'high') return 'bg-primary text-primary-foreground';
    return 'bg-secondary text-secondary-foreground';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Product Catalog</h1>
          <p className="mt-1 text-muted-foreground">Browse DOM-UK Euro cylinders for your master-key system</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search cylinders..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="double">Double</SelectItem>
              <SelectItem value="thumbturn">Thumbturn</SelectItem>
              <SelectItem value="half">Half</SelectItem>
            </SelectContent>
          </Select>
          <Select value={securityFilter} onValueChange={setSecurityFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Security" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Security</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="ultra">Ultra</SelectItem>
            </SelectContent>
          </Select>
          <Select value={pinsFilter} onValueChange={setPinsFilter}>
            <SelectTrigger className="w-full md:w-32">
              <SelectValue placeholder="Pins" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pins</SelectItem>
              <SelectItem value="5">5-pin</SelectItem>
              <SelectItem value="6">6-pin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground">{filtered.length} products found</p>

        {/* Product Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(p => (
            <Card key={p.id} className="shadow-card hover:shadow-elevated transition-shadow overflow-hidden group">
              <div className="h-40 bg-muted flex items-center justify-center relative">
                <Package className="h-16 w-16 text-muted-foreground/30" />
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <Badge className={securityColor(p.security)} variant="secondary">{p.security}</Badge>
                  {p.bsCompliant && <Badge variant="outline" className="bg-card"><Shield className="h-3 w-3 mr-1" />BS EN 1303</Badge>}
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display font-semibold text-foreground text-sm leading-tight">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{p.pins}-pin · {p.category} · {p.sizes.length} sizes</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-foreground">{format(p.priceGBP, p.priceEUR)}</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.description}</p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {p.features.slice(0, 3).map(f => (
                    <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
                  ))}
                </div>
                <Button onClick={() => handleAddToSystem(p)} className="w-full mt-4" size="sm">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />Add to System
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
