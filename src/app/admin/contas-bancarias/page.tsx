'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { BankAccount, BankTransaction } from '@/lib/database.types';
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
  Landmark,
  Plus,
  ArrowRightLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  CheckCircle2,
  Edit,
  Trash2
} from 'lucide-react';
import { DateFilterBar } from '@/components/admin/DateFilterBar';
import { DatePreset, getDatePresetRange, isDateInRange } from '@/lib/date-filters';

const accountSchema = z.object({
  bank_name: z.string().min(2, 'Nome do banco/caixa obrigatório'),
  agency: z.string().optional(),
  account_number: z.string().optional(),
  type: z.enum(['corrente', 'poupanca', 'caixa_interno']),
  initial_balance: z.coerce.number().min(0, 'Saldo inicial inválido')
});

const transferSchema = z.object({
  from_account_id: z.string().min(1, 'Selecione a conta de origem'),
  to_account_id: z.string().min(1, 'Selecione a conta de destino'),
  amount: z.coerce.number().min(0.01, 'Valor inválido'),
  date: z.string().min(1, 'Selecione a data'),
  description: z.string().min(3, 'Descrição obrigatória')
});

export default function ContasBancariasPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Date filters
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals
  const [isAccOpen, setIsAccOpen] = useState(false);
  const [isTxOpen, setIsTxOpen] = useState(false);

  // Edit Account state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [editBankName, setEditBankName] = useState('');
  const [editAgency, setEditAgency] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editType, setEditType] = useState<'corrente' | 'poupanca' | 'caixa_interno'>('corrente');
  const [editInitialBalance, setEditInitialBalance] = useState(0);

  // Delete Confirmation state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(null);

  const { register: regAcc, handleSubmit: subAcc, reset: resAcc, formState: { errors: errAcc } } = useForm<any>({
    resolver: zodResolver(accountSchema),
    defaultValues: { bank_name: '', agency: '', account_number: '', type: 'corrente', initial_balance: 0 }
  });

  const { register: regTx, handleSubmit: subTx, reset: resTx, watch: watchTx, formState: { errors: errTx } } = useForm<any>({
    resolver: zodResolver(transferSchema),
    defaultValues: { from_account_id: '', to_account_id: '', amount: 0, date: new Date().toISOString().substring(0, 10), description: 'Transferência entre contas' }
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [accs, txs] = await Promise.all([
        dbService.getBankAccounts(),
        dbService.getBankTransactions()
      ]);
      setAccounts(accs);
      setTransactions(txs);
    } catch (e) {
      console.error(e);
      toast.add({ title: 'Erro de conexão', description: 'Falha ao buscar saldos bancários.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onAddAccount = async (data: any) => {
    try {
      await dbService.createBankAccount({
        bank_name: data.bank_name,
        agency: data.agency || '',
        account_number: data.account_number || '',
        type: data.type,
        initial_balance: Number(data.initial_balance)
      });
      toast.add({ title: 'Conta Cadastrada', description: `Conta ${data.bank_name} criada com sucesso.`, type: 'success' });
      setIsAccOpen(false);
      resAcc();
      loadData();
    } catch (e: any) {
      toast.add({ title: 'Erro ao criar conta', description: e.message, type: 'error' });
    }
  };

  const onTransfer = async (data: any) => {
    if (data.from_account_id === data.to_account_id) {
      toast.add({ title: 'Contas idênticas', description: 'A conta de origem e destino devem ser diferentes.', type: 'warning' });
      return;
    }
    try {
      await dbService.transferBetweenAccounts(
        data.from_account_id,
        data.to_account_id,
        Number(data.amount),
        data.description,
        data.date
      );
      toast.add({ title: 'Transferência Concluída', description: 'Lançamentos refletidos nos saldos.', type: 'success' });
      setIsTxOpen(false);
      resTx();
      loadData();
    } catch (e: any) {
      toast.add({ title: 'Erro de transferência', description: e.message, type: 'error' });
    }
  };

  const handleOpenEditModal = (account: BankAccount) => {
    setEditingAccount(account);
    setEditBankName(account.bank_name);
    setEditAgency(account.agency || '');
    setEditAccountNumber(account.account_number || '');
    setEditType(account.type);
    setEditInitialBalance(account.initial_balance);
    setIsEditOpen(true);
  };

  const onUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    try {
      await dbService.updateBankAccount(editingAccount.id, {
        bank_name: editBankName,
        agency: editAgency,
        account_number: editAccountNumber,
        type: editType,
        initial_balance: Number(editInitialBalance)
      });
      toast.add({ title: 'Conta Atualizada', description: `Conta ${editBankName} foi atualizada com sucesso.`, type: 'success' });
      setIsEditOpen(false);
      loadData();
    } catch (e: any) {
      toast.add({ title: 'Erro ao atualizar', description: e.message, type: 'error' });
    }
  };

  const handleConfirmDelete = (account: BankAccount) => {
    setDeletingAccount(account);
    setIsDeleteOpen(true);
  };

  const onDeleteAccount = async () => {
    if (!deletingAccount) return;
    try {
      await dbService.deleteBankAccount(deletingAccount.id);
      toast.add({ title: 'Conta Excluída', description: `Conta ${deletingAccount.bank_name} foi excluída.`, type: 'success' });
      setIsDeleteOpen(false);
      setDeletingAccount(null);
      loadData();
    } catch (e: any) {
      toast.add({ title: 'Erro ao excluir', description: e.message, type: 'error' });
    }
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0);

  const dateRange = getDatePresetRange(datePreset, customStartDate, customEndDate);
  const filteredTransactions = transactions.filter(tx => isDateInRange(tx.date, dateRange));

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-white border rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderColor: '#e8e2d8' }}>
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-1.5" style={{ backgroundColor: '#f5f0e8', color: '#c9a96e' }}>
            FINANCEIRO ERP — TESOURARIA
          </span>
          <h1 className="text-xl font-semibold uppercase tracking-tight" style={{ color: '#3d2b1f' }}>
            CONTAS BANCÁRIAS & EXTRATO DE MOVIMENTAÇÕES
          </h1>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#8b7355' }}>
            Gestão consolidada de contas correntes, poupança e caixas internos.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setIsTxOpen(true)}
            variant="outline"
            className="border-stone-300 text-stone-700 hover:bg-stone-100 font-bold text-xs uppercase px-5 h-11 rounded-full cursor-pointer transition"
          >
            <ArrowRightLeft className="h-4 w-4 mr-1.5" /> TRANSFERÊNCIA
          </Button>
          <Button
            onClick={() => setIsAccOpen(true)}
            className="font-bold text-xs uppercase px-6 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95"
            style={{ backgroundColor: '#c9a96e', color: '#3d2b1f' }}
          >
            <Plus className="h-4 w-4 mr-1.5 text-[#3d2b1f]" /> NOVA CONTA BANCÁRIA
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

      {/* Total Balance KPI Banner */}
      <div className="bg-white border p-6 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: '#e8e2d8' }}>
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-xl text-white shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#8b7355' }}>SALDO CONSOLIDADO EM TESOURARIA</span>
            <p className="text-3xl font-black font-mono mt-0.5" style={{ color: '#3d2b1f' }}>{formatCurrency(totalBalance)}</p>
          </div>
        </div>
        <Badge className="text-xs font-mono uppercase px-4 py-1.5 rounded-full border border-stone-200" style={{ backgroundColor: '#faf8f5', color: '#3d2b1f' }}>
          {accounts.length} CONTAS ATIVAS
        </Badge>
      </div>

      {/* Bank Accounts Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white border p-5 rounded-2xl shadow-2xs space-y-2 flex flex-col justify-between" style={{ borderColor: '#e8e2d8' }}>
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: '#e8e2d8' }}>
                <span className="font-black text-xs uppercase" style={{ color: '#3d2b1f' }}>{acc.bank_name}</span>
                <Badge className="text-[9px] uppercase font-bold bg-stone-100 text-stone-700 border-none rounded-full px-2.5">
                  {acc.type === 'corrente' ? 'CONTA CORRENTE' : acc.type === 'caixa_interno' ? 'CAIXA FÍSICO' : 'POUPANÇA'}
                </Badge>
              </div>
              <p className="text-xl font-black font-mono" style={{ color: '#3d2b1f' }}>{formatCurrency(acc.current_balance)}</p>
              <p className="text-[10px] font-mono" style={{ color: '#8b7355' }}>
                AG: {acc.agency || '-'} | CONTA: {acc.account_number || '-'}
              </p>
            </div>
            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-stone-100 mt-2">
              <Button 
                onClick={() => handleOpenEditModal(acc)} 
                variant="ghost" 
                size="xs" 
                className="text-stone-500 hover:text-stone-700 font-bold text-[10px] uppercase rounded-full h-7 px-2.5"
              >
                <Edit className="h-3.5 w-3.5 mr-1" /> Editar
              </Button>
              <Button 
                onClick={() => handleConfirmDelete(acc)} 
                variant="ghost" 
                size="xs" 
                className="text-red-500 hover:text-red-700 font-bold text-[10px] uppercase rounded-full h-7 px-2.5"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Transactions Extrato Table */}
      <div className="bg-white border rounded-2xl shadow-2xs overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
        <div className="px-6 py-4 bg-white border-b flex items-center justify-between" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-xs font-black uppercase tracking-wider" style={{ color: '#3d2b1f' }}>
            EXTRATO RECENTE DE TRANSAÇÕES BANCÁRIAS
          </span>
          <Button onClick={loadData} variant="ghost" size="xs" className="text-stone-600 font-bold uppercase rounded-full">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> ATUALIZAR
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: '#f5f0e8', borderColor: '#e8e2d8' }}>
                <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>DATA/HORA</TableHead>
                <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>CONTA BANCÁRIA</TableHead>
                <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>TIPO</TableHead>
                <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>DESCRIÇÃO DA OPERAÇÃO</TableHead>
                <TableHead className="text-right font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>VALOR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 font-mono text-stone-500 text-xs">
                    Carregando extrato...
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-stone-500 font-mono text-xs">
                    Nenhuma transação bancária registrada para o período selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map(tx => {
                  const targetAccId = (tx as any).bank_account_id || (tx as any).account_id;
                  const acc = accounts.find(a => a.id === targetAccId);
                  const isCredit = tx.type === 'income' || tx.type === 'transfer_in';

                  return (
                    <TableRow key={tx.id} className="hover:bg-[#f5f0e8]/50 transition font-sans" style={{ borderColor: '#f0eae1' }}>
                      <TableCell className="font-mono text-stone-600">{formatDate(tx.date)}</TableCell>
                      <TableCell className="font-bold uppercase" style={{ color: '#3d2b1f' }}>{acc ? acc.bank_name : '-'}</TableCell>
                      <TableCell>
                        <Badge className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          isCredit ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isCredit ? 'CRÉDITO (+)' : 'DÉBITO (-)'}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ color: '#3d2b1f' }}>{tx.description}</TableCell>
                      <TableCell className={`text-right font-mono font-bold ${isCredit ? 'text-emerald-700' : 'text-stone-900'}`}>
                        {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* CREATE ACCOUNT DIALOG */}
      <Dialog open={isAccOpen} onOpenChange={setIsAccOpen}>
        <DialogContent className="max-w-md w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-6 py-4 border-b bg-white shrink-0 flex items-center gap-3" style={{ borderColor: '#e8e2d8' }}>
            <div className="h-9 w-9 rounded-xl grid place-items-center text-white shrink-0 shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
              <Landmark className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-black uppercase" style={{ color: '#3d2b1f' }}>CADASTRAR CONTA BANCÁRIA</DialogTitle>
          </div>

          <form onSubmit={subAcc(onAddAccount)} className="p-6 space-y-4 font-sans text-xs" style={{ backgroundColor: '#faf8f5' }}>
            <div className="space-y-1">
              <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Nome do Banco / Caixa *</label>
              <Input {...regAcc('bank_name')} placeholder="Ex: Itaú Unibanco, Caixa Físico" className="h-11 rounded-xl bg-white text-xs border-stone-200" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Agência</label>
                <Input {...regAcc('agency')} placeholder="0001" className="font-mono h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>
              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Número da Conta</label>
                <Input {...regAcc('account_number')} placeholder="12345-6" className="font-mono h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Tipo de Conta</label>
                <select {...regAcc('type')} className="w-full h-11 border border-stone-200 bg-white px-3 rounded-xl font-bold uppercase text-xs" style={{ color: '#3d2b1f' }}>
                  <option value="corrente">Conta Corrente</option>
                  <option value="poupanca">Poupança</option>
                  <option value="caixa_interno">Caixa Físico Interno</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Saldo Inicial (R$)</label>
                <Input type="number" step="0.01" {...regAcc('initial_balance')} className="font-mono text-right font-bold h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t flex justify-between items-center bg-white -mx-6 -mb-6 p-6 mt-4 shrink-0" style={{ borderColor: '#e8e2d8' }}>
              <Button type="button" variant="outline" onClick={() => setIsAccOpen(false)} className="border-stone-300 text-xs font-bold uppercase rounded-full h-11 px-6">
                CANCELAR
              </Button>
              <Button
                type="submit"
                className="font-bold text-xs uppercase px-8 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95"
                style={{ backgroundColor: '#c9a96e', color: '#3d2b1f' }}
              >
                SALVAR CONTA
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* TRANSFER DIALOG */}
      <Dialog open={isTxOpen} onOpenChange={setIsTxOpen}>
        <DialogContent className="max-w-md w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-6 py-4 border-b bg-white shrink-0 flex items-center gap-3" style={{ borderColor: '#e8e2d8' }}>
            <div className="h-9 w-9 rounded-xl grid place-items-center text-white shrink-0 shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-black uppercase" style={{ color: '#3d2b1f' }}>TRANSFERÊNCIA ENTRE CONTAS</DialogTitle>
          </div>

          <form onSubmit={subTx(onTransfer)} className="p-6 space-y-4 font-sans text-xs" style={{ backgroundColor: '#faf8f5' }}>
            <div className="space-y-1">
              <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Conta de Origem (Débito)</label>
              <select {...regTx('from_account_id')} className="w-full h-11 border border-stone-200 bg-white px-3 rounded-xl font-bold uppercase text-xs" style={{ color: '#3d2b1f' }}>
                <option value="">Selecione a origem...</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.bank_name} ({formatCurrency(a.current_balance)})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Conta de Destino (Crédito)</label>
              <select {...regTx('to_account_id')} className="w-full h-11 border border-stone-200 bg-white px-3 rounded-xl font-bold uppercase text-xs" style={{ color: '#3d2b1f' }}>
                <option value="">Selecione o destino...</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.bank_name} ({formatCurrency(a.current_balance)})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Valor da Transferência (R$)</label>
                <Input type="number" step="0.01" {...regTx('amount')} className="font-mono text-right font-bold h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>
              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Data da Operação</label>
                <Input type="date" {...regTx('date')} className="font-mono h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Descrição / Histórico</label>
              <Input {...regTx('description')} placeholder="Ex: Transferência de caixa para banco" className="h-11 rounded-xl bg-white text-xs border-stone-200" />
            </div>

            <DialogFooter className="pt-4 border-t flex justify-between items-center bg-white -mx-6 -mb-6 p-6 mt-4 shrink-0" style={{ borderColor: '#e8e2d8' }}>
              <Button type="button" variant="outline" onClick={() => setIsTxOpen(false)} className="border-stone-300 text-xs font-bold uppercase rounded-full h-11 px-6">
                CANCELAR
              </Button>
              <Button
                type="submit"
                className="font-bold text-xs uppercase px-8 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95"
                style={{ backgroundColor: '#c9a96e', color: '#3d2b1f' }}
              >
                EXECUTAR TRANSFERÊNCIA
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT ACCOUNT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-6 py-4 border-b bg-white shrink-0 flex items-center gap-3" style={{ borderColor: '#e8e2d8' }}>
            <div className="h-9 w-9 rounded-xl grid place-items-center text-white shrink-0 shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
              <Edit className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-black uppercase" style={{ color: '#3d2b1f' }}>EDITAR CONTA BANCÁRIA</DialogTitle>
          </div>

          <form onSubmit={onUpdateAccount} className="p-6 space-y-4 font-sans text-xs" style={{ backgroundColor: '#faf8f5' }}>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Nome do Banco/Caixa *</label>
                <Input value={editBankName} onChange={e => setEditBankName(e.target.value)} required className="h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>
              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Agência</label>
                <Input value={editAgency} onChange={e => setEditAgency(e.target.value)} placeholder="0101" className="font-mono h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Número da Conta</label>
                <Input value={editAccountNumber} onChange={e => setEditAccountNumber(e.target.value)} placeholder="12345-6" className="font-mono h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>
              <div className="space-y-1">
                <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Saldo Inicial (R$)</label>
                <Input type="number" step="0.01" value={editInitialBalance} onChange={e => setEditInitialBalance(Number(e.target.value))} required className="font-mono text-right font-bold h-11 rounded-xl bg-white text-xs border-stone-200" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-bold uppercase" style={{ color: '#8b7355' }}>Tipo de Conta</label>
              <select value={editType} onChange={e => setEditType(e.target.value as any)} className="w-full h-11 border border-stone-200 bg-white px-3 rounded-xl font-bold uppercase text-xs" style={{ color: '#3d2b1f' }}>
                <option value="corrente">Conta Corrente</option>
                <option value="poupanca">Poupança</option>
                <option value="caixa_interno">Caixa Físico Interno</option>
              </select>
            </div>

            <DialogFooter className="pt-4 border-t flex justify-between items-center bg-white -mx-6 -mb-6 p-6 mt-4 shrink-0" style={{ borderColor: '#e8e2d8' }}>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="border-stone-300 text-xs font-bold uppercase rounded-full h-11 px-6">
                CANCELAR
              </Button>
              <Button
                type="submit"
                className="font-bold text-xs uppercase px-8 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95"
                style={{ backgroundColor: '#c9a96e', color: '#3d2b1f' }}
              >
                SALVAR ALTERAÇÕES
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md w-full p-6 rounded-2xl bg-white border shadow-2xl flex flex-col gap-4" style={{ borderColor: '#e8e2d8' }}>
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> EXCLUIR CONTA BANCÁRIA
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-600 font-sans mt-2">
              Tem certeza de que deseja excluir a conta <b className="text-stone-900">"{deletingAccount?.bank_name}"</b>? 
              Essa ação não poderá ser desfeita e todas as transações vinculadas à conta podem perder sua referência.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-end gap-2 pt-4 border-t mt-2" style={{ borderColor: '#e8e2d8' }}>
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} className="border-stone-300 text-xs font-bold uppercase rounded-full h-11 px-6">
              CANCELAR
            </Button>
            <Button
              onClick={onDeleteAccount}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase px-8 h-11 rounded-full shadow-xs cursor-pointer"
            >
              SIM, EXCLUIR CONTA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
