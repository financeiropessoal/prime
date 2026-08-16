'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { AccountReceivable, Client, BankAccount } from '@/lib/database.types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ArrowDownCircle,
  Plus,
  RefreshCw,
  Search,
  Check,
  Building2
} from 'lucide-react';
import { DateFilterBar } from '@/components/admin/DateFilterBar';
import { DatePreset, getDatePresetRange, isDateInRange } from '@/lib/date-filters';

const receivableSchema = z.object({
  client_id: z.string().min(1, 'Selecione o cliente'),
  description: z.string().min(3, 'Descrição obrigatória'),
  category: z.string().min(1, 'Selecione uma categoria'),
  amount: z.coerce.number().min(0.01, 'Valor inválido'),
  issue_date: z.string().min(1, 'Data de emissão obrigatória'),
  due_date: z.string().min(1, 'Data de vencimento obrigatória'),
  payment_method: z.string().min(1, 'Selecione o método de recebimento')
});

const receiveSchema = z.object({
  bank_account_id: z.string().min(1, 'Selecione a conta de destino'),
  payment_date: z.string().min(1, 'Selecione a data de recebimento'),
  discount: z.coerce.number().min(0).default(0),
  discount_pct: z.coerce.number().min(0).default(0),
  actual_amount: z.coerce.number().min(0)
});

export default function ContasReceberPage() {
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'paid'>('pending');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals state
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<AccountReceivable | null>(null);

  const { register: regForm, handleSubmit: subForm, reset: resForm, formState: { errors: errForm } } = useForm<any>({
    resolver: zodResolver(receivableSchema),
    defaultValues: {
      client_id: '',
      description: '',
      category: 'Venda de Peças / Chaves',
      amount: 0,
      issue_date: new Date().toISOString().substring(0, 10),
      due_date: new Date().toISOString().substring(0, 10),
      payment_method: 'Pix'
    }
  });

  const { register: regRec, handleSubmit: subRec, reset: resRec, watch: watchRec, setValue: setValueRec } = useForm<any>({
    resolver: zodResolver(receiveSchema),
    defaultValues: {
      bank_account_id: '',
      payment_date: new Date().toISOString().substring(0, 10),
      discount: 0,
      discount_pct: 0,
      actual_amount: 0
    }
  });

  const handleDiscountChange = (val: number) => {
    const total = selectedReceivable?.amount || 0;
    const actual = Math.max(0, total - val);
    const pct = total > 0 ? (val / total) * 100 : 0;
    setValueRec('discount', val);
    setValueRec('actual_amount', Number(actual.toFixed(2)));
    setValueRec('discount_pct', Number(pct.toFixed(2)));
  };

  const handleDiscountPctChange = (val: number) => {
    const total = selectedReceivable?.amount || 0;
    const disc = (val / 100) * total;
    const actual = Math.max(0, total - disc);
    setValueRec('discount_pct', val);
    setValueRec('discount', Number(disc.toFixed(2)));
    setValueRec('actual_amount', Number(actual.toFixed(2)));
  };

  const handleActualAmountChange = (val: number) => {
    const total = selectedReceivable?.amount || 0;
    const disc = Math.max(0, total - val);
    const pct = total > 0 ? (disc / total) * 100 : 0;
    setValueRec('actual_amount', val);
    setValueRec('discount', Number(disc.toFixed(2)));
    setValueRec('discount_pct', Number(pct.toFixed(2)));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [recs, cls, accs] = await Promise.all([
        dbService.getAccountsReceivable(),
        dbService.getClients(),
        dbService.getBankAccounts()
      ]);
      setReceivables(recs);
      setClients(cls);
      setBankAccounts(accs);
    } catch (e) {
      console.error(e);
      toast.add({ title: 'Erro de conexão', description: 'Falha ao buscar contas a receber.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onAddReceivable = async (data: any) => {
    try {
      await dbService.createAccountReceivable({
        client_id: data.client_id,
        description: data.description,
        category: data.category,
        amount: Number(data.amount),
        issue_date: data.issue_date,
        due_date: data.due_date,
        payment_method: data.payment_method,
        bank_account_id: null,
        order_id: null
      });
      toast.add({ title: 'Título Lançado', description: 'Conta a receber cadastrada com sucesso.', type: 'success' });
      setIsNewOpen(false);
      resForm();
      loadData();
    } catch (e: any) {
      toast.add({ title: 'Erro ao cadastrar', description: e.message, type: 'error' });
    }
  };

  const handleOpenReceive = (item: AccountReceivable) => {
    setSelectedReceivable(item);
    resRec({
      bank_account_id: bankAccounts[0]?.id || '',
      payment_date: new Date().toISOString().substring(0, 10),
      discount: 0,
      discount_pct: 0,
      actual_amount: item.amount
    });
    setIsReceiveOpen(true);
  };

  const onReceiveConfirm = async (data: any) => {
    if (!selectedReceivable) return;
    try {
      await dbService.receiveAccountReceivable(
        selectedReceivable.id,
        data.bank_account_id,
        data.payment_date,
        Number(data.actual_amount)
      );
      toast.add({ title: 'Baixa de Recebimento', description: `Título #${selectedReceivable.id} liquidado.`, type: 'success' });
      setIsReceiveOpen(false);
      loadData();
    } catch (e: any) {
      toast.add({ title: 'Erro ao receber', description: e.message, type: 'error' });
    }
  };

  const todayStr = new Date().toISOString().substring(0, 10);
  const dateRange = getDatePresetRange(datePreset, customStartDate, customEndDate);

  const filteredReceivables = receivables.filter(r => {
    const client = clients.find(c => c.id === r.client_id);
    const clientName = client ? client.name : '';
    const matchesSearch = r.description.toLowerCase().includes(search.toLowerCase()) ||
      clientName.toLowerCase().includes(search.toLowerCase());

    let matchesTab = activeTab === 'pending' ? r.status !== 'paid' : r.status === 'paid';

    let matchesStatus = true;
    if (statusFilter === 'pending') matchesStatus = r.status === 'pending' && r.due_date >= todayStr;
    if (statusFilter === 'overdue') matchesStatus = r.status === 'pending' && r.due_date < todayStr;
    if (statusFilter === 'paid') matchesStatus = r.status === 'paid';

    const matchesDate = isDateInRange(r.due_date, dateRange);

    return matchesSearch && matchesTab && matchesStatus && matchesDate;
  });

  const baseFiltered = receivables.filter(r => {
    const client = clients.find(c => c.id === r.client_id);
    const clientName = client ? client.name : '';
    const matchesSearch = r.description.toLowerCase().includes(search.toLowerCase()) ||
      clientName.toLowerCase().includes(search.toLowerCase());
    const matchesDate = isDateInRange(r.due_date, dateRange);
    return matchesSearch && matchesDate;
  });

  const totalPending = baseFiltered.filter(r => r.status !== 'paid').reduce((sum, r) => sum + r.amount, 0);
  const totalOverdue = baseFiltered.filter(r => r.status !== 'paid' && r.due_date < todayStr).reduce((sum, r) => sum + r.amount, 0);
  const totalPaid = baseFiltered.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-white border rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderColor: '#e8e2d8' }}>
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-1.5" style={{ backgroundColor: '#f5f0e8', color: '#c9a96e' }}>
            FINANCEIRO ERP — CONTAS A RECEBER
          </span>
          <h1 className="text-xl font-semibold uppercase tracking-tight" style={{ color: '#3d2b1f' }}>
            FATURAMENTO & RECEBIMENTO DE VENDAS
          </h1>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#8b7355' }}>
            Gestão de boletos, cartões e parcelamentos de clientes.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setIsNewOpen(true)}
            className="font-bold text-xs uppercase px-6 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95"
            style={{ backgroundColor: '#c9a96e', color: '#3d2b1f' }}
          >
            <Plus className="h-4 w-4 mr-1.5 text-[#3d2b1f]" /> LANÇAR CONTA A RECEBER
          </Button>
        </div>
      </div>

      {/* TABS SEPARATOR */}
      <div className="flex gap-2 border-b pb-1" style={{ borderColor: '#e8e2d8' }}>
        <button
          onClick={() => {
            setActiveTab('pending');
            setStatusFilter('all');
          }}
          className={`font-bold text-xs uppercase px-6 py-3 rounded-full cursor-pointer transition-all ${
            activeTab === 'pending'
              ? 'text-white shadow-sm'
              : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
          }`}
          style={activeTab === 'pending' ? { backgroundColor: '#c9a96e' } : {}}
        >
          ⏳ A Receber (O que me devem)
        </button>
        <button
          onClick={() => {
            setActiveTab('paid');
            setStatusFilter('paid');
          }}
          className={`font-bold text-xs uppercase px-6 py-3 rounded-full cursor-pointer transition-all ${
            activeTab === 'paid'
              ? 'text-white shadow-sm'
              : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
          }`}
          style={activeTab === 'paid' ? { backgroundColor: '#c9a96e' } : {}}
        >
          ✅ Recebidos (Quitados)
        </button>
      </div>

      {/* Date Filter Bar */}
      <DateFilterBar
        preset={datePreset}
        onPresetChange={setDatePreset}
        startDate={customStartDate}
        onStartDateChange={setCustomStartDate}
        endDate={customEndDate}
        onEndDateChange={setCustomEndDate}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: '#8b7355' }}>TOTAL A RECEBER</span>
          <p className="text-2xl font-black font-mono mt-1" style={{ color: '#3d2b1f' }}>{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[11px] font-bold uppercase tracking-wider block text-red-600">RECEBIMENTOS VENCIDOS</span>
          <p className="text-2xl font-black font-mono text-red-600 mt-1">{formatCurrency(totalOverdue)}</p>
        </div>
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[11px] font-bold uppercase tracking-wider block text-emerald-700">TOTAL RECEBIDO</span>
          <p className="text-2xl font-black font-mono text-emerald-700 mt-1">{formatCurrency(totalPaid)}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border p-4 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Buscar por cliente ou descrição..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-11 text-xs rounded-xl bg-stone-50/50 border-stone-200"
            />
          </div>

          {activeTab === 'pending' && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-11 px-4 bg-stone-50/50 border border-stone-200 rounded-xl text-xs font-bold uppercase cursor-pointer"
              style={{ color: '#3d2b1f' }}
            >
              <option value="all">Todos os Status</option>
              <option value="pending">A Vencer</option>
              <option value="overdue">Vencidos (Atrasados)</option>
            </select>
          )}
        </div>
      </div>

      {/* Table of Receivables */}
      <div className="bg-white border rounded-2xl shadow-2xs overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: '#f5f0e8', borderColor: '#e8e2d8' }}>
                <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>VENCIMENTO</TableHead>
                <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>CLIENTE / COMPRADOR</TableHead>
                <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>DESCRIÇÃO</TableHead>
                <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>MÉTODO</TableHead>
                <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>STATUS</TableHead>
                <TableHead className="text-right font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>VALOR TÍTULO</TableHead>
                <TableHead className="text-center font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>AÇÃO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 font-mono text-stone-500 text-xs">
                    Carregando contas a receber...
                  </TableCell>
                </TableRow>
              ) : filteredReceivables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-stone-500 font-mono text-xs">
                    Nenhum título a receber encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReceivables.map(r => {
                  const client = clients.find(c => c.id === r.client_id);
                  const isPaid = r.status === 'paid';
                  const isOverdue = !isPaid && r.due_date < todayStr;

                  return (
                    <TableRow key={r.id} className="hover:bg-[#f5f0e8]/50 transition font-sans" style={{ borderColor: '#f0eae1' }}>
                      <TableCell className="font-mono font-bold" style={{ color: '#3d2b1f' }}>
                        {formatDate(r.due_date)}
                      </TableCell>

                      <TableCell className="font-bold uppercase" style={{ color: '#3d2b1f' }}>
                        {client ? client.name : '-'}
                      </TableCell>

                      <TableCell className="uppercase font-semibold" style={{ color: '#3d2b1f' }}>
                        {r.description}
                      </TableCell>

                      <TableCell className="font-mono uppercase text-stone-700">{r.payment_method}</TableCell>

                      <TableCell>
                        <Badge className={`text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
                          isPaid ? 'bg-emerald-100 text-emerald-800' :
                          isOverdue ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-900'
                        }`}>
                          {isPaid ? 'RECEBIDO' : isOverdue ? 'ATRASADO' : 'PENDENTE'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold text-sm" style={{ color: '#3d2b1f' }}>
                        {formatCurrency(r.amount)}
                      </TableCell>

                      <TableCell className="text-center">
                        {!isPaid && (
                          <Button
                            size="xs"
                            onClick={() => handleOpenReceive(r)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase px-4 h-8 rounded-full shadow-xs cursor-pointer"
                          >
                            RECEBER
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* NEW RECEIVABLE DIALOG */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-xl w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-6 py-4 border-b bg-white shrink-0 flex items-center gap-3" style={{ borderColor: '#e8e2d8' }}>
            <div className="h-9 w-9 rounded-xl grid place-items-center text-white shrink-0 shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
              <ArrowDownCircle className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-black uppercase" style={{ color: '#3d2b1f' }}>LANÇAR NOVA CONTA A RECEBER</DialogTitle>
          </div>

          <form onSubmit={subForm(onAddReceivable)} className="p-6 space-y-4 font-sans text-xs" style={{ backgroundColor: '#faf8f5' }}>
            <div className="space-y-1">
              <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Cliente</label>
              <select {...regForm('client_id')} className="w-full h-11 border border-stone-200 bg-white px-3 rounded-xl font-bold uppercase text-xs" style={{ color: '#3d2b1f' }}>
                <option value="">Selecione o cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.document})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Descrição da Venda / Título *</label>
              <Input {...regForm('description')} placeholder="Ex: Venda Faturada 30 dias - Pedido #891" className="h-11 rounded-xl bg-white text-xs border-stone-200" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Valor Total (R$) *</label>
                <Input type="number" step="0.01" {...regForm('amount')} className="font-mono text-right font-bold h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>

              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Forma de Pagamento</label>
                <select {...regForm('payment_method')} className="w-full h-11 border border-stone-200 bg-white px-3 rounded-xl font-bold uppercase text-xs" style={{ color: '#3d2b1f' }}>
                  <option value="Pix">Pix / Chave</option>
                  <option value="Boleto">Boleto Bancário</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Data de Emissão</label>
                <Input type="date" {...regForm('issue_date')} className="font-mono h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>

              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Data de Vencimento</label>
                <Input type="date" {...regForm('due_date')} className="font-mono font-bold h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t flex justify-between items-center bg-white -mx-6 -mb-6 p-6 mt-4 shrink-0" style={{ borderColor: '#e8e2d8' }}>
              <Button type="button" variant="outline" onClick={() => setIsNewOpen(false)} className="border-stone-300 text-xs font-bold uppercase rounded-full h-11 px-6">
                CANCELAR
              </Button>
              <Button
                type="submit"
                className="font-bold text-xs uppercase px-8 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95"
                style={{ backgroundColor: '#c9a96e', color: '#3d2b1f' }}
              >
                SALVAR TÍTULO
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* RECEIVE CONFIRM DIALOG */}
      <Dialog open={isReceiveOpen} onOpenChange={setIsReceiveOpen}>
        <DialogContent className="max-w-md w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-6 py-4 border-b bg-white shrink-0 flex items-center gap-3" style={{ borderColor: '#e8e2d8' }}>
            <div className="h-9 w-9 rounded-xl grid place-items-center text-white shrink-0 shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
              <Check className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-black uppercase" style={{ color: '#3d2b1f' }}>EFETUAR BAIXA DE RECEBIMENTO</DialogTitle>
          </div>

          {selectedReceivable && (
            <form onSubmit={subRec(onReceiveConfirm)} className="p-6 space-y-4 font-sans text-xs" style={{ backgroundColor: '#faf8f5' }}>
              <div className="p-4 bg-white border rounded-xl space-y-1 shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                <span className="font-bold uppercase block text-xs" style={{ color: '#3d2b1f' }}>{selectedReceivable.description}</span>
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-stone-500 font-mono">Valor Total Original:</span>
                  <span className="font-mono text-stone-700 font-bold text-xs">{formatCurrency(selectedReceivable.amount)}</span>
                </div>
              </div>

              {/* Discount and received amount inputs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-1">
                  <label className="block font-bold uppercase text-[9px]" style={{ color: '#8b7355' }}>Desconto (%)</label>
                  <Input 
                    type="number" 
                    step="any"
                    value={watchRec('discount_pct') || 0}
                    onChange={e => handleDiscountPctChange(Number(e.target.value))}
                    className="font-mono h-11 rounded-xl bg-white text-xs border-stone-200" 
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="block font-bold uppercase text-[9px]" style={{ color: '#8b7355' }}>Desconto (R$)</label>
                  <Input 
                    type="number" 
                    step="any"
                    value={watchRec('discount') || 0}
                    onChange={e => handleDiscountChange(Number(e.target.value))}
                    className="font-mono h-11 rounded-xl bg-white text-xs border-stone-200" 
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="block font-bold uppercase text-[9px]" style={{ color: '#3d2b1f' }}>Recebido (R$)</label>
                  <Input 
                    type="number" 
                    step="any"
                    value={watchRec('actual_amount') || 0}
                    onChange={e => handleActualAmountChange(Number(e.target.value))}
                    className="font-mono font-bold h-11 rounded-xl bg-white text-xs border-stone-200 text-emerald-700 bg-emerald-50/20" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Conta Bancária de Destino (Crédito)</label>
                <select {...regRec('bank_account_id')} className="w-full h-11 border border-stone-200 bg-white px-3 rounded-xl font-bold uppercase text-xs" style={{ color: '#3d2b1f' }}>
                  {bankAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.bank_name} ({formatCurrency(a.current_balance)})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Data do Recebimento</label>
                <Input type="date" {...regRec('payment_date')} className="font-mono h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>

              <DialogFooter className="pt-4 border-t flex justify-between items-center bg-white -mx-6 -mb-6 p-6 mt-4 shrink-0" style={{ borderColor: '#e8e2d8' }}>
                <Button type="button" variant="outline" onClick={() => setIsReceiveOpen(false)} className="border-stone-300 text-xs font-bold uppercase rounded-full h-11 px-6">
                  CANCELAR
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase px-8 h-11 rounded-full shadow-xs cursor-pointer">
                  CONFIRMAR RECEBIMENTO
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
