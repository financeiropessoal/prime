'use client';

import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { dbService } from '@/services/db';
import { Product, Client, BankAccount } from '@/lib/database.types';
import { formatCurrency } from '@/lib/formatters';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LazyProductImage } from '@/components/ui/lazy-product-image';
import { BluetoothPrinter, BTDevice } from '@/services/bluetooth-printer';
import posPrinter from '@/services/pos-printer';
import {
  Search, ShoppingCart, X, Plus, Minus, Trash2, User, CreditCard, Banknote, FileText,
  Check, RefreshCw, Zap, LayoutGrid, Printer, Bluetooth, CheckCircle, XCircle,
  SkipForward, ShoppingBag, Users, ClipboardList
} from 'lucide-react';

type PurchaseMode = 'unit' | 'package';
type PayMethodPDV = 'dinheiro' | 'cartao' | 'faturada';
type CardInstallPDV = '1x' | '2x' | '3x';
type FaturadaTermPDV = '15' | '30' | '30/60' | '30/60/90';

// Bottom nav view
type AppView = 'vender' | 'clientes' | 'pedidos';

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

  // Bottom nav
  const [appView, setAppView] = useState<AppView>('vender');

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
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientFromFinalize, setClientFromFinalize] = useState(false);

  // Mobile tab (catalog vs cart)
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  // Payment state
  const [payMethod, setPayMethod] = useState<PayMethodPDV>('dinheiro');
  const [cardInstall, setCardInstall] = useState<CardInstallPDV>('1x');
  const [faturadaTerm, setFaturadaTerm] = useState<FaturadaTermPDV>('30');

  // Print modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [lastOrderId, setLastOrderId] = useState('');
  const [lastOrderItems, setLastOrderItems] = useState<CartItem[]>([]);
  const [lastOrderTotal, setLastOrderTotal] = useState(0);
  const [lastPayLabel, setLastPayLabel] = useState('');

  // Bluetooth / Print
  const [isNative] = useState(() => typeof window !== 'undefined' && BluetoothPrinter.isNativeApp());
  const [printer, setPrinter] = useState<BTDevice | null>(null);
  const [btDevices, setBtDevices] = useState<BTDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printDone, setPrintDone] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  // Orders view
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');

  // Client registration
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', document: '', phone: '', email: '' });
  const [savingClient, setSavingClient] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('printer_device');
    if (saved) { try { setPrinter(JSON.parse(saved)); } catch {} }
    loadData();
  }, []);

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

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const data = await dbService.getOrders();
      setOrders(data.slice(0, 50)); // last 50
    } catch (e) { console.error(e); }
    finally { setOrdersLoading(false); }
  };

  // Open product modal
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

  const addToCart = (product: Product, itemConfig: { mode: PurchaseMode; qty: number; customPrice: number }) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.product.id === product.id && i.mode === itemConfig.mode);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantity += itemConfig.qty;
        copy[idx].customUnitPrice = itemConfig.customPrice;
        return copy;
      }
      return [...prev, { product, quantity: itemConfig.qty, mode: itemConfig.mode, customUnitPrice: itemConfig.customPrice }];
    });
    setProductModal(null);
    toast.add({ title: 'Item Adicionado', description: `${product.name} no carrinho.`, type: 'success' });
  };

  const removeFromCart = (index: number) => setCart(prev => prev.filter((_, i) => i !== index));
  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const copy = [...prev];
      const newQty = copy[index].quantity + delta;
      if (newQty <= 0) return prev.filter((_, i) => i !== index);
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

  // Payment label
  const getPayLabel = (): string => {
    if (payMethod === 'dinheiro') return 'DINHEIRO - A VISTA';
    if (payMethod === 'cartao') return `CARTAO ${cardInstall}${cardInstall === '1x' ? ' - A VISTA' : ` - ${formatCurrency(cartTotal / parseInt(cardInstall))}/parcela`}`;
    return `FATURADA ${faturadaTerm === '15' ? '15 DIAS' : faturadaTerm === '30' ? '30 DIAS' : faturadaTerm === '30/60' ? '30/60 DIAS' : '30/60/90 DIAS'}`;
  };

  // Finalize button: enforce client selection
  const handleFinalizeClick = () => {
    if (!selectedClient) {
      setClientFromFinalize(true);
      setClientSearchQuery('');
      setShowClientModal(true);
      return;
    }
    setPayMethod('dinheiro');
    setCardInstall('1x');
    setFaturadaTerm('30');
    setShowCheckout(true);
  };

  // When client is selected from modal and came from finalize flow
  const handleClientSelect = (c: Client) => {
    setSelectedClient(c);
    setShowClientModal(false);
    if (clientFromFinalize) {
      setClientFromFinalize(false);
      setPayMethod('dinheiro');
      setCardInstall('1x');
      setFaturadaTerm('30');
      setShowCheckout(true);
    }
  };

  // Finalize the sale
  const handleFinalize = async () => {
    if (!selectedClient) return;
    try {
      const orderItems = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.mode === 'package' ? item.quantity * (item.product.package_qty || 10) : item.quantity,
        unit_price: item.mode === 'package'
          ? (item.product.sale_price * (1 - (item.product.package_discount_pct || 10) / 100))
          : item.customUnitPrice
      }));

      const newOrder = await dbService.createOrder({
        client_id: selectedClient.id,
        items: orderItems,
        total_amount: cartTotal,
        shipping_cost: 0,
        shipping_address: { street: 'Balcão PDV', number: 'S/N', neighborhood: 'Centro', city: 'Ribeirão Preto', state: 'SP', zip_code: '14000-000' },
        payment_method: payMethod as any,
        status: 'paid'
      });

      toast.add({ title: 'Venda Concluída', description: `Pedido #${newOrder.id.slice(-6)} finalizado.`, type: 'success' });

      const oId = newOrder.id.slice(-6);
      const oCart = [...cart];
      const oTotal = cartTotal;
      const oPay = getPayLabel();

      // Save for print
      setLastOrderId(oId);
      setLastOrderItems(oCart);
      setLastOrderTotal(oTotal);
      setLastPayLabel(oPay);

      setCart([]);
      setShowCheckout(false);
      setPrintDone(false);
      setPrintError(null);
      setShowPrintModal(true);

      // Auto-print directly on native POS printer without asking for Bluetooth
      if (Capacitor.isNativePlatform()) {
        setTimeout(() => {
          handlePrint(oId, oCart, oTotal, oPay);
        }, 300);
      }
    } catch (e: any) {
      toast.add({ title: 'Erro na Venda', description: e.message || 'Falha ao processar.', type: 'error' });
    }
  };

  // Bluetooth handlers
  const handleScan = async () => {
    setScanning(true); setPrintError(null);
    try {
      const found = await BluetoothPrinter.scan();
      setBtDevices(found);
      if (!found.length) setPrintError('Nenhuma impressora encontrada. Verifique se está ligada e pareada.');
    } catch (e: any) { setPrintError(e?.message); }
    finally { setScanning(false); }
  };

  const handleConnect = async (d: BTDevice) => {
    setConnecting(d.address);
    try {
      await BluetoothPrinter.connect(d.address);
      setPrinter(d);
      localStorage.setItem('printer_device', JSON.stringify(d));
      setBtDevices([]);
    } catch (e: any) { setPrintError(`Falha: ${e?.message}`); }
    finally { setConnecting(null); }
  };

  const handlePrint = async (orderId?: string, items?: CartItem[], total?: number, payLabel?: string) => {
    const pItems = items || lastOrderItems;
    const pTotal = total || lastOrderTotal;
    const pLabel = payLabel || lastPayLabel;
    const pOrderId = orderId || lastOrderId;

    setPrinting(true); setPrintError(null);
    try {
      const receiptData = {
        storeName: 'PRIME CHAVES CODIFICADAS',
        storeAddress: 'www.primechavescodificadas.com.br',
        orderNumber: pOrderId,
        customerName: selectedClient?.name || undefined,
        items: pItems.map(item => {
          const price = item.mode === 'package'
            ? item.product.sale_price * (1 - (item.product.package_discount_pct || 10) / 100)
            : item.customUnitPrice;
          return { name: item.product.name, qty: item.quantity, price };
        }),
        subtotal: pTotal,
        total: pTotal,
        paymentMethod: pLabel,
        pixKey: 'pix.primeauto@gmail.com',
        pixQrUrl: 'https://www.primechavescodificadas.com.br/pix_qr.png',
        date: new Date().toLocaleString('pt-BR'),
      };

      if (Capacitor.isNativePlatform()) {
        try {
          const dev = await BluetoothPrinter.autoPrintReceipt(receiptData);
          if (dev) setPrinter(dev);
        } catch (err: any) {
          console.warn('Bluetooth autoPrint failed, attempting POS fallback:', err);
          await posPrinter.printReceipt(receiptData);
        }
      } else if (printer) {
        await BluetoothPrinter.printReceipt(receiptData);
      } else {
        setPrintError('Selecione uma impressora Bluetooth ou pareie a impressora nas Configurações do Android.');
        return;
      }
      setPrintDone(true);
      setTimeout(() => {
        setShowPrintModal(false);
        setPrintDone(false);
        setSelectedClient(null);
      }, 2000);
    } catch (e: any) { setPrintError(`Erro: ${e?.message}`); }
    finally { setPrinting(false); }
  };

  const closePrintModal = () => {
    setShowPrintModal(false);
    setPrintDone(false);
    setSelectedClient(null);
  };

  // Save new client
  const handleSaveClient = async () => {
    if (!newClient.name.trim()) {
      toast.add({ title: 'Nome obrigatório', type: 'error' });
      return;
    }
    setSavingClient(true);
    try {
      await dbService.createClient({
        name: newClient.name,
        document: newClient.document || '000.000.000-00',
        phone: newClient.phone,
        email: newClient.email,
        type: 'pf',
        profile_id: null,
        addresses: [{ street: '', number: '', neighborhood: '', city: '', state: '', zip_code: '', is_default: true }]
      } as any);
      toast.add({ title: 'Cliente cadastrado!', type: 'success' });
      setNewClient({ name: '', document: '', phone: '', email: '' });
      setShowNewClientForm(false);
      loadData();
    } catch (e: any) {
      toast.add({ title: 'Erro', description: e.message, type: 'error' });
    } finally { setSavingClient(false); }
  };

  const gold = '#c9a96e';
  const brown = '#5a4633';
  const darkBrown = '#3d2b1f';

  return (
    <div className="h-screen bg-[#faf8f5] text-stone-900 font-sans flex flex-col overflow-hidden">

      {/* ══════ HEADER ══════ */}
      <header className="border-b shrink-0 bg-white" style={{ borderColor: '#e8e2d8' }}>
        <div className="px-3 py-2 flex items-center justify-between gap-1.5 overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0 shrink">
            <img src="/logo.png" alt="Prime" className="h-6 w-auto object-contain shrink-0" />
            <span className="font-black text-[11px] tracking-wider uppercase truncate" style={{ color: darkBrown }}>PDV MÓVEL</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isNative && (
              <button onClick={() => { setPrintError(null); setPrintDone(false); setShowPrintModal(true); }}
                className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full border shrink-0"
                style={{ borderColor: printer ? gold : '#e8e2d8', color: printer ? '#16a34a' : '#8b7355' }}>
                <Printer className="h-3 w-3 shrink-0" />
                <span className="hidden sm:inline">{printer ? printer.name.slice(0, 8) : 'Impressora'}</span>
              </button>
            )}
            <button onClick={loadData} className="p-1 rounded-full hover:bg-stone-100 transition shrink-0" title="Atualizar">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: gold }} />
            </button>
            <div className="px-2.5 py-1 border rounded-full font-mono text-[11px] font-bold shrink-0 whitespace-nowrap" style={{ backgroundColor: '#faf8f5', borderColor: gold, color: darkBrown }}>
              {cartCount} · {formatCurrency(cartTotal)}
            </div>
          </div>
        </div>
      </header>

      {/* ══════ MAIN CONTENT ══════ */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ paddingBottom: '72px' }}>

        {/* ── VIEW: VENDER ── */}
        {appView === 'vender' && (
          <>
            {/* Mobile Tabs: Produtos / Carrinho */}
            <div className="flex bg-white border-b shrink-0" style={{ borderColor: '#e8e2d8' }}>
              <button onClick={() => setMobileTab('catalog')}
                className={`flex-1 py-3 text-center text-xs font-black uppercase border-b-2 cursor-pointer transition-colors ${
                  mobileTab === 'catalog' ? 'bg-white' : 'text-stone-500 border-transparent hover:bg-stone-50'
                }`} style={mobileTab === 'catalog' ? { borderColor: gold, color: darkBrown } : {}}>
                🔍 Produtos ({filteredProducts.length})
              </button>
              <button onClick={() => setMobileTab('cart')}
                className={`flex-1 py-3 text-center text-xs font-black uppercase border-b-2 cursor-pointer transition-colors ${
                  mobileTab === 'cart' ? 'bg-white' : 'text-stone-500 border-transparent hover:bg-stone-50'
                }`} style={mobileTab === 'cart' ? { borderColor: gold, color: darkBrown } : {}}>
                🛒 Carrinho ({cartCount})
              </button>
            </div>

            {/* CATALOG */}
            {mobileTab === 'catalog' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 bg-white border-b space-y-2" style={{ borderColor: '#e8e2d8' }}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <Input placeholder="Buscar por nome, SKU ou marca..." value={search}
                      onChange={e => setSearch(e.target.value)} className="pl-9 h-10 text-xs" />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {categoriesList.map(cat => (
                      <button key={cat} onClick={() => setSelectedCategory(cat)}
                        className={`h-7 px-3 rounded-full text-[10px] font-bold uppercase whitespace-nowrap cursor-pointer transition-colors ${
                          selectedCategory === cat ? 'text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300'
                        }`} style={selectedCategory === cat ? { backgroundColor: gold } : {}}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 p-3 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {filteredProducts.map(prod => (
                    <div key={prod.id} onClick={() => handleOpenProductModal(prod)}
                      className="bg-white border rounded-xl p-2.5 flex flex-col justify-between hover:shadow-md cursor-pointer transition group"
                      style={{ borderColor: '#e8e2d8' }}>
                      <div>
                        <div className="w-full aspect-square bg-stone-50 rounded-lg border mb-2 p-1 flex items-center justify-center" style={{ borderColor: '#e8e2d8' }}>
                          <LazyProductImage productId={prod.id} productName={prod.name} defaultImage="/prod_onix.jpg" className="object-contain max-h-full max-w-full" />
                        </div>
                        <span className="text-[9px] font-mono block" style={{ color: gold }}>{prod.sku}</span>
                        <h4 className="text-xs font-bold uppercase line-clamp-2 leading-tight" style={{ color: darkBrown }}>{prod.name}</h4>
                      </div>
                      <div className="pt-2 border-t mt-2 flex items-center justify-between" style={{ borderColor: '#e8e2d8' }}>
                        <span className="text-xs font-black font-mono" style={{ color: gold }}>{formatCurrency(prod.sale_price)}</span>
                        <span className="text-[9px] font-mono text-stone-500 font-bold">EST: {prod.stock_current}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CART */}
            {mobileTab === 'cart' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Client bar */}
                <div className="p-3 bg-white border-b flex items-center justify-between" style={{ borderColor: '#e8e2d8' }}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" style={{ color: gold }} />
                    <span className="text-xs font-bold uppercase truncate max-w-[200px]" style={{ color: selectedClient ? darkBrown : '#ef4444' }}>
                      {selectedClient ? selectedClient.name : '⚠️ SELECIONE UM CLIENTE'}
                    </span>
                  </div>
                  <Button size="xs" variant="outline" onClick={() => { setClientFromFinalize(false); setClientSearchQuery(''); setShowClientModal(true); }}
                    className="text-[10px] uppercase font-bold" style={{ borderColor: '#e8e2d8', color: brown }}>
                    {selectedClient ? 'ALTERAR' : 'VINCULAR'}
                  </Button>
                </div>

                {/* Cart items */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                      <ShoppingCart className="h-8 w-8 mb-2" />
                      <p className="text-xs font-bold uppercase">CARRINHO VAZIO</p>
                      <p className="text-[10px] text-stone-500">Clique nas peças para adicionar.</p>
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div key={idx} className="bg-white border rounded-xl p-2.5 space-y-1.5" style={{ borderColor: '#e8e2d8' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold uppercase truncate" style={{ color: darkBrown }}>{item.product.name}</h5>
                            <span className="text-[9px] font-mono" style={{ color: gold }}>
                              {item.product.sku} | {item.mode === 'package' ? `Pacote (${item.product.package_qty}un)` : 'Varejo'}
                            </span>
                          </div>
                          <button onClick={() => removeFromCart(idx)} className="text-stone-400 hover:text-red-600 p-0.5">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: '#e8e2d8' }}>
                          <div className="flex items-center border rounded-full bg-white h-7" style={{ borderColor: '#e8e2d8' }}>
                            <button onClick={() => updateQuantity(idx, -1)} className="w-7 h-full font-bold text-xs hover:bg-stone-100 rounded-l-full" style={{ color: brown }}>-</button>
                            <span className="w-7 text-center font-mono font-bold text-xs" style={{ color: darkBrown }}>{item.quantity}</span>
                            <button onClick={() => updateQuantity(idx, 1)} className="w-7 h-full font-bold text-xs hover:bg-stone-100 rounded-r-full" style={{ color: brown }}>+</button>
                          </div>
                          <span className="font-mono font-bold text-xs" style={{ color: darkBrown }}>{formatCurrency(getItemTotal(item))}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Cart footer */}
                <div className="p-4 bg-white border-t space-y-3" style={{ borderColor: '#e8e2d8' }}>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-black uppercase" style={{ color: darkBrown }}>TOTAL</span>
                    <span className="text-xl font-black font-mono" style={{ color: gold }}>{formatCurrency(cartTotal)}</span>
                  </div>
                  <Button disabled={cart.length === 0} onClick={handleFinalizeClick}
                    className="w-full h-12 text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-md"
                    style={{ backgroundColor: gold }}>
                    FINALIZAR VENDA
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── VIEW: CLIENTES ── */}
        {appView === 'clientes' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 bg-white border-b space-y-2" style={{ borderColor: '#e8e2d8' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase" style={{ color: darkBrown }}>Clientes Cadastrados</h2>
                <Button size="xs" onClick={() => setShowNewClientForm(true)} className="text-white text-[10px] font-bold uppercase rounded-full" style={{ backgroundColor: gold }}>
                  <Plus className="h-3 w-3 mr-1" /> Novo
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input placeholder="Buscar cliente..." value={clientSearchQuery}
                  onChange={e => setClientSearchQuery(e.target.value)} className="pl-9 h-10 text-xs" />
              </div>
            </div>
            <div className="flex-1 p-3 overflow-y-auto space-y-2">
              {clients.filter(c =>
                c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                c.document.toLowerCase().includes(clientSearchQuery.toLowerCase())
              ).map(c => (
                <div key={c.id} className="bg-white border rounded-xl p-3 flex items-center justify-between" style={{ borderColor: '#e8e2d8' }}>
                  <div>
                    <p className="text-xs font-bold uppercase" style={{ color: darkBrown }}>{c.name}</p>
                    <p className="text-[10px] font-mono" style={{ color: gold }}>{c.document} · {c.phone}</p>
                  </div>
                  <User className="h-4 w-4" style={{ color: gold }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── VIEW: PEDIDOS ── */}
        {appView === 'pedidos' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 bg-white border-b space-y-2" style={{ borderColor: '#e8e2d8' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase" style={{ color: darkBrown }}>Últimos Pedidos</h2>
                <Button size="xs" onClick={loadOrders} variant="outline" className="text-[10px] font-bold uppercase" style={{ borderColor: '#e8e2d8', color: brown }}>
                  <RefreshCw className={`h-3 w-3 mr-1 ${ordersLoading ? 'animate-spin' : ''}`} /> Atualizar
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input placeholder="Buscar pedido..." value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)} className="pl-9 h-10 text-xs" />
              </div>
            </div>
            <div className="flex-1 p-3 overflow-y-auto space-y-2">
              {orders.length === 0 && !ordersLoading && (
                <div className="text-center py-12 text-stone-400">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-xs font-bold">Clique em Atualizar para carregar pedidos</p>
                </div>
              )}
              {orders.filter(o =>
                o.id?.toLowerCase().includes(orderSearch.toLowerCase()) ||
                o.payment_method?.toLowerCase().includes(orderSearch.toLowerCase())
              ).map((o: any) => (
                <div key={o.id} className="bg-white border rounded-xl p-3 space-y-1" style={{ borderColor: '#e8e2d8' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black font-mono" style={{ color: darkBrown }}>#{o.id?.slice(-6)}</span>
                    <span className="text-xs font-black" style={{ color: gold }}>{formatCurrency(o.total_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-stone-500">{new Date(o.created_at).toLocaleString('pt-BR')}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f0ebe3', color: brown }}>
                      {o.payment_method}
                    </span>
                  </div>
                  <button onClick={() => {
                    const orderIdStr = o.id?.slice(-6) || 'PDV';
                    const payStr = o.payment_method?.toUpperCase() || 'PDV';
                    const totNum = o.total_amount || 0;

                    setLastOrderId(orderIdStr);
                    setLastPayLabel(payStr);
                    setLastOrderTotal(totNum);
                    setLastOrderItems([]);
                    setPrintDone(false);
                    setPrintError(null);
                    setShowPrintModal(true);

                    if (Capacitor.isNativePlatform()) {
                      setTimeout(() => handlePrint(orderIdStr, [], totNum, payStr), 200);
                    }
                  }} className="mt-2 w-full py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-black uppercase cursor-pointer hover:bg-amber-50 transition active:scale-98" style={{ borderColor: gold, color: darkBrown, backgroundColor: '#fcf8f2' }}>
                    <Printer className="h-4 w-4" style={{ color: gold }} /> Reimprimir Comprovante
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══════ FLOATING BOTTOM NAV ══════ */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex z-50 shadow-lg" style={{ borderColor: '#e8e2d8' }}>
        {([
          { id: 'vender' as AppView, icon: ShoppingBag, label: 'Vender' },
          { id: 'clientes' as AppView, icon: Users, label: 'Clientes' },
          { id: 'pedidos' as AppView, icon: ClipboardList, label: 'Pedidos' },
        ]).map(tab => (
          <button key={tab.id} onClick={() => { setAppView(tab.id); if (tab.id === 'pedidos') loadOrders(); }}
            className="flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors cursor-pointer"
            style={{ color: appView === tab.id ? gold : '#9ca3af' }}>
            <tab.icon className="h-5 w-5" />
            <span className="text-[10px] font-extrabold uppercase">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ══════ PRODUCT CONFIG MODAL ══════ */}
      {productModal && (
        <Dialog open={true} onOpenChange={() => setProductModal(null)}>
          <DialogContent className="max-w-md w-full p-0 gap-0 rounded-2xl bg-white border border-stone-300 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b bg-stone-100 flex items-center justify-between" style={{ borderColor: '#e8e2d8' }}>
              <DialogTitle className="text-base font-black uppercase leading-tight" style={{ color: darkBrown }}>{productModal.name}</DialogTitle>
            </div>
            <div className="p-6 space-y-4 text-sm font-sans">
              <p className="font-mono text-xs" style={{ color: gold }}>SKU: {productModal.sku} | ESTOQUE: {productModal.stock_current} UN</p>

              {productModal.package_qty && productModal.package_discount_pct ? (
                <div className="space-y-1.5">
                  <span className="font-bold text-xs uppercase text-stone-600">TIPO DE COMPRA</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => handleModeChange('unit')}
                      style={modalMode === 'unit' ? { backgroundColor: gold, borderColor: gold, color: '#fff' } : { borderColor: '#e8e2d8', color: brown }}
                      className="h-12 rounded-xl border text-xs font-bold transition cursor-pointer flex flex-col items-center justify-center bg-white hover:bg-stone-50">
                      <span>VAREJO</span>
                      <span className="text-[10px] font-medium opacity-80">{formatCurrency(productModal.sale_price)} / un</span>
                    </button>
                    <button type="button" onClick={() => handleModeChange('package')}
                      style={modalMode === 'package' ? { backgroundColor: gold, borderColor: gold, color: '#fff' } : { borderColor: '#e8e2d8', color: brown }}
                      className="h-12 rounded-xl border text-xs font-bold transition cursor-pointer flex flex-col items-center justify-center bg-white hover:bg-stone-50">
                      <span>ATACADO</span>
                      <span className="text-[10px] font-medium opacity-80">{formatCurrency(productModal.sale_price * (1 - productModal.package_discount_pct! / 100))} / un</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Price */}
              <div className="pt-2.5 flex justify-between items-center border-t" style={{ borderColor: '#e8e2d8' }}>
                <span className="font-bold text-xs uppercase" style={{ color: brown }}>PREÇO UNITÁRIO:</span>
                <div className="flex items-center gap-1 font-mono font-black text-xl" style={{ color: darkBrown }}>
                  <span>R$</span>
                  <input type="number" step="0.01" min="0"
                    value={modalPrice === 0 ? '' : modalPrice}
                    onChange={e => setModalPrice(parseFloat(e.target.value) || 0)}
                    className="w-24 text-right bg-transparent border-b border-dashed focus:outline-hidden font-mono font-black text-xl cursor-text"
                    style={{ borderColor: '#ccc', color: darkBrown }} />
                </div>
              </div>

              {modalMode === 'package' && (
                <div className="flex justify-between items-center text-stone-500 text-xs px-1 font-medium">
                  <span>Itens por Pacote:</span>
                  <span className="font-bold">{productModal.package_qty || 10} unidades</span>
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-1.5">
                <span className="font-bold text-xs uppercase text-stone-600">QUANTIDADE</span>
                <div className="flex items-center justify-between border rounded-xl p-2.5 bg-white" style={{ borderColor: '#e8e2d8' }}>
                  <button type="button" onClick={() => setModalQty(q => Math.max(1, q - 1))}
                    className="h-14 w-14 rounded-full border bg-stone-50 hover:bg-stone-100 flex items-center justify-center text-2xl font-bold cursor-pointer transition active:scale-95"
                    style={{ color: brown, borderColor: '#e8e2d8' }}>-</button>
                  <div className="text-center">
                    <span className="font-mono font-black text-2xl" style={{ color: darkBrown }}>{modalQty}</span>
                    <span className="text-[10px] block text-stone-400 font-medium mt-0.5">{modalMode === 'package' ? 'pacote(s)' : 'unidade(s)'}</span>
                  </div>
                  <button type="button" onClick={() => setModalQty(q => q + 1)}
                    className="h-14 w-14 rounded-full border bg-stone-50 hover:bg-stone-100 flex items-center justify-center text-2xl font-bold cursor-pointer transition active:scale-95"
                    style={{ color: brown, borderColor: '#e8e2d8' }}>+</button>
                </div>
              </div>

              {/* Total */}
              <div className="pt-2.5 flex justify-between items-center border-t" style={{ borderColor: '#e8e2d8' }}>
                <span className="font-bold text-xs uppercase" style={{ color: brown }}>TOTAL DO ITEM:</span>
                <span className="font-mono font-black text-xl" style={{ color: gold }}>
                  {formatCurrency((modalMode === 'package' ? modalPrice * (productModal.package_qty || 10) : modalPrice) * modalQty)}
                </span>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: '#e8e2d8', backgroundColor: '#faf8f5' }}>
              <Button variant="outline" onClick={() => setProductModal(null)}
                className="h-14 flex-1 text-sm font-black uppercase rounded-xl" style={{ borderColor: '#e8e2d8', color: brown }}>CANCELAR</Button>
              <Button onClick={() => addToCart(productModal, { mode: modalMode, qty: modalQty, customPrice: modalPrice })}
                className="h-14 flex-1 text-white font-black text-sm uppercase rounded-xl shadow-md active:scale-95 transition cursor-pointer"
                style={{ backgroundColor: gold }}>ADICIONAR</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ══════ CHECKOUT MODAL ══════ */}
      {showCheckout && (
        <Dialog open={true} onOpenChange={() => setShowCheckout(false)}>
          <DialogContent className="max-w-md w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: '#e8e2d8', backgroundColor: '#faf8f5' }}>
              <DialogTitle className="text-sm font-black uppercase" style={{ color: darkBrown }}>
                PAGAMENTO — {formatCurrency(cartTotal)}
              </DialogTitle>
              {selectedClient && (
                <p className="text-[10px] font-mono mt-1" style={{ color: gold }}>Cliente: {selectedClient.name}</p>
              )}
            </div>
            <div className="p-6 space-y-4">
              {/* Formas de pagamento */}
              <div className="grid grid-cols-3 gap-2">
                {(['dinheiro', 'cartao', 'faturada'] as PayMethodPDV[]).map(m => (
                  <button key={m} type="button" onClick={() => setPayMethod(m)}
                    className="p-3 border-2 rounded-xl text-center transition-all"
                    style={payMethod === m ? { borderColor: gold, backgroundColor: '#fdf8f0' } : { borderColor: '#e8e2d8', backgroundColor: 'white' }}>
                    <div className="text-xl mb-1">{m === 'dinheiro' ? '💵' : m === 'cartao' ? '💳' : '📄'}</div>
                    <span className="text-[11px] font-extrabold uppercase block" style={{ color: payMethod === m ? darkBrown : '#6b7280' }}>
                      {m === 'dinheiro' ? 'Dinheiro' : m === 'cartao' ? 'Cartão' : 'Faturada'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Cartão parcelas */}
              {payMethod === 'cartao' && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Parcelas</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['1x', '2x', '3x'] as CardInstallPDV[]).map(opt => (
                      <button key={opt} type="button" onClick={() => setCardInstall(opt)}
                        className="py-3 rounded-xl border-2 font-extrabold text-base transition"
                        style={cardInstall === opt ? { borderColor: gold, backgroundColor: gold, color: 'white' } : { borderColor: '#e8e2d8', color: '#374151', backgroundColor: 'white' }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                  {cartTotal > 0 && <p className="text-xs text-center font-mono" style={{ color: '#8b7355' }}>{cardInstall.replace('x', '')}x de {formatCurrency(cartTotal / parseInt(cardInstall))}</p>}
                </div>
              )}

              {/* Faturada prazos */}
              {payMethod === 'faturada' && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Prazo</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['15', '30', '30/60', '30/60/90'] as FaturadaTermPDV[]).map(opt => (
                      <button key={opt} type="button" onClick={() => setFaturadaTerm(opt)}
                        className="py-3 rounded-xl border-2 font-extrabold text-xs transition"
                        style={faturadaTerm === opt ? { borderColor: gold, backgroundColor: gold, color: 'white' } : { borderColor: '#e8e2d8', color: '#374151', backgroundColor: 'white' }}>
                        {opt === '15' ? '15 dias' : opt === '30' ? '30 dias' : opt === '30/60' ? '30 / 60 dias' : '30 / 60 / 90 dias'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumo */}
              <div className="rounded-xl p-3 border space-y-1" style={{ backgroundColor: '#faf8f5', borderColor: '#e8e2d8' }}>
                <p className="text-[10px] font-bold uppercase" style={{ color: '#8b7355' }}>Condição</p>
                <p className="text-sm font-extrabold" style={{ color: darkBrown }}>{
                  payMethod === 'dinheiro' ? '💵 Dinheiro — À Vista' :
                  payMethod === 'cartao' ? `💳 Cartão — ${cardInstall === '1x' ? '1x À Vista' : `${cardInstall} de ${formatCurrency(cartTotal / parseInt(cardInstall))}`}` :
                  `📄 Faturada — ${faturadaTerm === '15' ? '15 dias' : faturadaTerm === '30' ? '30 dias' : faturadaTerm === '30/60' ? '30/60 dias' : '30/60/90 dias'}`
                }</p>
                <p className="text-lg font-black" style={{ color: gold }}>Total: {formatCurrency(cartTotal)}</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: '#e8e2d8', backgroundColor: '#faf8f5' }}>
              <Button variant="outline" onClick={() => setShowCheckout(false)} className="flex-1 h-12 text-xs font-bold uppercase rounded-full" style={{ borderColor: '#e8e2d8', color: brown }}>VOLTAR</Button>
              <Button onClick={handleFinalize} className="flex-1 h-12 text-white font-bold text-xs uppercase rounded-full shadow-md" style={{ backgroundColor: gold }}>
                <Printer className="h-4 w-4 mr-1" /> CONFIRMAR
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ══════ PRINT MODAL ══════ */}
      {showPrintModal && (
        <Dialog open={true} onOpenChange={closePrintModal}>
          <DialogContent className="max-w-md w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: '#e8e2d8', backgroundColor: '#faf8f5' }}>
              <DialogTitle className="text-sm font-black uppercase" style={{ color: darkBrown }}>
                <Printer className="inline h-4 w-4 mr-2" style={{ color: gold }} />
                Imprimir Comprovante
              </DialogTitle>
            </div>
            <div className="p-6 space-y-4">
              {printDone ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="h-9 w-9 text-emerald-600" />
                  </div>
                  <p className="font-extrabold text-emerald-700 text-lg">Impresso com sucesso!</p>
                </div>
              ) : (
                <>
                  {/* Printer status */}
                  <div className="rounded-xl border p-4 space-y-3 bg-white" style={{ borderColor: '#e8e2d8' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-bold" style={{ color: brown }}>
                        <Printer className="h-5 w-5" style={{ color: gold }} />
                        {Capacitor.isNativePlatform()
                          ? <span className="text-emerald-700">🟢 Impressora POS Nativa</span>
                          : printer
                          ? <span className="text-emerald-700">🟢 {printer.name}</span>
                          : <span className="text-stone-400">Sem impressora</span>}
                      </div>
                      {!printer && !Capacitor.isNativePlatform() && (
                        <button onClick={handleScan} disabled={scanning} className="text-xs font-bold flex items-center gap-1" style={{ color: gold }}>
                          {scanning && <RefreshCw className="h-3 w-3 animate-spin" />}
                          {scanning ? 'Buscando...' : 'Buscar'}
                        </button>
                      )}
                      {printer && (
                        <button onClick={() => { BluetoothPrinter.disconnect(); setPrinter(null); localStorage.removeItem('printer_device'); }}
                          className="text-xs font-bold text-red-400">Desconectar</button>
                      )}
                    </div>
                    {btDevices.map(d => (
                      <button key={d.address} onClick={() => handleConnect(d)} disabled={!!connecting}
                        className="w-full flex items-center justify-between px-3 py-2 border rounded-xl hover:bg-stone-50 transition text-left"
                        style={{ borderColor: '#e8e2d8' }}>
                        <div>
                          <p className="text-xs font-bold" style={{ color: darkBrown }}>{d.name}</p>
                          <p className="text-[10px] text-stone-400">{d.address}</p>
                        </div>
                        {connecting === d.address
                          ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-stone-400" />
                          : <span className="text-xs font-bold" style={{ color: gold }}>Conectar →</span>}
                      </button>
                    ))}
                  </div>

                  {printError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-700">{printError}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {(printer || Capacitor.isNativePlatform()) && (
                      <Button onClick={() => handlePrint()} disabled={printing}
                        className="w-full h-12 text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                        style={{ backgroundColor: gold }}>
                        {printing ? <><RefreshCw className="h-4 w-4 animate-spin" /> Imprimindo...</> : <><Printer className="h-4 w-4" /> Imprimir Comprovante</>}
                      </Button>
                    )}
                    <button onClick={closePrintModal}
                      className="w-full py-3 rounded-full font-bold text-xs border flex items-center justify-center gap-2"
                      style={{ borderColor: '#e8e2d8', color: '#8b7355' }}>
                      <SkipForward className="h-4 w-4" /> Fechar sem imprimir
                    </button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ══════ CLIENT SELECTION MODAL ══════ */}
      {showClientModal && (
        <Dialog open={true} onOpenChange={() => { setShowClientModal(false); setClientFromFinalize(false); }}>
          <DialogContent className="max-w-md w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: '#e8e2d8', backgroundColor: '#faf8f5' }}>
              <DialogTitle className="text-sm font-black uppercase" style={{ color: darkBrown }}>SELECIONAR CLIENTE</DialogTitle>
            </div>
            <div className="p-3 bg-white border-b" style={{ borderColor: '#e8e2d8' }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input placeholder="Buscar cliente por nome ou CPF/CNPJ..."
                  value={clientSearchQuery} onChange={e => setClientSearchQuery(e.target.value)} className="pl-9 h-10 text-xs" />
              </div>
            </div>
            <div className="p-4 max-h-60 overflow-y-auto space-y-2 text-xs font-sans">
              {clients.filter(c =>
                c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                c.document.toLowerCase().includes(clientSearchQuery.toLowerCase())
              ).map(c => (
                <div key={c.id} onClick={() => handleClientSelect(c)}
                  className="p-2.5 border rounded-xl hover:bg-stone-50 cursor-pointer font-bold uppercase transition"
                  style={{ borderColor: '#e8e2d8', color: darkBrown }}>
                  {c.name} <span className="font-mono font-normal text-stone-500">({c.document})</span>
                </div>
              ))}
              {clients.filter(c =>
                c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                c.document.toLowerCase().includes(clientSearchQuery.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-6 text-stone-400 font-medium">Nenhum cliente encontrado.</div>
              )}
            </div>
            <DialogFooter className="px-6 py-4 border-t" style={{ borderColor: '#e8e2d8', backgroundColor: '#faf8f5' }}>
              <Button variant="outline" onClick={() => { setShowClientModal(false); setClientFromFinalize(false); }}
                className="text-xs font-bold uppercase rounded-full" style={{ borderColor: '#e8e2d8', color: brown }}>FECHAR</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ══════ NEW CLIENT FORM MODAL ══════ */}
      {showNewClientForm && (
        <Dialog open={true} onOpenChange={() => setShowNewClientForm(false)}>
          <DialogContent className="max-w-md w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: '#e8e2d8', backgroundColor: '#faf8f5' }}>
              <DialogTitle className="text-sm font-black uppercase" style={{ color: darkBrown }}>CADASTRAR CLIENTE</DialogTitle>
            </div>
            <div className="p-6 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase" style={{ color: '#8b7355' }}>Nome *</label>
                <Input value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" className="h-10 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase" style={{ color: '#8b7355' }}>CPF / CNPJ</label>
                <Input value={newClient.document} onChange={e => setNewClient(p => ({ ...p, document: e.target.value }))} placeholder="000.000.000-00" className="h-10 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase" style={{ color: '#8b7355' }}>Telefone</label>
                <Input value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" className="h-10 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase" style={{ color: '#8b7355' }}>E-mail</label>
                <Input value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" className="h-10 text-xs" />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: '#e8e2d8', backgroundColor: '#faf8f5' }}>
              <Button variant="outline" onClick={() => setShowNewClientForm(false)} className="flex-1 h-10 text-xs font-bold uppercase rounded-full" style={{ borderColor: '#e8e2d8', color: brown }}>CANCELAR</Button>
              <Button onClick={handleSaveClient} disabled={savingClient} className="flex-1 h-10 text-white font-bold text-xs uppercase rounded-full" style={{ backgroundColor: gold }}>
                {savingClient ? 'SALVANDO...' : 'SALVAR'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
