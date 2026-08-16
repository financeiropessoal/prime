'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { Product, Client, Supplier, Order, OrderItem, AccountPayable, AccountReceivable, BankAccount } from '@/lib/database.types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Package,
  Users,
  Truck,
  Landmark,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Calculator,
  RefreshCw,
  Wallet,
  Zap,
  Building2,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cls, sups, ords, pays, recs, accs, items] = await Promise.all([
        dbService.getProducts(),
        dbService.getClients(),
        dbService.getSuppliers(),
        dbService.getOrders(),
        dbService.getAccountsPayable(),
        dbService.getAccountsReceivable(),
        dbService.getBankAccounts(),
        dbService.getOrderItems()
      ]);
      setProducts(prods);
      setClients(cls);
      setSuppliers(sups);
      setOrders(ords);
      setPayables(pays);
      setReceivables(recs);
      setBankAccounts(accs);
      setOrderItems(items);
    } catch (e) {
      console.error('Erro ao carregar dados do dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-stone-600 font-mono text-xs">
        <div className="h-6 w-6 animate-spin border-2 border-[#e8590c] border-t-transparent mx-auto mb-2" />
        CARREGANDO PAINEL DE INDICADORES COMERCIAIS...
      </div>
    );
  }

  const todayStr = new Date().toISOString().substring(0, 10);
  const currentMonthStr = todayStr.substring(0, 7);

  // Calculations
  const salesToday = orders
    .filter(o => o.status !== 'cancelled' && o.created_at.substring(0, 10) === todayStr)
    .reduce((sum, o) => sum + o.total_amount, 0);

  const salesMonth = orders
    .filter(o => o.status !== 'cancelled' && o.created_at.substring(0, 7) === currentMonthStr)
    .reduce((sum, o) => sum + o.total_amount, 0);

  const payablesToday = payables
    .filter(p => p.status === 'pending' && p.due_date === todayStr)
    .reduce((sum, p) => sum + p.amount, 0);

  const receivablesToday = receivables
    .filter(r => r.status === 'pending' && r.due_date === todayStr)
    .reduce((sum, r) => sum + r.amount, 0);

  const totalBankBalance = bankAccounts.reduce((sum, a) => sum + a.current_balance, 0);
  const lowStockProducts = products.filter(p => p.stock_current <= p.stock_minimum);

  // DRE Simplificado Calculation
  const paidOrders = orders.filter(o => o.status === 'paid' && o.created_at.substring(0, 7) === currentMonthStr);
  const grossRevenue = paidOrders.reduce((sum, o) => sum + o.total_amount, 0);

  const paidOrderIds = new Set(paidOrders.map(o => o.id));
  const paidItems = orderItems.filter(item => paidOrderIds.has(item.order_id));

  const totalCMV = paidItems.reduce((sum, item) => {
    const prod = products.find(p => p.id === item.product_id);
    const unitCost = prod ? prod.cost_price : 0;
    return sum + (unitCost * item.quantity);
  }, 0);

  const grossProfit = grossRevenue - totalCMV;

  const monthExpenses = payables
    .filter(p => p.status === 'paid' && p.payment_date && p.payment_date.substring(0, 7) === currentMonthStr)
    .reduce((sum, p) => sum + p.amount, 0);

  const netOperatingProfit = grossProfit - monthExpenses;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* ── HEADER BANNER ────────────────────────────────────────────── */}
      <div className="border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs" style={{ backgroundColor: '#ffffff', borderColor: '#e8e2d8' }}>
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest block mb-1" style={{ color: '#c9a96e' }}>
            PAINEL COMERCIAL ERP
          </span>
          <h1 className="text-lg font-black uppercase tracking-tight" style={{ color: '#3d2b1f' }}>
            INDICADORES FINANCEIROS & ESTOQUE EM TEMPO REAL
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: '#8b7355' }}>
            Operação consolidada da loja e faturamento de atacado.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm" className="border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-bold rounded-full">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" style={{ color: '#c9a96e' }} /> ATUALIZAR
          </Button>
          <Link href="/admin/pdv">
            <Button size="sm" className="text-white font-bold text-xs uppercase rounded-full shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
              <Zap className="h-3.5 w-3.5 mr-1.5" /> NOVO PDV MÓVEL
            </Button>
          </Link>
        </div>
      </div>

      {/* ── BIG NUMBERS CARDS (4 COLS) ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <div className="flex items-center justify-between border-b pb-2 mb-2" style={{ borderColor: '#f0eae1' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8b7355' }}>VENDAS DO DIA</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black font-mono" style={{ color: '#3d2b1f' }}>{formatCurrency(salesToday)}</p>
          <span className="text-[10px] font-medium block mt-1" style={{ color: '#8b7355' }}>Mês: {formatCurrency(salesMonth)}</span>
        </div>

        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <div className="flex items-center justify-between border-b pb-2 mb-2" style={{ borderColor: '#f0eae1' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8b7355' }}>SALDO CONSOLIDADO BANCOS</span>
            <Landmark className="h-4 w-4" style={{ color: '#c9a96e' }} />
          </div>
          <p className="text-xl font-black font-mono" style={{ color: '#3d2b1f' }}>{formatCurrency(totalBankBalance)}</p>
          <span className="text-[10px] font-medium block mt-1" style={{ color: '#8b7355' }}>{bankAccounts.length} contas cadastradas</span>
        </div>

        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <div className="flex items-center justify-between border-b pb-2 mb-2" style={{ borderColor: '#f0eae1' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8b7355' }}>A PAGAR HOJE</span>
            <ArrowUpCircle className="h-4 w-4 text-red-600" />
          </div>
          <p className="text-xl font-black font-mono text-red-700">{formatCurrency(payablesToday)}</p>
          <span className="text-[10px] font-medium block mt-1" style={{ color: '#8b7355' }}>Vencimentos programados</span>
        </div>

        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <div className="flex items-center justify-between border-b pb-2 mb-2" style={{ borderColor: '#f0eae1' }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8b7355' }}>A RECEBER HOJE</span>
            <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black font-mono text-emerald-700">{formatCurrency(receivablesToday)}</p>
          <span className="text-[10px] font-medium block mt-1" style={{ color: '#8b7355' }}>Títulos a liquidar</span>
        </div>
      </div>

      {/* ── DRE SIMPLIFICADO & DEMONSTRATIVO FINANCEIRO ──────────────── */}
      <div className="bg-white border rounded-2xl p-6 space-y-4 shadow-xs" style={{ borderColor: '#e8e2d8' }}>
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: '#e8e2d8' }}>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider block" style={{ color: '#c9a96e' }}>ANÁLISE DE RESULTADO</span>
            <h2 className="text-sm font-black uppercase" style={{ color: '#3d2b1f' }}>DRE SIMPLIFICADO — MÊS VIGENTE</h2>
          </div>
          <Badge className="text-white border-none text-[10px] font-mono uppercase cursor-default" style={{ backgroundColor: '#c9a96e' }}>COMPETÊNCIA MENSAL</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-stone-100 border-b border-stone-300 text-[10px] font-bold uppercase text-stone-600">
                <th className="py-2.5 px-3">INDICADOR DE OPERAÇÃO</th>
                <th className="py-2.5 px-3 text-right">VALOR CONSOLIDADO</th>
                <th className="py-2.5 px-3">DESCRIÇÃO TÉCNICA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              <tr>
                <td className="py-2.5 px-3 font-bold uppercase text-stone-900">(+) RECEITA BRUTA DE VENDAS</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">{formatCurrency(grossRevenue)}</td>
                <td className="py-2.5 px-3 text-stone-500 text-[11px]">Total de vendas e pedidos pagos no período</td>
              </tr>
              <tr className="bg-stone-50">
                <td className="py-2.5 px-3 font-bold uppercase text-stone-900">(-) CMV (CUSTO MERCADORIAS VENDIDAS)</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">({formatCurrency(totalCMV)})</td>
                <td className="py-2.5 px-3 text-stone-500 text-[11px]">Custo de aquisição dos itens vendidos no estoque</td>
              </tr>
              <tr className="bg-stone-100 font-bold">
                <td className="py-2.5 px-3 font-black uppercase text-stone-900">(=) LUCRO BRUTO DA OPERAÇÃO</td>
                <td className="py-2.5 px-3 text-right font-mono font-black text-stone-900">{formatCurrency(grossProfit)}</td>
                <td className="py-2.5 px-3 text-stone-500 text-[11px]">Margem bruta acumulada</td>
              </tr>
              <tr className="bg-stone-50">
                <td className="py-2.5 px-3 font-bold uppercase text-stone-900">(-) DESPESAS OPERACIONAIS PAGAS</td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">({formatCurrency(monthExpenses)})</td>
                <td className="py-2.5 px-3 text-stone-500 text-[11px]">Contas a pagar quitadas no mês</td>
              </tr>
              <tr className="text-white font-bold" style={{ backgroundColor: '#3d2b1f' }}>
                <td className="py-3.5 px-3 font-black uppercase tracking-wider" style={{ color: '#c9a96e' }}>(=) LUCRO LÍQUIDO OPERACIONAL</td>
                <td className={`py-3.5 px-3 text-right font-mono font-black text-sm ${netOperatingProfit >= 0 ? 'text-[#c9a96e]' : 'text-red-400'}`}>{formatCurrency(netOperatingProfit)}</td>
                <td className="py-3.5 px-3 text-stone-300 text-[11px]">Resultado líquido final do período</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TABLES DENSE ROW: LOW STOCK & RECENT ORDERS ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Low Stock Alert Table (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-stone-300 rounded-[2px] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-[#e8590c]" /> ALERTAS DE ESTOQUE MÍNIMO ({lowStockProducts.length})
            </span>
            <Link href="/admin/produtos" className="text-[10px] font-bold text-[#e8590c] hover:underline uppercase">
              GESTÃO
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-500 font-mono">
              Todos os itens com nível de estoque adequado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100 border-b border-stone-200 text-[10px] font-bold uppercase text-stone-600">
                    <th className="py-2 px-2">SKU</th>
                    <th className="py-2 px-2">PRODUTO</th>
                    <th className="py-2 px-2 text-center">ATUAL</th>
                    <th className="py-2 px-2 text-center">MÍN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {lowStockProducts.map(p => (
                    <tr key={p.id} className="hover:bg-amber-500/5">
                      <td className="py-2 px-2 font-mono font-bold text-stone-800">{p.sku}</td>
                      <td className="py-2 px-2 truncate max-w-[140px] uppercase font-medium">{p.name}</td>
                      <td className="py-2 px-2 text-center font-mono font-black text-red-600">{p.stock_current}</td>
                      <td className="py-2 px-2 text-center font-mono text-stone-500">{p.stock_minimum}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Orders List Table (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-stone-300 rounded-[2px] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4 text-[#e8590c]" /> ÚLTIMAS VENDAS E PEDIDOS FATURADOS
            </span>
            <Link href="/admin/contas-receber" className="text-[10px] font-bold text-[#e8590c] hover:underline uppercase">
              VER TODAS
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100 border-b border-stone-200 text-[10px] font-bold uppercase text-stone-600">
                  <th className="py-2 px-2">CÓDIGO</th>
                  <th className="py-2 px-2">DATA</th>
                  <th className="py-2 px-2">PAGAMENTO</th>
                  <th className="py-2 px-2">STATUS</th>
                  <th className="py-2 px-2 text-right">VALOR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {orders.slice(0, 6).map(o => (
                  <tr key={o.id} className="hover:bg-amber-500/5 font-sans">
                    <td className="py-2 px-2 font-mono font-bold text-stone-900">#{o.id}</td>
                    <td className="py-2 px-2 font-mono text-stone-600">{formatDate(o.created_at)}</td>
                    <td className="py-2 px-2 font-bold uppercase text-stone-700">{o.payment_method}</td>
                    <td className="py-2 px-2">
                      <Badge className={`text-[9px] uppercase font-bold px-1.5 py-0 ${
                        o.status === 'paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-stone-100 text-stone-700'
                      }`}>
                        {o.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-stone-900">
                      {formatCurrency(o.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
