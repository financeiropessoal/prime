'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/contexts/cart-context';
import { dbService } from '@/services/db';
import { Client } from '@/lib/database.types';
import { formatCurrency } from '@/lib/formatters';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  QrCode,
  FileText,
  ArrowRight,
  ArrowLeft,
  Lock,
  Printer,
  Bluetooth,
  RefreshCw,
  XCircle,
  X,
  SkipForward
} from 'lucide-react';
import { BluetoothPrinter, BTDevice } from '@/services/bluetooth-printer';

const checkoutFormSchema = z.object({
  email: z.string().email('E-mail inválido'),
  name: z.string().min(3, 'Nome completo obrigatório'),
  document: z.string().min(11, 'Documento inválido (Mínimo 11 caracteres)'),
  phone: z.string().min(10, 'Telefone obrigatório'),
  street: z.string().min(3, 'Endereço obrigatório'),
  number: z.string().min(1, 'Número obrigatório'),
  neighborhood: z.string().min(2, 'Bairro obrigatório'),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z.string().min(2, 'UF obrigatória (Ex: SP)'),
  zip_code: z.string().min(8, 'CEP obrigatório')
});

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();
  const router = useRouter();

  // Steps: 1 = Identification & Shipping, 2 = Payment, 3 = Success (Confirmation)
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'cartao' | 'faturada'>('dinheiro');
  const [cardInstallment, setCardInstallment] = useState<'1x' | '2x' | '3x'>('1x');
  const [faturadaTerm, setFaturadaTerm] = useState<'15' | '30' | '30/60' | '30/60/90'>('30');
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  // Print Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [printerDevice, setPrinterDevice] = useState<BTDevice | null>(null);
  const [btDevices, setBtDevices] = useState<BTDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printDone, setPrintDone] = useState(false);

  useEffect(() => {
    setIsNativeApp(BluetoothPrinter.isNativeApp());
    const saved = localStorage.getItem('printer_device');
    if (saved) { try { setPrinterDevice(JSON.parse(saved)); } catch {} }
  }, []);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: { email: '', name: '', document: '', phone: '', street: '', number: '', neighborhood: '', city: '', state: '', zip_code: '' }
  });

  useEffect(() => {
    async function loadClients() {
      try {
        const cls = await dbService.getClients();
        setClients(cls);

        if (cls.length > 0) {
          const c = cls[0];
          setValue('email', c.email || 'carlos@gmail.com');
          setValue('name', c.name);
          setValue('document', c.document);
          setValue('phone', c.phone || '(16) 99999-8888');
          if (c.addresses && c.addresses.length > 0) {
            const addr = c.addresses[0];
            setValue('street', addr.street);
            setValue('number', addr.number);
            setValue('neighborhood', addr.neighborhood);
            setValue('city', addr.city);
            setValue('state', addr.state);
            setValue('zip_code', addr.zip_code);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (cart.length === 0 && step !== 3) {
      toast.add({ title: 'Carrinho Vazio', description: 'Adicione itens para prosseguir ao checkout.', type: 'warning' });
      router.push('/');
    } else {
      loadClients();
    }
  }, [cart, step, router, setValue]);

  const handleShippingSubmit = () => {
    setStep(2);
  };

  const handleFinalizeOrder = async (formData: any) => {
    setProcessing(true);
    try {
      let targetClient = clients.find(c => c.document.replace(/\D/g, '') === formData.document.replace(/\D/g, ''));

      if (!targetClient) {
        targetClient = await dbService.createClient({
          profile_id: 'prof-1',
          type: formData.document.length > 14 ? 'pj' : 'pf',
          name: formData.name,
          document: formData.document,
          email: formData.email,
          phone: formData.phone,
          addresses: [{
            street: formData.street,
            number: formData.number,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state,
            zip_code: formData.zip_code,
            is_default: true
          }]
        });
      }

      const orderItems = cart.map(item => {
        const isPkg = item.purchaseType === 'package';
        const qtyPerPkg = item.product.package_qty || 10;
        const discPct = item.product.package_discount_pct || 10;
        const unitPrice = item.product.sale_price;
        const finalPrice = isPkg ? unitPrice * (1 - discPct / 100) : unitPrice;
        const effectiveQty = isPkg ? item.quantity * qtyPerPkg : item.quantity;
        return { product_id: item.product.id, quantity: effectiveQty, unit_price: finalPrice };
      });

      const shippingAddress = {
        street: formData.street, number: formData.number,
        neighborhood: formData.neighborhood, city: formData.city,
        state: formData.state, zip_code: formData.zip_code
      };

      const newOrder = await dbService.createOrder({
        client_id: targetClient.id,
        items: orderItems,
        total_amount: cartTotal + 18.90,
        shipping_cost: 18.90,
        shipping_address: shippingAddress,
        payment_method: paymentMethod
      });

      setCreatedOrderId(newOrder.id);
      clearCart();

      // Salva dados do pedido e abre modal de impressão
      // Monta label de pagamento completo
      let paymentLabel = '';
      if (paymentMethod === 'dinheiro') paymentLabel = 'DINHEIRO - A VISTA';
      else if (paymentMethod === 'cartao') paymentLabel = `CARTAO ${cardInstallment.toUpperCase()}${cardInstallment === '1x' ? ' - A VISTA' : ' - ' + formatCurrency(cartTotal / parseInt(cardInstallment)) + '/parcela'}`;
      else if (paymentMethod === 'faturada') paymentLabel = `FATURADA ${faturadaTerm === '15' ? '15 DIAS' : faturadaTerm === '30' ? '30 DIAS' : faturadaTerm === '30/60' ? '30/60 DIAS' : '30/60/90 DIAS'}`;

      setPendingOrderData({
        orderId: newOrder.id,
        customerName: formData.name,
        paymentMethod: paymentLabel,
        items: cart.map(item => {
          const isPkg = item.purchaseType === 'package';
          const discPct = item.product.package_discount_pct || 10;
          const price = isPkg ? item.product.sale_price * (1 - discPct / 100) : item.product.sale_price;
          return { name: item.product.name, qty: item.quantity, price };
        }),
        subtotal: cartTotal,
        total: cartTotal + 18.90,
      });
      setShowPrintModal(true);

      toast.add({ title: 'Pedido Processado', description: `Pedido #${newOrder.id} gerado com sucesso.`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      toast.add({ title: 'Falha no Pedido', description: err.message || 'Erro ao comunicar com o servidor de faturamento.', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  // --- Bluetooth handlers (dentro do modal) ---
  const handleScanBt = async () => {
    setScanning(true); setPrintError(null);
    try {
      const enabled = await BluetoothPrinter.isEnabled();
      if (!enabled) { setPrintError('Bluetooth desligado. Ligue e tente novamente.'); return; }
      const found = await BluetoothPrinter.scan();
      setBtDevices(found);
      if (found.length === 0) setPrintError('Nenhuma impressora encontrada. Verifique se está ligada e pareada.');
    } catch (e: any) { setPrintError(e?.message || 'Erro ao buscar dispositivos.'); }
    finally { setScanning(false); }
  };

  const handleConnectBt = async (device: BTDevice) => {
    setConnecting(device.address); setPrintError(null);
    try {
      await BluetoothPrinter.connect(device.address);
      setPrinterDevice(device);
      localStorage.setItem('printer_device', JSON.stringify(device));
      setBtDevices([]);
    } catch (e: any) { setPrintError(`Falha ao conectar: ${e?.message}`); }
    finally { setConnecting(null); }
  };

  const handlePrint = async () => {
    if (!pendingOrderData) return;
    setPrinting(true); setPrintError(null);
    try {
      await BluetoothPrinter.printReceipt({
        storeName: 'PRIME CHAVES CODIFICADAS',
        storeAddress: 'www.primechavescodificadas.com.br',
        orderNumber: pendingOrderData.orderId,
        items: pendingOrderData.items,
        subtotal: pendingOrderData.subtotal,
        total: pendingOrderData.total,
        paymentMethod: pendingOrderData.paymentMethod,
        customerName: pendingOrderData.customerName,
        date: new Date().toLocaleString('pt-BR'),
      });
      setPrintDone(true);
      setTimeout(() => { setShowPrintModal(false); setStep(3); }, 1500);
    } catch (e: any) { setPrintError(`Erro ao imprimir: ${e?.message}`); }
    finally { setPrinting(false); }
  };

  const handleSkipPrint = () => { setShowPrintModal(false); setStep(3); };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-stone-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 py-3.5 px-4 sm:px-6 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img 
              src="/logo.png" 
              alt="Prime Chaves Codificadas" 
              className="h-9 w-auto object-contain md:h-11"
            />
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-stone-600 uppercase">
            <Lock className="h-3.5 w-3.5 text-[#e8590c]" />
            <span>CHECKOUT SEGURA 256-BIT</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 py-8 flex-1">
        {step !== 3 && (
          /* NUMERATED STEP HEADER BAR */
          <div className="bg-white border border-stone-300 p-4 rounded-[2px] mb-6 flex items-center justify-around text-xs font-bold uppercase tracking-wider">
            <div className={`flex items-center gap-2 ${step === 1 ? 'text-[#e8590c]' : 'text-emerald-700'}`}>
              <span className={`h-6 w-6 rounded-[2px] flex items-center justify-center font-mono text-xs ${
                step === 1 ? 'bg-[#e8590c] text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>1</span>
              <span>DADOS & ENDEREÇO</span>
            </div>

            <span className="text-stone-300">───</span>

            <div className={`flex items-center gap-2 ${step === 2 ? 'text-[#e8590c]' : 'text-stone-400'}`}>
              <span className={`h-6 w-6 rounded-[2px] flex items-center justify-center font-mono text-xs ${
                step === 2 ? 'bg-[#e8590c] text-white' : 'bg-stone-200 text-stone-600'
              }`}>2</span>
              <span>PAGAMENTO</span>
            </div>

            <span className="text-stone-300">───</span>

            <div className="flex items-center gap-2 text-stone-400">
              <span className="h-6 w-6 rounded-[2px] bg-stone-200 text-stone-600 flex items-center justify-center font-mono text-xs">3</span>
              <span>CONFIRMAÇÃO</span>
            </div>
          </div>
        )}

        {/* STEP 3: ORDER CONFIRMATION / POST CHECKOUT PAGE */}
        {step === 3 ? (
          <div className="max-w-2xl mx-auto bg-white border border-stone-300 p-8 rounded-[2px] text-center space-y-6 shadow-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-[2px] inline-block">
              <CheckCircle2 className="h-10 w-10 mx-auto" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-stone-500 uppercase">
                CONFIRMAÇÃO DE FATURAMENTO TÉCNICO
              </span>
              <h1 className="text-2xl font-black uppercase text-stone-900">
                PEDIDO #{createdOrderId} FATURADO COM SUCESSO
              </h1>
              <p className="text-xs text-stone-600">
                A nota fiscal e a confirmação de separação do estoque foram geradas e enviadas ao e-mail cadastrado.
              </p>
            </div>

            <div className="p-4 rounded-xl border text-left space-y-1 text-xs" style={{ backgroundColor: '#faf8f5', borderColor: '#e8e2d8' }}>
              <span className="font-bold uppercase block text-xs" style={{ color: '#5a4633' }}>CONDIÇÃO DE PAGAMENTO</span>
              <p className="font-extrabold text-sm" style={{ color: '#3d2b1f' }}>
                {paymentMethod === 'dinheiro' && '💵 Dinheiro — À Vista'}
                {paymentMethod === 'cartao' && `💳 Cartão — ${cardInstallment === '1x' ? '1x À Vista' : `${cardInstallment} de ${formatCurrency(cartTotal / parseInt(cardInstallment))}`}`}
                {paymentMethod === 'faturada' && `📄 Faturada — ${faturadaTerm === '15' ? '15 dias' : faturadaTerm === '30' ? '30 dias' : faturadaTerm === '30/60' ? '30 / 60 dias' : '30 / 60 / 90 dias'}`}
              </p>
            </div>


            <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/cliente">
                <Button variant="outline" className="border-stone-300 text-stone-800 text-xs uppercase font-bold">
                  VER MEUS PEDIDOS NA CONTA
                </Button>
              </Link>
              <Link href="/">
                <Button className="bg-[#e8590c] hover:bg-[#d9480f] text-white text-xs font-bold uppercase">
                  VOLTAR AO CATÁLOGO DE PEÇAS
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* STEPS 1 & 2 FORM WITH STICKY ORDER SUMMARY */
          <form onSubmit={handleSubmit(step === 1 ? handleShippingSubmit : handleFinalizeOrder)}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* LEFT FORM COLUMN (7 COLS) */}
              <div className="lg:col-span-7 space-y-6">

                {step === 1 && (
                  /* STEP 1: IDENTIFICATION & ADDRESS */
                  <div className="bg-white border border-stone-300 p-6 rounded-[2px] space-y-4">
                    <span className="text-xs font-black uppercase tracking-wider text-stone-900 block border-b border-stone-200 pb-2">
                      1. IDENTIFICAÇÃO E ENDEREÇO DE ENTREGA
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-stone-700 uppercase">E-mail *</label>
                        <Input placeholder="cliente@email.com" {...register('email')} />
                        {errors.email && <p className="text-[10px] text-red-600 font-mono mt-0.5">{errors.email.message?.toString()}</p>}
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-stone-700 uppercase">Nome Completo / Razão Social *</label>
                        <Input placeholder="Nome Completo" {...register('name')} />
                        {errors.name && <p className="text-[10px] text-red-600 font-mono mt-0.5">{errors.name.message?.toString()}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-stone-700 uppercase">CPF ou CNPJ *</label>
                        <Input placeholder="000.000.000-00" {...register('document')} />
                        {errors.document && <p className="text-[10px] text-red-600 font-mono mt-0.5">{errors.document.message?.toString()}</p>}
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-stone-700 uppercase">WhatsApp / Telefone *</label>
                        <Input placeholder="(00) 00000-0000" {...register('phone')} />
                        {errors.phone && <p className="text-[10px] text-red-600 font-mono mt-0.5">{errors.phone.message?.toString()}</p>}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-200 space-y-3">
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-4 space-y-1">
                          <label className="block text-[11px] font-bold text-stone-700 uppercase">CEP *</label>
                          <Input placeholder="00000-000" {...register('zip_code')} className="font-mono" />
                          {errors.zip_code && <p className="text-[10px] text-red-600 font-mono mt-0.5">{errors.zip_code.message?.toString()}</p>}
                        </div>
                        <div className="col-span-8 space-y-1">
                          <label className="block text-[11px] font-bold text-stone-700 uppercase">Logradouro / Rua *</label>
                          <Input placeholder="Rua..." {...register('street')} />
                          {errors.street && <p className="text-[10px] text-red-600 font-mono mt-0.5">{errors.street.message?.toString()}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-stone-700 uppercase">Número *</label>
                          <Input placeholder="Nº" {...register('number')} />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-stone-700 uppercase">Bairro *</label>
                          <Input placeholder="Bairro" {...register('neighborhood')} />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-stone-700 uppercase">Cidade / UF *</label>
                          <div className="flex gap-1">
                            <Input placeholder="Cidade" {...register('city')} className="flex-1" />
                            <Input placeholder="UF" maxLength={2} {...register('state')} className="w-12 uppercase font-mono px-1 text-center" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button type="submit" className="bg-[#e8590c] hover:bg-[#d9480f] text-white font-bold text-xs uppercase px-6">
                        IR PARA O PAGAMENTO <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  /* STEP 2: PAYMENT SELECTION */
                  <div className="bg-white border border-stone-300 p-6 rounded-[2px] space-y-5">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                      <span className="text-xs font-black uppercase tracking-wider text-stone-900">
                        2. FORMA DE PAGAMENTO
                      </span>
                      <button type="button" onClick={() => setStep(1)} className="text-xs font-bold hover:underline uppercase" style={{ color: '#c9a96e' }}>
                        ← Alterar dados
                      </button>
                    </div>

                    {/* Formas de pagamento */}
                    <div className="grid grid-cols-3 gap-3">
                      {/* Dinheiro */}
                      <div
                        onClick={() => setPaymentMethod('dinheiro')}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all text-center ${
                          paymentMethod === 'dinheiro'
                            ? 'border-[#c9a96e] bg-amber-50 ring-1 ring-[#c9a96e]'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <div className="text-2xl mb-1.5">💵</div>
                        <span className="block text-xs font-extrabold uppercase" style={{ color: paymentMethod === 'dinheiro' ? '#5a4633' : '#374151' }}>Dinheiro</span>
                        <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">À VISTA</span>
                      </div>

                      {/* Cartão */}
                      <div
                        onClick={() => setPaymentMethod('cartao')}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all text-center ${
                          paymentMethod === 'cartao'
                            ? 'border-[#c9a96e] bg-amber-50 ring-1 ring-[#c9a96e]'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <CreditCard className={`h-6 w-6 mx-auto mb-1.5 ${ paymentMethod === 'cartao' ? 'text-[#c9a96e]' : 'text-blue-500' }`} />
                        <span className="block text-xs font-extrabold uppercase" style={{ color: paymentMethod === 'cartao' ? '#5a4633' : '#374151' }}>Cartão</span>
                        <span className="text-[9px] text-stone-400 font-bold block mt-0.5">1X · 2X · 3X</span>
                      </div>

                      {/* Faturada */}
                      <div
                        onClick={() => setPaymentMethod('faturada')}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all text-center ${
                          paymentMethod === 'faturada'
                            ? 'border-[#c9a96e] bg-amber-50 ring-1 ring-[#c9a96e]'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <FileText className={`h-6 w-6 mx-auto mb-1.5 ${ paymentMethod === 'faturada' ? 'text-[#c9a96e]' : 'text-stone-500' }`} />
                        <span className="block text-xs font-extrabold uppercase" style={{ color: paymentMethod === 'faturada' ? '#5a4633' : '#374151' }}>Faturada</span>
                        <span className="text-[9px] text-stone-400 font-bold block mt-0.5">A PRAZO</span>
                      </div>
                    </div>

                    {/* Sub-opções: Cartão — parcelas */}
                    {paymentMethod === 'cartao' && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#8b7355' }}>Número de parcelas</p>
                        <div className="grid grid-cols-3 gap-2">
                          {(['1x', '2x', '3x'] as const).map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setCardInstallment(opt)}
                              className={`py-3 rounded-xl border-2 font-extrabold text-sm transition ${
                                cardInstallment === opt
                                  ? 'border-[#c9a96e] text-white'
                                  : 'border-stone-200 text-stone-600 hover:border-stone-300 bg-white'
                              }`}
                              style={cardInstallment === opt ? { backgroundColor: '#c9a96e' } : {}}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-stone-400 font-mono">
                          {cartTotal > 0 && `${cardInstallment.replace('x', '')}x de ${formatCurrency(cartTotal / parseInt(cardInstallment))}`}
                        </p>
                      </div>
                    )}

                    {/* Sub-opções: Faturada — prazos */}
                    {paymentMethod === 'faturada' && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#8b7355' }}>Prazo de pagamento</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(['15', '30', '30/60', '30/60/90'] as const).map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setFaturadaTerm(opt)}
                              className={`py-3 rounded-xl border-2 font-extrabold text-xs transition ${
                                faturadaTerm === opt
                                  ? 'border-[#c9a96e] text-white'
                                  : 'border-stone-200 text-stone-600 hover:border-stone-300 bg-white'
                              }`}
                              style={faturadaTerm === opt ? { backgroundColor: '#c9a96e' } : {}}
                            >
                              {opt === '15' ? '15 dias' : opt === '30' ? '30 dias' : opt === '30/60' ? '30 / 60 dias' : '30 / 60 / 90 dias'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resumo do pagamento selecionado */}
                    <div className="rounded-xl px-4 py-3 border" style={{ backgroundColor: '#faf8f5', borderColor: '#e8e2d8' }}>
                      <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: '#8b7355' }}>Resumo da condição escolhida</p>
                      <p className="text-sm font-extrabold" style={{ color: '#3d2b1f' }}>
                        {paymentMethod === 'dinheiro' && '💵 Dinheiro — À Vista'}
                        {paymentMethod === 'cartao' && `💳 Cartão — ${cardInstallment === '1x' ? '1x À Vista' : `${cardInstallment} de ${formatCurrency(cartTotal / parseInt(cardInstallment))}`}`}
                        {paymentMethod === 'faturada' && `📄 Faturada — ${faturadaTerm === '15' ? '15 dias' : faturadaTerm === '30' ? '30 dias' : faturadaTerm === '30/60' ? '30 / 60 dias' : '30 / 60 / 90 dias'}`}
                      </p>
                    </div>

                    <div className="pt-2 flex justify-between items-center border-t border-stone-200">
                      <Button type="button" variant="outline" onClick={() => setStep(1)} className="border-stone-300 text-stone-700 text-xs uppercase font-bold">
                        <ArrowLeft className="h-4 w-4 mr-1" /> VOLTAR
                      </Button>
                      <Button
                        type="submit"
                        disabled={processing}
                        className="text-white font-bold text-xs uppercase px-8"
                        style={{ backgroundColor: '#c9a96e' }}
                      >
                        {processing ? 'PROCESSANDO...' : 'FINALIZAR PEDIDO'}
                      </Button>
                    </div>
                  </div>
                )}

              </div>

              {/* RIGHT STICKY ORDER SUMMARY COLUMN (5 COLS) */}
              <div className="lg:col-span-5 bg-white border border-stone-300 p-5 rounded-[2px] space-y-4 lg:sticky lg:top-20">
                <span className="text-xs font-black uppercase text-stone-900 tracking-wider block border-b border-stone-200 pb-2">
                  RESUMO DO PEDIDO (#89123)
                </span>

                <div className="divide-y divide-stone-200 max-h-80 overflow-y-auto pr-1">
                  {cart.map((item, idx) => {
                    const isPkg = item.purchaseType === 'package';
                    const qtyPerPkg = item.product.package_qty || 10;
                    const discPct = item.product.package_discount_pct || 10;
                    const unitPrice = item.product.sale_price;
                    const priceCalculated = isPkg
                      ? (unitPrice * qtyPerPkg) * (1 - discPct / 100)
                      : unitPrice;

                    return (
                      <div key={idx} className="py-2.5 flex justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 truncate uppercase">{item.product.name}</p>
                          <p className="text-[10px] text-stone-500 font-mono">
                            SKU: {item.product.sku} | Qtd: {item.quantity}x {isPkg ? `Pacote (${qtyPerPkg}un)` : 'Unidade'}
                          </p>
                        </div>
                        <span className="font-mono font-bold text-stone-900 shrink-0">
                          {formatCurrency(priceCalculated * item.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-1.5 pt-3 border-t border-stone-300 text-xs font-sans">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal do Pedido</span>
                    <span className="font-mono">{formatCurrency(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Frete SEDEX</span>
                    <span className="font-mono text-stone-900">{formatCurrency(18.90)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-stone-900 pt-2 border-t border-stone-200">
                    <span className="uppercase">TOTAL FINAL</span>
                    <span className="font-mono text-[#e8590c]">{formatCurrency(cartTotal + 18.90)}</span>
                  </div>
                </div>

                <div className="p-3 bg-stone-100 text-stone-600 text-[10px] uppercase font-bold flex items-center gap-2 rounded-[2px]">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>EMISSÃO IMEDIATA DE NOTA FISCAL E GARANTIA</span>
                </div>
              </div>

            </div>
          </form>
        )}
      </main>

      {/* ===== MODAL DE IMPRESSÃO BLUETOOTH ===== */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal Card */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: '#e8e2d8', backgroundColor: '#faf8f5' }}>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg grid place-items-center text-white" style={{ backgroundColor: '#c9a96e' }}>
                  <Printer className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider" style={{ color: '#3d2b1f' }}>
                    Imprimir Comprovante
                  </h2>
                  <p className="text-[10px]" style={{ color: '#8b7355' }}>
                    Pedido #{pendingOrderData?.orderId} finalizado
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">

              {/* Sucesso de impressão */}
              {printDone ? (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <p className="font-bold text-emerald-700 text-sm">Comprovante impresso com sucesso!</p>
                  <p className="text-xs text-stone-500">Redirecionando...</p>
                </div>
              ) : (
                <>
                  {/* Se não é app nativo: aviso */}
                  {!isNativeApp ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2">
                      <Printer className="h-8 w-8 mx-auto text-amber-500" />
                      <p className="text-xs font-bold text-amber-800">Impressão via Bluetooth</p>
                      <p className="text-xs text-amber-700">
                        Para imprimir o comprovante, use o <strong>app Prime Automotive</strong> instalado no celular Android.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Status impressora */}
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border" style={{ borderColor: '#e8e2d8', backgroundColor: '#faf8f5' }}>
                        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: '#5a4633' }}>
                          <Bluetooth className="h-4 w-4" style={{ color: '#c9a96e' }} />
                          {printerDevice
                            ? <span className="text-emerald-700">🟢 {printerDevice.name}</span>
                            : <span className="text-stone-500">Nenhuma impressora conectada</span>
                          }
                        </div>
                        {!printerDevice && (
                          <button
                            onClick={handleScanBt}
                            disabled={scanning}
                            className="text-xs font-bold flex items-center gap-1"
                            style={{ color: '#c9a96e' }}
                          >
                            {scanning ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                            {scanning ? 'Buscando...' : 'Buscar'}
                          </button>
                        )}
                      </div>

                      {/* Lista de dispositivos encontrados */}
                      {btDevices.length > 0 && !printerDevice && (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {btDevices.map(device => (
                            <button
                              key={device.address}
                              onClick={() => handleConnectBt(device)}
                              disabled={!!connecting}
                              className="w-full flex items-center justify-between px-3 py-2 border rounded-xl hover:bg-stone-50 transition text-left"
                              style={{ borderColor: '#e8e2d8' }}
                            >
                              <div>
                                <p className="text-xs font-bold" style={{ color: '#3d2b1f' }}>{device.name}</p>
                                <p className="text-[10px] text-stone-400">{device.address}</p>
                              </div>
                              {connecting === device.address
                                ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-stone-400" />
                                : <span className="text-xs font-bold" style={{ color: '#c9a96e' }}>Conectar →</span>
                              }
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Erro */}
                  {printError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-700">{printError}</p>
                    </div>
                  )}

                  {/* Botões de ação */}
                  <div className="space-y-2 pt-1">
                    {/* Botão imprimir */}
                    {isNativeApp && printerDevice && (
                      <button
                        onClick={handlePrint}
                        disabled={printing}
                        className="w-full h-12 rounded-full font-bold text-xs uppercase tracking-wider text-white flex items-center justify-center gap-2 shadow-md transition hover:opacity-90 disabled:opacity-60"
                        style={{ backgroundColor: '#c9a96e' }}
                      >
                        {printing
                          ? <><RefreshCw className="h-4 w-4 animate-spin" /> Imprimindo...</>
                          : <><Printer className="h-4 w-4" /> Imprimir Comprovante</>
                        }
                      </button>
                    )}

                    {/* Pular impressão */}
                    <button
                      onClick={handleSkipPrint}
                      className="w-full h-10 rounded-full font-bold text-xs uppercase tracking-wider border flex items-center justify-center gap-2 transition hover:bg-stone-50"
                      style={{ borderColor: '#e8e2d8', color: '#8b7355' }}
                    >
                      <SkipForward className="h-3.5 w-3.5" />
                      Pular — Finalizar sem imprimir
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
