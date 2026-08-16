'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { TripSettlement, BankAccount } from '@/lib/database.types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Search,
  Check,
  Calculator,
  Calendar,
  DollarSign,
  TrendingUp,
  Percent,
  Coins
} from 'lucide-react';

const settlementSchema = z.object({
  description: z.string().min(3, 'Identificação da viagem obrigatória'),
  start_date: z.string().min(1, 'Data de início obrigatória'),
  end_date: z.string().min(1, 'Data de término obrigatória'),
  sales_amount: z.coerce.number().min(0, 'Valor de vendas inválido'),
  expenses_amount: z.coerce.number().min(0, 'Valor de despesas inválido'),
  parts_amount: z.coerce.number().min(0, 'Valor de peças inválido'),
  reinvestment_pct: z.coerce.number().min(0).max(100, 'Percentual deve ser entre 0 e 100'),
  status: z.enum(['pending_transfer', 'transferred'])
});

export default function AcertosPage() {
  const [settlements, setSettlements] = useState<TripSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [selectedSettle, setSelectedSettle] = useState<TripSettlement | null>(null);
  const [withdrawValue, setWithdrawValue] = useState(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [newSettleBankAccountId, setNewSettleBankAccountId] = useState('');

  const [expenseItems, setExpenseItems] = useState<{ description: string; amount: number }[]>([]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      description: '',
      start_date: new Date(Date.now() - 86400000 * 7).toISOString().substring(0, 10),
      end_date: new Date().toISOString().substring(0, 10),
      sales_amount: 0,
      expenses_amount: 0,
      parts_amount: 0,
      reinvestment_pct: 10,
      status: 'pending_transfer'
    }
  });

  const addExpenseItem = () => {
    setExpenseItems([...expenseItems, { description: '', amount: 0 }]);
  };

  const removeExpenseItem = (idx: number) => {
    const updated = [...expenseItems];
    updated.splice(idx, 1);
    setExpenseItems(updated);
    const sum = updated.reduce((s, i) => s + (i.amount || 0), 0);
    setValue('expenses_amount', sum);
  };

  const updateExpenseItem = (idx: number, field: 'description' | 'amount', val: any) => {
    const updated = [...expenseItems];
    if (field === 'amount') {
      updated[idx].amount = Number(val) || 0;
    } else {
      updated[idx].description = val;
    }
    setExpenseItems(updated);
    const sum = updated.reduce((s, i) => s + (i.amount || 0), 0);
    setValue('expenses_amount', sum);
  };

  const watchStartDate = watch('start_date');
  const watchEndDate = watch('end_date');
  const watchSales = watch('sales_amount') || 0;
  const watchExpenses = watch('expenses_amount') || 0;
  const watchParts = watch('parts_amount') || 0;
  const watchReinvestPct = watch('reinvestment_pct') || 0;

  // Real-time calculations
  const baseProfit = Math.max(0, watchSales - watchExpenses - watchParts);
  const reinvestmentAmount = Number((baseProfit * (watchReinvestPct / 100)).toFixed(2));
  const netProfit = Number((baseProfit - reinvestmentAmount).toFixed(2));

  const loadData = async () => {
    setLoading(true);
    try {
      const [settlementsData, accountsData] = await Promise.all([
        dbService.getTripSettlements(),
        dbService.getBankAccounts()
      ]);
      setSettlements(settlementsData);
      setBankAccounts(accountsData);
    } catch (e) {
      console.error(e);
      toast.add({ title: 'Erro de conexão', description: 'Falha ao buscar dados financeiros.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Autofill stats from transactions/orders in date range
  const handleAutofillRange = async () => {
    try {
      const [orders, payables, receivables] = await Promise.all([
        dbService.getOrders(),
        dbService.getAccountsPayable(),
        dbService.getAccountsReceivable()
      ]);

      const start = watchStartDate;
      const end = watchEndDate;

      if (!start || !end) {
        toast.add({ title: 'Atenção', description: 'Selecione as datas de início e fim da viagem.', type: 'info' });
        return;
      }

      // 1. Sales amount: Sum of total_amount of orders in date range
      const salesInPeriod = orders
        .filter(o => {
          const date = o.created_at.substring(0, 10);
          return date >= start && date <= end && o.status !== 'cancelled';
        })
        .reduce((sum, o) => sum + o.total_amount, 0);

      // 2. Expenses amount: Sum of paid account payables in date range
      const expensesInPeriod = payables
        .filter(p => {
          const date = p.payment_date || '';
          return date >= start && date <= end && p.status === 'paid';
        })
        .reduce((sum, p) => sum + p.amount, 0);

      // 3. Estimate parts amount (CMV): 35% of sales baseline (customisable by user)
      const partsEst = Number((salesInPeriod * 0.35).toFixed(2));

      setValue('sales_amount', salesInPeriod);
      setValue('parts_amount', partsEst);

      if (expensesInPeriod > 0) {
        setExpenseItems([
          { description: 'Despesas Consolidadas do Período', amount: expensesInPeriod }
        ]);
        setValue('expenses_amount', expensesInPeriod);
      } else {
        setExpenseItems([]);
        setValue('expenses_amount', 0);
      }

      toast.add({
        title: 'Dados Carregados',
        description: 'Vendas e despesas consolidadas do período preenchidas no formulário.',
        type: 'success'
      });
    } catch (e: any) {
      toast.add({ title: 'Erro ao buscar dados', description: e.message, type: 'error' });
    }
  };

  const onSubmit = async (data: any) => {
    if (data.status === 'transferred' && !newSettleBankAccountId) {
      toast.add({
        title: 'Conta Bancária obrigatória',
        description: 'Selecione a conta bancária para debitar o pagamento do salário.',
        type: 'error'
      });
      return;
    }

    try {
      const finalBaseProfit = Math.max(0, data.sales_amount - data.expenses_amount - data.parts_amount);
      const finalReinvestAmount = Number((finalBaseProfit * (data.reinvestment_pct / 100)).toFixed(2));
      const finalNetProfit = Number((finalBaseProfit - finalReinvestAmount).toFixed(2));

      await dbService.createTripSettlement({
        description: data.description,
        start_date: data.start_date,
        end_date: data.end_date,
        sales_amount: Number(data.sales_amount),
        expenses_amount: Number(data.expenses_amount),
        parts_amount: Number(data.parts_amount),
        reinvestment_pct: Number(data.reinvestment_pct),
        reinvestment_amount: finalReinvestAmount,
        net_profit: finalNetProfit,
        status: data.status,
        expenses_details: expenseItems,
        transferred_amount: data.status === 'transferred' ? finalNetProfit : 0.00
      }, newSettleBankAccountId || undefined);

      toast.add({ title: 'Acerto Confirmado', description: 'Acerto de viagem cadastrado com sucesso.', type: 'success' });
      setIsNewOpen(false);
      setExpenseItems([]);
      setNewSettleBankAccountId('');
      reset();
      loadData();
    } catch (e: any) {
      toast.add({ title: 'Erro ao salvar acerto', description: e.message, type: 'error' });
    }
  };

  const handleOpenWithdraw = (settle: TripSettlement) => {
    setSelectedSettle(settle);
    const remaining = Number((settle.net_profit - (settle.transferred_amount || 0)).toFixed(2));
    setWithdrawValue(remaining);
    setIsWithdrawOpen(true);
  };

  const onConfirmWithdraw = async () => {
    if (!selectedSettle) return;
    if (withdrawValue <= 0) {
      toast.add({ title: 'Valor inválido', description: 'O valor de retirada deve ser maior que zero.', type: 'error' });
      return;
    }
    if (!selectedBankAccountId) {
      toast.add({
        title: 'Conta Bancária obrigatória',
        description: 'Selecione a conta bancária para debitar o pagamento do salário.',
        type: 'error'
      });
      return;
    }
    const remaining = Number((selectedSettle.net_profit - (selectedSettle.transferred_amount || 0)).toFixed(2));
    if (withdrawValue > remaining) {
      toast.add({ title: 'Valor excedente', description: `Você não pode retirar mais do que o saldo pendente de ${formatCurrency(remaining)}.`, type: 'error' });
      return;
    }
    try {
      await dbService.withdrawTripSettlement(selectedSettle.id, withdrawValue, selectedBankAccountId);
      toast.add({ title: 'Retirada Registrada', description: `Retirada de ${formatCurrency(withdrawValue)} realizada com sucesso.`, type: 'success' });
      setIsWithdrawOpen(false);
      setSelectedBankAccountId('');
      loadData();
    } catch (e: any) {
      toast.add({ title: 'Erro ao efetuar retirada', description: e.message, type: 'error' });
    }
  };

  const filteredSettlements = settlements.filter(s => {
    const matchesSearch = s.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPIs
  const totalNetProfit = settlements.reduce((sum, s) => sum + s.net_profit, 0);
  const pendingTransferProfit = settlements.reduce((sum, s) => sum + (s.net_profit - (s.transferred_amount || 0)), 0);
  const totalReinvested = settlements.reduce((sum, s) => sum + s.reinvestment_amount, 0);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-white border rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderColor: '#e8e2d8' }}>
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-1.5" style={{ backgroundColor: '#f5f0e8', color: '#c9a96e' }}>
            GESTÃO FINANCEIRA — VIAGENS
          </span>
          <h1 className="text-xl font-semibold uppercase tracking-tight" style={{ color: '#3d2b1f' }}>
            ACERTOS DE VIAGEM
          </h1>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#8b7355' }}>
            Fechamento financeiro semanal, apuração de custos e repasses de pro-labore (salário).
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => {
              reset();
              setIsNewOpen(true);
            }}
            className="font-bold text-xs uppercase px-6 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95"
            style={{ backgroundColor: '#c9a96e', color: '#3d2b1f' }}
          >
            <Plus className="h-4 w-4 mr-1.5 text-[#3d2b1f]" /> NOVO ACERTO DE VIAGEM
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[11px] font-bold uppercase tracking-wider block text-emerald-700">LUCRO TOTAL APURADO (SALÁRIOS)</span>
          <p className="text-2xl font-black font-mono text-emerald-700 mt-1">{formatCurrency(totalNetProfit)}</p>
        </div>
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[11px] font-bold uppercase tracking-wider block text-[#e8590c]">PENDENTE DE REPASSE (A RETIRAR)</span>
          <p className="text-2xl font-black font-mono text-[#e8590c] mt-1">{formatCurrency(pendingTransferProfit)}</p>
        </div>
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: '#8b7355' }}>REINVESTIDO NA EMPRESA</span>
          <p className="text-2xl font-black font-mono mt-1" style={{ color: '#3d2b1f' }}>{formatCurrency(totalReinvested)}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border p-4 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Buscar por descrição da viagem..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-11 text-xs rounded-xl bg-stone-50/50 border-stone-200"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-11 px-4 bg-stone-50/50 border border-stone-200 rounded-xl text-xs font-bold uppercase cursor-pointer"
            style={{ color: '#3d2b1f' }}
          >
            <option value="all">Todos os Status</option>
            <option value="pending_transfer">Pendente de Repasse</option>
            <option value="transferred">Repassado (Sócio Pago)</option>
          </select>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="bg-white border rounded-2xl shadow-2xs overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: '#f5f0e8', borderColor: '#e8e2d8' }}>
                <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>VIAGEM / DATA</TableHead>
                <TableHead className="font-bold uppercase text-[10px] text-right" style={{ color: '#8b7355' }}>FATURADO</TableHead>
                <TableHead className="font-bold uppercase text-[10px] text-right" style={{ color: '#8b7355' }}>DESPESAS</TableHead>
                <TableHead className="font-bold uppercase text-[10px] text-right" style={{ color: '#8b7355' }}>PEÇAS (CMV)</TableHead>
                <TableHead className="font-bold uppercase text-[10px] text-right" style={{ color: '#8b7355' }}>REINVESTIDO</TableHead>
                <TableHead className="font-bold uppercase text-[10px] text-right" style={{ color: '#8b7355' }}>LUCRO LÍQUIDO</TableHead>
                <TableHead className="font-bold uppercase text-[10px] text-center" style={{ color: '#8b7355' }}>STATUS</TableHead>
                <TableHead className="font-bold uppercase text-[10px] text-center" style={{ color: '#8b7355' }}>AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 font-mono text-stone-500 text-xs">
                    Carregando acertos de viagens...
                  </TableCell>
                </TableRow>
              ) : filteredSettlements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-stone-500 font-mono text-xs">
                    Nenhum acerto de viagem registrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSettlements.map(s => {
                  const isPending = s.status === 'pending_transfer';

                  return (
                    <TableRow key={s.id} className="hover:bg-[#f5f0e8]/50 transition font-sans" style={{ borderColor: '#f0eae1' }}>
                      <TableCell className="py-4">
                        <span className="font-bold block uppercase text-stone-900">{s.description}</span>
                        <span className="text-[10px] text-stone-500 font-mono flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" /> {formatDate(s.start_date)} a {formatDate(s.end_date)}
                        </span>
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold" style={{ color: '#3d2b1f' }}>
                        {formatCurrency(s.sales_amount)}
                      </TableCell>

                      <TableCell className="text-right font-mono text-red-600">
                        {formatCurrency(s.expenses_amount)}
                      </TableCell>

                      <TableCell className="text-right font-mono text-stone-600">
                        {formatCurrency(s.parts_amount)}
                      </TableCell>

                      <TableCell className="text-right">
                        <span className="font-mono block font-bold text-stone-800">{formatCurrency(s.reinvestment_amount)}</span>
                        <span className="text-[9px] font-mono text-stone-500 block">({s.reinvestment_pct}%)</span>
                      </TableCell>

                      <TableCell className="text-right font-mono text-stone-900 text-xs">
                        <span className="font-black text-emerald-700 block">{formatCurrency(s.net_profit)}</span>
                        { (s.transferred_amount || 0) > 0 && (
                          <span className="text-[9px] text-stone-500 block">Retirado: {formatCurrency(s.transferred_amount || 0)}</span>
                        )}
                        { (s.net_profit - (s.transferred_amount || 0)) > 0 && (
                          <span className="text-[9px] text-amber-700 font-bold block">Pendente: {formatCurrency(s.net_profit - (s.transferred_amount || 0))}</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge className={`text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
                          (s.transferred_amount || 0) >= s.net_profit ? 'bg-emerald-100 text-emerald-800' : 
                          (s.transferred_amount || 0) > 0 ? 'bg-amber-100 text-amber-900 border-amber-300' :
                          'bg-stone-100 text-stone-700'
                        }`}>
                          {(s.transferred_amount || 0) >= s.net_profit ? 'Repassado (Total)' :
                           (s.transferred_amount || 0) > 0 ? 'Repassado (Parcial)' :
                           'Pendente de Repasse'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        {(s.transferred_amount || 0) < s.net_profit ? (
                          <Button
                            size="xs"
                            onClick={() => handleOpenWithdraw(s)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] uppercase px-3 h-7 rounded-full shadow-xs cursor-pointer flex items-center gap-1 mx-auto"
                          >
                            <Check className="h-3 w-3" /> RETIRAR SALÁRIO
                          </Button>
                        ) : (
                          <span className="text-[10px] font-mono text-stone-400">Totalmente Pago</span>
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

      {/* CALCULATOR MODAL (NEW SETTLEMENT) */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-lg w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-6 py-4 border-b bg-white shrink-0 flex items-center gap-3" style={{ borderColor: '#e8e2d8' }}>
            <div className="h-9 w-9 rounded-xl grid place-items-center text-white shrink-0 shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
              <Calculator className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-black uppercase" style={{ color: '#3d2b1f' }}>NOVO ACERTO DE VIAGEM (CALCULADORA)</DialogTitle>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 font-sans text-xs" style={{ backgroundColor: '#faf8f5' }}>
            
            <div className="space-y-1">
              <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Identificação / Rota da Viagem *</label>
              <Input {...register('description')} placeholder="Ex: Rota Triângulo Mineiro - Uberlândia / Uberaba" className="h-11 rounded-xl bg-white text-xs border-stone-200" />
              {errors.description?.message && <p className="text-red-500 font-bold mt-1">{String(errors.description.message)}</p>}
            </div>

            {/* Date Selection and Auto-load */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4 space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Data de Início</label>
                <Input type="date" {...register('start_date')} className="font-mono h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>
              <div className="sm:col-span-4 space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Data de Retorno</label>
                <Input type="date" {...register('end_date')} className="font-mono h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>
              <div className="sm:col-span-4">
                <Button 
                  type="button" 
                  onClick={handleAutofillRange}
                  style={{ backgroundColor: '#c9a96e' }}
                  className="w-full h-11 text-white font-bold hover:opacity-90 transition text-[10px] uppercase rounded-xl flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> PUXAR PERÍODO
                </Button>
              </div>
            </div>

            {/* Detalhamento de Despesas (Lançamento Um a Um) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center pb-1">
                <span className="block font-bold uppercase tracking-wider text-[#8b7355] text-[10px]">Detalhamento de Despesas (Lançamento Um a Um)</span>
                <Button
                  type="button"
                  onClick={addExpenseItem}
                  style={{ backgroundColor: '#c9a96e' }}
                  className="h-7 px-2.5 rounded-lg text-white hover:opacity-90 flex items-center justify-center gap-1 cursor-pointer shadow-xs text-[10px] font-bold transition"
                >
                  <Plus className="h-3 w-3" /> ADICIONAR
                </Button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto border p-3 rounded-xl bg-white/50" style={{ borderColor: '#e8e2d8' }}>
                {expenseItems.length === 0 ? (
                  <div className="text-center text-[10px] text-stone-500 font-mono py-2">
                    Nenhuma despesa lançada. Clique em + ADICIONAR para lançar uma a uma.
                  </div>
                ) : (
                  expenseItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        placeholder="Ex: Combustível / Pedágio / Hotel"
                        value={item.description}
                        onChange={e => updateExpenseItem(idx, 'description', e.target.value)}
                        className="h-9 rounded-lg bg-white text-xs border-stone-200 flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="R$"
                        value={item.amount || ''}
                        onChange={e => updateExpenseItem(idx, 'amount', e.target.value)}
                        className="h-9 rounded-lg bg-white text-xs border-stone-200 w-24 font-mono font-bold"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeExpenseItem(idx)}
                        className="h-9 w-9 rounded-lg border-stone-200 hover:bg-red-50 text-red-500 flex items-center justify-center p-0 cursor-pointer font-bold text-sm"
                      >
                        ×
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Numbers section */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Valor Vendido (R$)</label>
                <Input type="number" step="any" {...register('sales_amount')} className="font-mono h-11 rounded-xl bg-white text-xs border-stone-200 font-bold" />
              </div>
              <div className="space-y-1">
                <label className="block font-bold uppercase text-red-700">Despesas Totais (R$)</label>
                <Input type="number" readOnly step="any" {...register('expenses_amount')} className="font-mono h-11 rounded-xl bg-stone-100/80 text-stone-600 text-xs border-stone-200 font-bold cursor-not-allowed" />
              </div>
              <div className="space-y-1">
                <label className="block font-bold uppercase text-stone-700">Custo Peças/CMV (R$)</label>
                <Input type="number" step="any" {...register('parts_amount')} className="font-mono h-11 rounded-xl bg-white text-xs border-stone-200 text-stone-600" />
              </div>
            </div>

            {/* Reinvestment options */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Reinvestir (%)</label>
                <Input type="number" step="any" {...register('reinvestment_pct')} className="font-mono h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>
              <div className="space-y-1">
                <label className="block font-bold uppercase text-stone-500">Valor Reinvestido</label>
                <div className="h-11 rounded-xl border border-stone-200 bg-stone-100 flex items-center px-3 font-mono font-bold text-stone-600 text-xs">
                  {formatCurrency(reinvestmentAmount)}
                </div>
              </div>
              <div className="space-y-1">
                <label className="block font-bold uppercase text-emerald-800">Lucro Líquido (Salário)</label>
                <div className="h-11 rounded-xl border border-emerald-200 bg-emerald-50/30 flex items-center px-3 font-mono font-black text-emerald-700 text-xs">
                  {formatCurrency(netProfit)}
                </div>
              </div>
            </div>

            {/* Conta Bancária para Débito de Salário Imediato */}
            <div className="space-y-1">
              <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Conta Bancária para Pagamento (Se finalizar com pagamento)</label>
              <select
                value={newSettleBankAccountId}
                onChange={e => setNewSettleBankAccountId(e.target.value)}
                className="w-full h-11 border border-stone-200 bg-white px-3 rounded-xl font-bold uppercase text-xs"
                style={{ color: '#3d2b1f' }}
              >
                <option value="">Selecione a conta para débito imediato...</option>
                {bankAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.bank_name} ({formatCurrency(a.current_balance)})</option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-4 border-t flex flex-col sm:flex-row gap-2 justify-between items-center bg-white -mx-6 -mb-6 p-6 mt-4 shrink-0" style={{ borderColor: '#e8e2d8' }}>
              <Button type="button" variant="outline" onClick={() => setIsNewOpen(false)} className="border-stone-300 text-xs font-bold uppercase rounded-full h-11 px-6 w-full sm:w-auto">
                CANCELAR
              </Button>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  type="submit"
                  onClick={() => setValue('status', 'pending_transfer')}
                  className="font-bold text-xs uppercase px-5 h-11 rounded-full border border-stone-300 bg-white text-stone-700 hover:bg-stone-50 cursor-pointer transition w-full sm:w-auto"
                >
                  💾 SALVAR ACERTO
                </Button>
                <Button
                  type="submit"
                  onClick={() => setValue('status', 'transferred')}
                  className="font-bold text-xs uppercase px-6 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95 text-white bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                >
                  💸 FINALIZAR COM PAGAMENTO
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* WITHDRAWAL MODAL */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent className="max-w-md w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-6 py-4 border-b bg-white shrink-0 flex items-center gap-3" style={{ borderColor: '#e8e2d8' }}>
            <div className="h-9 w-9 rounded-xl grid place-items-center text-white shrink-0 shadow-xs" style={{ backgroundColor: '#10b981' }}>
              <Coins className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-black uppercase" style={{ color: '#3d2b1f' }}>REGISTRAR RETIRADA DE SALÁRIO</DialogTitle>
          </div>

          {selectedSettle && (
            <div className="p-6 space-y-4 font-sans text-xs" style={{ backgroundColor: '#faf8f5' }}>
              <div className="p-4 bg-white border rounded-xl space-y-2 shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                <span className="font-bold uppercase block text-xs" style={{ color: '#3d2b1f' }}>{selectedSettle.description}</span>
                <div className="grid grid-cols-3 gap-2 border-t pt-2 mt-2 text-[10px] text-stone-500 font-mono">
                  <div>
                    <span className="block font-bold text-stone-600">LUCRO TOTAL:</span>
                    <span className="text-emerald-700 font-bold">{formatCurrency(selectedSettle.net_profit)}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-stone-600">JÁ RETIRADO:</span>
                    <span className="text-stone-700 font-bold">{formatCurrency(selectedSettle.transferred_amount || 0)}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-amber-800">PENDENTE:</span>
                    <span className="text-amber-700 font-bold">{formatCurrency(selectedSettle.net_profit - (selectedSettle.transferred_amount || 0))}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Valor da Retirada Atual (R$)</label>
                <Input 
                  type="number" 
                  step="any"
                  value={withdrawValue || ''}
                  onChange={e => setWithdrawValue(Number(e.target.value))}
                  className="font-mono font-bold h-11 rounded-xl bg-white text-xs border-stone-200 text-emerald-700 bg-emerald-50/10" 
                />
                <span className="text-[10px] text-stone-500 mt-1 block">Insira o valor que está sendo retirado do caixa agora.</span>
              </div>

              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Conta Bancária para Débito *</label>
                <select
                  value={selectedBankAccountId}
                  onChange={e => setSelectedBankAccountId(e.target.value)}
                  className="w-full h-11 border border-stone-200 bg-white px-3 rounded-xl font-bold uppercase text-xs"
                  style={{ color: '#3d2b1f' }}
                >
                  <option value="">Selecione a conta para debitar...</option>
                  {bankAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.bank_name} ({formatCurrency(a.current_balance)})</option>
                  ))}
                </select>
              </div>

              <DialogFooter className="pt-4 border-t flex justify-between items-center bg-white -mx-6 -mb-6 p-6 mt-4 shrink-0" style={{ borderColor: '#e8e2d8' }}>
                <Button type="button" variant="outline" onClick={() => setIsWithdrawOpen(false)} className="border-stone-300 text-xs font-bold uppercase rounded-full h-11 px-6">
                  CANCELAR
                </Button>
                <Button 
                  type="button" 
                  onClick={onConfirmWithdraw}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase px-8 h-11 rounded-full shadow-xs cursor-pointer"
                >
                  CONFIRMAR RETIRADA
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
