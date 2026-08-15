'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { dbService } from '@/services/db';
import { Product, Banner } from '@/lib/database.types';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { useCart } from '@/contexts/cart-context';
import CartDrawer from '@/components/cart-drawer';
import {
  Search,
  ShoppingCart,
  User,
  ShieldCheck,
  Truck,
  Phone,
  Gauge,
  Tag,
  ChevronRight,
  Menu,
  Lock,
  Building2,
  Package,
  Sparkles,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export default function StoreHomePageV3() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAllProducts, setShowAllProducts] = useState(false);

  const { cartCount, addToCart } = useCart();

  useEffect(() => {
    async function loadData() {
      try {
        const prodsData = await dbService.getProducts();
        setProducts(prodsData.filter(p => p.status === 'active'));
      } catch (e) {
        console.error('Erro ao carregar dados na loja:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const categories = [
    { id: 'all', name: 'TODAS AS PEÇAS', count: products.length },
    { id: 'Chaves Codificadas', name: 'CHAVE CANIVETE', count: products.filter(p => p.category === 'Chaves Codificadas').length },
    { id: 'Carcaças de Chave', name: 'CAPA CONTROLE', count: products.filter(p => p.category === 'Carcaças de Chave').length },
    { id: 'Controles de Alarme', name: 'CONTROLE', count: products.filter(p => p.category === 'Controles de Alarme').length },
    { id: 'Baterias', name: 'BATERIAS', count: products.filter(p => p.category === 'Baterias').length }
  ];

  const filteredProducts = products.filter(product => {
    const matchesSearch =
      searchQuery === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.brand || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getShowcaseProducts = (list: Product[]) => {
    // 1. Group products by category (ignoring Importados placeholders)
    const groups: { [key: string]: Product[] } = {};
    list.forEach(p => {
      if (p.category === 'Importados' || p.sku === 'PRD-IMPORT') return;
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });

    const categoryNames = Object.keys(groups);
    if (categoryNames.length === 0) return list.slice(0, 4);

    // Shuffle products inside each category list
    categoryNames.forEach(cat => {
      groups[cat] = [...groups[cat]].sort(() => Math.random() - 0.5);
    });

    // Shuffle the category names so the starting category is random too
    const shuffledCategories = [...categoryNames].sort(() => Math.random() - 0.5);

    const selected: Product[] = [];
    const indices: { [key: string]: number } = {};
    shuffledCategories.forEach(cat => {
      indices[cat] = 0;
    });

    // 2. Cycle through shuffled categories to pick one product at a time (round-robin)
    let added = true;
    while (selected.length < 4 && added) {
      added = false;
      for (const cat of shuffledCategories) {
        const idx = indices[cat];
        const prodList = groups[cat];
        if (idx < prodList.length) {
          selected.push(prodList[idx]);
          indices[cat]++;
          added = true;
        }
        if (selected.length >= 4) break;
      }
    }

    // Fallback using randomized list
    if (selected.length < 4) {
      const remainingList = [...list].sort(() => Math.random() - 0.5);
      for (const prod of remainingList) {
        if (!selected.some(s => s.id === prod.id)) {
          selected.push(prod);
        }
        if (selected.length >= 4) break;
      }
    }

    return selected;
  };

  return (
    <div className="min-h-screen w-full font-sans antialiased" style={{ backgroundColor: '#faf8f5', color: '#3d2b1f' }}>

      {/* ── HEADER NAV (PRIME AUTOMOTIVE V3) ───────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-md border-b" style={{ backgroundColor: 'rgba(255,255,255,0.9)', borderColor: '#e8e2d8' }}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img 
              src="/logo.png" 
              alt="Prime Chaves Codificadas" 
              className="h-10 w-auto object-contain md:h-12"
            />
          </Link>

          {/* Quick Nav Actions */}
          <div className="flex items-center gap-3">
            <Link href="/admin" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full hover:bg-stone-100 transition" style={{ color: '#5a4633' }}>
              <Lock className="h-3.5 w-3.5" style={{ color: '#c9a96e' }} /> Painel ERP
            </Link>

            <Link href="/cliente" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full hover:bg-stone-100 transition" style={{ color: '#5a4633' }}>
              <User className="h-3.5 w-3.5" style={{ color: '#c9a96e' }} /> Minha Conta
            </Link>

            <button
              onClick={() => setIsCartOpen(true)}
              style={{ backgroundColor: '#c9a96e', color: '#ffffff' }}
              className="h-10 px-5 rounded-full text-xs font-bold inline-flex items-center gap-2 shadow-xs transition hover:opacity-95 cursor-pointer"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Pedido</span>
              {cartCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-white" style={{ color: '#c9a96e' }}>
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION (HERO WARM & SEARCH PILL) ─────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 px-5 border-b" style={{ backgroundColor: '#faf8f5', borderColor: '#e8e2d8' }}>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="max-w-2xl space-y-4">
            
            {/* Tag Badge */}
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border shadow-2xs"
              style={{ backgroundColor: '#3d2b1f', color: '#ffffff', borderColor: 'rgba(255,255,255,0.15)' }}
            >
              <Gauge className="h-3.5 w-3.5 text-amber-400" />
              <span>PEÇAS AUTOMOTIVAS NO ATACADO</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-black text-3xl sm:text-4xl md:text-5xl leading-tight tracking-tight" style={{ color: '#3d2b1f' }}>
              O que seu cliente procura.{' '}
              <span style={{ color: '#c9a96e' }}>O lucro que seu negócio merece.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base font-medium max-w-lg leading-relaxed" style={{ color: '#5a4633' }}>
              Chaves, Capas e Controles da linha Pósitron, Olimpus, Sistec, Hinor, Bravo e muito mais... Preço de atacado para revendedores em todo o Brasil.
            </p>

            {/* Search Pill Form */}
            <form onSubmit={e => e.preventDefault()} className="pt-4">
              <div
                className="flex items-center gap-2 max-w-md rounded-full px-2 py-2 border shadow-md transition-all focus-within:ring-2"
                style={{ backgroundColor: '#ffffff', borderColor: '#e8e2d8' }}
              >
                <div className="flex-1 flex items-center gap-2.5 px-3">
                  <Search className="h-5 w-5 shrink-0" style={{ color: '#8b7355' }} />
                  <input
                    type="text"
                    placeholder="O que você precisa hoje?"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full outline-none bg-transparent text-sm font-medium placeholder:text-stone-400"
                    style={{ color: '#3d2b1f' }}
                  />
                </div>
                <button
                  type="submit"
                  className="h-11 px-7 rounded-full font-bold text-sm shadow-xs transition hover:opacity-95 cursor-pointer shrink-0"
                  style={{ backgroundColor: '#c9a96e', color: '#ffffff' }}
                >
                  Buscar
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTAINER & BENEFIT CARDS ──────────────────────────── */}
      <main className="max-w-6xl mx-auto px-5 pb-32 -mt-10 relative z-20 space-y-8">
        
        {/* 3 Benefit Feature Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl p-5 border flex items-center gap-4 shadow-2xs" style={{ backgroundColor: '#ffffff', borderColor: '#e8e2d8' }}>
            <div className="h-12 w-12 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: 'rgba(201,169,110,0.15)', color: '#c9a96e' }}>
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: '#3d2b1f' }}>Entrega rápida</div>
              <div className="text-xs font-medium" style={{ color: '#8b7355' }}>Enviamos em até 24h para todo o Brasil</div>
            </div>
          </div>

          <div className="rounded-2xl p-5 border flex items-center gap-4 shadow-2xs" style={{ backgroundColor: '#ffffff', borderColor: '#e8e2d8' }}>
            <div className="h-12 w-12 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: 'rgba(201,169,110,0.15)', color: '#c9a96e' }}>
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: '#3d2b1f' }}>Garantia real</div>
              <div className="text-xs font-medium" style={{ color: '#8b7355' }}>Troca sem burocracia e produto testado</div>
            </div>
          </div>

          <div className="rounded-2xl p-5 border flex items-center gap-4 shadow-2xs" style={{ backgroundColor: '#ffffff', borderColor: '#e8e2d8' }}>
            <div className="h-12 w-12 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: 'rgba(201,169,110,0.15)', color: '#c9a96e' }}>
              <Phone className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: '#3d2b1f' }}>Suporte especializado</div>
              <div className="text-xs font-medium" style={{ color: '#8b7355' }}>Atendimento técnico para chaveiros</div>
            </div>
          </div>
        </section>

        {/* ── PROMOTIONAL DISCOUNT BANNER CARD (PRIME V3 FOTO 2) ─────────────── */}
        <Link
          href="/descontos"
          className="block rounded-2xl p-5 sm:p-6 border transition hover:shadow-md cursor-pointer group"
          style={{ backgroundColor: '#ffffff', borderColor: '#c9a96e' }}
        >
          <div className="flex items-center gap-4">
            {/* Tag Icon Box */}
            <div
              className="h-12 w-12 rounded-xl grid place-items-center shrink-0 shadow-2xs"
              style={{ backgroundColor: '#c9a96e', color: '#ffffff' }}
            >
              <Tag className="h-5 w-5" />
            </div>

            {/* Banner Text Content */}
            <div className="flex-1 min-w-0">
              <div className="text-sm sm:text-base font-black leading-tight" style={{ color: '#000000' }}>
                Quanto mais você leva, mais barato fica
              </div>
              <div className="text-xs sm:text-sm mt-0.5 font-medium" style={{ color: '#8b7355' }}>
                Entenda as três tabelas de desconto em 30 segundos.
              </div>
            </div>

            {/* Chevron Right Indicator */}
            <ChevronRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" style={{ color: '#c9a96e' }} />
          </div>
        </Link>

        {/* ── CATEGORIES PILLS BAR ────────────────────────────────────── */}
        <section className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-xl" style={{ color: '#3d2b1f' }}>Categorias</h2>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-6 h-11 rounded-full text-xs font-bold uppercase transition border cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'shadow-xs'
                    : 'hover:border-stone-400'
                }`}
                style={{
                  backgroundColor: selectedCategory === cat.id ? '#3d2b1f' : '#ffffff',
                  color: selectedCategory === cat.id ? '#ffffff' : '#3d2b1f',
                  borderColor: selectedCategory === cat.id ? '#3d2b1f' : '#e8e2d8'
                }}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        </section>

        {/* ── PRODUCT CARDS GRID (PRIME AUTOMOTIVE V3 STYLE) ───────────── */}
        <section id="catalogo" className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-xl uppercase tracking-tight" style={{ color: '#3d2b1f' }}>
                Catálogo de Peças
              </h2>
              <p className="text-xs font-medium" style={{ color: '#8b7355' }}>
                {filteredProducts.length} produtos disponíveis para pronta entrega
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs font-mono" style={{ color: '#8b7355' }}>
              <div className="h-6 w-6 animate-spin border-2 border-[#c9a96e] border-t-transparent mx-auto mb-2" />
              Carregando produtos...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white border rounded-2xl p-12 text-center space-y-2" style={{ borderColor: '#e8e2d8' }}>
              <Search className="h-8 w-8 mx-auto text-stone-400" />
              <p className="text-sm font-bold uppercase text-stone-900">Nenhum produto encontrado</p>
              <p className="text-xs text-stone-500">Tente buscar por outro termo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(showAllProducts ? filteredProducts : getShowcaseProducts(filteredProducts)).map(product => {
                const hasPackage = product.package_qty && product.package_discount_pct;
                const packageUnitPrice = hasPackage
                  ? product.sale_price * (1 - (product.package_discount_pct! / 100))
                  : product.sale_price;

                return (
                  <article
                    key={product.id}
                    className="rounded-2xl border overflow-hidden flex flex-col transition hover:shadow-md group"
                    style={{ backgroundColor: '#ffffff', borderColor: '#e8e2d8' }}
                  >
                    {/* Image Box */}
                    <Link
                      href={`/produto/${product.id}`}
                      className="block aspect-square relative overflow-hidden bg-white p-3 border-b"
                      style={{ borderColor: '#f0eae1' }}
                    >

                      <img
                        src={product.images[0] || '/prod_onix.jpg'}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    </Link>

                    {/* Content Box */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        {/* SKU */}
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: '#c9a96e' }}>
                          SKU: {product.sku}
                        </div>

                        {/* Title */}
                        <Link href={`/produto/${product.id}`}>
                          <h3 className="mt-1 font-bold text-xs sm:text-sm leading-tight line-clamp-2 uppercase hover:underline" style={{ color: '#3d2b1f' }}>
                            {product.name}
                          </h3>
                        </Link>
                      </div>

                      {/* Pricing Breakdown */}
                      <div className="space-y-2 pt-2 border-t border-stone-100">
                        <div className="flex items-center justify-between text-[10px] font-medium" style={{ color: '#8b7355' }}>
                          <span>UNITÁRIO AVULSO</span>
                          <span className="font-bold" style={{ color: '#3d2b1f' }}>
                            {formatCurrency(product.sale_price)}
                          </span>
                        </div>

                        {hasPackage && (
                          <div 
                            className="relative overflow-hidden rounded-xl border p-2 flex flex-col gap-1 transition-all shadow-2xs"
                            style={{ 
                              background: 'linear-gradient(135deg, #fdfbf7 0%, #f7f1e3 100%)', 
                              borderColor: '#c9a96e' 
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-black tracking-widest uppercase" style={{ color: '#3d2b1f' }}>
                                PACOTE {product.package_qty} UNIDADES
                              </span>
                              <span 
                                className="text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-wider text-white" 
                                style={{ backgroundColor: '#3d2b1f' }}
                              >
                                Economize {product.package_discount_pct}%
                              </span>
                            </div>
                            
                            <div className="flex items-baseline justify-between mt-0.5">
                              <span className="text-[10px] font-bold" style={{ color: '#3d2b1f' }}>
                                Preço no pacote:
                              </span>
                              <span className="font-bold text-xs sm:text-sm" style={{ color: '#e8590c' }}>
                                {formatCurrency(packageUnitPrice)} <span className="text-[9px] font-normal text-stone-500">/un</span>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* CTA Button */}
                      <button
                        onClick={() => {
                          addToCart(product, 1, 'unit');
                          setIsCartOpen(true);
                          toast.add({
                            title: 'Item Adicionado ao Pedido',
                            description: `${product.name} foi adicionado.`,
                            type: 'success'
                          });
                        }}
                        className="w-full h-11 rounded-full font-bold text-xs sm:text-sm active:scale-[0.98] transition shadow-2xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        style={{ backgroundColor: '#c9a96e', color: '#ffffff' }}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        <span>Adicionar ao Pedido</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!showAllProducts && filteredProducts.length > 4 && (
            <div className="flex justify-center pt-6">
              <Button
                onClick={() => setShowAllProducts(true)}
                className="h-11 px-8 rounded-full text-xs font-bold uppercase transition hover:opacity-95 text-stone-900 shadow-xs cursor-pointer"
                style={{ backgroundColor: '#c9a96e' }}
              >
                Ver Mais Produtos
              </Button>
            </div>
          )}
        </section>
      </main>

      {/* ── FOOTER (PRIME AUTOMOTIVE V3) ────────────────────────────── */}
      <footer className="border-t py-12 px-5 text-xs font-sans" style={{ backgroundColor: '#3d2b1f', color: '#a39281', borderColor: 'rgba(255,255,255,0.1)' }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div>
            <div className="mb-3">
              <img 
                src="/logo-white.png" 
                alt="Prime Chaves Codificadas" 
                className="h-9 w-auto object-contain" 
              />
            </div>
            <p className="text-[11px] leading-relaxed">
              Distribuidora B2B especializada em chaves codificadas, carcaças e controles automotivos.
            </p>
          </div>

          <div>
            <span className="block text-xs font-bold uppercase text-white tracking-wider mb-3">ATENDIMENTO TÉCNICO</span>
            <p className="text-[11px]">Segunda a Sexta: 08h às 18h</p>
            <p className="text-[11px] font-mono font-bold mt-1" style={{ color: '#e8590c' }}>(34) 99865-1112</p>
            <p className="text-[11px] text-stone-400">contato@primeautomotive.app</p>
          </div>

          <div>
            <span className="block text-xs font-bold uppercase text-white tracking-wider mb-3">ACESSO DIRETO</span>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link href="/admin" className="hover:text-white transition">Painel ERP Administrativo</Link></li>
              <li><Link href="/cliente" className="hover:text-white transition">Portal do Cliente</Link></li>
              <li><Link href="/checkout" className="hover:text-white transition">Finalização de Pedido</Link></li>
            </ul>
          </div>

          <div>
            <span className="block text-xs font-bold uppercase text-white tracking-wider mb-3">CONDIÇÕES DE PAGAMENTO</span>
            <p className="text-[11px] leading-relaxed">
              Pix com Confirmação Imediata, Cartão de Crédito em até 12x e Faturamento Boleto para Pessoas Jurídicas.
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto text-center text-[10px] font-mono" style={{ color: '#8b7355' }}>
          ATACADO PRIME AUTOMOTIVE — PORTAL B2B © 2026
        </div>
      </footer>

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
