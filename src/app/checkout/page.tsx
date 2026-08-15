'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/contexts/cart-context';
import { dbService } from '@/services/db';
import { Client } from '@/lib/database.types';
import { formatCurrency } from '@/lib/formatters';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Truck,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Building2,
  Lock,
  User,
  MapPin
} from 'lucide-react';

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
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'boleto'>('pix');
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

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

        return {
          product_id: item.product.id,
          quantity: effectiveQty,
          unit_price: finalPrice
        };
      });

      const shippingAddress = {
        street: formData.street,
        number: formData.number,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code
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
      setStep(3);

      toast.add({
        title: 'Pedido Processado',
        description: `Pedido #${newOrder.id} gerado com sucesso.`,
        type: 'success'
      });
    } catch (err: any) {
      console.error(err);
      toast.add({
        title: 'Falha no Pedido',
        description: err.message || 'Erro ao comunicar com o servidor de faturamento.',
        type: 'error'
      });
    } finally {
      setProcessing(false);
    }
  };

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

            {paymentMethod === 'pix' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-[2px] text-left space-y-2 text-xs">
                <span className="font-bold text-amber-900 uppercase block">PAGAMENTO VIA PIX (APROVAÇÃO IMEDIATA)</span>
                <p className="text-stone-700 font-mono text-[11px] bg-white p-2 border border-amber-300 break-all select-all">
                  00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000520400005303986540518.905802BR5916PRIME AUTOMOTIVE6009SAO PAULO62070503***6304E2CA
                </p>
                <p className="text-[10px] text-stone-500">Copie a chave Pix acima e pague no app do seu banco para liberação imediata do envio.</p>
              </div>
            )}

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
                  <div className="bg-white border border-stone-300 p-6 rounded-[2px] space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-stone-900">
                        2. SELEÇÃO DA FORMA DE PAGAMENTO TÉCNICO
                      </span>
                      <button type="button" onClick={() => setStep(1)} className="text-xs text-[#e8590c] font-bold hover:underline uppercase">
                        ALTERAR ENDEREÇO
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div
                        onClick={() => setPaymentMethod('pix')}
                        className={`p-4 border rounded-[2px] cursor-pointer transition-all ${
                          paymentMethod === 'pix' ? 'border-[#e8590c] bg-amber-500/5 ring-1 ring-[#e8590c]' : 'border-stone-300 bg-white'
                        }`}
                      >
                        <QrCode className="h-6 w-6 text-[#e8590c] mb-2" />
                        <span className="block text-xs font-bold uppercase">PIX IMEDIATO</span>
                        <span className="text-[10px] text-emerald-700 font-bold block">APROVAÇÃO INSTANTÂNEA</span>
                      </div>

                      <div
                        onClick={() => setPaymentMethod('card')}
                        className={`p-4 border rounded-[2px] cursor-pointer transition-all ${
                          paymentMethod === 'card' ? 'border-[#e8590c] bg-amber-500/5 ring-1 ring-[#e8590c]' : 'border-stone-300 bg-white'
                        }`}
                      >
                        <CreditCard className="h-6 w-6 text-blue-600 mb-2" />
                        <span className="block text-xs font-bold uppercase">CARTÃO DE CRÉDITO</span>
                        <span className="text-[10px] text-stone-500 block">PARCELAMENTO DISPONÍVEL</span>
                      </div>

                      <div
                        onClick={() => setPaymentMethod('boleto')}
                        className={`p-4 border rounded-[2px] cursor-pointer transition-all ${
                          paymentMethod === 'boleto' ? 'border-[#e8590c] bg-amber-500/5 ring-1 ring-[#e8590c]' : 'border-stone-300 bg-white'
                        }`}
                      >
                        <FileText className="h-6 w-6 text-stone-700 mb-2" />
                        <span className="block text-xs font-bold uppercase">BOLETO BANCÁRIO</span>
                        <span className="text-[10px] text-stone-500 block">VENCIMENTO 2 DIAS</span>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-between items-center border-t border-stone-200">
                      <Button type="button" variant="outline" onClick={() => setStep(1)} className="border-stone-300 text-stone-700 text-xs uppercase font-bold">
                        <ArrowLeft className="h-4 w-4 mr-1" /> VOLTAR
                      </Button>

                      <Button
                        type="submit"
                        disabled={processing}
                        className="bg-[#e8590c] hover:bg-[#d9480f] text-white font-bold text-xs uppercase px-8"
                      >
                        {processing ? 'PROCESSANDO...' : 'FINALIZAR PEDIDO DE COMPRA'}
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
    </div>
  );
}
