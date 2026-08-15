'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { AccountPayable, AccountReceivable, BankAccount } from '@/lib/database.types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Building2
} from 'lucide-react';

import { DateFilterBar } from '@/components/admin/DateFilterBar';
import { DatePreset, getDatePresetRange, isDateInRange } from '@/lib/date-filters';

export default function FluxoCaixaPage() {
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // View mode: 'realized' (only paid transactions) vs 'projected' (paid + pending)
  const [viewMode, setViewMode] = useState<'realized' | 'projected'>('projected');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [payData, recData, accData] = await Promise.all([
        dbService.getAccountsPayable(),
        dbService.getAccountsReceivable(),
        dbService.getBankAccounts()
      ]);
      setPayables(payData);
      setReceivables(recData);
      setBankAccounts(accData);
    } catch (e) {
      console.error(e);
      toast.add({ title: 'Erro de conexão', description: 'Falha ao carregar fluxo de caixa.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const todayStr = new Date().toISOString().substring(0, 10);
  const currentMonthStr = todayStr.substring(0, 7);

  const getFlowItems = () => {
    let recs = receivables;
    let pays = payables;

    if (viewMode === 'realized') {
      recs = recs.filter(r => r.status === 'paid');
      pays = pays.filter(p => p.status === 'paid');
    }

    const flowMap = new Map<string, { date: string; inflows: number; outflows: number; net: number; details: string[] }>();

    recs.forEach(r => {
      const date = r.status === 'paid' && r.payment_date ? r.payment_date : r.due_date;
      const existing = flowMap.get(date) || { date, inflows: 0, outflows: 0, net: 0, details: [] };
      existing.inflows += r.amount;
      existing.net += r.amount;
      existing.details.push(`(+) Rec: ${r.description} (${formatCurrency(r.amount)})`);
      flowMap.set(date, existing);
    });

    pays.forEach(p => {
      const date = p.status === 'paid' && p.payment_date ? p.payment_date : p.due_date;
      const existing = flowMap.get(date) || { date, inflows: 0, outflows: 0, net: 0, details: [] };
      existing.outflows += p.amount;
      existing.net -= p.amount;
      existing.details.push(`(-) Pag: ${p.description} (${formatCurrency(p.amount)})`);
      flowMap.set(date, existing);
    });

    return Array.from(flowMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  const flowItems = getFlowItems();
  const dateRange = getDatePresetRange(datePreset, customStartDate, customEndDate);

  const initialBankBalance = bankAccounts.reduce((sum, a) => sum + a.initial_balance, 0);

  let cumulativeBalance = initialBankBalance;
  const allFlowWithBalance = flowItems.map(item => {
    cumulativeBalance += item.net;
    return {
      ...item,
      accumulatedBalance: cumulativeBalance
    };
  });

  const flowWithBalance = allFlowWithBalance.filter(item => isDateInRange(item.date, dateRange));

  const monthInflows = flowWithBalance.reduce((sum, i) => sum + i.inflows, 0);
  const monthOutflows = flowWithBalance.reduce((sum, i) => sum + i.outflows, 0);
  const monthNet = monthInflows - monthOutflows;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-white border rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderColor: '#e8e2d8' }}>
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-1.5" style={{ backgroundColor: '#f5f0e8', color: '#c9a96e' }}>
            FINANCEIRO ERP — FLUXO DE CAIXA
          </span>
          <h1 className="text-xl font-semibold uppercase tracking-tight" style={{ color: '#3d2b1f' }}>
            FLUXO DE CAIXA REALIZADO & PROJETADO
          </h1>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#8b7355' }}>
            Projeção diária de entradas, saídas e acúmulo de saldo bancário.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex border rounded-full bg-stone-100 p-1" style={{ borderColor: '#e8e2d8' }}>
            <button
              onClick={() => setViewMode('projected')}
              className={`px-4 py-1.5 text-xs font-semibold uppercase rounded-full cursor-pointer transition-colors ${
                viewMode === 'projected' ? 'shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
              style={{
                backgroundColor: viewMode === 'projected' ? '#c9a96e' : 'transparent',
                color: '#3d2b1f'
              }}
            >
              PROJETADO
            </button>
            <button
              onClick={() => setViewMode('realized')}
              className={`px-4 py-1.5 text-xs font-semibold uppercase rounded-full cursor-pointer transition-colors ${
                viewMode === 'realized' ? 'shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
              style={{
                backgroundColor: viewMode === 'realized' ? '#c9a96e' : 'transparent',
                color: '#3d2b1f'
              }}
            >
              REALIZADO
            </button>
          </div>

          <Button
            onClick={loadData}
            variant="outline"
            className="border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold uppercase rounded-full h-11 px-5"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> ATUALIZAR
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: '#8b7355' }}>ENTRADAS DO MÊS (+)</span>
          <p className="text-2xl font-black font-mono text-emerald-700 mt-1">{formatCurrency(monthInflows)}</p>
        </div>
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: '#8b7355' }}>SAÍDAS DO MÊS (-)</span>
          <p className="text-2xl font-black font-mono text-red-600 mt-1">{formatCurrency(monthOutflows)}</p>
        </div>
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: '#8b7355' }}>RESULTADO LÍQUIDO DO MÊS</span>
          <p className={`text-2xl font-black font-mono mt-1 ${monthNet >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatCurrency(monthNet)}
          </p>
        </div>
      </div>

      {/* Daily Cash Flow Table */}
      <div className="bg-white border rounded-2xl shadow-2xs overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
        <div className="px-6 py-4 bg-white border-b flex items-center justify-between" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-xs font-black uppercase tracking-wider" style={{ color: '#3d2b1f' }}>
            DEMONSTRATIVO DIÁRIO DE FLUXO DE CAIXA E SALDO ACUMULADO
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ backgroundColor: '#f5f0e8', borderColor: '#e8e2d8' }}>
                <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>DATA DA OPERAÇÃO</TableHead>
                <TableHead className="text-right font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>ENTRADAS (+)</TableHead>
                <TableHead className="text-right font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>SAÍDAS (-)</TableHead>
                <TableHead className="text-right font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>SALDO LÍQUIDO DIA</TableHead>
                <TableHead className="text-right font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>SALDO ACUMULADO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 font-mono text-stone-500 text-xs">
                    Calculando projeção de fluxo...
                  </TableCell>
                </TableRow>
              ) : flowWithBalance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-stone-500 font-mono text-xs">
                    Nenhum lançamento no período.
                  </TableCell>
                </TableRow>
              ) : (
                flowWithBalance.map((item, i) => (
                  <TableRow key={i} className="hover:bg-[#f5f0e8]/50 transition font-sans" style={{ borderColor: '#f0eae1' }}>
                    <TableCell className="font-mono font-bold" style={{ color: '#3d2b1f' }}>{formatDate(item.date)}</TableCell>

                    <TableCell className="text-right font-mono font-bold text-emerald-700">
                      {item.inflows > 0 ? formatCurrency(item.inflows) : '-'}
                    </TableCell>

                    <TableCell className="text-right font-mono font-bold text-red-600">
                      {item.outflows > 0 ? `(${formatCurrency(item.outflows)})` : '-'}
                    </TableCell>

                    <TableCell className={`text-right font-mono font-bold ${item.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatCurrency(item.net)}
                    </TableCell>

                    <TableCell className="text-right font-mono font-black text-sm" style={{ color: '#3d2b1f' }}>
                      {formatCurrency(item.accumulatedBalance)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
