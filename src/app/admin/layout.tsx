'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  Landmark,
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  ShoppingBag,
  Menu,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Search,
  Bell,
  Lock,
  KeyRound,
  KanbanSquare,
  Smartphone,
  ShieldCheck,
  Building2,
  Image,
  BarChart3,
  Compass
} from 'lucide-react';

interface NavGroup {
  group: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, login, logout, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Grouped Navigation Items
  const navGroups: NavGroup[] = [
    {
      group: 'VENDAS & MARKETING',
      items: [
        { href: '/admin', label: 'Dashboard Comercial', icon: LayoutDashboard },
        { href: '/admin/crm', label: 'CRM — Funil de Vendas', icon: KanbanSquare },
        { href: '/admin/prospeccao', label: 'Prospecção (Chaveiros.net)', icon: Compass },
        { href: '/admin/pdv', label: 'PDV Móvel (Caixa)', icon: Smartphone },
        { href: '/admin/banner', label: 'Banner Promocional', icon: Image }
      ]
    },
    {
      group: 'ESTOQUE',
      items: [
        { href: '/admin/produtos', label: 'Produtos & Peças', icon: Package }
      ]
    },
    {
      group: 'FINANCEIRO',
      items: [
        { href: '/admin/contas-bancarias', label: 'Contas Bancárias', icon: Landmark },
        { href: '/admin/contas-pagar', label: 'Contas a Pagar', icon: ArrowUpCircle },
        { href: '/admin/contas-receber', label: 'Contas a Receber', icon: ArrowDownCircle },
        { href: '/admin/fluxo-caixa', label: 'Fluxo de Caixa', icon: DollarSign },
        { href: '/admin/acertos', label: 'Acertos de Viagem', icon: ShieldCheck }
      ]
    },
    {
      group: 'RELATÓRIOS',
      items: [
        { href: '/admin/relatorios', label: 'Relatórios Gerenciais', icon: BarChart3 }
      ]
    },
    {
      group: 'CADASTROS',
      items: [
        { href: '/admin/clientes', label: 'Clientes (PF / PJ)', icon: Users },
        { href: '/admin/fornecedores', label: 'Fornecedores', icon: Truck }
      ]
    }
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await login(email, password, 'admin');
    setIsSubmitting(false);

    if (result.success) {
      toast.add({
        title: 'Acesso Autorizado',
        description: 'Bem-vindo ao Sistema ERP PRIME AUTOMOTIVE',
        type: 'success'
      });
      router.push('/admin');
    } else {
      toast.add({
        title: 'Acesso Negado',
        description: result.error || 'Verifique suas credenciais.',
        type: 'error'
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.add({
      title: 'Sessão Encerrada',
      description: 'Logout realizado com sucesso.',
      type: 'info'
    });
    router.push('/admin');
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center font-mono" style={{ backgroundColor: '#faf8f5', color: '#3d2b1f' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin border-2 border-t-transparent rounded-full" style={{ borderColor: '#c9a96e', borderTopColor: 'transparent' }} />
          <p className="text-xs uppercase tracking-widest font-bold">Carregando ERP PRIME AUTOMOTIVE...</p>
        </div>
      </div>
    );
  }

  // Auth Gate
  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 font-sans" style={{ backgroundColor: '#faf8f5', color: '#3d2b1f' }}>
        <div className="w-full max-w-md border bg-white p-8 shadow-md rounded-2xl" style={{ borderColor: '#e8e2d8' }}>
          <div className="flex flex-col items-center mb-8 border-b pb-6" style={{ borderColor: '#e8e2d8' }}>
            <div className="flex items-center justify-center mb-2">
              <img 
                src="/logo.png" 
                alt="Prime Chaves Codificadas" 
                className="h-12 w-auto object-contain"
              />
            </div>
            <h1 className="text-xs font-bold tracking-widest uppercase mt-2" style={{ color: '#8b7355' }}>AUTENTICAÇÃO ERP DE GESTÃO</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-wider" style={{ color: '#8b7355' }}>
                E-mail do Administrador
              </label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@chaveiroauto.com.br"
                  className="pl-9 bg-stone-50 border text-xs h-11 rounded-xl"
                  style={{ borderColor: '#e8e2d8', color: '#3d2b1f' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#8b7355' }} />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-wider" style={{ color: '#8b7355' }}>
                Senha de Acesso
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 bg-stone-50 border text-xs h-11 rounded-xl"
                  style={{ borderColor: '#e8e2d8', color: '#3d2b1f' }}
                  required
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#8b7355' }} />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full text-white font-bold tracking-wider uppercase h-11 rounded-full transition-all mt-2 text-xs shadow-xs"
              style={{ backgroundColor: '#c9a96e' }}
            >
              {isSubmitting ? 'VERIFICANDO...' : 'ACESSAR PAINEL ERP'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t text-center" style={{ borderColor: '#e8e2d8' }}>
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold hover:underline transition uppercase tracking-wider" style={{ color: '#c9a96e' }}>
              <ShoppingBag className="h-4 w-4" />
              Ir para a Loja Virtual
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Active ERP Shell
  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans" style={{ backgroundColor: '#faf8f5', color: '#3d2b1f' }}>
      
      {/* 1. SIDEBAR FIXED (ESPRESSO #3D2B1F) */}
      <aside
        className={`hidden md:flex flex-col border-r transition-all duration-200 z-30 shrink-0 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
        style={{ backgroundColor: '#3d2b1f', borderColor: 'rgba(255,255,255,0.1)' }}
      >
        {/* Header Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#332318' }}>
          {!sidebarCollapsed && (
            <Link href="/admin" className="flex items-center">
              <img 
                src="/logo-white.png" 
                alt="Prime Chaves Codificadas" 
                className="h-8 w-auto object-contain" 
              />
            </Link>
          )}
          {sidebarCollapsed && (
            <div 
              className="h-8 w-8 rounded-lg grid place-items-center text-white mx-auto font-black text-xs relative overflow-hidden" 
              style={{ backgroundColor: '#e8590c' }}
            >
              PR
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-300 transition cursor-pointer"
            title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Grouped Navigation Links */}
        <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto font-sans">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1.5">
              {!sidebarCollapsed && (
                <div className="px-2 text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#a39281' }}>
                  {group.group}
                </div>
              )}
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                const IconComponent = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      isActive
                        ? 'text-white font-extrabold shadow-xs'
                        : 'text-stone-300 hover:bg-white/10 hover:text-white'
                    }`}
                    style={isActive ? { backgroundColor: '#c9a96e' } : {}}
                  >
                    <IconComponent className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-stone-300'}`} />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-3 border-t space-y-1.5" style={{ backgroundColor: '#332318', borderColor: 'rgba(255,255,255,0.1)' }}>
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-stone-300 hover:bg-white/10 hover:text-white transition uppercase tracking-wider"
          >
            <ShoppingBag className="h-4 w-4 text-amber-400" />
            {!sidebarCollapsed && <span>Ver Loja</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-300 hover:bg-red-950/40 transition cursor-pointer uppercase tracking-wider"
          >
            <LogOut className="h-4 w-4" />
            {!sidebarCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-xs">
          <aside className="w-64 bg-[#1a1a1a] h-full flex flex-col p-4 text-stone-100 border-r border-stone-800">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#e8590c] text-white rounded-[2px]">
                  <Building2 className="h-4 w-4" />
                </div>
                <span className="font-black text-sm tracking-wider text-white uppercase">PRIME AUTOMOTIVE</span>
              </div>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1 text-stone-400 hover:text-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 py-4 space-y-4 overflow-y-auto">
              {navGroups.map((group) => (
                <div key={group.group} className="space-y-1">
                  <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest px-2 mb-1">
                    {group.group}
                  </div>
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                    const IconComponent = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileSidebarOpen(false)}
                        className={`flex items-center gap-3 px-2.5 py-2 rounded-[2px] text-xs font-semibold uppercase tracking-wider transition-all ${
                          isActive
                            ? 'bg-[#e8590c] text-white'
                            : 'text-stone-300 hover:bg-stone-800'
                        }`}
                      >
                        <IconComponent className="h-4 w-4 text-stone-400" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="border-t border-stone-800 pt-4 space-y-1">
              <Link
                href="/"
                className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-bold text-stone-400 hover:text-white uppercase"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Ver Loja</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-bold text-red-400 hover:text-red-300 uppercase cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </button>
            </div>
          </aside>
          <div className="flex-1" onClick={() => setMobileSidebarOpen(false)} />
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#faf8f5' }}>
        {/* TOPBAR */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-6 shrink-0 backdrop-blur-md" style={{ borderColor: '#e8e2d8' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 text-stone-600 hover:bg-stone-100 rounded-xl md:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Global Search Bar */}
            <div className="hidden sm:flex items-center gap-2.5 bg-white border rounded-full px-3.5 py-1.5 w-64 md:w-80 shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
              <Search className="h-4 w-4 shrink-0" style={{ color: '#8b7355' }} />
              <input
                type="text"
                placeholder="Busca global no ERP (SKU, Cliente, Pedido)..."
                className="bg-transparent border-none text-xs outline-none text-stone-900 placeholder:text-stone-400 w-full font-medium"
              />
            </div>
          </div>

          {/* Topbar Right Actions */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border-r pr-4" style={{ borderColor: '#e8e2d8' }}>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8b7355' }}>SISTEMA ONLINE</span>
            </div>

            {/* User Badge */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right hidden sm:flex leading-tight">
                <span className="text-xs font-bold uppercase" style={{ color: '#3d2b1f' }}>{user.name}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#c9a96e' }}>GESTOR ERP</span>
              </div>
              <div className="h-9 w-9 text-white font-extrabold text-xs rounded-xl flex items-center justify-center shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
                {user.name ? user.name.substring(0, 2).toUpperCase() : 'AD'}
              </div>
            </div>
          </div>
        </header>

        {/* DENSE CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6" style={{ backgroundColor: '#faf8f5' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

