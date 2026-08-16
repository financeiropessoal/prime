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
import { LazyProductImage } from '@/components/ui/lazy-product-image';
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

  const categoriesList = ['Todos', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Modals & Panels
  const [productModal, setProductModal] = useState<Product | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [modalMode, setModalMode] = useState<PurchaseMode>('unit');
  const [modalPrice, setModalPrice] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);

  const handleOpenProductModal = (prod: Product) => {
    setModalQty(1);
    setModalMode('unit');
    setModalPrice(prod.sale_price);
    setProductModal(prod);
  };

  const handleModeChange = (mode: PurchaseMode) => {
    setModalMode(mode);
    if (productModal) {
      if (mode === 'package') {
        const disc = productModal.package_discount_pct || 10;
        setModalPrice(productModal.sale_price * (1 - disc / 100));
      } else {
        setModalPrice(productModal.sale_price);
      }
    }
  };

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
      <header className="border-b shrink-0 bg-white" style={{ borderColor: '#e8e2d8' }}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="xs" className="text-stone-600 hover:text-stone-900 transition font-bold" style={{ color: '#5a4633' }}>
                <ArrowLeft className="h-4 w-4 mr-1" style={{ color: '#c9a96e' }} /> Painel ERP
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full text-white" style={{ backgroundColor: '#c9a96e' }}>
                <Zap className="h-3.5 w-3.5" />
              </div>
              <span className="font-black text-xs sm:text-sm tracking-wider uppercase" style={{ color: '#3d2b1f' }}>PDV MÓVEL FAST</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={loadData} variant="ghost" size="xs" className="text-stone-600 hover:text-stone-900 transition">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: '#c9a96e' }} />
            </Button>
            <div className="px-3 py-1 border rounded-full font-mono text-xs font-bold transition-all shadow-2xs" style={{ backgroundColor: '#faf8f5', borderColor: '#c9a96e', color: '#3d2b1f' }}>
              {cartCount} ITENS — {formatCurrency(cartTotal)}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Tab Selector */}
      <div className="flex md:hidden bg-stone-100 border-b border-stone-300 shrink-0">
        <button
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-3.5 text-center text-xs font-black uppercase border-b-2 cursor-pointer transition-colors ${
            mobileTab === 'catalog'
              ? 'border-[#e8590c] text-[#e8590c] bg-white'
              : 'border-transparent text-stone-600 hover:bg-stone-50'
          }`}
        >
          🔍 Ver Peças ({filteredProducts.length})
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-3.5 text-center text-xs font-black uppercase border-b-2 cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
            mobileTab === 'cart'
              ? 'border-[#e8590c] text-[#e8590c] bg-white'
              : 'border-transparent text-stone-600 hover:bg-stone-50'
          }`}
        >
          🛒 Ver Carrinho ({cartCount})
        </button>
      </div>

      {/* Main PDV Layout */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* LEFT CATALOG PANEL (60%) */}
        <div className={`w-full h-full md:h-3/5 flex flex-col bg-[#f8f9fa] border-b border-stone-300 overflow-hidden ${mobileTab === 'catalog' ? 'flex' : 'hidden md:flex'}`}>
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
              {categoriesList.map(cat => (
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
                onClick={() => handleOpenProductModal(prod)}
                className="bg-white border border-stone-300 rounded-[2px] p-2.5 flex flex-col justify-between hover:border-[#e8590c] cursor-pointer transition-colors group"
              >
                <div>
                  <div className="w-full aspect-square bg-stone-100 border border-stone-200 mb-2 p-1 flex items-center justify-center">
                    <LazyProductImage
                      productId={prod.id}
                      productName={prod.name}
                      defaultImage="/prod_onix.jpg"
                      className="object-contain max-h-full max-w-full"
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
        <div className={`w-full h-full md:h-2/5 flex flex-col bg-white overflow-hidden ${mobileTab === 'cart' ? 'flex' : 'hidden md:flex'}`}>
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
          <DialogContent className="max-w-md w-full p-0 gap-0 rounded-2xl bg-white border border-stone-300 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-300 bg-stone-100 flex items-center justify-between">
              <DialogTitle className="text-sm font-black uppercase text-stone-900 leading-tight">
                {productModal.name}
              </DialogTitle>
            </div>
            <div className="p-6 space-y-4 text-xs font-sans">
              <p className="font-mono text-stone-500">
                SKU: {productModal.sku} | ESTOQUE: {productModal.stock_current} UN
              </p>

              {/* Purchase Mode Select (Atacado / Varejo) if applicable */}
              {productModal.package_qty && productModal.package_discount_pct ? (
                <div className="space-y-1.5">
                  <span className="font-bold text-[10px] uppercase text-stone-500">TIPO DE COMPRA</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleModeChange('unit')}
                      style={
                        modalMode === 'unit'
                          ? { backgroundColor: '#c9a96e', borderColor: '#c9a96e', color: '#ffffff' }
                          : { borderColor: '#e8e2d8', color: '#5a4633' }
                      }
                      className="h-11 rounded-xl border text-xs font-bold transition cursor-pointer flex flex-col items-center justify-center bg-white hover:bg-stone-50"
                    >
                      <span>VAREJO</span>
                      <span className="text-[9px] font-medium opacity-80">
                        {formatCurrency(productModal.sale_price)} / un
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleModeChange('package')}
                      style={
                        modalMode === 'package'
                          ? { backgroundColor: '#c9a96e', borderColor: '#c9a96e', color: '#ffffff' }
                          : { borderColor: '#e8e2d8', color: '#5a4633' }
                      }
                      className="h-11 rounded-xl border text-xs font-bold transition cursor-pointer flex flex-col items-center justify-center bg-white hover:bg-stone-50"
                    >
                      <span>ATACADO (PACOTE)</span>
                      <span className="text-[9px] font-medium opacity-80">
                        {formatCurrency(productModal.sale_price * (1 - productModal.package_discount_pct! / 100))} / un
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Price Details - Editable Input */}
              <div className="space-y-1.5">
                <span className="font-bold text-[10px] uppercase text-stone-500">PREÇO UNITÁRIO DE VENDA (R$)</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-xs">R$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={modalPrice === 0 ? '' : modalPrice}
                    onChange={e => setModalPrice(parseFloat(e.target.value) || 0)}
                    className="pl-8 h-11 text-xs font-mono font-bold"
                  />
                </div>
                {modalMode === 'package' && (
                  <div className="flex justify-between items-center text-stone-500 text-[9px] px-1">
                    <span>Itens por Pacote:</span>
                    <span className="font-bold">{productModal.package_qty || 10} unidades</span>
                  </div>
                )}
              </div>

              {/* Quantity Selector - Large Touch Buttons for Card Terminal */}
              <div className="space-y-1.5">
                <span className="font-bold text-[10px] uppercase text-stone-500">QUANTIDADE</span>
                <div className="flex items-center justify-between border border-stone-300 rounded-xl p-2 bg-white">
                  <button
                    type="button"
                    onClick={() => setModalQty(q => Math.max(1, q - 1))}
                    className="h-12 w-12 rounded-full border border-stone-300 bg-stone-50 hover:bg-stone-100 flex items-center justify-center text-xl font-bold cursor-pointer select-none transition active:scale-95 animate-none"
                    style={{ color: '#5a4633' }}
                  >
                    -
                  </button>
                  <div className="text-center">
                    <span className="font-mono font-black text-xl text-stone-900">{modalQty}</span>
                    <span className="text-[10px] block text-stone-400 font-medium mt-0.5">
                      {modalMode === 'package' ? 'pacote(s)' : 'unidade(s)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalQty(q => q + 1)}
                    className="h-12 w-12 rounded-full border border-stone-300 bg-stone-50 hover:bg-stone-100 flex items-center justify-center text-xl font-bold cursor-pointer select-none transition active:scale-95 animate-none"
                    style={{ color: '#5a4633' }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Real-time Total Price */}
              <div className="pt-2 flex justify-between items-center border-t border-stone-200">
                <span className="font-bold text-xs uppercase text-stone-700">VALOR TOTAL DO ITEM:</span>
                <span className="font-mono font-black text-lg" style={{ color: '#e8590c' }}>
                  {formatCurrency(
                    (modalMode === 'package'
                      ? modalPrice * (productModal.package_qty || 10)
                      : modalPrice) * modalQty
                  )}
                </span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-stone-300 flex flex-row gap-3 bg-stone-50">
              <Button
                variant="outline"
                onClick={() => setProductModal(null)}
                className="h-12 flex-1 text-xs font-bold uppercase rounded-xl border-stone-300 bg-white hover:bg-stone-100 transition active:scale-95 cursor-pointer text-stone-700"
              >
                CANCELAR
              </Button>
              <Button
                onClick={() => {
                  addToCart(productModal, { mode: modalMode, qty: modalQty, customPrice: modalPrice });
                }}
                className="h-12 flex-1 bg-[#e8590c] hover:bg-[#d9480f] text-white font-bold text-xs uppercase rounded-xl shadow-md active:scale-95 transition cursor-pointer"
              >
                ADICIONAR AO PDV
              </Button>
            </div>
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
