'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { dbService } from '@/services/db';
import { Product } from '@/lib/database.types';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { useCart } from '@/contexts/cart-context';
import CartDrawer from '@/components/cart-drawer';
import { LazyProductImage } from '@/components/ui/lazy-product-image';
import {
  Search,
  ShoppingCart,
  User,
  ShieldCheck,
  Truck,
  Phone,
  Tag,
  ChevronRight,
  Menu,
  Lock,
  ArrowRight,
  Filter,
  SlidersHorizontal,
  Home,
  CheckCircle2
} from 'lucide-react';

export default function ProductsCatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const { cartCount, addToCart } = useCart();

  useEffect(() => {
    async function loadData() {
      try {
        const prodsData = await dbService.getProducts();
        setProducts(prodsData.filter(p => p.status === 'active'));
      } catch (e) {
        console.error('Erro ao carregar produtos do catálogo:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Unique categories list
  const categoryOptions = [
    { id: 'all', name: 'Todas as Categorias' },
    ...Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(cat => ({
      id: cat,
      name: cat
    }))
  ];

  // Unique brands list
  const brandOptions = ['all', ...Array.from(new Set(products.map(p => p.brand).filter(Boolean)))];

  // Filter & Sort Logic
  const filteredProducts = products
    .filter(product => {
      const matchesSearch =
        searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.brand || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesBrand = selectedBrand === 'all' || product.brand === selectedBrand;

      return matchesSearch && matchesCategory && matchesBrand;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price_asc') return a.sale_price - b.sale_price;
      if (sortBy === 'price_desc') return b.sale_price - a.sale_price;
      return 0;
    });

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1, 'unit');
    toast.add({
      title: 'Adicionado ao Pedido',
      description: `${product.name} foi adicionado ao seu carrinho.`,
      type: 'success'
    });
  };

  return (
    <div className="min-h-screen w-full font-sans antialiased" style={{ backgroundColor: '#faf8f5', color: '#3d2b1f' }}>
      
      {/* ── HEADER NAV (PRIME AUTOMOTIVE V3 STYLE) ───────────────────── */}
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
            <Link href="/" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full hover:bg-stone-100 transition" style={{ color: '#5a4633' }}>
              <Home className="h-3.5 w-3.5" style={{ color: '#c9a96e' }} /> Início
            </Link>

            <Link href="/admin" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full hover:bg-stone-100 transition" style={{ color: '#5a4633' }}>
              <Lock className="h-3.5 w-3.5" style={{ color: '#c9a96e' }} /> Painel ERP
            </Link>

            <Button
              onClick={() => setIsCartOpen(true)}
              className="rounded-full font-semibold text-xs px-5 h-10 shadow-xs hover:opacity-95 text-stone-900"
              style={{ backgroundColor: '#c9a96e' }}
            >
              <ShoppingCart className="h-4 w-4 mr-1.5 text-stone-900" />
              Pedido
              {cartCount > 0 && (
                <Badge className="ml-1.5 bg-orange-600 text-white font-mono text-[10px] h-5 w-5 rounded-full flex items-center justify-center p-0">
                  {cartCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* ── BREADCRUMB ─────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-5 pt-6">
        <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
          <Link href="/" className="hover:text-stone-900">Início</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-stone-900">Produtos</span>
        </div>
      </div>

      {/* ── MAIN CONTAINER ─────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-5 py-6">
        
        {/* Header Title & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight" style={{ color: '#3d2b1f' }}>
              Catálogo de Peças Automotivas
            </h1>
            <p className="text-sm font-medium mt-1" style={{ color: '#8b7355' }}>
              Consulte nosso estoque e faça seu pedido direto de fábrica.
            </p>
          </div>

          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, SKU, montadora..."
              className="pl-10 h-11 rounded-xl bg-white border border-stone-200 text-xs font-medium"
              style={{ color: '#3d2b1f' }}
            />
          </div>
        </div>

        {/* Catalog Body Grid (Filters Sidebar + Cards Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* 1. FILTER SIDEBAR */}
          <aside className="space-y-6 lg:col-span-1">
            <div className="bg-white border rounded-2xl p-5 space-y-5" style={{ borderColor: '#e8e2d8' }}>
              
              <div className="flex items-center gap-2 pb-3 border-b" style={{ borderColor: '#e8e2d8' }}>
                <SlidersHorizontal className="h-4 w-4 text-[#c9a96e]" />
                <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ color: '#3d2b1f' }}>Filtros</h3>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-stone-500">Categoria</label>
                <div className="flex flex-col gap-1">
                  {categoryOptions.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`text-left text-xs py-1.5 px-3 rounded-lg transition-all font-medium ${
                        selectedCategory === cat.id ? 'bg-[#f5f0e8] text-orange-700 font-semibold' : 'text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Filter */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-stone-500">Montadora / Marca</label>
                <select
                  value={selectedBrand}
                  onChange={e => setSelectedBrand(e.target.value)}
                  className="w-full h-10 border border-stone-200 bg-white px-3 rounded-xl text-xs font-semibold uppercase"
                  style={{ color: '#3d2b1f' }}
                >
                  <option value="all">Todas as marcas</option>
                  {brandOptions.filter(b => b !== 'all').map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Sort By Select */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-stone-500">Ordenar por</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="w-full h-10 border border-stone-200 bg-white px-3 rounded-xl text-xs font-semibold uppercase"
                  style={{ color: '#3d2b1f' }}
                >
                  <option value="name">Ordem alfabética (A-Z)</option>
                  <option value="price_asc">Menor Preço</option>
                  <option value="price_desc">Maior Preço</option>
                </select>
              </div>

            </div>
          </aside>

          {/* 2. PRODUCTS GRID */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="py-24 text-center text-xs font-mono" style={{ color: '#8b7355' }}>
                <div className="h-8 w-8 animate-spin border-2 border-[#c9a96e] border-t-transparent mx-auto mb-2" />
                Carregando produtos do estoque...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white border rounded-2xl p-16 text-center space-y-3" style={{ borderColor: '#e8e2d8' }}>
                <SlidersHorizontal className="h-10 w-10 mx-auto text-stone-400" />
                <h3 className="text-base font-bold uppercase text-stone-900">Nenhum produto atende aos filtros</h3>
                <p className="text-xs text-stone-500">Limpe os filtros de marca ou busca e tente novamente.</p>
                <Button
                  onClick={() => { setSelectedCategory('all'); setSelectedBrand('all'); setSearchQuery(''); }}
                  className="h-10 text-xs font-semibold px-6 rounded-full border border-stone-300 hover:bg-stone-50 text-stone-850 bg-white"
                >
                  Limpar Todos os Filtros
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredProducts.map(product => {
                  const hasPackage = product.package_qty && product.package_discount_pct;
                  const packageUnitPrice = hasPackage
                    ? product.sale_price * (1 - (product.package_discount_pct! / 100))
                    : product.sale_price;

                  return (
                    <article
                      key={product.id}
                      className="rounded-2xl border overflow-hidden flex flex-col transition hover:shadow-md bg-white"
                      style={{ borderColor: '#e8e2d8' }}
                    >
                      {/* Image & Badges */}
                      <div className="relative aspect-square bg-stone-50 flex items-center justify-center p-4 border-b overflow-hidden group-hover:opacity-95" style={{ borderColor: '#f0eae1' }}>
                        <LazyProductImage
                          productId={product.id}
                          productName={product.name}
                          defaultImage="/logo.png"
                          className="object-contain h-full w-full max-h-48 max-w-48 transition duration-300 hover:scale-105"
                        />

                        {/* Discount Tag */}
                        {hasPackage && (
                          <Badge className="absolute top-3 left-3 bg-[#e8590c] text-white font-mono text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full border-none">
                            -{product.package_discount_pct}% ATACADO
                          </Badge>
                        )}

                        {/* SKU Badge */}
                        <Badge className="absolute bottom-3 right-3 bg-stone-900/80 text-white font-mono text-[9px] px-2 py-0.5 rounded-full border-none">
                          SKU: {product.sku}
                        </Badge>
                      </div>

                      {/* Content */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#c9a96e] block">
                            {product.brand} • {product.category}
                          </span>
                          <h4 className="font-semibold text-xs text-stone-900 line-clamp-2 h-8 leading-snug">
                            {product.name}
                          </h4>
                        </div>

                        {/* Price box */}
                        <div className="bg-stone-50/50 p-2.5 rounded-xl border space-y-1" style={{ borderColor: '#f0eae1' }}>
                          {hasPackage ? (
                            <>
                              <div className="flex justify-between items-baseline">
                                <span className="text-[9px] font-semibold text-stone-500 uppercase">Unitário varejo:</span>
                                <span className="text-xs font-semibold text-stone-600 font-mono line-through">
                                  {formatCurrency(product.sale_price)}
                                </span>
                              </div>
                              <div className="flex justify-between items-baseline border-t pt-1 mt-1" style={{ borderColor: '#f0eae1' }}>
                                <span className="text-[9px] font-bold text-orange-700 uppercase">Preço Atacado (Lote {product.package_qty}un):</span>
                                <span className="text-sm font-bold text-orange-700 font-mono">
                                  {formatCurrency(packageUnitPrice)}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="flex justify-between items-baseline">
                              <span className="text-[9px] font-semibold text-stone-500 uppercase">Preço Unitário:</span>
                              <span className="text-sm font-bold text-stone-900 font-mono">
                                {formatCurrency(product.sale_price)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <Button
                          onClick={() => handleAddToCart(product)}
                          className="w-full text-xs font-semibold uppercase rounded-full h-10 shadow-xs hover:opacity-95 text-stone-900 mt-2"
                          style={{ backgroundColor: '#c9a96e' }}
                        >
                          <ShoppingCart className="h-3.5 w-3.5 mr-1 text-stone-900" /> Adicionar
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

    </div>
  );
}
