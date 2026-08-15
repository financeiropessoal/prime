'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { Product, Supplier, StockMovement } from '@/lib/database.types';
import { formatCurrency } from '@/lib/formatters';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Package,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  AlertTriangle,
  History,
  TrendingDown,
  Trash2,
  Edit,
  Car,
  PackageMinus,
  PackagePlus,
  RefreshCw,
  Building2
} from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const compatibilitySchema = z.object({
  brand: z.string().optional().or(z.literal('')),
  model: z.string().optional().or(z.literal('')),
  year: z.string().optional().or(z.literal(''))
});

const productFormSchema = z.object({
  name: z.string().min(1, 'Nome do produto é obrigatório'),
  sku: z.string().optional().or(z.literal('')),
  barcode: z.string().optional().nullable(),
  category: z.string().optional().or(z.literal('')),
  brand: z.string().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
  cost_price: z.coerce.number().optional().default(0),
  sale_price: z.coerce.number().optional().default(0),
  package_qty: z.coerce.number().int().nullable().optional(),
  package_discount_pct: z.coerce.number().nullable().optional(),
  stock_current: z.coerce.number().int().optional().default(0),
  stock_minimum: z.coerce.number().int().optional().default(0),
  supplier_id: z.string().optional().nullable(),
  vehicle_compatibility: z.array(compatibilitySchema).default([]),
  status: z.enum(['active', 'inactive']).default('active'),
  imageUrl: z.string().optional().or(z.literal(''))
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function ProdutosAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortField, setSortField] = useState<keyof Product>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isMovementsOpen, setIsMovementsOpen] = useState(false);
  const [selectedProductMovements, setSelectedProductMovements] = useState<Product | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Manual Stock Adjustment form state
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustType, setAdjustType] = useState<'input' | 'manual_adjustment'>('input');
  const [adjustJustification, setAdjustJustification] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setUploadedImage(base64);
        setValue('imageUrl', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const categories = ['Chaves Codificadas', 'Carcaças de Chave', 'Controles de Alarme', 'Telecomandos', 'Baterias', 'Módulos', 'Outros'];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors }
  } = useForm<any>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      sku: '',
      barcode: '',
      category: 'Chaves Codificadas',
      brand: '',
      description: '',
      cost_price: 0,
      sale_price: 0,
      package_qty: 10,
      package_discount_pct: 10,
      stock_current: 0,
      stock_minimum: 5,
      supplier_id: null,
      vehicle_compatibility: [],
      status: 'active',
      imageUrl: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'vehicle_compatibility'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, sups, movs] = await Promise.all([
        dbService.getProducts(),
        dbService.getSuppliers(),
        dbService.getStockMovements()
      ]);
      setProducts(prods);
      setSuppliers(sups);
      setMovements(movs);
    } catch (e) {
      console.error(e);
      toast.add({ title: 'Erro de conexão', description: 'Não foi possível carregar o catálogo de produtos.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const suggestNextSku = (cat: string) => {
    if (editingProduct) return;
    let prefix = '';
    if (cat === 'Chaves Codificadas' || cat === 'Carcaças de Chave') {
      prefix = 'CH-';
    } else if (cat === 'Controles de Alarme') {
      prefix = 'CT-';
    } else if (cat === 'Baterias') {
      prefix = 'BT-';
    } else {
      return;
    }

    const numbers = products
      .map(p => {
        const sku = (p.sku || '').trim();
        if (sku.toUpperCase().startsWith(prefix)) {
          const num = parseInt(sku.substring(prefix.length), 10);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      })
      .filter(n => n > 0);

    const highest = numbers.length > 0 ? Math.max(...numbers) : (prefix === 'CH-' ? 217 : prefix === 'CT-' ? 112 : 100);
    const nextSku = `${prefix}${highest + 1}`;
    setValue('sku', nextSku);
  };

  const watchCategory = watch('category');

  useEffect(() => {
    if (watchCategory && !editingProduct && isFormOpen) {
      suggestNextSku(watchCategory);
    }
  }, [watchCategory, editingProduct, isFormOpen, products]);

  const watchCostPrice = watch('cost_price') || 0;
  const watchSalePrice = watch('sale_price') || 0;
  const watchPackageQty = watch('package_qty') || 0;
  const watchPackageDiscountPct = watch('package_discount_pct') || 0;

  const calculatedMargin = watchCostPrice > 0 ? ((watchSalePrice - watchCostPrice) / watchCostPrice) * 100 : 0;
  const calculatedPkgPrice = watchSalePrice > 0 && watchPackageQty > 0
    ? (watchSalePrice * watchPackageQty) * (1 - (watchPackageDiscountPct / 100))
    : 0;

  const handleOpenCreateForm = () => {
    setUploadedImage('');
    setEditingProduct(null);
    reset({
      name: '',
      sku: '',
      barcode: '',
      category: 'Chaves Codificadas',
      brand: '',
      description: '',
      cost_price: 0,
      sale_price: 0,
      package_qty: 10,
      package_discount_pct: 10,
      stock_current: 0,
      stock_minimum: 5,
      supplier_id: null,
      vehicle_compatibility: [],
      status: 'active',
      imageUrl: ''
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (product: Product) => {
    setUploadedImage(product.images?.[0] || '');
    setEditingProduct(product);
    reset({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      category: product.category,
      brand: product.brand,
      description: product.description,
      cost_price: product.cost_price,
      sale_price: product.sale_price,
      package_qty: product.package_qty || 10,
      package_discount_pct: product.package_discount_pct || 10,
      stock_current: product.stock_current,
      stock_minimum: product.stock_minimum,
      supplier_id: product.supplier_id,
      vehicle_compatibility: product.vehicle_compatibility || [],
      status: product.status,
      imageUrl: product.images?.[0] || ''
    });
    setIsFormOpen(true);
  };

  const onFormSubmit = async (data: ProductFormValues) => {
    try {
      const generatedSku = data.sku && data.sku.trim() !== '' 
        ? data.sku 
        : `SKU-${Math.floor(100000 + Math.random() * 900000)}`;

      const payload = {
        name: data.name,
        sku: generatedSku,
        barcode: data.barcode || null,
        category: data.category || 'Geral',
        brand: data.brand || 'Universal',
        description: data.description || 'Sem descrição cadastrada.',
        cost_price: Number(data.cost_price || 0),
        sale_price: Number(data.sale_price || 0),
        package_qty: data.package_qty ? Number(data.package_qty) : null,
        package_discount_pct: data.package_discount_pct ? Number(data.package_discount_pct) : null,
        stock_current: Number(data.stock_current || 0),
        stock_minimum: Number(data.stock_minimum || 0),
        supplier_id: data.supplier_id || null,
        vehicle_compatibility: (data.vehicle_compatibility || []).map(v => ({
          brand: v.brand || '',
          model: v.model || '',
          year: v.year || ''
        })),
        status: data.status || 'active',
        images: data.imageUrl ? [data.imageUrl] : ['https://images.unsplash.com/photo-1617400301413-5858dc44f434?w=500&auto=format&fit=crop&q=60']
      };

      if (editingProduct) {
        await dbService.updateProduct(editingProduct.id, payload);
        toast.add({ title: 'Produto Atualizado', description: `Item ${payload.name} atualizado.`, type: 'success' });
      } else {
        await dbService.createProduct(payload);
        toast.add({ title: 'Produto Criado', description: `Item ${payload.name} cadastrado.`, type: 'success' });
      }
      setIsFormOpen(false);
      loadData();
    } catch (e: any) {
      toast.add({ title: 'Erro ao Salvar', description: e.message || 'Ocorreu um erro ao salvar o produto.', type: 'error' });
    }
  };

  const handleOpenAdjust = (product: Product) => {
    setAdjustingProduct(product);
    setAdjustQty(1);
    setAdjustType('input');
    setAdjustJustification('');
    setIsAdjustOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    if (adjustQty <= 0) {
      toast.add({ title: 'Quantidade Inválida', description: 'Informe um valor maior que zero.', type: 'warning' });
      return;
    }
    if (!adjustJustification.trim()) {
      toast.add({ title: 'Justificativa Obrigatória', description: 'Descreva o motivo do ajuste.', type: 'warning' });
      return;
    }

    try {
      const newStock = adjustType === 'input'
        ? adjustingProduct.stock_current + adjustQty
        : Math.max(0, adjustingProduct.stock_current - adjustQty);

      await dbService.updateProduct(adjustingProduct.id, {
        stock_current: newStock,
        description: adjustJustification
      });

      toast.add({
        title: 'Estoque Ajustado',
        description: `Novo saldo de ${adjustingProduct.name}: ${newStock} unidades.`,
        type: 'success'
      });

      setIsAdjustOpen(false);
      loadData();
    } catch (e) {
      toast.add({ title: 'Erro no Ajuste', description: 'Não foi possível atualizar o estoque.', type: 'error' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return;
    try {
      await dbService.deleteProduct(deletingProduct.id);
      toast.add({ title: 'Produto Excluído', description: 'Item removido permanentemente.', type: 'success' });
      setIsDeleteOpen(false);
      loadData();
    } catch (e: any) {
      if (e.message === 'REFERENCED_BY_SALES') {
        toast.add({
          title: 'Produto Inativado',
          description: 'Este item possui histórico de vendas e não pode ser removido. Ele foi marcado como Inativo.',
          type: 'warning'
        });
      } else {
        toast.add({
          title: 'Erro ao Excluir',
          description: e.message || 'Ocorreu um erro ao excluir o produto.',
          type: 'error'
        });
      }
      setIsDeleteOpen(false);
      loadData();
    }
  };

  // Filter & Sort Logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;

    let matchesStock = true;
    if (stockFilter === 'low') matchesStock = p.stock_current <= p.stock_minimum;
    if (stockFilter === 'normal') matchesStock = p.stock_current > p.stock_minimum;

    return matchesSearch && matchesCategory && matchesStock;
  }).sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }
    return 0;
  });

  const lowStockCount = products.filter(p => p.stock_current <= p.stock_minimum).length;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className="border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs" style={{ backgroundColor: '#ffffff', borderColor: '#e8e2d8' }}>
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest block mb-1" style={{ color: '#c9a96e' }}>
            CONTROLE DE ESTOQUE ERP
          </span>
          <h1 className="text-xl font-black uppercase tracking-tight" style={{ color: '#3d2b1f' }}>
            PRODUTOS, CHAVES & PEÇAS CATALOGADAS
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: '#8b7355' }}>
            Total de {products.length} itens cadastrados no inventário.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleOpenCreateForm}
            size="sm"
            className="font-bold text-xs uppercase px-5 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95"
            style={{ backgroundColor: '#c9a96e', color: '#3d2b1f' }}
          >
            <Plus className="h-4 w-4 mr-1.5 text-[#3d2b1f]" /> CADASTRAR NOVO PRODUTO
          </Button>
        </div>
      </div>

      {/* KPI Alert Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#8b7355' }}>TOTAL DE PEÇAS</span>
          <p className="text-2xl font-black font-mono mt-1" style={{ color: '#3d2b1f' }}>{products.length}</p>
        </div>

        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#8b7355' }}>ALERTAS DE ESTOQUE MÍNIMO</span>
          <p className={`text-2xl font-black font-mono mt-1 ${lowStockCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {lowStockCount}
          </p>
        </div>

        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#8b7355' }}>FORNECEDORES CADASTRADOS</span>
          <p className="text-2xl font-black font-mono mt-1" style={{ color: '#3d2b1f' }}>{suppliers.length}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border p-5 rounded-2xl space-y-3 shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Buscar por código SKU, nome do produto ou marca..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="h-10 px-3 bg-white border border-stone-300 rounded-[2px] text-xs text-stone-800 font-bold uppercase cursor-pointer"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value)}
              className="h-10 px-3 bg-white border border-stone-300 rounded-[2px] text-xs text-stone-800 font-bold uppercase cursor-pointer"
            >
              <option value="all">Todos os Saldos</option>
              <option value="low">Estoque Mínimo (Alerta)</option>
              <option value="normal">Estoque Normal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid Layout */}
      {loading ? (
        <div className="bg-white border p-12 text-center rounded-2xl font-mono text-stone-500 text-xs shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#c9a96e]" />
          Carregando inventário...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white border p-12 text-center rounded-2xl font-mono text-stone-500 text-xs shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          Nenhum produto encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(p => {
            const isLow = p.stock_current <= p.stock_minimum;
            const hasPkg = p.package_qty && p.package_discount_pct;
            const pkgPrice = hasPkg
              ? (p.sale_price * p.package_qty!) * (1 - p.package_discount_pct! / 100)
              : null;

            return (
              <div 
                key={p.id} 
                className="bg-white border rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition duration-200 flex flex-col justify-between" 
                style={{ borderColor: '#e8e2d8' }}
              >
                {/* Image and Header */}
                <div className="relative bg-stone-50 border-b p-4 flex items-center justify-center h-44" style={{ borderColor: '#f0eae1' }}>
                  <img
                    src={p.images?.[0] || 'https://images.unsplash.com/photo-1617400301413-5858dc44f434?w=200'}
                    alt={p.name}
                    className="object-contain max-h-full max-w-full"
                  />
                  {/* Stock Badge */}
                  <div className="absolute top-2.5 right-2.5">
                    <Badge className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                      isLow ? 'bg-red-50 text-red-700 border-red-200' : 'bg-stone-100 text-stone-700 border-stone-200'
                    }`}>
                      {p.stock_current} UN {isLow ? '(MÍN!)' : ''}
                    </Badge>
                  </div>
                  {/* SKU */}
                  <div className="absolute bottom-2 left-2.5 bg-black/70 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-sm">
                    {p.sku}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Category & Brand */}
                    <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#8b7355' }}>
                      <span>{p.category}</span>
                      <span>{p.brand}</span>
                    </div>
                    {/* Name */}
                    <h3 className="text-xs font-black uppercase text-stone-900 line-clamp-2 h-8 leading-tight">
                      {p.name}
                    </h3>
                  </div>

                  {/* Pricing Info */}
                  <div className="bg-stone-50 p-2.5 rounded-xl space-y-1.5 border" style={{ borderColor: '#f0eae1' }}>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-stone-500 font-medium">CUSTO:</span>
                      <span className="font-mono font-bold text-stone-700">{formatCurrency(p.cost_price)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-stone-500 font-medium">VENDA:</span>
                      <span className="font-mono font-black text-stone-900">{formatCurrency(p.sale_price)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-dashed border-stone-200">
                      <span className="text-stone-500 font-medium">ATACADO:</span>
                      {pkgPrice ? (
                        <div className="text-right">
                          <span className="font-mono font-bold text-emerald-700 block">{formatCurrency(pkgPrice)}</span>
                          <span className="text-[8px] text-stone-400 block leading-none">({p.package_qty}un, {p.package_discount_pct}% OFF)</span>
                        </div>
                      ) : (
                        <span className="text-stone-400 font-mono">-</span>
                      )}
                    </div>
                  </div>

                  {/* Compatibility info */}
                  <div className="text-[9px] text-stone-500 truncate" title={(p.vehicle_compatibility || []).map(v => `${v.brand} ${v.model}`).join(', ') || 'Universal'}>
                    <span className="font-bold">COMPATÍVEL:</span> {(p.vehicle_compatibility || []).map(v => `${v.brand} ${v.model}`).join(', ') || 'Universal'}
                  </div>
                </div>

                {/* Action Buttons Footer */}
                <div className="grid grid-cols-2 gap-2 p-3 border-t bg-stone-50/50" style={{ borderColor: '#f0eae1' }}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenAdjust(p)}
                    className="border-stone-300 text-stone-850 text-[10px] uppercase font-black h-10 rounded-lg flex items-center justify-center gap-1.5 hover:bg-stone-100 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5" style={{ color: '#c9a96e' }} /> AJUSTAR
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEditForm(p)}
                    className="border-stone-300 text-stone-850 text-[10px] uppercase font-black h-10 rounded-lg flex items-center justify-center gap-1.5 hover:bg-stone-100 cursor-pointer shadow-2xs"
                  >
                    <Edit className="h-3.5 w-3.5 text-stone-500" /> EDITAR
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedProductMovements(p);
                      setIsMovementsOpen(true);
                    }}
                    className="border-stone-300 text-stone-850 text-[10px] uppercase font-black h-10 rounded-lg flex items-center justify-center gap-1.5 hover:bg-stone-100 cursor-pointer shadow-2xs"
                  >
                    <History className="h-3.5 w-3.5 text-stone-500" /> HISTÓRICO
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDeletingProduct(p);
                      setIsDeleteOpen(true);
                    }}
                    className="border-red-200 text-red-750 text-[10px] uppercase font-black h-10 rounded-lg flex items-center justify-center gap-1.5 hover:bg-red-50 hover:text-red-800 cursor-pointer shadow-2xs"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" /> EXCLUIR
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 1. MAIN PRODUCT FORM MODAL (900px WIDE DESKTOP / FULL MOBILE) ── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-6 py-4 border-b shrink-0 bg-white flex items-center justify-between" style={{ borderColor: '#e8e2d8' }}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl grid place-items-center text-white shrink-0 shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
                <Package className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black uppercase tracking-tight" style={{ color: '#3d2b1f' }}>
                  {editingProduct ? 'EDITAR PEÇA / PRODUTO' : 'CADASTRAR NOVO PRODUTO NO INVENTÁRIO'}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium mt-0.5" style={{ color: '#8b7355' }}>
                  Preencha as seções técnicas de identificação, preços em atacado/varejo e compatibilidades veiculares.
                </DialogDescription>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col">
            <div className="px-8 py-6 space-y-6 max-h-[75vh] overflow-y-auto font-sans" style={{ backgroundColor: '#faf8f5' }}>

              {/* ── SEÇÃO 1: IDENTIFICAÇÃO DO ITEM ─────────────────── */}
              <div className="space-y-4 bg-white p-6 rounded-2xl border shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                <span className="text-xs font-black uppercase tracking-wider block border-b pb-2" style={{ color: '#3d2b1f', borderColor: '#e8e2d8' }}>
                  1. IDENTIFICAÇÃO DO PRODUTO & CATEGORIA
                </span>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>
                    Nome Completo do Produto / Peça <span className="text-red-600">*</span>
                  </label>
                  <Input
                    {...register('name')}
                    placeholder="Ex: Chave Canivete Codificada Completa Chevrolet Onix 2013-2019"
                    className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200"
                  />
                  {errors.name && <p className="text-[10px] text-red-600 font-mono mt-0.5">{errors.name.message?.toString()}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Código SKU</label>
                    <Input {...register('sku')} placeholder="CHV-GM-ONX-01 (ou automático)" className="font-mono h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Código EAN-13 (Barras)</label>
                    <Input {...register('barcode')} placeholder="7891234567890" className="font-mono h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Marca / Fabricante</label>
                    <Input {...register('brand')} placeholder="Ex: Chevrolet / Olimpus" className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Categoria da Peça</label>
                    <Select value={watch('category')} onValueChange={val => setValue('category', val)}>
                      <SelectTrigger className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Chaves Codificadas">Chaves Codificadas</SelectItem>
                        <SelectItem value="Carcaças de Chave">Carcaças de Chave</SelectItem>
                        <SelectItem value="Controles de Alarme">Controles de Alarme</SelectItem>
                        <SelectItem value="Baterias">Baterias</SelectItem>
                        <SelectItem value="Transponders / Chips">Transponders / Chips</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Fornecedor Padrão</label>
                    <Select value={watch('supplier_id') || 'none'} onValueChange={val => setValue('supplier_id', val === 'none' ? null : val)}>
                      <SelectTrigger className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200">
                        <SelectValue placeholder="Selecione o fornecedor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem Fornecedor Vinculado</SelectItem>
                        {suppliers.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.trade_name || s.company_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Descrição Técnica</label>
                  <Textarea
                    {...register('description')}
                    rows={3}
                    placeholder="Especifique tipo de lâmina, frequência (ex: 433MHz), modelo do chip transponder..."
                    className="rounded-xl bg-stone-50/50 text-xs border-stone-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Foto do Produto</label>
                  <div className="flex flex-col gap-3">
                    <label 
                      className="relative border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-stone-50/50 hover:border-[#c9a96e]"
                      style={{ borderColor: '#e8e2d8' }}
                    >
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange}
                        className="hidden" 
                      />
                      
                      {watch('imageUrl') ? (
                        <div className="flex items-center gap-3 w-full">
                          <div className="h-16 w-16 border rounded-xl overflow-hidden bg-white shrink-0 p-1 flex items-center justify-center" style={{ borderColor: '#e8e2d8' }}>
                            <img 
                              src={watch('imageUrl')} 
                              alt="Upload" 
                              className="h-full w-full object-contain" 
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-stone-700 truncate">Imagem selecionada</p>
                            <button 
                              type="button" 
                              onClick={(e) => {
                                e.preventDefault();
                                setUploadedImage('');
                                setValue('imageUrl', '');
                              }}
                              className="text-[10px] text-red-500 font-bold hover:underline uppercase mt-1 cursor-pointer"
                            >
                              Remover Foto
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <Plus className="h-5 w-5 mx-auto mb-1.5" style={{ color: '#c9a96e' }} />
                          <p className="text-xs font-bold" style={{ color: '#3d2b1f' }}>Subir Foto do Produto</p>
                          <p className="text-[10px] font-medium mt-0.5" style={{ color: '#8b7355' }}>Clique para selecionar arquivo de imagem</p>
                        </div>
                      )}
                    </label>
                  </div>
                  <input type="hidden" {...register('imageUrl')} />
                </div>
              </div>

              {/* ── SEÇÃO 2: PRECIFICAÇÃO DE VAREJO E ATACADO ────────── */}
              <div className="space-y-4 bg-white p-6 rounded-2xl border shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                <span className="text-xs font-black uppercase tracking-wider block border-b pb-2" style={{ color: '#3d2b1f', borderColor: '#e8e2d8' }}>
                  2. PRECIFICAÇÃO DE ATACADO & CUSTOS
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Preço de Custo (R$)</label>
                    <Input {...register('cost_price')} type="number" step="0.01" placeholder="0.00" className="font-mono h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Preço de Venda Unitário (R$)</label>
                    <Input {...register('sale_price')} type="number" step="0.01" placeholder="0.00" className="font-mono h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                  </div>
                </div>

                <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: '#f5f0e8' }}>
                  <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: '#c9a96e' }}>
                    DESCONTO AUTOMÁTICO EM PACOTE FECHADO
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Qtd Mínima do Pacote (un)</label>
                      <Input {...register('package_qty')} type="number" placeholder="10" className="font-mono h-11 rounded-xl bg-white text-xs border-stone-300" />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Desconto do Pacote (%)</label>
                      <Input {...register('package_discount_pct')} type="number" step="0.1" placeholder="10.0" className="font-mono h-11 rounded-xl bg-white text-xs border-stone-300" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SEÇÃO 3: ESTOQUE E COMPATIBILIDADE ───────────────── */}
              <div className="space-y-4 bg-white p-6 rounded-2xl border shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                <span className="text-xs font-black uppercase tracking-wider block border-b pb-2" style={{ color: '#3d2b1f', borderColor: '#e8e2d8' }}>
                  3. ESTOQUE & COMPATIBILIDADE VEICULAR
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Estoque Atual (un)</label>
                    <Input {...register('stock_current')} type="number" placeholder="0" className="font-mono h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Estoque Mínimo (Alerta)</label>
                    <Input {...register('stock_minimum')} type="number" placeholder="5" className="font-mono h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Status do Item</label>
                    <Select value={watch('status')} onValueChange={val => setValue('status', val as any)}>
                      <SelectTrigger className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo (Na Vitrine)</SelectItem>
                        <SelectItem value="inactive">Inativo (Oculto)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Compatibility FieldArray */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Veículos Compatíveis</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => append({ brand: '', model: '', year: '' })}
                      className="border-stone-300 text-stone-800 text-[10px] uppercase font-bold rounded-full"
                    >
                      + ADICIONAR VEÍCULO
                    </Button>
                  </div>

                  {fields.length === 0 ? (
                    <p className="text-xs text-stone-500 italic">Sem restrição veicular — Peça universal.</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {fields.map((field, idx) => (
                        <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-4">
                            <Input placeholder="Marca (ex: Fiat)" {...register(`vehicle_compatibility.${idx}.brand` as const)} className="h-9 text-xs rounded-lg" />
                          </div>
                          <div className="col-span-4">
                            <Input placeholder="Modelo (ex: Toro)" {...register(`vehicle_compatibility.${idx}.model` as const)} className="h-9 text-xs rounded-lg" />
                          </div>
                          <div className="col-span-3">
                            <Input placeholder="Ano (ex: 2017-2023)" {...register(`vehicle_compatibility.${idx}.year` as const)} className="h-9 text-xs rounded-lg" />
                          </div>
                          <div className="col-span-1 text-right">
                            <Button type="button" variant="ghost" size="icon-xs" onClick={() => remove(idx)} className="text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* STICKY FOOTER */}
            <div className="px-6 py-4 border-t flex justify-between items-center bg-white shrink-0" style={{ borderColor: '#e8e2d8' }}>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="border-stone-300 text-xs font-bold uppercase rounded-full h-11 px-6">
                CANCELAR
              </Button>
              <Button
                type="submit"
                className="font-bold text-xs uppercase px-8 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95"
                style={{ backgroundColor: '#c9a96e', color: '#3d2b1f' }}
              >
                {editingProduct ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR PRODUTO'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── 2. MANUAL STOCK ADJUSTMENT DIALOG ───────────────────────── */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="max-w-lg w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-6 py-4 border-b bg-white shrink-0 flex items-center gap-3" style={{ borderColor: '#e8e2d8' }}>
            <div className="h-9 w-9 rounded-xl grid place-items-center text-white shrink-0 shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
              <RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black uppercase" style={{ color: '#3d2b1f' }}>AJUSTAR ESTOQUE FÍSICO</DialogTitle>
              <DialogDescription className="text-xs font-medium mt-0.5" style={{ color: '#8b7355' }}>
                Registre uma entrada manual de reposição ou saída corretiva no ERP.
              </DialogDescription>
            </div>
          </div>

          {adjustingProduct && (
            <form onSubmit={handleAdjustSubmit} className="flex flex-col">
              <div className="p-6 space-y-4 font-sans text-xs" style={{ backgroundColor: '#faf8f5' }}>
                <div className="p-4 bg-white border rounded-xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                  <p className="font-bold uppercase" style={{ color: '#3d2b1f' }}>{adjustingProduct.name}</p>
                  <p className="font-mono text-[11px]" style={{ color: '#8b7355' }}>SKU: {adjustingProduct.sku} | Saldo Atual: {adjustingProduct.stock_current} un</p>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>TIPO DE OPERAÇÃO *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustType('input')}
                      className={`h-11 border rounded-xl font-bold uppercase text-xs cursor-pointer transition ${
                        adjustType === 'input' ? 'text-white border-transparent shadow-xs' : 'bg-white text-stone-700 border-stone-300'
                      }`}
                      style={adjustType === 'input' ? { backgroundColor: '#3d2b1f' } : {}}
                    >
                      (+) ENTRADA
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('manual_adjustment')}
                      className={`h-11 border rounded-xl font-bold uppercase text-xs cursor-pointer transition ${
                        adjustType === 'manual_adjustment' ? 'text-white border-transparent shadow-xs' : 'bg-white text-stone-700 border-stone-300'
                      }`}
                      style={adjustType === 'manual_adjustment' ? { backgroundColor: '#3d2b1f' } : {}}
                    >
                      (-) SAÍDA
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>QUANTIDADE *</label>
                  <Input
                    type="number"
                    min="1"
                    value={adjustQty}
                    onChange={e => setAdjustQty(parseInt(e.target.value) || 1)}
                    className="font-mono text-right font-bold h-11 rounded-xl bg-white border-stone-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>JUSTIFICATIVA TÉCNICA *</label>
                  <textarea
                    placeholder="Informe o motivo ou número da nota fiscal de compra..."
                    value={adjustJustification}
                    onChange={e => setAdjustJustification(e.target.value)}
                    required
                    rows={2}
                    className="w-full border border-stone-200 bg-white p-3 text-xs focus:outline-none resize-none rounded-xl"
                    style={{ color: '#3d2b1f' }}
                  />
                </div>
              </div>

              <DialogFooter className="px-6 py-4 border-t flex justify-between items-center bg-white shrink-0" style={{ borderColor: '#e8e2d8' }}>
                <Button type="button" variant="outline" onClick={() => setIsAdjustOpen(false)} className="border-stone-300 text-xs uppercase font-bold rounded-full h-11 px-6">
                  CANCELAR
                </Button>
                <Button
                  type="submit"
                  className="font-bold text-xs uppercase px-8 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95"
                  style={{ backgroundColor: '#c9a96e', color: '#3d2b1f' }}
                >
                  SALVAR AJUSTE
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 3. STOCK MOVEMENTS HISTORY DIALOG ─────────────────────────── */}
      <Dialog open={isMovementsOpen} onOpenChange={setIsMovementsOpen}>
        <DialogContent className="max-w-2xl w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-6 py-4 border-b bg-white shrink-0 flex items-center gap-3" style={{ borderColor: '#e8e2d8' }}>
            <div className="h-9 w-9 rounded-xl grid place-items-center text-white shrink-0 shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
              <History className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black uppercase" style={{ color: '#3d2b1f' }}>HISTÓRICO DE MOVIMENTAÇÕES</DialogTitle>
              <DialogDescription className="text-xs font-medium mt-0.5" style={{ color: '#8b7355' }}>
                Extrato completo de auditoria de entradas, saídas de vendas e ajustes.
              </DialogDescription>
            </div>
          </div>

          {selectedProductMovements && (
            <div className="p-6 space-y-4 font-sans text-xs" style={{ backgroundColor: '#faf8f5' }}>
              <div className="p-4 bg-white border rounded-xl font-mono shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                <span className="font-bold uppercase block" style={{ color: '#3d2b1f' }}>{selectedProductMovements.name}</span>
                <span className="text-[11px]" style={{ color: '#8b7355' }}>SKU: {selectedProductMovements.sku} | SALDO ATUAL: {selectedProductMovements.stock_current} UN</span>
              </div>

              <div className="max-h-60 overflow-y-auto border rounded-xl bg-white" style={{ borderColor: '#e8e2d8' }}>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b font-bold uppercase text-[10px]" style={{ backgroundColor: '#f5f0e8', borderColor: '#e8e2d8', color: '#8b7355' }}>
                      <th className="p-3">Data</th>
                      <th className="p-3">Tipo</th>
                      <th className="p-3 text-right">Qtd</th>
                      <th className="p-3">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.filter(m => m.product_id === selectedProductMovements.id).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-stone-400 italic">Nenhuma movimentação registrada.</td>
                      </tr>
                    ) : (
                      movements
                        .filter(m => m.product_id === selectedProductMovements.id)
                        .map(m => (
                          <tr key={m.id} className="border-b text-stone-800" style={{ borderColor: '#f0eae1' }}>
                            <td className="p-3 font-mono text-[11px]">{new Date(m.created_at).toLocaleString()}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                m.type === 'input' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {m.type === 'input' ? 'ENTRADA' : 'SAÍDA'}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-bold">{m.quantity}</td>
                            <td className="p-3 text-stone-500 text-[11px]">{m.justification || '-'}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 4. DELETE CONFIRM DIALOG ──────────────────────────────────── */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md w-full p-6 rounded-[2px] bg-white border border-stone-300 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-red-600">CONFIRMAR EXCLUSÃO DO PRODUTO?</DialogTitle>
            <DialogDescription className="text-xs text-stone-500 mt-1">
              Esta ação removerá a peça permanentemente do ERP e do Catálogo da Loja.
            </DialogDescription>
          </DialogHeader>

          {deletingProduct && (
            <div className="space-y-4 pt-3 font-sans text-xs">
              <div className="p-3 bg-red-50 border border-red-200 rounded-[2px]">
                <p className="font-bold text-red-900 uppercase">{deletingProduct.name}</p>
                <p className="font-mono text-red-700 text-[11px]">SKU: {deletingProduct.sku}</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} className="border-stone-300 text-xs uppercase font-bold">
                  CANCELAR
                </Button>
                <Button type="button" onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase">
                  CONFIRMAR EXCLUSÃO
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
