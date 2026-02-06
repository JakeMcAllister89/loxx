import { DashboardLayout } from '@/components/DashboardLayout';
import { useCart } from '@/contexts/CartContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { products } from '@/data/products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Trash2, ShoppingCart, CreditCard, Minus, Plus, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function Cart() {
  const { items, removeItem, updateQuantity, clearCart, totalGBP, totalEUR, itemCount } = useCart();
  const { format } = useCurrency();

  const handleCheckout = () => {
    toast.info('Stripe checkout will be configured once Cloud is connected');
  };

  if (items.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">Your Cart is Empty</h2>
          <p className="text-muted-foreground mb-6">Browse our catalog or design a key system to get started.</p>
          <div className="flex gap-3">
            <Button asChild variant="outline"><Link to="/catalog">Browse Catalog</Link></Button>
            <Button asChild variant="hero"><Link to="/designer">Design System</Link></Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Shopping Cart</h1>
            <p className="text-muted-foreground text-sm">{itemCount} items in your cart</p>
          </div>
          <Button variant="ghost" onClick={() => { clearCart(); toast.success('Cart cleared'); }} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />Clear Cart
          </Button>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-3">
            {items.map((item, i) => {
              const product = products.find(p => p.id === item.productId);
              if (!product) return null;
              return (
                <Card key={i} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-foreground text-sm">{product.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.size} · {item.finish}</p>
                        {item.keyCode && <p className="text-xs text-accent mt-0.5">Key: {item.keyCode} {item.nodeLabel && `(${item.nodeLabel})`}</p>}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(i, item.quantity - 1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                            <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(i, item.quantity + 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-foreground">{format(product.priceGBP * item.quantity, product.priceEUR * item.quantity)}</span>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeItem(i)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="shadow-card h-fit sticky top-20">
            <CardHeader>
              <CardTitle className="font-display text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{format(totalGBP, totalEUR)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span className="text-accent font-medium">Free</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">VAT (20%)</span><span>{format(totalGBP * 0.2, totalEUR * 0.2)}</span></div>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{format(totalGBP * 1.2, totalEUR * 1.2)}</span>
              </div>
              <Button variant="hero" className="w-full" size="lg" onClick={handleCheckout}>
                <CreditCard className="h-4 w-4 mr-2" />Proceed to Checkout
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">Secure payment powered by Stripe. All prices include manufacturer warranty.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
