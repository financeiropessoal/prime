'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { AccountPayable, Supplier, BankAccount } from '@/lib/database.types';
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
  ArrowUpCircle,
  Plus,
  RefreshCw,
  Search,
  Check,
  Building2
} from 'lucide-react';

import { DateFilterBar } from '@/components/admin/DateFilterBar';
import { DatePreset, getDatePresetRange, isDateInRange } from '@/lib/date-filters';

const payableSchema = z.object({
  supplier_id: z.string().min(1, 'Selecione o fornecedor'),
  description: z.string().min(3, 'Descrição obrigatória'),
  category: z.string().min(1, 'Selecione uma categoria'),
  amount: z.coerce.number().min(0.01, 'Valor inválido'),
  issue_date: z.string().min(1, 'Data de emissão obrigatória'),
  due_date: z.string().min(1, 'Data de vencimento obrigatória'),
  payment_method: z.string().min(1, 'Selecione o método de pagamento'),
  installments: z.coerce.number().int().min(1, 'Mínimo 1 parcela').max(12, 'Máximo 12 parcelas')
});

const checkoutSchema = z.object({
  bank_account_id: z.string().min(1, 'Selecione a conta bancária'),
  payment_date: z.string().min(1, 'Selecione a data de pagamento')
});

export default function ContasPagarPage() {
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals state
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payingBill, setPayingBill] = useState<AccountPayable | null>(null);

  const categories = ['Compra de Mercadorias / Peças', 'Fornecedores / Insumos', 'Aluguel & Infraestrutura', 'Folha de Pagamento', 'Impostos & Taxas', 'Manutenção & Ferramental', 'Outros'];

  const { register: regNew, handleSubmit: subNew, reset: resNew, formState: { errors: errNew } } = useForm<any>({
    resolver: zodResolver(payableSchema),
    defaultValues: {
      supplier_id: '',
      description: '',
      category: 'Compra de Mercadorias / Peças',
      amount: 0,
      issue_date: new Date().toISOString().substring(0, 10),
      due_date: new Date().toISOString().substring(0, 10),
      payment_method: 'Boleto',
      installments: 1
    }
  });

  const { register: regPay, handleSubmit: subPay, reset: resPay } = useForm<any>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      bank_account_id: '',
      payment_date: new Date().toISOString().substring(0, 10)
    }
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [pays, sups, accs] = await Promise.all([
        dbService.getAccountsPayable(),
        dbService.getSuppliers(),
        dbService.getBankAccounts()
      ]);
      setPayables(pays);
      setSuppliers(sups);
      setBankAccounts(accs);
    } catch (e) {
      console.error(e);
      toast.add({ title: 'Erro de conexão', description: 'Não foi possível carregar as contas a pagar.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onAddPayable = async (data: any) => {
    try {
      await dbService.createAccountPayable({
        supplier_id: data.supplier_id,
        description: data.description,
        category: data.category,
        amount: Number(data.amount),
        issue_date: data.issue_date,
        due_date: data.due_date,
        payment_method: data.payment_method,
        installments: Number(data.installments),
        bank_account_id: null,
        attachment_url: null,
        recurrence_id: null
      });
      toast.add({ title: 'Título Lançado', description: 'Conta a pagar cadastrada com sucesso.', type: 'success' });
      setIsNewOpen(false);
      resNew();
      loadData();
    } catch (e: any) {
      toast.add({ title: 'Erro ao cadastrar', description: e.message, type: 'error' });
    }
  };

  const handleOpenPay = (bill: AccountPayable) => {
    setPayingBill(bill);
    resPay({
      bank_account_id: bankAccounts[0]?.id || '',
      payment_date: new Date().toISOString().substring(0, 10)
    });
    setIsPayOpen(true);
  };

  const onPayConfirm = async (data: any) => {
    if (!payingBill) return;
    try {
      await dbService.payAccountPayable(payingBill.id, data.bank_account_id, data.payment_date);
      toast.add({ title: 'Baixa Efetuada', description: `Título #${payingBill.id} pago e quitado.`, type: 'success' });
      setIsPayOpen(false);
      loadData();
    } catch (e: any) {
      toast.add({ title: 'Erro no pagamento', description: e.message, type: 'error' });
    }
  };

  const todayStr = new Date().toISOString().substring(0, 10);
  const dateRange = getDatePresetRange(datePreset, customStartDate, customEndDate);

  const filteredPayables = payables.filter(p => {
    const sup = suppliers.find(s => s.id === p.supplier_id);
    const supName = sup ? sup.trade_name : '';
    const matchesSearch = p.description.toLowerCase().includes(search.toLowerCase()) ||
      supName.toLowerCase().includes(search.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === 'pending') matchesStatus = p.status === 'pending' && p.due_date >= todayStr;
    if (statusFilter === 'overdue') matchesStatus = p.status === 'pending' && p.due_date < todayStr;
    if (statusFilter === 'paid') matchesStatus = p.status === 'paid';

    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const matchesDate = isDateInRange(p.due_date, dateRange);

    return matchesSearch && matchesStatus && matchesCategory && matchesDate;
  });

  const totalPending = filteredPayables.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const totalOverdue = filteredPayables.filter(p => p.status === 'pending' && p.due_date < todayStr).reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = filteredPayables.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-white border rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderColor: '#e8e2d8' }}>
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-1.5" style={{ backgroundColor: '#f5f0e8', color: '#c9a96e' }}>
            FINANCEIRO ERP — CONTAS A PAGAR
          </span>
          <h1 className="text-xl font-semibold uppercase tracking-tight" style={{ color: '#3d2b1f' }}>
            GESTÃO DE OBRIGAÇÕES & FORNECEDORES
          </h1>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#8b7355' }}>
            Lançamento e quitação de títulos de compra e despesas operacionais.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setIsNewOpen(true)}
            className="font-bold text-xs uppercase px-6 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95"
            style={{ backgroundColor: '#c9a96e', color: '#3d2b1f' }}
          >
            <Plus className="h-4 w-4 mr-1.5 text-[#3d2b1f]" /> LANÇAR CONTA A PAGAR
          </Button>
        </div>
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

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: '#8b7355' }}>TOTAL PENDENTE A PAGAR</span>
          <p className="text-2xl font-black font-mono mt-1" style={{ color: '#3d2b1f' }}>{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[11px] font-bold uppercase tracking-wider block text-red-600">TÍTULOS VENCIDOS</span>
          <p className="text-2xl font-black font-mono text-red-600 mt-1">{formatCurrency(totalOverdue)}</p>
        </div>
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[11px] font-bold uppercase tracking-wider block text-emerald-700">TÍTULOS QUITADOS</span>
          <p className="text-2xl font-black font-mono text-emerald-700 mt-1">{formatCurrency(totalPaid)}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border p-4 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Buscar por fornecedor ou descrição da despesa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-11 text-xs rounded-xl bg-stone-50/50 border-stone-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-11 px-4 bg-stone-50/50 border border-stone-200 rounded-xl text-xs font-bold uppercase cursor-pointer"
              style={{ color: '#3d2b1f' }}
            >
              <option value="all">Todos os Status</option>
              <option value="pending">A Vencer</option>
              <option value="overdue">Vencidas (Atrasadas)</option>
              <option value="paid">Quitadas (Pagas)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table of Payables */}
      <div className="bg-white border rounded-2xl shadow-2xs overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: '#f5f0e8', borderColor: '#e8e2d8' }}>
                <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>VENCIMENTO</TableHead>
                <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>FORNECEDOR</TableHead>
                <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>DESCRIÇÃO / CATEGORIA</TableHead>
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
                    Carregando títulos a pagar...
                  </TableCell>
                </TableRow>
              ) : filteredPayables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-stone-500 font-mono text-xs">
                    Nenhum título encontrado com esses critérios.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayables.map(p => {
                  const sup = suppliers.find(s => s.id === p.supplier_id);
                  const isPaid = p.status === 'paid';
                  const isOverdue = !isPaid && p.due_date < todayStr;

                  return (
                    <TableRow key={p.id} className="hover:bg-[#f5f0e8]/50 transition font-sans" style={{ borderColor: '#f0eae1' }}>
                      <TableCell className="font-mono font-bold" style={{ color: '#3d2b1f' }}>
                        {formatDate(p.due_date)}
                      </TableCell>

                      <TableCell className="font-bold uppercase" style={{ color: '#3d2b1f' }}>
                        {sup ? sup.trade_name : '-'}
                      </TableCell>

                      <TableCell>
                        <span className="font-bold block uppercase" style={{ color: '#3d2b1f' }}>{p.description}</span>
                        <span className="text-[10px] block uppercase" style={{ color: '#8b7355' }}>{p.category}</span>
                      </TableCell>

                      <TableCell className="font-mono uppercase text-stone-700">{p.payment_method}</TableCell>

                      <TableCell>
                        <Badge className={`text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
                          isPaid ? 'bg-emerald-100 text-emerald-800' :
                          isOverdue ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-900'
                        }`}>
                          {isPaid ? 'QUITADO' : isOverdue ? 'ATRASADO' : 'PENDENTE'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold text-sm" style={{ color: '#3d2b1f' }}>
                        {formatCurrency(p.amount)}
                      </TableCell>

                      <TableCell className="text-center">
                        {!isPaid && (
                          <Button
                            size="xs"
                            onClick={() => handleOpenPay(p)}
                            className="font-bold text-[10px] uppercase px-4 h-8 rounded-full shadow-xs cursor-pointer transition hover:opacity-95"
                            style={{ backgroundColor: '#c9a96e', color: '#3d2b1f' }}
                          >
                            DAR BAIXA
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

      {/* NEW PAYABLE DIALOG */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-xl w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-6 py-4 border-b bg-white shrink-0 flex items-center gap-3" style={{ borderColor: '#e8e2d8' }}>
            <div className="h-9 w-9 rounded-xl grid place-items-center text-white shrink-0 shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
              <ArrowUpCircle className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-black uppercase" style={{ color: '#3d2b1f' }}>LANÇAR NOVA CONTA A PAGAR</DialogTitle>
          </div>

          <form onSubmit={subNew(onAddPayable)} className="p-6 space-y-4 font-sans text-xs" style={{ backgroundColor: '#faf8f5' }}>
            <div className="space-y-1">
              <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Fornecedor</label>
              <select {...regNew('supplier_id')} className="w-full h-11 border border-stone-200 bg-white px-3 rounded-xl font-bold uppercase text-xs" style={{ color: '#3d2b1f' }}>
                <option value="">Selecione o fornecedor...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.trade_name} ({s.company_name})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Descrição do Título / Despesa *</label>
              <Input {...regNew('description')} placeholder="Ex: NF 1234 - Reposição de Carcaças" className="h-11 rounded-xl bg-white text-xs border-stone-200" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Categoria de Custo</label>
                <select {...regNew('category')} className="w-full h-11 border border-stone-200 bg-white px-3 rounded-xl font-bold uppercase text-xs" style={{ color: '#3d2b1f' }}>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Valor Total (R$) *</label>
                <Input type="number" step="0.01" {...regNew('amount')} className="font-mono text-right font-bold h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Data de Emissão</label>
                <Input type="date" {...regNew('issue_date')} className="font-mono h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>

              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Data de Vencimento</label>
                <Input type="date" {...regNew('due_date')} className="font-mono font-bold h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Forma de Pagamento</label>
                <select {...regNew('payment_method')} className="w-full h-11 border border-stone-200 bg-white px-3 rounded-xl font-bold uppercase text-xs" style={{ color: '#3d2b1f' }}>
                  <option value="Boleto">Boleto Bancário</option>
                  <option value="Pix">Pix / Transferência</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Parcelas</label>
                <Input type="number" {...regNew('installments')} className="font-mono text-right h-11 rounded-xl bg-white text-xs border-stone-200" />
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

      {/* PAY BILL DIALOG */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="max-w-md w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-6 py-4 border-b bg-white shrink-0 flex items-center gap-3" style={{ borderColor: '#e8e2d8' }}>
            <div className="h-9 w-9 rounded-xl grid place-items-center text-white shrink-0 shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
              <Check className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-black uppercase" style={{ color: '#3d2b1f' }}>EFETUAR BAIXA DE TÍTULO A PAGAR</DialogTitle>
          </div>

          {payingBill && (
            <form onSubmit={subPay(onPayConfirm)} className="p-6 space-y-4 font-sans text-xs" style={{ backgroundColor: '#faf8f5' }}>
              <div className="p-4 bg-white border rounded-xl space-y-1 shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                <span className="font-bold uppercase block text-xs" style={{ color: '#3d2b1f' }}>{payingBill.description}</span>
                <span className="font-mono font-black text-sm block" style={{ color: '#c9a96e' }}>{formatCurrency(payingBill.amount)}</span>
              </div>

              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Conta Bancária de Débito</label>
                <select {...regPay('bank_account_id')} className="w-full h-11 border border-stone-200 bg-white px-3 rounded-xl font-bold uppercase text-xs" style={{ color: '#3d2b1f' }}>
                  {bankAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.bank_name} ({formatCurrency(a.current_balance)})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Data do Pagamento</label>
                <Input type="date" {...regPay('payment_date')} className="font-mono h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>

              <DialogFooter className="pt-4 border-t flex justify-between items-center bg-white -mx-6 -mb-6 p-6 mt-4 shrink-0" style={{ borderColor: '#e8e2d8' }}>
                <Button type="button" variant="outline" onClick={() => setIsPayOpen(false)} className="border-stone-300 text-xs font-bold uppercase rounded-full h-11 px-6">
                  CANCELAR
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase px-8 h-11 rounded-full shadow-xs cursor-pointer">
                  CONFIRMAR QUITAÇÃO
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
