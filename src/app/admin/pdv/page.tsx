'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { dbService } from '@/services/db';
import { Product, Client, BankAccount } from '@/lib/database.types';
import { formatCurrency } from '@/lib/formatters';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Search,
  ShoppingCart,
  X,
  Plus,
  Minus,
  Trash2,
  User,
  QrCode,
  CreditCard,
  Banknote,
  FileText,
  ArrowLeft,
  Check,
  RefreshCw,
  Zap,
  Building2,
  LayoutGrid
} from 'lucide-react';

type PurchaseMode = 'unit' | 'package';
type PaymentMethod = 'pix' | 'card' | 'cash' | 'invoice';

interface CartItem {
  product: Product;
  quantity: number;
  mode: PurchaseMode;
  customUnitPrice: number;
}

const CATEGORIES = ['Todos', 'Chaves Codificadas', 'Carcaças de Chave', 'Controles de Alarme', 'Chips & Transponders', 'Baterias', 'Máquinas'];

function getItemTotal(item: CartItem): number {
  if (item.mode === 'package') {
    const pkgQty = item.product.package_qty || 10;
    const disc = item.product.package_discount_pct || 10;
    const pkgUnit = item.product.sale_price * (1 - disc / 100);
    return pkgUnit * pkgQty * item.quantity;
  }
  return item.customUnitPrice * item.quantity;
}

export default function PdvPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Modals & Panels
  const [productModal, setProductModal] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);

  // Mobile navigation tab
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cls, accs] = await Promise.all([
        dbService.getProducts(),
        dbService.getClients(),
        dbService.getBankAccounts()
      ]);
      setProducts(prods.filter(p => p.status === 'active'));
      setClients(cls);
      setBankAccounts(accs);
    } catch (e) {
      console.error(e);
      toast.add({ title: 'Erro de conexão', description: 'Não foi possível carregar dados do PDV.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addToCart = (product: Product, itemConfig: { mode: PurchaseMode; qty: number; customPrice: number }) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.product.id === product.id && i.mode === itemConfig.mode);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantity += itemConfig.qty;
        copy[idx].customUnitPrice = itemConfig.customPrice;
        return copy;
      }
      return [...prev, {
        product,
        quantity: itemConfig.qty,
        mode: itemConfig.mode,
        customUnitPrice: itemConfig.customPrice
      }];
    });
    setProductModal(null);
    toast.add({ title: 'Item Adicionado', description: `${product.name} no carrinho do PDV.`, type: 'success' });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const copy = [...prev];
      const newQty = copy[index].quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      copy[index].quantity = newQty;
      return copy;
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + getItemTotal(item), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());

    const matchesCat = selectedCategory === 'Todos' || p.category === selectedCategory;

    return matchesSearch && matchesCat;
  });

  const handleFinalize = async (method: PaymentMethod, bankAccountId: string, isPaid: boolean) => {
    try {
      const orderItems = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.mode === 'package' ? item.quantity * (item.product.package_qty || 10) : item.quantity,
        unit_price: item.mode === 'package'
          ? (item.product.sale_price * (1 - (item.product.package_discount_pct || 10) / 100))
          : item.customUnitPrice
      }));

      const pMethod = (method === 'cash' ? 'pix' : method) as 'pix' | 'card' | 'boleto';
      const newOrder = await dbService.createOrder({
        client_id: selectedClient ? selectedClient.id : 'cli-1',
        items: orderItems,
        total_amount: cartTotal,
        shipping_cost: 0,
        shipping_address: { street: 'Balcão PDV', number: 'S/N', neighborhood: 'Centro', city: 'Ribeirão Preto', state: 'SP', zip_code: '14000-000' },
        payment_method: pMethod,
        status: isPaid ? 'paid' : 'waiting_payment'
      });

      toast.add({
        title: 'Venda Concluída (PDV)',
        description: `Pedido #${newOrder.id} finalizado com sucesso.`,
        type: 'success'
      });

      setCart([]);
      setSelectedClient(null);
      setShowCheckout(false);
      loadData();
    } catch (e: any) {
      toast.add({ title: 'Erro na Venda', description: e.message || 'Falha ao processar venda no PDV.', type: 'error' });
    }
  };

  return (
    <div className="h-screen bg-[#f8f9fa] text-stone-900 font-sans flex flex-col overflow-hidden">
      {/* PDV Header */}
      <header className="bg-[#1a1a1a] text-white border-b border-stone-800 shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="xs" className="text-stone-400 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-1" /> Painel ERP
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-1 bg-[#e8590c] text-white rounded-[2px]">
                <Zap className="h-4 w-4" />
              </div>
              <span className="font-black text-sm tracking-wider uppercase text-white">PDV MÓVEL FAST</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={loadData} variant="ghost" size="xs" className="text-stone-400 hover:text-white">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <div className="bg-stone-900 px-3 py-1 border border-stone-700 rounded-[2px] font-mono text-xs font-bold text-[#e8590c]">
              {cartCount} ITENS — {formatCurrency(cartTotal)}
            </div>
          </div>
        </div>
      </header>

      {/* Main PDV Layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT CATALOG PANEL (60%) */}
        <div className="w-full md:w-3/5 flex flex-col bg-[#f8f9fa] border-r border-stone-300 overflow-hidden">
          {/* Search & Categories */}
          <div className="p-3 bg-white border-b border-stone-300 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <Input
                placeholder="Buscar por nome, SKU ou marca da chave..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-10 text-xs"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`h-7 px-3 rounded-[2px] text-[10px] font-bold uppercase whitespace-nowrap cursor-pointer transition-colors ${
                    selectedCategory === cat ? 'bg-[#1a1a1a] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 p-3 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredProducts.map(prod => (
              <div
                key={prod.id}
                onClick={() => setProductModal(prod)}
                className="bg-white border border-stone-300 rounded-[2px] p-2.5 flex flex-col justify-between hover:border-[#e8590c] cursor-pointer transition-colors group"
              >
                <div>
                  <div className="w-full aspect-square bg-stone-100 border border-stone-200 mb-2 p-1 flex items-center justify-center">
                    <img
                      src={prod.images?.[0] || 'https://images.unsplash.com/photo-1617400301413-5858dc44f434?w=100'}
                      alt={prod.name}
                      className="object-contain max-h-full"
                    />
                  </div>
                  <span className="text-[9px] font-mono text-stone-500 block">SKU: {prod.sku}</span>
                  <h4 className="text-xs font-bold text-stone-900 uppercase line-clamp-2 leading-tight group-hover:text-[#e8590c]">
                    {prod.name}
                  </h4>
                </div>

                <div className="pt-2 border-t border-stone-200 mt-2 flex items-center justify-between">
                  <span className="text-xs font-black font-mono text-[#e8590c]">
                    {formatCurrency(prod.sale_price)}
                  </span>
                  <span className="text-[9px] font-mono text-stone-500 font-bold">
                    EST: {prod.stock_current}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT CART & CHECKOUT PANEL (40%) */}
        <div className="w-full md:w-2/5 flex flex-col bg-white overflow-hidden border-l border-stone-300">
          {/* Client Selection Bar */}
          <div className="p-3 bg-stone-100 border-b border-stone-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-stone-600" />
              <span className="text-xs font-bold uppercase text-stone-900 truncate max-w-[200px]">
                {selectedClient ? selectedClient.name : 'CLIENTE BALCÃO (NÃO IDENTIFICADO)'}
              </span>
            </div>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setShowClientModal(true)}
              className="border-stone-300 text-stone-800 text-[10px] uppercase font-bold"
            >
              {selectedClient ? 'ALTERAR' : 'VINCULAR'}
            </Button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-[#f8f9fa]">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                <ShoppingCart className="h-8 w-8 mb-2" />
                <p className="text-xs font-bold uppercase">CARRINHO VAZIO NO PDV</p>
                <p className="text-[10px] text-stone-500">Clique nas peças à esquerda para adicionar.</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="bg-white border border-stone-300 p-2.5 rounded-[2px] space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-stone-900 uppercase truncate">{item.product.name}</h5>
                      <span className="text-[9px] font-mono text-stone-500">
                        SKU: {item.product.sku} | {item.mode === 'package' ? `Pacote (${item.product.package_qty}un)` : 'Varejo'}
                      </span>
                    </div>
                    <button onClick={() => removeFromCart(idx)} className="text-stone-400 hover:text-red-600 p-0.5">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-stone-200">
                    <div className="flex items-center border border-stone-300 rounded-[2px] bg-white h-6">
                      <button onClick={() => updateQuantity(idx, -1)} className="w-6 h-full font-bold text-xs hover:bg-stone-100">-</button>
                      <span className="w-6 text-center font-mono font-bold text-xs">{item.quantity}</span>
                      <button onClick={() => updateQuantity(idx, 1)} className="w-6 h-full font-bold text-xs hover:bg-stone-100">+</button>
                    </div>

                    <span className="font-mono font-bold text-stone-900 text-xs">
                      {formatCurrency(getItemTotal(item))}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer & Checkout Action */}
          <div className="p-4 bg-white border-t border-stone-300 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-black uppercase text-stone-900">TOTAL DA VENDA</span>
              <span className="text-xl font-black font-mono text-[#e8590c]">{formatCurrency(cartTotal)}</span>
            </div>

            <Button
              disabled={cart.length === 0}
              onClick={() => setShowCheckout(true)}
              className="w-full h-12 bg-[#e8590c] hover:bg-[#d9480f] text-white font-bold text-xs uppercase tracking-wider rounded-[2px]"
            >
              FINALIZAR VENDA PDV IMEDIATA
            </Button>
          </div>
        </div>

      </div>

      {/* PRODUCT CONFIG MODAL */}
      {productModal && (
        <Dialog open={true} onOpenChange={() => setProductModal(null)}>
          <DialogContent className="max-w-md w-full p-0 gap-0 rounded-[2px] bg-white border border-stone-300 shadow-2xl">
            <div className="px-6 py-4 border-b border-stone-300 bg-stone-100">
              <DialogTitle className="text-sm font-black uppercase text-stone-900">{productModal.name}</DialogTitle>
            </div>
            <div className="p-6 space-y-4 text-xs font-sans">
              <p className="font-mono text-stone-500">SKU: {productModal.sku} | ESTOQUE: {productModal.stock_current} UN</p>
              <div className="p-3 bg-stone-100 border border-stone-200 font-mono text-stone-900">
                PREÇO VAREJO: {formatCurrency(productModal.sale_price)}
              </div>
            </div>
            <DialogFooter className="px-6 py-4 border-t border-stone-300 flex justify-between bg-stone-50">
              <Button variant="outline" onClick={() => setProductModal(null)} className="text-xs font-bold uppercase">CANCELAR</Button>
              <Button
                onClick={() => addToCart(productModal, { mode: 'unit', qty: 1, customPrice: productModal.sale_price })}
                className="bg-[#e8590c] hover:bg-[#d9480f] text-white font-bold text-xs uppercase"
              >
                ADICIONAR AO PDV
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CHECKOUT MODAL */}
      {showCheckout && (
        <Dialog open={true} onOpenChange={() => setShowCheckout(false)}>
          <DialogContent className="max-w-md w-full p-0 gap-0 rounded-[2px] bg-white border border-stone-300 shadow-2xl">
            <div className="px-6 py-4 border-b border-stone-300 bg-stone-100">
              <DialogTitle className="text-sm font-black uppercase text-stone-900">RECEBIMENTO PDV ({formatCurrency(cartTotal)})</DialogTitle>
            </div>
            <div className="p-6 space-y-3 text-xs font-sans">
              <Button onClick={() => handleFinalize('pix', bankAccounts[0]?.id || '', true)} className="w-full bg-emerald-600 text-white font-bold uppercase">
                PAGAR COM PIX (QUITADO)
              </Button>
              <Button onClick={() => handleFinalize('card', bankAccounts[0]?.id || '', true)} className="w-full bg-blue-600 text-white font-bold uppercase">
                PAGAR COM CARTÃO (QUITADO)
              </Button>
              <Button onClick={() => handleFinalize('cash', bankAccounts[0]?.id || '', true)} className="w-full bg-stone-800 text-white font-bold uppercase">
                PAGAR EM DINHEIRO (QUITADO)
              </Button>
            </div>
            <DialogFooter className="px-6 py-4 border-t border-stone-300 bg-stone-50">
              <Button variant="outline" onClick={() => setShowCheckout(false)} className="text-xs font-bold uppercase">VOLTAR</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CLIENT SELECTION MODAL */}
      {showClientModal && (
        <Dialog open={true} onOpenChange={() => setShowClientModal(false)}>
          <DialogContent className="max-w-md w-full p-0 gap-0 rounded-[2px] bg-white border border-stone-300 shadow-2xl">
            <div className="px-6 py-4 border-b border-stone-300 bg-stone-100">
              <DialogTitle className="text-sm font-black uppercase text-stone-900">SELECIONAR CLIENTE</DialogTitle>
            </div>
            <div className="p-4 max-h-60 overflow-y-auto space-y-2 text-xs font-sans">
              {clients.map(c => (
                <div
                  key={c.id}
                  onClick={() => { setSelectedClient(c); setShowClientModal(false); }}
                  className="p-2.5 border border-stone-200 rounded-[2px] hover:bg-stone-100 cursor-pointer font-bold uppercase"
                >
                  {c.name} ({c.document})
                </div>
              ))}
            </div>
            <DialogFooter className="px-6 py-4 border-t border-stone-300 bg-stone-50">
              <Button variant="outline" onClick={() => setShowClientModal(false)} className="text-xs font-bold uppercase">FECHAR</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
