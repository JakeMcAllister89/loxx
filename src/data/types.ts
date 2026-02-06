export interface Product {
  id: string;
  name: string;
  model: string;
  description: string;
  category: 'single' | 'double' | 'thumbturn' | 'half';
  pins: 5 | 6;
  security: 'standard' | 'high' | 'ultra';
  sizes: string[];
  finishes: string[];
  priceGBP: number;
  priceEUR: number;
  image: string;
  features: string[];
  bsCompliant: boolean;
}

export type Currency = 'GBP' | 'EUR';

export interface KeySystemNode {
  id: string;
  label: string;
  type: 'grand-master' | 'sub-master' | 'department' | 'floor' | 'room';
  cylinderId?: string;
  keyCode?: string;
  children: string[];
  parentId?: string;
}

export interface KeySystem {
  id: string;
  name: string;
  nodes: Record<string, KeySystemNode>;
  rootId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  size: string;
  finish: string;
  keyCode?: string;
  nodeLabel?: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  totalGBP: number;
  totalEUR: number;
  status: 'paid' | 'processing' | 'shipped' | 'delivered';
  createdAt: string;
  shippingAddress: string;
  keySystemId?: string;
}

export interface ValidationResult {
  valid: boolean;
  warnings: ValidationWarning[];
  errors: ValidationError[];
}

export interface ValidationWarning {
  nodeId: string;
  message: string;
}

export interface ValidationError {
  nodeId: string;
  message: string;
}
