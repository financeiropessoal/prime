'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/lib/database.types';

export type CartItem = {
  product: Product;
  quantity: number;
  purchaseType: 'unit' | 'package';
};

type CartContextType = {
  cart: CartItem[];
  cartCount: number;
  addToCart: (product: Product, quantity: number, purchaseType: 'unit' | 'package') => void;
  removeFromCart: (productId: string, purchaseType: 'unit' | 'package') => void;
  updateCartQuantity: (productId: string, purchaseType: 'unit' | 'package', quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('primeauto_cart');
      if (stored) {
        try {
          setCart(JSON.parse(stored));
        } catch (e) {
          console.error('Error loading cart', e);
        }
      }
    }
  }, []);

  // Save cart to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('primeauto_cart', JSON.stringify(cart));
    }
  }, [cart]);

  const addToCart = (product: Product, quantity: number, purchaseType: 'unit' | 'package') => {
    setCart(prev => {
      const existingIdx = prev.findIndex(
        item => item.product.id === product.id && item.purchaseType === purchaseType
      );

      if (existingIdx > -1) {
        const nextCart = [...prev];
        nextCart[existingIdx].quantity += quantity;
        return nextCart;
      }

      return [...prev, { product, quantity, purchaseType }];
    });
  };

  const removeFromCart = (productId: string, purchaseType: 'unit' | 'package') => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.purchaseType === purchaseType)));
  };

  const updateCartQuantity = (productId: string, purchaseType: 'unit' | 'package', quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, purchaseType);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.product.id === productId && item.purchaseType === purchaseType) {
        return { ...item, quantity };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Total quantity of items in the cart
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Total value in BRL
  const cartTotal = cart.reduce((sum, item) => {
    if (item.purchaseType === 'package') {
      const qty = item.product.package_qty || 10;
      const discount = item.product.package_discount_pct || 10;
      const pricePerPkg = (item.product.sale_price * qty) * (1 - discount / 100);
      return sum + (pricePerPkg * item.quantity);
    } else {
      return sum + (item.product.sale_price * item.quantity);
    }
  }, 0);

  return (
    <CartContext.Provider value={{ cart, cartCount, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
