'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { Order, Client, OrderItem, Product } from '@/lib/database.types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import Link from 'next/link';
import {
  User,
  ShoppingBag,
  MapPin,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building2,
  Phone,
  Mail,
  ChevronRight,
  KeyRound,
  Lock,
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react';

export default function ClienteAreaPage() {
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Authentication State for Client
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('carlos@gmail.com');
  const [loginPassword, setLoginPassword] = useState('123456');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDoc, setRegDoc] = useState('');
  const [regPhone, setRegPhone] = useState('');

  const defaultCustomerId = 'cli-1';

  const loadData = async () => {
    setLoading(true);
    try {
      const [cls, ords, items, prods] = await Promise.all([
        dbService.getClients(),
        dbService.getOrders(),
        dbService.getOrderItems(),
        dbService.getProducts()
      ]);

      const foundClient = cls.find(c => c.id === defaultCustomerId);
      if (foundClient) {
        setClient(foundClient);
        setOrders(ords.filter(o => o.client_id === defaultCustomerId));
      }
      setOrderItems(items);
      setProducts(prods);
    } catch (e) {
      console.error(e);
      toast.add({ title: 'Erro de conexão', description: 'Não foi possível carregar dados da conta.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail) {
      toast.add({ title: 'E-mail obrigatório', description: 'Informe seu e-mail de acesso.', type: 'error' });
      return;
    }
    setIsLoggedIn(true);
    toast.add({ title: 'Login Efetuado', description: 'Bem-vindo à sua Conta Comercial.', type: 'success' });
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regDoc) {
      toast.add({ title: 'Campos Obrigatórios', description: 'Preencha Nome, E-mail e Documento.', type: 'error' });
      return;
    }
    try {
      const newClient = await dbService.createClient({
        profile_id: 'prof-1',
        type: regDoc.length > 14 ? 'pj' : 'pf',
        name: regName,
        document: regDoc,
        email: regEmail,
        phone: regPhone,
        addresses: []
      });
      setClient(newClient);
      setIsLoggedIn(true);
      toast.add({ title: 'Cadastro Concluído', description: 'Sua conta comercial foi criada.', type: 'success' });
    } catch (err) {
      toast.add({ title: 'Erro ao cadastrar', description: 'Não foi possível criar a conta.', type: 'error' });
    }
  };

  const handleRecoverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoverEmail) return;
    setIsRecoverModalOpen(false);
    toast.add({
      title: 'Link Enviado',
      description: `Instruções de redefinição enviadas para ${recoverEmail}.`,
      type: 'success'
    });
    setRecoverEmail('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center font-mono text-xs text-stone-600">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin border-2 border-[#e8590c] border-t-transparent" />
          <span>CARREGANDO PORTAL DO CLIENTE...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-stone-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 py-3.5 px-4 sm:px-6 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img 
              src="/logo.png" 
              alt="Prime Chaves Codificadas" 
              className="h-9 w-auto object-contain md:h-11"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs font-bold text-stone-600 hover:text-stone-900 uppercase">
              Catálogo de Peças
            </Link>
            <Link href="/admin" className="text-xs font-bold text-[#e8590c] hover:underline uppercase">
              Painel ERP
            </Link>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-stone-300 py-2.5 px-4 text-xs font-mono text-stone-600">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <Link href="/" className="hover:text-[#e8590c]">CATÁLOGO</Link>
          <ChevronRight className="h-3 w-3 text-stone-400" />
          <span className="font-bold text-stone-900 uppercase">PORTAL DO CLIENTE</span>
        </div>
      </div>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto w-full px-4 py-8 flex-1">
        {!isLoggedIn ? (
          /* LOGIN / REGISTRATION FORM */
          <div className="max-w-md mx-auto bg-white border border-stone-300 rounded-[2px] overflow-hidden shadow-xs">
            {/* Tabs Header */}
            <div className="flex border-b border-stone-300 bg-stone-100 text-xs font-bold uppercase">
              <button
                type="button"
                onClick={() => setAuthTab('login')}
                className={`flex-1 py-3 text-center cursor-pointer ${
                  authTab === 'login' ? 'bg-white text-[#e8590c] border-b-2 border-[#e8590c]' : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                ENTRAR NA CONTA
              </button>
              <button
                type="button"
                onClick={() => setAuthTab('register')}
                className={`flex-1 py-3 text-center cursor-pointer ${
                  authTab === 'register' ? 'bg-white text-[#e8590c] border-b-2 border-[#e8590c]' : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                CRIAR CADASTRO
              </button>
            </div>

            <div className="p-6">
              {authTab === 'login' ? (
                /* LOGIN FORM */
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase text-stone-700">E-mail Cadastrado *</label>
                    <Input
                      type="email"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="carlos@gmail.com"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="block text-[11px] font-bold uppercase text-stone-700">Senha *</label>
                      <button
                        type="button"
                        onClick={() => setIsRecoverModalOpen(true)}
                        className="text-[10px] text-[#e8590c] hover:underline font-bold uppercase"
                      >
                        ESQUECEU A SENHA?
                      </button>
                    </div>
                    <Input
                      type="password"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full bg-[#e8590c] hover:bg-[#d9480f] text-white font-bold text-xs uppercase">
                    ACESSAR PORTAL DO CLIENTE
                  </Button>
                </form>
              ) : (
                /* REGISTER FORM */
                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase text-stone-700">Nome Completo / Razão Social *</label>
                    <Input
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      placeholder="Ex: Carlos Silva"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase text-stone-700">E-mail Comercial *</label>
                    <Input
                      type="email"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="carlos@email.com"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-stone-700">CPF ou CNPJ *</label>
                      <Input
                        value={regDoc}
                        onChange={e => setRegDoc(e.target.value)}
                        placeholder="000.000.000-00"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase text-stone-700">WhatsApp *</label>
                      <Input
                        value={regPhone}
                        onChange={e => setRegPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-[#e8590c] hover:bg-[#d9480f] text-white font-bold text-xs uppercase mt-2">
                    CRIAR MINHA CONTA DE CLIENTE
                  </Button>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* LOGGED IN CUSTOMER DASHBOARD */
          <div className="space-y-6">
            {/* Customer Info Card Header */}
            {client && (
              <div className="bg-white border border-stone-300 p-6 rounded-[2px] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 text-white font-black text-base rounded-xl flex items-center justify-center font-sans shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-base font-black text-stone-900 uppercase">{client.name}</h1>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] uppercase font-bold">
                        {client.type === 'pf' ? 'PESSOA FÍSICA' : 'PESSOA JURÍDICA'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-stone-500 mt-1">
                      <span>DOC: {client.document}</span>
                      <span>TEL: {client.phone || '-'}</span>
                      <span>EMAIL: {client.email || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={loadData}
                    size="sm"
                    className="border-stone-300 text-stone-700 text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Atualizar Pedidos
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsLoggedIn(false)}
                    size="sm"
                    className="border-stone-300 text-red-600 hover:bg-red-50 text-xs uppercase"
                  >
                    Sair
                  </Button>
                </div>
              </div>
            )}

            {/* Orders List Table */}
            <div className="bg-white border border-stone-300 rounded-[2px] overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-300 flex items-center justify-between bg-stone-100">
                <span className="text-xs font-black uppercase tracking-wider text-stone-900 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-[#e8590c]" /> HISTÓRICO DE PEDIDOS DE PEÇAS ({orders.length})
                </span>
              </div>

              {orders.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500 font-mono">
                  Nenhum pedido efetuado até o momento.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-stone-100 border-b border-stone-300 text-[10px] font-bold uppercase text-stone-600">
                        <th className="py-2.5 px-4">CÓDIGO PEDIDO</th>
                        <th className="py-2.5 px-4">DATA FATURAMENTO</th>
                        <th className="py-2.5 px-4">FORMA PAGAMENTO</th>
                        <th className="py-2.5 px-4">STATUS</th>
                        <th className="py-2.5 px-4 text-right">VALOR TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {orders.map(order => (
                        <tr key={order.id} className="hover:bg-amber-500/5 font-sans">
                          <td className="py-3 px-4 font-mono font-bold text-stone-900">
                            #{order.id}
                          </td>
                          <td className="py-3 px-4 text-stone-600 font-mono">
                            {formatDate(order.created_at)}
                          </td>
                          <td className="py-3 px-4 font-bold uppercase text-stone-700">
                            {order.payment_method}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={`text-[9px] uppercase font-bold px-2 py-0.5 ${
                              order.status === 'paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                              order.status === 'waiting_payment' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                              'bg-stone-100 text-stone-700 border-stone-300'
                            }`}>
                              {order.status === 'paid' ? 'PAGO & SEPARADO' :
                               order.status === 'waiting_payment' ? 'AGUARDANDO PAGAMENTO' : order.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-stone-900 text-sm">
                            {formatCurrency(order.total_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* PASSWORD RECOVERY MODAL */}
      <Dialog open={isRecoverModalOpen} onOpenChange={setIsRecoverModalOpen}>
        <DialogContent className="max-w-[440px] w-full p-0 gap-0 rounded-[2px] bg-white border border-stone-300 shadow-xl flex flex-col">
          <div className="px-6 py-4 border-b border-stone-300 shrink-0">
            <DialogTitle className="text-sm font-semibold text-stone-900 uppercase">REDEFINIÇÃO DE SENHA COMERCIAL</DialogTitle>
            <DialogDescription className="text-xs text-stone-500 mt-0.5">
              Digite seu e-mail cadastrado para receber as instruções de recuperação.
            </DialogDescription>
          </div>

          <form onSubmit={handleRecoverSubmit} className="flex flex-col">
            <div className="px-6 py-5 space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-stone-700 uppercase">E-mail do Cadastro *</label>
                <Input
                  type="email"
                  placeholder="seuemail@chaveiro.com.br"
                  value={recoverEmail}
                  onChange={e => setRecoverEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t border-stone-300 flex justify-between items-center bg-stone-50">
              <Button type="button" variant="outline" onClick={() => setIsRecoverModalOpen(false)} className="border-stone-300 text-xs">
                CANCELAR
              </Button>
              <Button type="submit" className="bg-[#e8590c] hover:bg-[#d9480f] text-white font-bold text-xs uppercase">
                ENVIAR LINK DE RECUPERAÇÃO
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
