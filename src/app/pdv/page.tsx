'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { Product } from '@/lib/database.types';
import { useCart } from '@/contexts/cart-context';
import { formatCurrency } from '@/lib/formatters';
import { BluetoothPrinter, BTDevice } from '@/services/bluetooth-printer';
import { formatCurrency as fmt } from '@/lib/formatters';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, Printer,
  Bluetooth, RefreshCw, CheckCircle, XCircle, SkipForward, X
} from 'lucide-react';

type PayMethod = 'dinheiro' | 'cartao' | 'faturada';
type CardInstall = '1x' | '2x' | '3x';
type FaturadaTerm = '15' | '30' | '30/60' | '30/60/90';

export default function PDVPage() {
  const { cart, addToCart, removeFromCart, updateCartQuantity, cartTotal, clearCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'catalog' | 'cart' | 'payment' | 'print'>('catalog');

  // Payment
  const [payMethod, setPayMethod] = useState<PayMethod>('dinheiro');
  const [cardInstall, setCardInstall] = useState<CardInstall>('1x');
  const [faturadaTerm, setFaturadaTerm] = useState<FaturadaTerm>('30');
  const [customerName, setCustomerName] = useState('');

  // Bluetooth / Print
  const [isNative] = useState(() => BluetoothPrinter.isNativeApp());
  const [printer, setPrinter] = useState<BTDevice | null>(null);
  const [btDevices, setBtDevices] = useState<BTDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printDone, setPrintDone] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('printer_device');
    if (saved) { try { setPrinter(JSON.parse(saved)); } catch {} }
    dbService.getProducts().then(p => { setProducts(p); setLoading(false); });
  }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // Payment label for receipt
  const payLabel = () => {
    if (payMethod === 'dinheiro') return 'DINHEIRO - A VISTA';
    if (payMethod === 'cartao') return `CARTAO ${cardInstall}${cardInstall === '1x' ? ' - A VISTA' : ` - ${fmt(cartTotal / parseInt(cardInstall))}/parcela`}`;
    return `FATURADA ${faturadaTerm === '15' ? '15 DIAS' : faturadaTerm === '30' ? '30 DIAS' : faturadaTerm === '30/60' ? '30/60 DIAS' : '30/60/90 DIAS'}`;
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

  const handlePrint = async () => {
    setPrinting(true); setPrintError(null);
    try {
      await BluetoothPrinter.printReceipt({
        storeName: 'PRIME CHAVES CODIFICADAS',
        storeAddress: 'www.primechavescodificadas.com.br',
        orderNumber: `${Date.now()}`.slice(-6),
        customerName: customerName || undefined,
        items: cart.map(item => {
          const isPkg = item.purchaseType === 'package';
          const disc = item.product.package_discount_pct || 10;
          const price = isPkg ? item.product.sale_price * (1 - disc / 100) : item.product.sale_price;
          return { name: item.product.name, qty: item.quantity, price };
        }),
        subtotal: cartTotal,
        total: cartTotal,
        paymentMethod: payLabel(),
        date: new Date().toLocaleString('pt-BR'),
      });
      setPrintDone(true);
      setTimeout(() => { clearCart(); setView('catalog'); setPrintDone(false); setCustomerName(''); }, 2000);
    } catch (e: any) { setPrintError(`Erro: ${e?.message}`); }
    finally { setPrinting(false); }
  };

  const gold = '#c9a96e';
  const brown = '#5a4633';
  const bg = '#faf8f5';

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ backgroundColor: bg }}>

      {/* ── HEADER ── */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-40" style={{ borderColor: '#e8e2d8' }}>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Prime" className="h-8 w-auto object-contain" />
          <span className="text-xs font-bold uppercase tracking-wider hidden sm:block" style={{ color: brown }}>PDV Mobile</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Bluetooth status */}
          {isNative && (
            <button onClick={() => setView('print')} className="flex items-center gap-1 text-xs font-bold px-2 py-1.5 rounded-full border"
              style={{ borderColor: printer ? '#c9a96e' : '#e8e2d8', color: printer ? '#16a34a' : '#8b7355' }}>
              <Bluetooth className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{printer ? printer.name : 'Impressora'}</span>
            </button>
          )}
          {/* Cart button */}
          <button onClick={() => setView('cart')}
            className="relative flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full text-white"
            style={{ backgroundColor: gold }}>
            <ShoppingCart className="h-4 w-4" />
            <span>{fmt(cartTotal)}</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-black">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── CATALOG VIEW ── */}
      {view === 'catalog' && (
        <div className="flex-1 p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou SKU..."
              className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm bg-white outline-none focus:ring-2"
              style={{ borderColor: '#e8e2d8', '--tw-ring-color': gold } as any}
            />
          </div>

          {/* Products grid */}
          {loading ? (
            <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin" style={{ color: gold }} /></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map(p => {
                const inCart = cart.find(c => c.product.id === p.id);
                return (
                  <div key={p.id} className="bg-white border rounded-2xl p-3 space-y-2 shadow-sm" style={{ borderColor: '#e8e2d8' }}>
                    <div className="aspect-square bg-stone-50 rounded-xl overflow-hidden">
                      <img src={p.images?.[0] || '/prod_onix.jpg'} alt={p.name} className="w-full h-full object-contain p-2" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase leading-tight line-clamp-2" style={{ color: brown }}>{p.name}</p>
                      <p className="text-[10px] font-mono mt-0.5" style={{ color: gold }}>{p.sku}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black" style={{ color: '#3d2b1f' }}>{fmt(p.sale_price)}</span>
                      {inCart ? (
                        <div className="flex items-center gap-1 border rounded-full overflow-hidden h-7" style={{ borderColor: '#e8e2d8' }}>
                          <button onClick={() => updateCartQuantity(p.id, 'unit', Math.max(1, inCart.quantity - 1))}
                            className="w-6 h-full flex items-center justify-center font-bold text-xs hover:bg-stone-100" style={{ color: brown }}>-</button>
                          <span className="w-6 text-center text-xs font-mono font-bold" style={{ color: brown }}>{inCart.quantity}</span>
                          <button onClick={() => updateCartQuantity(p.id, 'unit', inCart.quantity + 1)}
                            className="w-6 h-full flex items-center justify-center font-bold text-xs hover:bg-stone-100" style={{ color: brown }}>+</button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(p, 1, 'unit')}
                          className="h-7 w-7 rounded-full text-white flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: gold }}>
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CART VIEW ── */}
      {view === 'cart' && (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-white" style={{ borderColor: '#e8e2d8' }}>
            <button onClick={() => setView('catalog')} className="text-xs font-bold" style={{ color: gold }}>← Voltar</button>
            <h2 className="text-sm font-extrabold uppercase" style={{ color: brown }}>Carrinho ({cartCount})</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <ShoppingCart className="h-10 w-10 text-stone-300" />
                <p className="text-sm font-bold text-stone-400">Carrinho vazio</p>
                <button onClick={() => setView('catalog')} className="text-xs font-bold px-4 py-2 rounded-full text-white" style={{ backgroundColor: gold }}>
                  Ver Produtos
                </button>
              </div>
            ) : (
              cart.map((item, idx) => {
                const price = item.purchaseType === 'package'
                  ? item.product.sale_price * (1 - (item.product.package_discount_pct || 10) / 100)
                  : item.product.sale_price;
                return (
                  <div key={idx} className="bg-white border rounded-2xl p-3 flex gap-3 items-center" style={{ borderColor: '#e8e2d8' }}>
                    <img src={item.product.images?.[0] || '/prod_onix.jpg'} alt="" className="h-12 w-12 object-contain rounded-lg bg-stone-50 p-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold uppercase truncate" style={{ color: brown }}>{item.product.name}</p>
                      <p className="text-[10px] font-mono" style={{ color: gold }}>{item.product.sku}</p>
                      <p className="text-xs font-black mt-0.5" style={{ color: '#3d2b1f' }}>{fmt(price)} × {item.quantity} = {fmt(price * item.quantity)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <button onClick={() => removeFromCart(item.product.id, item.purchaseType)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex items-center border rounded-full overflow-hidden h-7" style={{ borderColor: '#e8e2d8' }}>
                        <button onClick={() => updateCartQuantity(item.product.id, item.purchaseType, Math.max(1, item.quantity - 1))}
                          className="w-6 h-full flex items-center justify-center text-xs font-bold hover:bg-stone-100" style={{ color: brown }}>-</button>
                        <span className="w-6 text-center text-xs font-mono font-bold" style={{ color: brown }}>{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(item.product.id, item.purchaseType, item.quantity + 1)}
                          className="w-6 h-full flex items-center justify-center text-xs font-bold hover:bg-stone-100" style={{ color: brown }}>+</button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-4 bg-white border-t space-y-3" style={{ borderColor: '#e8e2d8' }}>
              <div className="flex justify-between text-lg font-black" style={{ color: '#3d2b1f' }}>
                <span>TOTAL</span>
                <span style={{ color: gold }}>{fmt(cartTotal)}</span>
              </div>
              <button onClick={() => setView('payment')}
                className="w-full h-12 rounded-full text-white font-extrabold text-sm uppercase tracking-wider shadow-md"
                style={{ backgroundColor: gold }}>
                Escolher Pagamento →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PAYMENT VIEW ── */}
      {view === 'payment' && (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-white" style={{ borderColor: '#e8e2d8' }}>
            <button onClick={() => setView('cart')} className="text-xs font-bold" style={{ color: gold }}>← Voltar</button>
            <h2 className="text-sm font-extrabold uppercase" style={{ color: brown }}>Forma de Pagamento</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Nome do cliente (opcional) */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Nome do Cliente (opcional)</label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                placeholder="Ex: João Silva" className="w-full px-3 py-2.5 border rounded-xl text-sm bg-white outline-none"
                style={{ borderColor: '#e8e2d8' }} />
            </div>

            {/* Formas */}
            <div className="grid grid-cols-3 gap-2">
              {(['dinheiro', 'cartao', 'faturada'] as PayMethod[]).map(m => (
                <button key={m} type="button" onClick={() => setPayMethod(m)}
                  className={`p-3 border-2 rounded-2xl text-center transition-all`}
                  style={payMethod === m ? { borderColor: gold, backgroundColor: '#fdf8f0' } : { borderColor: '#e8e2d8', backgroundColor: 'white' }}>
                  <div className="text-xl mb-1">{m === 'dinheiro' ? '💵' : m === 'cartao' ? '💳' : '📄'}</div>
                  <span className="text-[11px] font-extrabold uppercase block" style={{ color: payMethod === m ? brown : '#6b7280' }}>
                    {m === 'dinheiro' ? 'Dinheiro' : m === 'cartao' ? 'Cartão' : 'Faturada'}
                  </span>
                </button>
              ))}
            </div>

            {/* Cartão — parcelas */}
            {payMethod === 'cartao' && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Parcelas</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['1x', '2x', '3x'] as CardInstall[]).map(opt => (
                    <button key={opt} type="button" onClick={() => setCardInstall(opt)}
                      className="py-3 rounded-xl border-2 font-extrabold text-base transition"
                      style={cardInstall === opt ? { borderColor: gold, backgroundColor: gold, color: 'white' } : { borderColor: '#e8e2d8', color: '#374151', backgroundColor: 'white' }}>
                      {opt}
                    </button>
                  ))}
                </div>
                {cartTotal > 0 && (
                  <p className="text-xs text-center font-mono" style={{ color: '#8b7355' }}>
                    {cardInstall.replace('x', '')}x de {fmt(cartTotal / parseInt(cardInstall))}
                  </p>
                )}
              </div>
            )}

            {/* Faturada — prazos */}
            {payMethod === 'faturada' && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Prazo</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['15', '30', '30/60', '30/60/90'] as FaturadaTerm[]).map(opt => (
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
            <div className="rounded-2xl p-4 border space-y-1" style={{ backgroundColor: '#faf8f5', borderColor: '#e8e2d8' }}>
              <p className="text-[10px] font-bold uppercase" style={{ color: '#8b7355' }}>Condição escolhida</p>
              <p className="text-base font-extrabold" style={{ color: '#3d2b1f' }}>{
                payMethod === 'dinheiro' ? '💵 Dinheiro — À Vista' :
                payMethod === 'cartao' ? `💳 Cartão — ${cardInstall === '1x' ? '1x À Vista' : `${cardInstall} de ${fmt(cartTotal / parseInt(cardInstall))}`}` :
                `📄 Faturada — ${faturadaTerm === '15' ? '15 dias' : faturadaTerm === '30' ? '30 dias' : faturadaTerm === '30/60' ? '30/60 dias' : '30/60/90 dias'}`
              }</p>
              <p className="text-lg font-black" style={{ color: gold }}>Total: {fmt(cartTotal)}</p>
            </div>
          </div>

          <div className="p-4 bg-white border-t" style={{ borderColor: '#e8e2d8' }}>
            <button onClick={() => setView('print')}
              className="w-full h-13 py-3.5 rounded-full text-white font-extrabold text-sm uppercase tracking-wider shadow-md"
              style={{ backgroundColor: gold }}>
              <Printer className="inline h-4 w-4 mr-2" />
              Finalizar e Imprimir
            </button>
          </div>
        </div>
      )}

      {/* ── PRINT VIEW ── */}
      {view === 'print' && (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-white" style={{ borderColor: '#e8e2d8' }}>
            <button onClick={() => setView('payment')} className="text-xs font-bold" style={{ color: gold }}>← Voltar</button>
            <h2 className="text-sm font-extrabold uppercase" style={{ color: brown }}>Imprimir Comprovante</h2>
          </div>

          <div className="flex-1 p-4 space-y-4">
            {printDone ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="h-9 w-9 text-emerald-600" />
                </div>
                <p className="font-extrabold text-emerald-700 text-lg">Impresso com sucesso!</p>
                <p className="text-sm text-stone-500">Voltando ao catálogo...</p>
              </div>
            ) : (
              <>
                {/* Status da impressora */}
                <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: '#e8e2d8', backgroundColor: 'white' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold" style={{ color: brown }}>
                      <Bluetooth className="h-5 w-5" style={{ color: gold }} />
                      {printer ? <span className="text-emerald-700">🟢 {printer.name}</span> : <span className="text-stone-400">Sem impressora</span>}
                    </div>
                    {!printer && isNative && (
                      <button onClick={handleScan} disabled={scanning}
                        className="text-xs font-bold flex items-center gap-1"
                        style={{ color: gold }}>
                        {scanning && <RefreshCw className="h-3 w-3 animate-spin" />}
                        {scanning ? 'Buscando...' : 'Buscar'}
                      </button>
                    )}
                    {printer && (
                      <button onClick={() => { BluetoothPrinter.disconnect(); setPrinter(null); localStorage.removeItem('printer_device'); }}
                        className="text-xs font-bold text-red-400">Desconectar</button>
                    )}
                  </div>

                  {/* Lista dispositivos */}
                  {btDevices.map(d => (
                    <button key={d.address} onClick={() => handleConnect(d)} disabled={!!connecting}
                      className="w-full flex items-center justify-between px-3 py-2 border rounded-xl hover:bg-stone-50 transition text-left"
                      style={{ borderColor: '#e8e2d8' }}>
                      <div>
                        <p className="text-xs font-bold" style={{ color: '#3d2b1f' }}>{d.name}</p>
                        <p className="text-[10px] text-stone-400">{d.address}</p>
                      </div>
                      {connecting === d.address
                        ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-stone-400" />
                        : <span className="text-xs font-bold" style={{ color: gold }}>Conectar →</span>}
                    </button>
                  ))}

                  {!isNative && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      ⚠️ Bluetooth disponível apenas no app Android instalado.
                    </p>
                  )}
                </div>

                {printError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700">{printError}</p>
                  </div>
                )}

                <div className="space-y-2">
                  {isNative && printer && (
                    <button onClick={handlePrint} disabled={printing}
                      className="w-full py-4 rounded-full text-white font-extrabold text-sm uppercase tracking-wider shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ backgroundColor: gold }}>
                      {printing ? <><RefreshCw className="h-4 w-4 animate-spin" /> Imprimindo...</> : <><Printer className="h-4 w-4" /> Imprimir Comprovante</>}
                    </button>
                  )}
                  <button onClick={() => { clearCart(); setView('catalog'); setCustomerName(''); }}
                    className="w-full py-3 rounded-full font-bold text-sm border flex items-center justify-center gap-2"
                    style={{ borderColor: '#e8e2d8', color: '#8b7355' }}>
                    <SkipForward className="h-4 w-4" />
                    Finalizar sem imprimir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
