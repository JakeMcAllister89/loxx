import React, { createContext, useContext, useState, useCallback } from 'react';
import { CartItem } from '@/data/types';
import { products } from '@/data/products';

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  totalGBP: number;
  totalEUR: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      const existing = prev.findIndex(
        i => i.productId === item.productId && i.size === item.size && i.finish === item.finish
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + item.quantity };
        return updated;
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateQuantity = useCallback((index: number, quantity: number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: Math.max(1, quantity) } : item));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalGBP = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product?.priceGBP ?? 0) * item.quantity;
  }, 0);

  const totalEUR = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product?.priceEUR ?? 0) * item.quantity;
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalGBP, totalEUR, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
