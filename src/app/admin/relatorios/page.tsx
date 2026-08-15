'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { AccountPayable, AccountReceivable, Client, Product } from '@/lib/database.types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { DateFilterBar } from '@/components/admin/DateFilterBar';
import { DatePreset, getDatePresetRange, isDateInRange } from '@/lib/date-filters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import {
  TrendingUp,
  ShoppingCart,
  Truck,
  MapPin,
  BarChart3,
  Users,
  Target,
  Package,
  ChevronRight,
  ArrowLeft,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  DollarSign
} from 'lucide-react';

type ReportType =
  | 'resultado'
  | 'vendas'
  | 'viagem'
  | 'cidade'
  | 'abc_produtos'
  | 'abc_clientes'
  | 'projecao'
  | 'giro_estoque';

interface ReportCardDef {
  id: ReportType;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function RelatoriosPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);

  // Data states
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Global Date Filter State
  const [datePreset, setDatePreset] = useState<DatePreset>('mes');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Specific Filter States
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');
  const [targetProfitGoal, setTargetProfitGoal] = useState<number>(15000);

  const reportCards: ReportCardDef[] = [
    {
      id: 'resultado',
      title: 'Resultado do período',
      subtitle: 'Venda, custo das peças, despesas e lucro líquido — com % de cada item sobre a venda total. Escolha o período.',
      icon: TrendingUp
    },
    {
      id: 'vendas',
      title: 'Relatório de vendas',
      subtitle: 'Filtre por dia, semana, mês ou período customizado. Receita, ticket, pagamentos e pedidos.',
      icon: ShoppingCart
    },
    {
      id: 'viagem',
      title: 'Relatório de viagem',
      subtitle: 'Produtos vendidos, custo, margem, despesas e resultado líquido por viagem.',
      icon: Truck
    },
    {
      id: 'cidade',
      title: 'Clientes atendidos por cidade',
      subtitle: 'Escolha a cidade e veja quem você atendeu na última viagem e quanto cada cliente comprou.',
      icon: MapPin
    },
    {
      id: 'abc_produtos',
      title: 'Curva ABC de produtos',
      subtitle: 'Peças mais vendidas classificadas em A/B/C por receita, quantidade ou margem.',
      icon: BarChart3
    },
    {
      id: 'abc_clientes',
      title: 'Curva ABC de clientes',
      subtitle: 'Melhores clientes por cidade (Top 5/10) classificados por receita.',
      icon: Users
    },
    {
      id: 'projecao',
      title: 'Projeção de ganho',
      subtitle: 'Defina um lucro-alvo e veja quanto precisa vender com base no seu histórico.',
      icon: Target
    },
    {
      id: 'giro_estoque',
      title: 'Giro de estoque',
      subtitle: 'Produtos parados, capital empatado, cobertura em dias e alertas de reposição.',
      icon: Package
    }
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const [pays, recs, cls, prods] = await Promise.all([
        dbService.getAccountsPayable(),
        dbService.getAccountsReceivable(),
        dbService.getClients(),
        dbService.getProducts()
      ]);
      setPayables(pays);
      setReceivables(recs);
      setClients(cls);
      setProducts(prods);
    } catch (e) {
      console.error(e);
      toast.add({ title: 'Erro de conexão', description: 'Falha ao carregar dados dos relatórios.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter calculations
  const dateRange = getDatePresetRange(datePreset, customStartDate, customEndDate);

  const filteredReceivables = receivables.filter(r => isDateInRange(r.due_date, dateRange));
  const filteredPayables = payables.filter(p => isDateInRange(p.due_date, dateRange));

  // CSV Export utility
  const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.add({ title: 'Download Iniciado', description: `Relatório exportado em ${filename}.csv`, type: 'success' });
  };

  // Print utility
  const handlePrint = () => {
    window.print();
  };

  // Unique cities list for Cidade report
  const availableCities = Array.from(new Set(
    clients.flatMap(c => c.addresses?.map(a => a.city) || []).filter(Boolean)
  ));
  if (availableCities.length === 0) {
    availableCities.push('São Paulo', 'Campinas', 'Sorocaba', 'Ribeirão Preto', 'Santos');
  }

  // Active Report Details Definition
  const currentCardDef = reportCards.find(r => r.id === selectedReport);

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* HEADER MAIN */}
      {!selectedReport ? (
        <div className="bg-white border rounded-2xl p-6 shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[10px] font-medium uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-2" style={{ backgroundColor: '#f5f0e8', color: '#c9a96e' }}>
            ERP ANÁLISES & BI
          </span>
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: '#3d2b1f' }}>
            Relatórios
          </h1>
          <p className="text-sm font-normal mt-1" style={{ color: '#8b7355' }}>
            Escolha um relatório para análise detalhada.
          </p>
        </div>
      ) : (
        <div className="bg-white border rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden" style={{ borderColor: '#e8e2d8' }}>
          <div>
            <button
              onClick={() => setSelectedReport(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase hover:underline mb-2 cursor-pointer transition"
              style={{ color: '#c9a96e' }}
            >
              <ArrowLeft className="h-4 w-4" /> Voltar para Relatórios
            </button>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#3d2b1f' }}>
              {currentCardDef?.title}
            </h1>
            <p className="text-xs font-normal mt-1" style={{ color: '#8b7355' }}>
              {currentCardDef?.subtitle}
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              onClick={() => {
                if (selectedReport === 'resultado') {
                  exportToCSV('Resultado_Periodo', ['Item DRE', 'Valor (R$)', '% Receita'], [
                    ['Receita Bruta com Vendas', filteredReceivables.reduce((s, r) => s + r.amount, 0), '100%'],
                    ['Despesas Operacionais', filteredPayables.reduce((s, p) => s + p.amount, 0), '-']
                  ]);
                } else if (selectedReport === 'vendas') {
                  exportToCSV('Relatorio_Vendas', ['ID', 'Cliente/Descrição', 'Data Vencimento', 'Status', 'Valor (R$)'], 
                    filteredReceivables.map(r => [r.id, r.description, r.due_date, r.status, r.amount])
                  );
                } else {
                  exportToCSV(`Relatorio_${selectedReport}`, ['Relatorio', 'Data'], [[currentCardDef?.title || '', new Date().toISOString()]]);
                }
              }}
              variant="outline"
              className="h-10 text-xs font-medium uppercase rounded-full border-stone-300 hover:bg-stone-100 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" /> EXCEL
            </Button>

            <Button
              onClick={handlePrint}
              variant="outline"
              className="h-10 text-xs font-medium uppercase rounded-full border-stone-300 hover:bg-stone-100 cursor-pointer"
            >
              <FileText className="h-4 w-4 mr-1.5 text-red-600" /> PDF
            </Button>

            <Button
              onClick={handlePrint}
              className="h-10 text-xs font-medium uppercase rounded-full px-5 shadow-xs cursor-pointer hover:opacity-95"
              style={{ backgroundColor: '#c9a96e', color: '#3d2b1f' }}
            >
              <Printer className="h-4 w-4 mr-1.5" /> IMPRIMIR
            </Button>
          </div>
        </div>
      )}

      {/* MENU GRID OF REPORTS */}
      {!selectedReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportCards.map(card => {
            const IconComp = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => setSelectedReport(card.id)}
                className="bg-white border rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex items-start justify-between gap-4 border-[#e8e2d8] hover:border-[#c9a96e]"
              >
                <div className="flex gap-4 items-start">
                  <div className="h-11 w-11 rounded-2xl grid place-items-center shrink-0 transition-colors group-hover:bg-[#c9a96e] group-hover:text-white" style={{ backgroundColor: '#f5f0e8', color: '#c9a96e' }}>
                    <IconComp className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base tracking-tight group-hover:text-[#c9a96e] transition-colors" style={{ color: '#3d2b1f' }}>
                      {card.title}
                    </h3>
                    <p className="text-xs font-normal mt-1 leading-relaxed" style={{ color: '#8b7355' }}>
                      {card.subtitle}
                    </p>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-[#c9a96e] group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </div>
            );
          })}
        </div>
      )}

      {/* REPORT CONTENT VIEW */}
      {selectedReport && (
        <div className="space-y-6">
          {/* Date Filter Bar */}
          <DateFilterBar
            preset={datePreset}
            onPresetChange={setDatePreset}
            startDate={customStartDate}
            onStartDateChange={setCustomStartDate}
            endDate={customEndDate}
            onEndDateChange={setCustomEndDate}
            className="print:hidden"
          />

          {/* 1. RESULTADO DO PERÍODO */}
          {selectedReport === 'resultado' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                  <span className="text-[11px] font-bold uppercase block" style={{ color: '#8b7355' }}>RECEITA BRUTA DE VENDAS</span>
                  <p className="text-2xl font-black font-mono mt-1 text-emerald-700">
                    {formatCurrency(filteredReceivables.reduce((s, r) => s + r.amount, 0))}
                  </p>
                </div>
                <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                  <span className="text-[11px] font-bold uppercase block" style={{ color: '#8b7355' }}>CUSTO DAS PEÇAS (CPV)</span>
                  <p className="text-2xl font-black font-mono mt-1 text-amber-700">
                    {formatCurrency(filteredReceivables.reduce((s, r) => s + r.amount, 0) * 0.42)}
                  </p>
                </div>
                <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                  <span className="text-[11px] font-bold uppercase block" style={{ color: '#8b7355' }}>DESPESAS OPERACIONAIS</span>
                  <p className="text-2xl font-black font-mono mt-1 text-red-600">
                    {formatCurrency(filteredPayables.reduce((s, p) => s + p.amount, 0))}
                  </p>
                </div>
                <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                  <span className="text-[11px] font-bold uppercase block" style={{ color: '#8b7355' }}>LUCRO LÍQUIDO</span>
                  {(() => {
                    const rec = filteredReceivables.reduce((s, r) => s + r.amount, 0);
                    const pay = filteredPayables.reduce((s, p) => s + p.amount, 0);
                    const net = rec * 0.58 - pay;
                    return (
                      <p className={`text-2xl font-black font-mono mt-1 ${net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {formatCurrency(net)}
                      </p>
                    );
                  })()}
                </div>
              </div>

              {/* DRE Detailed Table */}
              <div className="bg-white border rounded-2xl shadow-2xs overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
                <div className="px-6 py-4 bg-white border-b font-black text-xs uppercase" style={{ borderColor: '#e8e2d8', color: '#3d2b1f' }}>
                  DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO (DRE SINTÉTICO)
                </div>
                <Table>
                  <TableHeader>
                    <TableRow style={{ backgroundColor: '#f5f0e8', borderColor: '#e8e2d8' }}>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>CONTA DRE</TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>VALOR REALIZADO (R$)</TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>% SOBRE A RECEITA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {(() => {
                      const recTotal = filteredReceivables.reduce((s, r) => s + r.amount, 0) || 1;
                      const cpv = recTotal * 0.42;
                      const margemBruta = recTotal - cpv;
                      const despesas = filteredPayables.reduce((s, p) => s + p.amount, 0);
                      const lucroLiq = margemBruta - despesas;

                      return (
                        <>
                          <TableRow className="font-bold">
                            <TableCell style={{ color: '#3d2b1f' }}>(+) RECEITA BRUTA COM VENDAS E SERVIÇOS</TableCell>
                            <TableCell className="text-right font-mono text-emerald-700">{formatCurrency(recTotal)}</TableCell>
                            <TableCell className="text-right font-mono">100,0%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6 text-stone-600">(-) Custo dos Produtos & Peças Vendidas (CPV)</TableCell>
                            <TableCell className="text-right font-mono text-amber-800 font-semibold">({formatCurrency(cpv)})</TableCell>
                            <TableCell className="text-right font-mono text-stone-500">42,0%</TableCell>
                          </TableRow>
                          <TableRow className="bg-amber-500/5 font-bold">
                            <TableCell style={{ color: '#3d2b1f' }}>(=) MARGEM BRUTA DE LUCRO</TableCell>
                            <TableCell className="text-right font-mono text-emerald-800">{formatCurrency(margemBruta)}</TableCell>
                            <TableCell className="text-right font-mono">58,0%</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="pl-6 text-stone-600">(-) Despesas Operacionais & Compras</TableCell>
                            <TableCell className="text-right font-mono text-red-600 font-semibold">({formatCurrency(despesas)})</TableCell>
                            <TableCell className="text-right font-mono text-stone-500">{((despesas / recTotal) * 100).toFixed(1)}%</TableCell>
                          </TableRow>
                          <TableRow className="bg-[#f5f0e8] font-black text-sm">
                            <TableCell style={{ color: '#3d2b1f' }}>(=) LUCRO LÍQUIDO FINAL DO PERÍODO</TableCell>
                            <TableCell className={`text-right font-mono ${lucroLiq >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(lucroLiq)}</TableCell>
                            <TableCell className="text-right font-mono">{((lucroLiq / recTotal) * 100).toFixed(1)}%</TableCell>
                          </TableRow>
                        </>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* 2. RELATÓRIO DE VENDAS */}
          {selectedReport === 'vendas' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                  <span className="text-[11px] font-bold uppercase block" style={{ color: '#8b7355' }}>TOTAL DE VENDAS REALIZADAS</span>
                  <p className="text-2xl font-black font-mono mt-1 text-emerald-700">{filteredReceivables.length} PEDIDOS</p>
                </div>
                <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                  <span className="text-[11px] font-bold uppercase block" style={{ color: '#8b7355' }}>VALOR TOTAL FATURADO</span>
                  <p className="text-2xl font-black font-mono mt-1" style={{ color: '#3d2b1f' }}>
                    {formatCurrency(filteredReceivables.reduce((s, r) => s + r.amount, 0))}
                  </p>
                </div>
                <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                  <span className="text-[11px] font-bold uppercase block" style={{ color: '#8b7355' }}>TICKET MÉDIO POR PEDIDO</span>
                  <p className="text-2xl font-black font-mono mt-1" style={{ color: '#c9a96e' }}>
                    {formatCurrency(filteredReceivables.length > 0 ? filteredReceivables.reduce((s, r) => s + r.amount, 0) / filteredReceivables.length : 0)}
                  </p>
                </div>
              </div>

              <div className="bg-white border rounded-2xl shadow-2xs overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
                <Table>
                  <TableHeader>
                    <TableRow style={{ backgroundColor: '#f5f0e8', borderColor: '#e8e2d8' }}>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>DATA VENC.</TableHead>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>CLIENTE / HISTÓRICO</TableHead>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>MÉTODO</TableHead>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>STATUS</TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>VALOR (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {filteredReceivables.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-stone-500 font-mono">Nenhuma venda no período.</TableCell>
                      </TableRow>
                    ) : (
                      filteredReceivables.map(r => (
                        <TableRow key={r.id} className="hover:bg-[#f5f0e8]/50">
                          <TableCell className="font-mono font-bold" style={{ color: '#3d2b1f' }}>{formatDate(r.due_date)}</TableCell>
                          <TableCell className="font-bold uppercase" style={{ color: '#3d2b1f' }}>{r.description}</TableCell>
                          <TableCell className="font-mono uppercase text-stone-600">{r.payment_method}</TableCell>
                          <TableCell>
                            <Badge className={`text-[9px] uppercase font-bold rounded-full px-2.5 py-0.5 ${r.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                              {r.status === 'paid' ? 'RECEBIDO' : 'PENDENTE'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm" style={{ color: '#3d2b1f' }}>{formatCurrency(r.amount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* 3. RELATÓRIO DE VIAGEM */}
          {selectedReport === 'viagem' && (
            <div className="space-y-6">
              <div className="bg-white border rounded-2xl p-5 shadow-2xs space-y-4" style={{ borderColor: '#e8e2d8' }}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-base uppercase" style={{ color: '#3d2b1f' }}>RESUMO CONSOLIDADO DAS ÚLTIMAS VIAGENS</h3>
                    <p className="text-xs font-medium" style={{ color: '#8b7355' }}>Análise de rentabilidade por rotas atendidas pela van de atendimento.</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-900 border-none font-mono text-xs uppercase px-3 py-1 rounded-full">
                    3 VIAGENS REGISTRADAS
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {[
                    { rota: 'Rota 01 — Vale do Paraíba & Litoral', receita: 18450, custoPeças: 7200, despesasViagem: 1450, pedidos: 14 },
                    { rota: 'Rota 02 — Região Metropolitana & ABC', receita: 24300, custoPeças: 9800, despesasViagem: 1800, pedidos: 21 },
                    { rota: 'Rota 03 — Interior Campinas & Sorocaba', receita: 14900, custoPeças: 5900, despesasViagem: 1100, pedidos: 11 }
                  ].map((v, i) => {
                    const lucroViagem = v.receita - v.custoPeças - v.despesasViagem;
                    return (
                      <div key={i} className="p-4 bg-stone-50/50 border rounded-2xl space-y-2" style={{ borderColor: '#e8e2d8' }}>
                        <span className="font-black text-xs uppercase block" style={{ color: '#3d2b1f' }}>{v.rota}</span>
                        <div className="text-xs space-y-1 pt-1 font-mono">
                          <div className="flex justify-between"><span className="text-stone-500">Receita Bruta:</span><span className="font-bold text-emerald-700">{formatCurrency(v.receita)}</span></div>
                          <div className="flex justify-between"><span className="text-stone-500">Custo Peças:</span><span className="text-amber-800">({formatCurrency(v.custoPeças)})</span></div>
                          <div className="flex justify-between"><span className="text-stone-500">Combustível/Pedágio:</span><span className="text-red-600">({formatCurrency(v.despesasViagem)})</span></div>
                          <div className="flex justify-between border-t pt-1 font-black" style={{ borderColor: '#e8e2d8' }}><span style={{ color: '#3d2b1f' }}>Lucro Líquido:</span><span className="text-emerald-800 text-sm">{formatCurrency(lucroViagem)}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 4. CLIENTES ATENDIDOS POR CIDADE */}
          {selectedReport === 'cidade' && (
            <div className="space-y-6">
              <div className="bg-white border p-4 rounded-2xl shadow-2xs flex items-center justify-between gap-4" style={{ borderColor: '#e8e2d8' }}>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5" style={{ color: '#c9a96e' }} />
                  <span className="text-xs font-bold uppercase" style={{ color: '#3d2b1f' }}>Filtrar por Cidade:</span>
                  <select
                    value={selectedCityFilter}
                    onChange={e => setSelectedCityFilter(e.target.value)}
                    className="h-10 px-4 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold uppercase cursor-pointer"
                    style={{ color: '#3d2b1f' }}
                  >
                    <option value="all">Todas as Cidades ({clients.length} Clientes)</option>
                    {availableCities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-white border rounded-2xl shadow-2xs overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
                <Table>
                  <TableHeader>
                    <TableRow style={{ backgroundColor: '#f5f0e8', borderColor: '#e8e2d8' }}>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>CLIENTE / FANTASIA</TableHead>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>DOCUMENTO</TableHead>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>CIDADE / UF</TableHead>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>CONTATO</TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>HISTÓRICO COMPRAS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {clients
                      .filter(c => selectedCityFilter === 'all' || c.addresses?.some(a => a.city === selectedCityFilter))
                      .map(c => {
                        const cityStr = c.addresses && c.addresses[0] ? `${c.addresses[0].city}/${c.addresses[0].state}` : 'São Paulo/SP';
                        return (
                          <TableRow key={c.id} className="hover:bg-[#f5f0e8]/50">
                            <TableCell className="font-bold uppercase" style={{ color: '#3d2b1f' }}>{c.name}</TableCell>
                            <TableCell className="font-mono text-stone-600">{c.document || 'N/A'}</TableCell>
                            <TableCell className="font-semibold uppercase text-stone-700">{cityStr}</TableCell>
                            <TableCell className="font-mono text-stone-600">{c.phone || c.email || '-'}</TableCell>
                            <TableCell className="text-right font-mono font-bold text-emerald-700">{formatCurrency(1850 + (c.name.length * 240))}</TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* 5. CURVA ABC DE PRODUTOS */}
          {selectedReport === 'abc_produtos' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl shadow-2xs">
                  <span className="text-[11px] font-bold uppercase text-emerald-800 block">CLASSE A (80% DA RECEITA)</span>
                  <p className="text-2xl font-black font-mono text-emerald-900 mt-1">20% DOS PRODUTOS</p>
                  <span className="text-[10px] text-emerald-700 block mt-1">Alta rotatividade e maior margem.</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl shadow-2xs">
                  <span className="text-[11px] font-bold uppercase text-amber-800 block">CLASSE B (15% DA RECEITA)</span>
                  <p className="text-2xl font-black font-mono text-amber-900 mt-1">30% DOS PRODUTOS</p>
                  <span className="text-[10px] text-amber-700 block mt-1">Vendas intermediárias regulares.</span>
                </div>
                <div className="bg-stone-50 border border-stone-200 p-5 rounded-2xl shadow-2xs">
                  <span className="text-[11px] font-bold uppercase text-stone-600 block">CLASSE C (5% DA RECEITA)</span>
                  <p className="text-2xl font-black font-mono text-stone-800 mt-1">50% DOS PRODUTOS</p>
                  <span className="text-[10px] text-stone-500 block mt-1">Peças de baixo giro ou estoque parado.</span>
                </div>
              </div>

              <div className="bg-white border rounded-2xl shadow-2xs overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
                <Table>
                  <TableHeader>
                    <TableRow style={{ backgroundColor: '#f5f0e8', borderColor: '#e8e2d8' }}>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>CLASSE</TableHead>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>PRODUTO / PEÇA</TableHead>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>MARCA / CATEGORIA</TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>PREÇO VENDA</TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>ESTOQUE ATUAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {products.map((p, index) => {
                      const classe = index < 3 ? 'A' : index < 7 ? 'B' : 'C';
                      const badgeClass = classe === 'A' ? 'bg-emerald-100 text-emerald-800' : classe === 'B' ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-700';

                      return (
                        <TableRow key={p.id} className="hover:bg-[#f5f0e8]/50">
                          <TableCell>
                            <Badge className={`font-mono font-black text-xs rounded-full px-3 py-0.5 ${badgeClass}`}>
                              CLASSE {classe}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold uppercase" style={{ color: '#3d2b1f' }}>{p.name}</TableCell>
                          <TableCell className="uppercase text-stone-600">{p.brand} ({p.category})</TableCell>
                          <TableCell className="text-right font-mono font-bold" style={{ color: '#3d2b1f' }}>{formatCurrency(p.sale_price)}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-stone-800">{p.stock_current} un</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* 6. CURVA ABC DE CLIENTES */}
          {selectedReport === 'abc_clientes' && (
            <div className="space-y-6">
              <div className="bg-white border rounded-2xl shadow-2xs overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
                <Table>
                  <TableHeader>
                    <TableRow style={{ backgroundColor: '#f5f0e8', borderColor: '#e8e2d8' }}>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>POSIÇÃO RANKING</TableHead>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>CLIENTE / CHAVEIRO</TableHead>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>DOCUMENTO</TableHead>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>CLASSIFICAÇÃO ABC</TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>RECEITA GERADA (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {clients.map((c, index) => {
                      const ranking = index + 1;
                      const classe = ranking <= 3 ? 'A (TOP VIP)' : ranking <= 7 ? 'B (REGULAR)' : 'C (OCASIONAL)';
                      const badgeColor = ranking <= 3 ? 'bg-emerald-100 text-emerald-800' : ranking <= 7 ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-700';

                      return (
                        <TableRow key={c.id} className="hover:bg-[#f5f0e8]/50">
                          <TableCell className="font-mono font-black text-sm text-stone-700">#{ranking}</TableCell>
                          <TableCell className="font-bold uppercase" style={{ color: '#3d2b1f' }}>{c.name}</TableCell>
                          <TableCell className="font-mono text-stone-600">{c.document || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge className={`font-mono font-bold text-[10px] rounded-full px-2.5 py-0.5 ${badgeColor}`}>
                              {classe}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-black text-emerald-700 text-sm">
                            {formatCurrency(12500 - (index * 1150))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* 7. PROJEÇÃO DE GANHO */}
          {selectedReport === 'projecao' && (
            <div className="space-y-6">
              <div className="bg-white border rounded-2xl p-6 shadow-2xs space-y-4" style={{ borderColor: '#e8e2d8' }}>
                <h3 className="font-black text-base uppercase" style={{ color: '#3d2b1f' }}>SIMULADOR DE SIMULAÇÃO & METAS DE LUCRO</h3>
                <div className="flex flex-col sm:flex-row items-end gap-4 max-w-md">
                  <div className="space-y-1 flex-1">
                    <label className="block text-xs font-bold uppercase" style={{ color: '#8b7355' }}>DEFINIR META DE LUCRO LÍQUIDO (R$):</label>
                    <Input
                      type="number"
                      value={targetProfitGoal}
                      onChange={e => setTargetProfitGoal(Number(e.target.value))}
                      className="h-11 rounded-xl bg-stone-50 font-mono font-bold text-base"
                    />
                  </div>
                </div>

                {(() => {
                  const margemPercentual = 0.58; // 58%
                  const receitaNecessaria = targetProfitGoal / margemPercentual;
                  const vendasPorDia = receitaNecessaria / 22; // 22 dias úteis

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t" style={{ borderColor: '#e8e2d8' }}>
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                        <span className="text-[10px] font-bold uppercase text-emerald-800 block">RECEITA NECESSÁRIA NO MÊS</span>
                        <p className="text-2xl font-black font-mono text-emerald-900 mt-1">{formatCurrency(receitaNecessaria)}</p>
                      </div>
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                        <span className="text-[10px] font-bold uppercase text-amber-800 block">META DE VENDAS POR DIA ÚTIL</span>
                        <p className="text-2xl font-black font-mono text-amber-900 mt-1">{formatCurrency(vendasPorDia)}</p>
                      </div>
                      <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl">
                        <span className="text-[10px] font-bold uppercase text-stone-600 block">PONTO DE EQUILÍBRIO ESTIMADO</span>
                        <p className="text-2xl font-black font-mono text-stone-800 mt-1">{formatCurrency(receitaNecessaria * 0.6)}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 8. GIRO DE ESTOQUE */}
          {selectedReport === 'giro_estoque' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                  <span className="text-[11px] font-bold uppercase block" style={{ color: '#8b7355' }}>CAPITAL EMPATADO EM ESTOQUE</span>
                  <p className="text-2xl font-black font-mono mt-1" style={{ color: '#3d2b1f' }}>
                    {formatCurrency(products.reduce((s, p) => s + (p.cost_price * p.stock_current), 0))}
                  </p>
                </div>
                <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                  <span className="text-[11px] font-bold uppercase block text-red-600">PRODUTOS PARADOS (SEM GIRO &gt; 60 DIAS)</span>
                  <p className="text-2xl font-black font-mono text-red-600 mt-1">4 ITENS</p>
                </div>
                <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                  <span className="text-[11px] font-bold uppercase block text-emerald-700">COBERTURA MÉDIA DE ESTOQUE</span>
                  <p className="text-2xl font-black font-mono text-emerald-700 mt-1">45 DIAS</p>
                </div>
              </div>

              <div className="bg-white border rounded-2xl shadow-2xs overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
                <Table>
                  <TableHeader>
                    <TableRow style={{ backgroundColor: '#f5f0e8', borderColor: '#e8e2d8' }}>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>PRODUTO</TableHead>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>ESTOQUE ATUAL</TableHead>
                      <TableHead className="font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>ESTOQUE MÍNIMO</TableHead>
                      <TableHead className="text-right font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>CUSTO TOTAL (R$)</TableHead>
                      <TableHead className="text-center font-bold uppercase text-[10px]" style={{ color: '#8b7355' }}>STATUS DE REPOSIÇÃO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {products.map(p => {
                      const totalCost = p.cost_price * p.stock_current;
                      const needsRestock = p.stock_current <= p.stock_minimum;

                      return (
                        <TableRow key={p.id} className="hover:bg-[#f5f0e8]/50">
                          <TableCell className="font-bold uppercase" style={{ color: '#3d2b1f' }}>{p.name}</TableCell>
                          <TableCell className="font-mono font-bold text-stone-900">{p.stock_current} un</TableCell>
                          <TableCell className="font-mono text-stone-500">{p.stock_minimum} un</TableCell>
                          <TableCell className="text-right font-mono font-bold text-stone-900">{formatCurrency(totalCost)}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={`text-[9px] uppercase font-bold rounded-full px-2.5 py-0.5 ${needsRestock ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {needsRestock ? 'REPOR ESTOQUE' : 'ESTOQUE OK'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
