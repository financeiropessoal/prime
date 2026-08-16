'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/contexts/cart-context';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { X, Trash2, ShoppingCart, ArrowRight, Printer, Bluetooth, BluetoothOff, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { BluetoothPrinter, BTDevice } from '@/services/bluetooth-printer';

type CartDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, removeFromCart, updateCartQuantity, cartTotal, cartCount, clearCart } = useCart();

  // --- Bluetooth Printer State ---
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [printerDevice, setPrinterDevice] = useState<BTDevice | null>(null);
  const [showPrinterSetup, setShowPrinterSetup] = useState(false);
  const [devices, setDevices] = useState<BTDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printerError, setPrinterError] = useState<string | null>(null);
  const [printSuccess, setPrintSuccess] = useState(false);

  useEffect(() => {
    setIsNativeApp(BluetoothPrinter.isNativeApp());
    const saved = localStorage.getItem('printer_device');
    if (saved) {
      try { setPrinterDevice(JSON.parse(saved)); } catch {}
    }
  }, []);

  if (!isOpen) return null;

  // --- Printer Handlers ---
  const handleScanDevices = async () => {
    setScanning(true);
    setPrinterError(null);
    try {
      const enabled = await BluetoothPrinter.isEnabled();
      if (!enabled) {
        setPrinterError('Bluetooth desligado. Ligue o Bluetooth e tente novamente.');
        return;
      }
      const found = await BluetoothPrinter.scan();
      setDevices(found);
      if (found.length === 0) setPrinterError('Nenhuma impressora encontrada. Verifique se está ligada e pareada.');
    } catch (e: any) {
      setPrinterError(e?.message || 'Erro ao buscar dispositivos.');
    } finally {
      setScanning(false);
    }
  };

  const handleConnectDevice = async (device: BTDevice) => {
    setConnecting(device.address);
    setPrinterError(null);
    try {
      await BluetoothPrinter.connect(device.address);
      setPrinterDevice(device);
      localStorage.setItem('printer_device', JSON.stringify(device));
      setShowPrinterSetup(false);
      setDevices([]);
    } catch (e: any) {
      setPrinterError(`Falha ao conectar: ${e?.message || 'Erro desconhecido'}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async () => {
    await BluetoothPrinter.disconnect();
    setPrinterDevice(null);
    localStorage.removeItem('printer_device');
  };

  // --- Finalizar e Imprimir ---
  const handleFinishAndPrint = async () => {
    setPrinting(true);
    setPrinterError(null);
    setPrintSuccess(false);
    try {
      const items = cart.map(item => {
        const isPkg = item.purchaseType === 'package';
        const discPct = item.product.package_discount_pct || 10;
        const price = isPkg
          ? item.product.sale_price * (1 - discPct / 100)
          : item.product.sale_price;
        return { name: item.product.name, qty: item.quantity, price };
      });

      await BluetoothPrinter.printReceipt({
        storeName: 'PRIME CHAVES CODIFICADAS',
        storeAddress: 'www.primechavescodificadas.com.br',
        orderNumber: `${Date.now()}`.slice(-6),
        items,
        subtotal: cartTotal,
        total: cartTotal,
        paymentMethod: 'MAQUININHA',
        date: new Date().toLocaleString('pt-BR'),
      });

      setPrintSuccess(true);
      setTimeout(() => {
        clearCart();
        onClose();
      }, 1800);
    } catch (e: any) {
      setPrinterError(`Erro ao imprimir: ${e?.message || 'Verifique a conexão com a impressora.'}`);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" />

      <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="pointer-events-auto w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-stone-300">

          {/* Header */}
          <div className="px-5 py-4 bg-white flex items-center justify-between border-b" style={{ borderColor: '#e8e2d8' }}>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg grid place-items-center text-white" style={{ backgroundColor: '#c9a96e' }}>
                <ShoppingCart className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider" style={{ color: '#3d2b1f' }}>
                PEDIDO DE PEÇAS ({cartCount})
              </h2>
            </div>
            <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-700 transition cursor-pointer rounded-full">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ backgroundColor: '#faf8f5' }}>
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-6">
                <div className="p-4 bg-white border rounded-2xl text-stone-400" style={{ borderColor: '#e8e2d8' }}>
                  <ShoppingCart className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-xs uppercase tracking-wider" style={{ color: '#3d2b1f' }}>SEU PEDIDO ESTÁ VAZIO</h3>
                <p className="text-xs max-w-xs" style={{ color: '#8b7355' }}>Explore o catálogo e adicione chaves e componentes ao seu pedido.</p>
                <Button onClick={onClose} className="mt-2 rounded-full font-bold text-xs px-6 h-10 text-white" style={{ backgroundColor: '#c9a96e' }}>
                  VOLTAR AO CATÁLOGO
                </Button>
              </div>
            ) : (
              cart.map((item, idx) => {
                const isPkg = item.purchaseType === 'package';
                const pkgQty = item.product.package_qty || 10;
                const discPct = item.product.package_discount_pct || 10;
                const unitPrice = item.product.sale_price;
                const priceCalculated = isPkg ? unitPrice * (1 - discPct / 100) : unitPrice;

                return (
                  <div key={`${item.product.id}-${item.purchaseType}-${idx}`} className="p-3.5 bg-white border rounded-2xl space-y-3 shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                    <div className="flex gap-3">
                      <div className="h-14 w-14 rounded-xl bg-white border p-1 shrink-0" style={{ borderColor: '#f0eae1' }}>
                        <img src={item.product.images?.[0] || '/prod_onix.jpg'} alt={item.product.name} className="h-full w-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-bold leading-tight line-clamp-2 uppercase" style={{ color: '#3d2b1f' }}>{item.product.name}</h4>
                          <button onClick={() => removeFromCart(item.product.id, item.purchaseType)} className="text-stone-400 hover:text-red-600 transition p-1">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold uppercase" style={{ color: '#c9a96e' }}>{item.product.sku}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase" style={{ backgroundColor: '#f5f0e8', color: '#8b7355' }}>
                            {isPkg ? `PACOTE (${pkgQty} UN)` : 'UNITÁRIO'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: '#f0eae1' }}>
                      <div className="flex items-center border rounded-full overflow-hidden h-8" style={{ borderColor: '#e8e2d8' }}>
                        <button onClick={() => updateCartQuantity(item.product.id, item.purchaseType, Math.max(1, item.quantity - 1))}
                          className="w-7 h-full hover:bg-stone-100 font-bold text-xs cursor-pointer flex items-center justify-center" style={{ color: '#3d2b1f' }}>-</button>
                        <span className="w-8 text-center font-mono font-bold text-xs" style={{ color: '#3d2b1f' }}>{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(item.product.id, item.purchaseType, item.quantity + 1)}
                          className="w-7 h-full hover:bg-stone-100 font-bold text-xs cursor-pointer flex items-center justify-center" style={{ color: '#3d2b1f' }}>+</button>
                      </div>
                      <span className="font-black text-sm" style={{ color: '#3d2b1f' }}>{formatCurrency(priceCalculated * item.quantity)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Summary + Print */}
          {cart.length > 0 && (
            <div className="p-4 bg-white border-t space-y-3" style={{ borderColor: '#e8e2d8' }}>

              {/* Totais */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between" style={{ color: '#8b7355' }}>
                  <span>Subtotal das Peças</span>
                  <span className="font-mono font-bold">{formatCurrency(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-black pt-2 border-t" style={{ color: '#3d2b1f', borderColor: '#e8e2d8' }}>
                  <span className="uppercase">TOTAL DO PEDIDO</span>
                  <span className="font-mono text-base" style={{ color: '#c9a96e' }}>{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              {/* Impressora Bluetooth — só aparece no app nativo */}
              {isNativeApp && (
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
                  {/* Barra de status da impressora */}
                  <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: '#faf8f5' }}>
                    <div className="flex items-center gap-2 text-xs font-bold" style={{ color: '#5a4633' }}>
                      <Printer className="h-4 w-4" style={{ color: '#c9a96e' }} />
                      {printerDevice ? (
                        <span className="text-emerald-700">🟢 {printerDevice.name}</span>
                      ) : (
                        <span className="text-stone-500">Impressora não conectada</span>
                      )}
                    </div>
                    <button
                      onClick={() => { setShowPrinterSetup(v => !v); setPrinterError(null); setDevices([]); }}
                      className="text-xs font-bold underline"
                      style={{ color: '#c9a96e' }}
                    >
                      {printerDevice ? 'Trocar' : 'Configurar'}
                    </button>
                  </div>

                  {/* Painel de configuração da impressora */}
                  {showPrinterSetup && (
                    <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: '#e8e2d8' }}>
                      {printerDevice && (
                        <button onClick={handleDisconnect} className="w-full text-xs text-red-500 font-bold py-1.5 hover:underline">
                          Desconectar {printerDevice.name}
                        </button>
                      )}
                      <button
                        onClick={handleScanDevices}
                        disabled={scanning}
                        className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-bold text-white transition"
                        style={{ backgroundColor: '#5a4633' }}
                      >
                        {scanning
                          ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Buscando...</>
                          : <><Bluetooth className="h-3.5 w-3.5" /> Buscar Impressoras Pareadas</>}
                      </button>

                      {/* Lista de dispositivos */}
                      {devices.map(device => (
                        <button
                          key={device.address}
                          onClick={() => handleConnectDevice(device)}
                          disabled={!!connecting}
                          className="w-full flex items-center justify-between px-3 py-2 border rounded-lg hover:bg-stone-50 transition text-left"
                          style={{ borderColor: '#e8e2d8' }}
                        >
                          <div>
                            <p className="text-xs font-bold" style={{ color: '#3d2b1f' }}>{device.name}</p>
                            <p className="text-[10px] text-stone-400">{device.address}</p>
                          </div>
                          {connecting === device.address
                            ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-stone-400" />
                            : <span className="text-xs font-bold" style={{ color: '#c9a96e' }}>Conectar →</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Mensagem de erro de impressão */}
              {printerError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700">{printerError}</p>
                </div>
              )}

              {/* Sucesso de impressão */}
              {printSuccess && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                  <p className="text-xs text-emerald-700 font-bold">Comprovante impresso! Pedido finalizado.</p>
                </div>
              )}

              {/* Botões de ação */}
              <div className="space-y-2">
                {/* Botão principal: Finalizar e Imprimir (só no app nativo com impressora) */}
                {isNativeApp && printerDevice ? (
                  <button
                    onClick={handleFinishAndPrint}
                    disabled={printing || printSuccess}
                    className="w-full h-12 rounded-full font-bold text-xs uppercase tracking-wider text-white inline-flex items-center justify-center gap-2 shadow-md transition hover:opacity-95 cursor-pointer disabled:opacity-60"
                    style={{ backgroundColor: '#c9a96e' }}
                  >
                    {printing ? (
                      <><RefreshCw className="h-4 w-4 animate-spin" /> Imprimindo...</>
                    ) : printSuccess ? (
                      <><CheckCircle className="h-4 w-4" /> Pedido Finalizado!</>
                    ) : (
                      <><Printer className="h-4 w-4" /> FINALIZAR E IMPRIMIR PEDIDO</>
                    )}
                  </button>
                ) : (
                  /* Botão padrão: só finalizar (navegador / sem impressora) */
                  <Link href="/checkout" onClick={onClose} className="block">
                    <button
                      className="w-full h-12 rounded-full font-bold text-xs uppercase tracking-wider text-white inline-flex items-center justify-center gap-2 shadow-xs transition hover:opacity-95 cursor-pointer"
                      style={{ backgroundColor: '#c9a96e' }}
                    >
                      <span>FINALIZAR COMPRA DE PEÇAS</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </Link>
                )}

                {/* Se está no app nativo mas sem impressora conectada, mostra botão secundário */}
                {isNativeApp && !printerDevice && (
                  <button
                    onClick={() => setShowPrinterSetup(true)}
                    className="w-full h-10 rounded-full font-bold text-xs uppercase tracking-wider border transition hover:bg-stone-50 flex items-center justify-center gap-2"
                    style={{ borderColor: '#c9a96e', color: '#5a4633' }}
                  >
                    <BluetoothOff className="h-4 w-4" />
                    Conectar Impressora
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
