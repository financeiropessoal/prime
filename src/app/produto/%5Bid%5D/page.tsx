'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { Product } from '@/lib/database.types';
import { formatCurrency } from '@/lib/formatters';
import { useCart } from '@/contexts/cart-context';
import CartDrawer from '@/components/cart-drawer';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShoppingCart,
  User,
  ShieldCheck,
  Truck,
  Car,
  ChevronRight,
  Building2,
  CheckCircle2,
  Lock,
  Package,
  Wrench,
  FileText,
  Clock,
  Tag
} from 'lucide-react';

export default function ProdutoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Purchase options
  const [purchaseType, setPurchaseType] = useState<'unit' | 'package'>('package');
  const [quantity, setQuantity] = useState(1);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Shipping simulator state
  const [cep, setCep] = useState('');
  const [shippingResult, setShippingResult] = useState<{ price: number; days: number } | null>(null);
  const [simulating, setSimulating] = useState(false);

  const { cartCount, addToCart } = useCart();

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      try {
        const data = await dbService.getProducts();
        const found = data.find(p => p.id === id);
        if (found) {
          setProduct(found);
        } else {
          toast.add({ title: 'Peça não encontrada', description: 'Item não localizado no inventário.', type: 'warning' });
          router.push('/');
        }
      } catch (e) {
        console.error(e);
        toast.add({ title: 'Erro de conexão', description: 'Falha ao buscar especificações da peça.', type: 'error' });
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id, router]);

  const handleSimulateShipping = (e: React.FormEvent) => {
    e.preventDefault();
    if (cep.replace(/\D/g, '').length !== 8) {
      toast.add({ title: 'CEP Inválido', description: 'Por favor, digite um CEP válido com 8 dígitos.', type: 'warning' });
      return;
    }
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      setShippingResult({ price: 18.90, days: 3 });
      toast.add({ title: 'Frete Calculado', description: 'SEDEX Express calculado com sucesso.', type: 'success' });
    }, 400);
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, quantity, purchaseType);
    setIsCartOpen(true);
    toast.add({
      title: 'Item Adicionado',
      description: `${quantity}x ${product.name} adicionado ao carrinho.`,
      type: 'success'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center font-mono text-xs">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin border-2 border-[#e8590c] border-t-transparent" />
          <span>CARREGANDO FICHA TÉCNICA DA PEÇA...</span>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const hasPackageDiscount = product.package_qty && product.package_discount_pct;
  const unitPackagePrice = hasPackageDiscount
    ? product.sale_price * (1 - (product.package_discount_pct! / 100))
    : product.sale_price;

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-stone-900 font-sans flex flex-col">
      {/* Topbar Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img 
              src="/logo.png" 
              alt="Prime Chaves Codificadas" 
              className="h-10 w-auto object-contain md:h-12"
            />
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="outline" size="sm" className="border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-bold uppercase rounded-[4px]">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar ao Catálogo
              </Button>
            </Link>

            <Button
              onClick={() => setIsCartOpen(true)}
              size="sm"
              className="bg-[#e8590c] hover:bg-[#d9480f] text-white font-bold text-xs uppercase px-3"
            >
              <ShoppingCart className="h-4 w-4 mr-1.5" />
              Carrinho ({cartCount})
            </Button>
          </div>
        </div>
      </header>

      {/* Breadcrumb Bar */}
      <div className="bg-white border-b border-stone-300 py-2.5 px-4 text-xs font-mono text-stone-600">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <Link href="/" className="hover:text-[#e8590c]">CATÁLOGO</Link>
          <ChevronRight className="h-3 w-3 text-stone-400" />
          <span>{product.category.toUpperCase()}</span>
          <ChevronRight className="h-3 w-3 text-stone-400" />
          <span className="font-bold text-stone-900 truncate">SKU: {product.sku}</span>
        </div>
      </div>

      {/* Main 2-Column Product Layout */}
      <main className="max-w-7xl mx-auto w-full px-4 py-6 flex-1 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT COLUMN: STICKY GALLERY (5 COLS) */}
          <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-20">
            <div className="bg-white border border-stone-300 p-6 rounded-[2px] aspect-square flex items-center justify-center relative shadow-xs">
              <img
                src={product.images[0] || 'https://images.unsplash.com/photo-1617400301413-5858dc44f434?w=500&auto=format&fit=crop&q=60'}
                alt={product.name}
                className="object-contain max-h-full max-w-full"
              />
              <div className="absolute top-3 left-3 flex flex-col gap-1">
                <Badge className="bg-emerald-600 text-white border-none font-bold text-[9px] uppercase">
                  PRONTA ENTREGA
                </Badge>
                <Badge className="text-white border-none font-bold text-[9px] uppercase" style={{ backgroundColor: '#c9a96e' }}>
                  GARANTIA 2 ANOS
                </Badge>
              </div>
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img, idx) => (
                  <div key={idx} className="w-16 h-16 bg-white border border-stone-300 p-1 cursor-pointer hover:border-[#e8590c]">
                    <img src={img} alt="Thumb" className="object-contain w-full h-full" />
                  </div>
                ))}
              </div>
            )}

            {/* Quick Guarantees Bar */}
            <div className="bg-stone-100 border border-stone-300 p-3 rounded-[2px] grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase text-stone-700">
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-[#e8590c]" />
                <span>TESTADO 100%</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Truck className="h-4 w-4 text-[#e8590c]" />
                <span>ENVIO RÁPIDO</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Clock className="h-4 w-4 text-[#e8590c]" />
                <span>POSTAGEM 24H</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: TECHNICAL DETAILS & PURCHASE OPTIONS (7 COLS) */}
          <div className="lg:col-span-7 space-y-6">

            {/* Header Info */}
            <div className="bg-white border border-stone-300 p-6 rounded-[2px] space-y-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold text-stone-500 uppercase">
                    SKU: {product.sku}
                  </span>
                  <span className="text-stone-300">|</span>
                  <span className="text-xs font-mono text-stone-500 uppercase">
                    EAN-13: {product.barcode || '7891234567890'}
                  </span>
                </div>
                <h1 className="text-xl font-black text-stone-900 uppercase leading-tight">
                  {product.name}
                </h1>
              </div>

              {/* Compatible Vehicle Table Block */}
              <div className="border border-stone-300 rounded-[2px] overflow-hidden bg-stone-50">
                <div className="bg-stone-100 px-3 py-2 border-b border-stone-300 flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-stone-900 flex items-center gap-1.5">
                    <Car className="h-4 w-4 text-[#e8590c]" /> COMPATIBILIDADE VEICULAR CONFIRMADA
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded-[2px]">
                    VERIFICADO
                  </span>
                </div>

                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="bg-white border-b border-stone-200 text-[10px] font-bold uppercase text-stone-500">
                      <th className="py-1.5 px-3">MARCA</th>
                      <th className="py-1.5 px-3">MODELO ATENDIDO</th>
                      <th className="py-1.5 px-3">ANOS COMPATÍVEIS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 bg-white">
                    {product.vehicle_compatibility && product.vehicle_compatibility.length > 0 ? (
                      product.vehicle_compatibility.map((v, i) => (
                        <tr key={i} className="hover:bg-stone-50">
                          <td className="py-1.5 px-3 font-bold uppercase">{v.brand}</td>
                          <td className="py-1.5 px-3 font-semibold uppercase text-stone-800">{v.model}</td>
                          <td className="py-1.5 px-3 font-mono text-stone-600">{v.year}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-2 px-3 text-stone-500 italic">
                          Universal / compatível com múltiplos controles da categoria {product.category}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pricing & Purchase Selection Card */}
              <div className="space-y-3 pt-2">
                <span className="block text-xs font-black uppercase tracking-wider text-stone-700">
                  SELEÇÃO DE MODALIDADE DE COMPRA:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Unit Retail */}
                  <label
                    onClick={() => setPurchaseType('unit')}
                    className={`p-4 border rounded-[2px] cursor-pointer transition-all ${
                      purchaseType === 'unit'
                        ? 'border-[#e8590c] bg-amber-500/5 ring-1 ring-[#e8590c]'
                        : 'border-stone-300 bg-white hover:border-stone-400'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold uppercase text-stone-800">VAREJO UNITÁRIO</span>
                      <input
                        type="radio"
                        name="ptype"
                        checked={purchaseType === 'unit'}
                        onChange={() => setPurchaseType('unit')}
                        className="accent-[#e8590c]"
                      />
                    </div>
                    <p className="text-xl font-black font-mono text-stone-900">
                      {formatCurrency(product.sale_price)}
                    </p>
                    <span className="text-[10px] text-stone-500 block mt-1">Preço por 1 unidade individual</span>
                  </label>

                  {/* Option 2: Wholesale Package */}
                  {hasPackageDiscount ? (
                    <label
                      onClick={() => setPurchaseType('package')}
                      className={`p-4 border rounded-[2px] cursor-pointer transition-all relative overflow-hidden ${
                        purchaseType === 'package'
                          ? 'border-[#e8590c] bg-amber-500/5 ring-1 ring-[#e8590c]'
                          : 'border-stone-300 bg-white hover:border-stone-400'
                      }`}
                    >
                      <div className="absolute top-0 right-0 bg-[#e8590c] text-white text-[9px] font-bold px-2 py-0.5 uppercase">
                        {product.package_discount_pct}% DESCONTO
                      </div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold uppercase text-stone-800">PACOTE FECHADO ATACADO</span>
                        <input
                          type="radio"
                          name="ptype"
                          checked={purchaseType === 'package'}
                          onChange={() => setPurchaseType('package')}
                          className="accent-[#e8590c]"
                        />
                      </div>
                      <p className="text-xl font-black font-mono text-[#e8590c]">
                        {formatCurrency(unitPackagePrice)} <span className="text-xs font-sans text-stone-600 font-normal">/un</span>
                      </p>
                      <span className="text-[10px] text-stone-600 block font-semibold mt-1">
                        Embalagem com {product.package_qty} unidades = {formatCurrency(unitPackagePrice * product.package_qty!)}
                      </span>
                    </label>
                  ) : (
                    <div className="p-4 border border-stone-200 bg-stone-50 text-stone-400 text-xs flex items-center justify-center">
                      Desconto de pacote não aplicável para este item.
                    </div>
                  )}
                </div>

                {/* Quantity & CTA Button */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <div className="flex items-center border border-stone-300 rounded-[2px] bg-white h-12 w-36 shrink-0">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-full text-stone-600 hover:bg-stone-100 font-bold text-base cursor-pointer"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-mono font-bold text-sm text-stone-900">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-full text-stone-600 hover:bg-stone-100 font-bold text-base cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <Button
                    onClick={handleAddToCart}
                    className="flex-1 h-12 bg-[#e8590c] hover:bg-[#d9480f] text-white font-bold text-sm uppercase tracking-wider rounded-[2px]"
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" /> ADICIONAR AO CARRINHO DE COMPRAS
                  </Button>
                </div>
              </div>

              {/* Shipping Simulator */}
              <div className="pt-4 border-t border-stone-200">
                <form onSubmit={handleSimulateShipping} className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase text-stone-700">SIMULAÇÃO DE FRETE TÉCNICO (CEP)</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="00000-000"
                      value={cep}
                      onChange={e => setCep(e.target.value)}
                      className="h-10 text-xs max-w-xs font-mono"
                    />
                    <Button type="submit" variant="outline" className="h-10 text-xs border-stone-300 text-stone-800">
                      {simulating ? 'CALCULANDO...' : 'CALCULAR FRETE'}
                    </Button>
                  </div>

                  {shippingResult && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-mono flex items-center justify-between rounded-[2px] mt-2">
                      <span>SEDEX EXPRESS (ENTREGA EM {shippingResult.days} DIAS ÚTEIS)</span>
                      <span className="font-bold">{formatCurrency(shippingResult.price)}</span>
                    </div>
                  )}
                </form>
              </div>

            </div>

            {/* Technical Specifications Table */}
            <div className="bg-white border border-stone-300 p-6 rounded-[2px] space-y-4">
              <span className="text-xs font-black uppercase text-stone-900 tracking-wider block border-b border-stone-200 pb-2">
                ESPECIFICAÇÕES TÉCNICAS E CONSTRUTIVAS DA PEÇA
              </span>

              <table className="w-full text-xs text-left font-sans border border-stone-200">
                <tbody className="divide-y divide-stone-200">
                  <tr className="bg-stone-50">
                    <td className="py-2 px-3 font-bold text-stone-600 w-1/3 border-r border-stone-200">NOME DO PRODUTO</td>
                    <td className="py-2 px-3 font-semibold text-stone-900">{product.name}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-stone-600 border-r border-stone-200">CÓDIGO SKU INTERNO</td>
                    <td className="py-2 px-3 font-mono font-bold text-stone-900">{product.sku}</td>
                  </tr>
                  <tr className="bg-stone-50">
                    <td className="py-2 px-3 font-bold text-stone-600 border-r border-stone-200">MARCA HOMOLOGADA</td>
                    <td className="py-2 px-3 text-stone-900 uppercase font-semibold">{product.brand || 'UNIVERSAL'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-stone-600 border-r border-stone-200">CATEGORIA DE PEÇA</td>
                    <td className="py-2 px-3 text-stone-900 uppercase">{product.category}</td>
                  </tr>
                  <tr className="bg-stone-50">
                    <td className="py-2 px-3 font-bold text-stone-600 border-r border-stone-200">DISPONIBILIDADE EM ESTOQUE</td>
                    <td className="py-2 px-3 font-mono text-emerald-700 font-bold">{product.stock_current} UNIDADES PRONTAS PARA ENVIO</td>
                  </tr>
                </tbody>
              </table>

              <div className="pt-2">
                <span className="block text-[11px] font-bold uppercase text-stone-600 mb-1">DESCRIÇÃO E INSTRUÇÕES DE PROGRAMAÇÃO:</span>
                <p className="text-xs text-stone-700 leading-relaxed font-sans bg-stone-50 p-3 border border-stone-200 rounded-[2px]">
                  {product.description}
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
