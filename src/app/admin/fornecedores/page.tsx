'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { Supplier, Product, AccountPayable } from '@/lib/database.types';
import { formatCurrency, formatDocument, formatPhone, validateCNPJ, cleanDocument } from '@/lib/formatters';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Truck,
  Plus,
  Search,
  Trash2,
  Edit,
  ClipboardList,
  Mail,
  Phone,
  Calendar,
  FileText,
  DollarSign,
  Package,
  RefreshCw,
  Building2
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const supplierFormSchema = z.object({
  trade_name: z.string().min(1, 'Nome Fantasia é obrigatório'),
  company_name: z.string().optional().or(z.literal('')),
  cnpj: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().optional().or(z.literal('')),
  payment_terms: z.string().optional().or(z.literal('')),
  delivery_lead_time: z.coerce.number().optional().default(0)
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export default function FornecedoresAdminPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [search, setSearch] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileSupplier, setProfileSupplier] = useState<Supplier | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<any>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      company_name: '',
      trade_name: '',
      cnpj: '',
      phone: '',
      email: '',
      payment_terms: 'Faturado 30 dias',
      delivery_lead_time: 3
    }
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [sups, prods, pays] = await Promise.all([
        dbService.getSuppliers(),
        dbService.getProducts(),
        dbService.getAccountsPayable()
      ]);
      setSuppliers(sups);
      setProducts(prods);
      setPayables(pays);
    } catch (e) {
      console.error(e);
      toast.add({ title: 'Erro de Conexão', description: 'Não foi possível carregar os fornecedores.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateForm = () => {
    setEditingSupplier(null);
    reset({
      company_name: '',
      trade_name: '',
      cnpj: '',
      phone: '',
      email: '',
      payment_terms: 'Faturado 30 dias',
      delivery_lead_time: 3
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    reset({
      company_name: supplier.company_name,
      trade_name: supplier.trade_name,
      cnpj: supplier.cnpj,
      phone: supplier.phone || '',
      email: supplier.email || '',
      payment_terms: supplier.payment_terms || 'Faturado 30 dias',
      delivery_lead_time: supplier.delivery_lead_time || 3
    });
    setIsFormOpen(true);
  };

  const onFormSubmit = async (data: any) => {
    try {
      if (editingSupplier) {
        await dbService.updateSupplier(editingSupplier.id, data);
        toast.add({ title: 'Fornecedor Atualizado', description: `Fornecedor ${data.trade_name} atualizado.`, type: 'success' });
      } else {
        await dbService.createSupplier(data);
        toast.add({ title: 'Fornecedor Cadastrado', description: `Fornecedor ${data.trade_name} cadastrado.`, type: 'success' });
      }
      setIsFormOpen(false);
      loadData();
    } catch (e: any) {
      toast.add({ title: 'Erro ao Salvar', description: e.message || 'Falha ao salvar fornecedor.', type: 'error' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSupplier) return;
    try {
      await dbService.deleteSupplier(deletingSupplier.id);
      toast.add({ title: 'Fornecedor Excluído', description: 'Registro removido permanentemente.', type: 'success' });
      setIsDeleteOpen(false);
      loadData();
    } catch (e) {
      toast.add({ title: 'Erro ao Excluir', description: 'Não foi possível excluir o fornecedor.', type: 'error' });
    }
  };

  const filteredSuppliers = suppliers.filter(s => {
    return s.trade_name.toLowerCase().includes(search.toLowerCase()) ||
      s.company_name.toLowerCase().includes(search.toLowerCase()) ||
      s.cnpj.includes(search) ||
      (s.email && s.email.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className="border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs" style={{ backgroundColor: '#ffffff', borderColor: '#e8e2d8' }}>
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest block mb-1" style={{ color: '#c9a96e' }}>
            CADASTROS GERAIS ERP
          </span>
          <h1 className="text-xl font-black uppercase tracking-tight" style={{ color: '#3d2b1f' }}>
            FORNECEDORES DE FABRICAÇÃO & COMPONENTES
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: '#8b7355' }}>
            Total de {suppliers.length} fornecedores homologados.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleOpenCreateForm}
            size="sm"
            className="font-bold text-xs uppercase px-5 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95"
            style={{ backgroundColor: '#c9a96e', color: '#3d2b1f' }}
          >
            <Plus className="h-4 w-4 mr-1.5 text-[#3d2b1f]" /> CADASTRAR NOVO FORNECEDOR
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#8b7355' }}>TOTAL FORNECEDORES</span>
          <p className="text-2xl font-black font-mono mt-1" style={{ color: '#3d2b1f' }}>{suppliers.length}</p>
        </div>
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#8b7355' }}>PRAZO MÉDIO ENTREGA</span>
          <p className="text-2xl font-black font-mono mt-1" style={{ color: '#3d2b1f' }}>3.5 DIAS</p>
        </div>
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#8b7355' }}>ITENS CATALOGADOS</span>
          <p className="text-2xl font-black font-mono mt-1" style={{ color: '#3d2b1f' }}>{products.length}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-stone-300 p-4 rounded-[2px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Buscar por Razão Social, Nome Fantasia, CNPJ ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs"
          />
        </div>
      </div>

      {/* Table of Suppliers */}
      <div className="bg-white border border-stone-300 rounded-[2px] overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NOME FANTASIA / RAZÃO SOCIAL</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>TELEFONE / WHATSAPP</TableHead>
                <TableHead>E-MAIL</TableHead>
                <TableHead>CONDIÇÕES PAGAMENTO</TableHead>
                <TableHead className="text-center">PRAZO ENTREGA</TableHead>
                <TableHead className="text-center">AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 font-mono text-stone-500 text-xs">
                    Carregando fornecedores...
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-stone-500 font-mono text-xs">
                    Nenhum fornecedor encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map(sup => (
                  <TableRow key={sup.id} className="hover:bg-amber-500/5 font-sans">
                    <TableCell>
                      <span className="font-bold text-stone-900 uppercase block">{sup.trade_name}</span>
                      <span className="text-[10px] text-stone-500 uppercase">{sup.company_name}</span>
                    </TableCell>

                    <TableCell className="font-mono text-stone-800 font-bold">
                      {formatDocument(sup.cnpj)}
                    </TableCell>

                    <TableCell className="font-mono text-stone-700">
                      {formatPhone(sup.phone || '')}
                    </TableCell>

                    <TableCell className="text-stone-600">
                      {sup.email || '-'}
                    </TableCell>

                    <TableCell className="font-bold uppercase text-stone-800 text-[11px]">
                      {sup.payment_terms}
                    </TableCell>

                    <TableCell className="text-center font-mono font-bold text-stone-900">
                      {sup.delivery_lead_time} DIAS
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => { setProfileSupplier(sup); setIsProfileOpen(true); }}
                          className="border-stone-300 text-stone-800 text-[10px] uppercase font-bold"
                        >
                          FICHA
                        </Button>
                        <Button size="icon-xs" variant="ghost" onClick={() => handleOpenEditForm(sup)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon-xs" variant="ghost" onClick={() => { setDeletingSupplier(sup); setIsDeleteOpen(true); }} className="text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── CREATE / EDIT SUPPLIER DIALOG ────────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-6 py-4 border-b shrink-0 bg-white flex items-center gap-3" style={{ borderColor: '#e8e2d8' }}>
            <div className="h-10 w-10 rounded-xl grid place-items-center text-white shrink-0 shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black uppercase tracking-tight" style={{ color: '#3d2b1f' }}>
                {editingSupplier ? 'EDITAR FORNECEDOR' : 'CADASTRAR NOVO FORNECEDOR HOMOLOGADO'}
              </DialogTitle>
              <DialogDescription className="text-xs font-medium mt-0.5" style={{ color: '#8b7355' }}>
                Informe a razão social, CNPJ e condições comerciais para emissão de pedidos de compra.
              </DialogDescription>
            </div>
          </div>

          <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col">
            <div className="px-6 py-6 space-y-6 max-h-[75vh] overflow-y-auto font-sans" style={{ backgroundColor: '#faf8f5' }}>

              {/* DADOS CADASTRAIS */}
              <div className="space-y-4 bg-white p-6 rounded-2xl border shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                <span className="text-xs font-black uppercase tracking-wider block border-b pb-2" style={{ color: '#3d2b1f', borderColor: '#e8e2d8' }}>
                  1. DADOS CADASTRAIS DA EMPRESA
                </span>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>
                      Nome Fantasia <span className="text-red-600">*</span>
                    </label>
                    <Input {...register('trade_name')} placeholder="Ex: Maxell Baterias" className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                    {errors.trade_name && <p className="text-[10px] text-red-600 font-mono mt-0.5">{errors.trade_name.message?.toString()}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Razão Social</label>
                    <Input {...register('company_name')} placeholder="Ex: Maxell Indústria S.A." className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>CNPJ</label>
                    <Input {...register('cnpj')} placeholder="00.000.000/0001-00" className="font-mono h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>WhatsApp / Telefone</label>
                    <Input {...register('phone')} placeholder="(00) 00000-0000" className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>E-mail Comercial</label>
                  <Input {...register('email')} placeholder="vendas@fornecedor.com.br" className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                </div>
              </div>

              {/* CONDIÇÕES COMERCIAIS */}
              <div className="space-y-4 bg-white p-6 rounded-2xl border shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                <span className="text-xs font-black uppercase tracking-wider block border-b pb-2" style={{ color: '#3d2b1f', borderColor: '#e8e2d8' }}>
                  2. CONDIÇÕES COMERCIAIS DE FATURAMENTO
                </span>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Condição de Pagamento Padrão</label>
                    <Input {...register('payment_terms')} placeholder="Ex: Boleto Faturado 30 dias" className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Prazo Médio de Entrega (em dias úteis)</label>
                    <Input type="number" {...register('delivery_lead_time')} className="font-mono text-right h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                  </div>
                </div>
              </div>

            </div>

            <DialogFooter className="px-6 py-4 border-t flex justify-between items-center bg-white shrink-0" style={{ borderColor: '#e8e2d8' }}>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="border-stone-300 text-xs font-bold uppercase rounded-full h-11 px-6">
                CANCELAR
              </Button>
              <Button
                type="submit"
                className="font-bold text-xs uppercase px-8 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95"
                style={{ backgroundColor: '#c9a96e', color: '#3d2b1f' }}
              >
                SALVAR FORNECEDOR
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PROFILE FICHA DIALOG */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-2xl w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-6 py-4 border-b bg-white shrink-0 flex items-center gap-3" style={{ borderColor: '#e8e2d8' }}>
            <div className="h-9 w-9 rounded-xl grid place-items-center text-white shrink-0 shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
              <Truck className="h-4 w-4" />
            </div>
            <DialogTitle className="text-sm font-black uppercase" style={{ color: '#3d2b1f' }}>FICHA COMERCIAL DO FORNECEDOR</DialogTitle>
          </div>

          {profileSupplier && (
            <div className="p-6 space-y-4 text-xs font-sans" style={{ backgroundColor: '#faf8f5' }}>
              <div className="p-4 bg-white border rounded-xl space-y-1 shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                <span className="font-bold uppercase text-sm block" style={{ color: '#3d2b1f' }}>{profileSupplier.trade_name}</span>
                <span className="block" style={{ color: '#8b7355' }}>RAZÃO SOCIAL: {profileSupplier.company_name}</span>
                <span className="font-mono block" style={{ color: '#c9a96e' }}>CNPJ: {formatDocument(profileSupplier.cnpj)}</span>
                <span className="block" style={{ color: '#8b7355' }}>E-MAIL: {profileSupplier.email || '-'} | CONTATO: {formatPhone(profileSupplier.phone || '')}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md w-full p-6 rounded-2xl bg-white border shadow-2xl" style={{ borderColor: '#e8e2d8' }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-red-600">CONFIRMAR EXCLUSÃO DO FORNECEDOR?</DialogTitle>
          </DialogHeader>

          {deletingSupplier && (
            <div className="space-y-4 pt-2 text-xs">
              <p className="text-stone-600">Tem certeza que deseja remover <strong>{deletingSupplier.trade_name}</strong>?</p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} className="border-stone-300 text-xs font-bold uppercase rounded-full h-10 px-6">
                  CANCELAR
                </Button>
                <Button type="button" onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase rounded-full h-10 px-6">
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
