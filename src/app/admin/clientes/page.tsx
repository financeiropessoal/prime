'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { CrmLead, Client, Order, AccountReceivable } from '@/lib/database.types';
import { formatCurrency, formatDocument, formatPhone, validateCPF, validateCNPJ, cleanDocument } from '@/lib/formatters';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  Plus,
  Search,
  Trash2,
  Edit,
  MapPin,
  ClipboardList,
  Mail,
  Phone,
  FileText,
  DollarSign,
  ShoppingBag,
  RefreshCw,
  Building2,
  CheckCircle2
} from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const clientFormSchema = z.object({
  type: z.enum(['pf', 'pj']),
  name: z.string().min(1, 'Nome / Razão Social é obrigatório'),
  document: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().optional().or(z.literal('')),
  addresses: z.array(z.object({
    street: z.string().optional().or(z.literal('')),
    number: z.string().optional().or(z.literal('')),
    complement: z.string().optional().nullable(),
    neighborhood: z.string().optional().or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
    state: z.string().optional().or(z.literal('')),
    zip_code: z.string().optional().or(z.literal('')),
    is_default: z.boolean().default(false)
  })).default([])
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function ClientesAdminPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileClient, setProfileClient] = useState<Client | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors }
  } = useForm<any>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      type: 'pf',
      name: '',
      document: '',
      phone: '',
      email: '',
      addresses: [{
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: 'SP',
        zip_code: '',
        is_default: true
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'addresses'
  });

  const watchType = watch('type');
  const watchState = watch('addresses.0.state') || 'SP';
  const [customCities, setCustomCities] = useState<string[]>([]);

  const BR_STATES_CITIES: Record<string, string[]> = {
    SP: ['Campinas', 'Sorocaba', 'São Paulo', 'Santos', 'São José dos Campos', 'São José do Rio Preto', 'Ribeirão Preto', 'Barretos', 'Guarulhos', 'São Bernardo do Campo', 'Santo André', 'Osasco', 'Mogi das Cruzes', 'Jundiaí', 'Piracicaba', 'Bauru', 'Franca', 'Araraquara', 'Presidente Prudente', 'Marília'],
    GO: ['Goiânia', 'Anápolis', 'Aparecida de Goiânia', 'Rio Verde', 'Itumbiara', 'Catalão', 'Jataí', 'Formosa'],
    DF: ['Brasília', 'Taguatinga', 'Ceilândia', 'Samambaia', 'Guará', 'Águas Claras', 'Sobradinho'],
    MG: ['Belo Horizonte', 'Uberaba', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros', 'Ribeirão das Neves', 'Governador Valadares', 'Ipatinga'],
    RJ: ['Rio de Janeiro', 'Niterói', 'Duque de Caxias', 'São Gonçalo', 'Nova Iguaçu', 'Belford Roxo', 'Campos dos Goytaxazes', 'Petrópolis', 'Volta Redonda'],
    PR: ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'São José dos Pinhais', 'Foz do Iguaçu'],
    SC: ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Chapecó', 'Criciúma', 'Itajaí'],
    RS: ['Porto Alegre', 'Caxias do Sul', 'Canoas', 'Pelotas', 'Santa Maria', 'Gravataí', 'Novo Hamburgo'],
    BA: ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Itabuna', 'Juazeiro'],
    PE: ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina', 'Paulista'],
    CE: ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral'],
    AM: ['Manaus', 'Parintins', 'Itacoatiara'],
    PA: ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Castanhal'],
    MT: ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Sorriso'],
    MS: ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá'],
    ES: ['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Linhares'],
    AL: ['Maceió', 'Arapiraca', 'Rio Largo'],
    AP: ['Macapá', 'Santana'],
    MA: ['São Luís', 'Imperatriz', 'Timon', 'Caxias'],
    PB: ['João Pessoa', 'Campina Grande', 'Santa Rita'],
    PI: ['Teresina', 'Parnaíba', 'Picos'],
    RN: ['Natal', 'Mossoró', 'Parnamirim'],
    RO: ['Porto Velho', 'Ji-Paraná', 'Ariquemes'],
    RR: ['Boa Vista'],
    SE: ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto'],
    TO: ['Palmas', 'Araguaína', 'Gurupi'],
    AC: ['Rio Branco', 'Cruzeiro do Sul']
  };

  const handleCepSearch = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const info = await res.json();
        if (!info.erro) {
          setValue('addresses.0.street', info.logradouro || '');
          setValue('addresses.0.neighborhood', info.bairro || '');
          setValue('addresses.0.state', info.uf || '');
          
          const uf = info.uf || '';
          const city = info.localidade || '';
          
          const predefined = BR_STATES_CITIES[uf] || [];
          if (!predefined.includes(city)) {
            setCustomCities(prev => {
              if (!prev.includes(city)) {
                return [...prev, city];
              }
              return prev;
            });
          }
          
          setValue('addresses.0.city', city);
          toast.add({ title: 'CEP Encontrado', description: `${info.localidade} - ${info.uf}`, type: 'success' });
        } else {
          toast.add({ title: 'CEP Não Encontrado', description: 'Confira o CEP informado.', type: 'warning' });
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [cls, ords, recs] = await Promise.all([
        dbService.getClients(),
        dbService.getOrders(),
        dbService.getAccountsReceivable()
      ]);
      setClients(cls);
      setOrders(ords);
      setReceivables(recs);
    } catch (e) {
      console.error(e);
      toast.add({ title: 'Erro de Conexão', description: 'Não foi possível carregar os clientes.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateForm = () => {
    setEditingClient(null);
    reset({
      type: 'pf',
      name: '',
      document: '',
      phone: '',
      email: '',
      addresses: [{
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: 'SP',
        zip_code: '',
        is_default: true
      }]
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (client: Client) => {
    setEditingClient(client);
    reset({
      type: client.type,
      name: client.name,
      document: client.document,
      phone: client.phone || '',
      email: client.email || '',
      addresses: client.addresses || []
    });
    setIsFormOpen(true);
  };

  const onFormSubmit = async (data: any) => {
    try {
      if (editingClient) {
        await dbService.updateClient(editingClient.id, data);
        toast.add({ title: 'Cliente Atualizado', description: `Dados de ${data.name} atualizados.`, type: 'success' });
      } else {
        await dbService.createClient({ profile_id: 'prof-1', ...data });
        toast.add({ title: 'Cliente Cadastrado', description: `Cliente ${data.name} criado.`, type: 'success' });
      }
      setIsFormOpen(false);
      loadData();
    } catch (e: any) {
      toast.add({ title: 'Erro ao Salvar', description: e.message || 'Falha ao salvar cliente.', type: 'error' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingClient) return;
    try {
      await dbService.deleteClient(deletingClient.id);
      toast.add({ title: 'Cliente Excluído', description: 'Registro removido permanentemente.', type: 'success' });
      setIsDeleteOpen(false);
      loadData();
    } catch (e) {
      toast.add({ title: 'Erro ao Excluir', description: 'Não foi possível excluir o cliente.', type: 'error' });
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.document.includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone && c.phone.includes(search));

    const matchesType = typeFilter === 'all' || c.type === typeFilter;

    return matchesSearch && matchesType;
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
            CLIENTES, CHAVEIROS & EMPRESAS PARCEIRAS
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: '#8b7355' }}>
            Total de {clients.length} clientes cadastrados na base do ERP.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleOpenCreateForm}
            size="sm"
            className="font-bold text-xs uppercase px-5 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95"
            style={{ backgroundColor: '#c9a96e', color: '#3d2b1f' }}
          >
            <Plus className="h-4 w-4 mr-1.5 text-[#3d2b1f]" /> CADASTRAR NOVO CLIENTE
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#8b7355' }}>TOTAL CLIENTES</span>
          <p className="text-2xl font-black font-mono mt-1" style={{ color: '#3d2b1f' }}>{clients.length}</p>
        </div>
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#8b7355' }}>PESSOAS FÍSICAS (PF)</span>
          <p className="text-2xl font-black font-mono mt-1" style={{ color: '#3d2b1f' }}>{clients.filter(c => c.type === 'pf').length}</p>
        </div>
        <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: '#8b7355' }}>PESSOAS JURÍDICAS / CHAVEIROS (PJ)</span>
          <p className="text-2xl font-black font-mono mt-1" style={{ color: '#3d2b1f' }}>{clients.filter(c => c.type === 'pj').length}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-stone-300 p-4 rounded-[2px]">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Buscar por nome, CPF/CNPJ, e-mail ou telefone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="h-10 px-3 bg-white border border-stone-300 rounded-[2px] text-xs text-stone-800 font-bold uppercase cursor-pointer"
          >
            <option value="all">Todos os Tipos (PF / PJ)</option>
            <option value="pf">Pessoa Física (CPF)</option>
            <option value="pj">Pessoa Jurídica (CNPJ)</option>
          </select>
        </div>
      </div>

      {/* Table of Clients */}
      <div className="bg-white border border-stone-300 rounded-[2px] overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>TIPO</TableHead>
                <TableHead>NOME / RAZÃO SOCIAL</TableHead>
                <TableHead>DOCUMENTO (CPF/CNPJ)</TableHead>
                <TableHead>TELEFONE / WHATSAPP</TableHead>
                <TableHead>E-MAIL</TableHead>
                <TableHead>CIDADE / UF</TableHead>
                <TableHead className="text-center">AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 font-mono text-stone-500 text-xs">
                    Carregando base de clientes...
                  </TableCell>
                </TableRow>
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-stone-500 font-mono text-xs">
                    Nenhum cliente encontrado com os critérios digitados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map(client => {
                  const defaultAddress = client.addresses?.[0];

                  return (
                    <TableRow key={client.id} className="hover:bg-amber-500/5 font-sans">
                      <TableCell>
                        <Badge className={`text-[9px] font-bold uppercase px-1.5 py-0 ${
                          client.type === 'pf' ? 'bg-stone-100 text-stone-800 border-stone-300' : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                          {client.type === 'pf' ? 'PF' : 'PJ'}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-bold text-stone-900 uppercase">
                        {client.name}
                      </TableCell>

                      <TableCell className="font-mono text-stone-800 font-bold">
                        {formatDocument(client.document)}
                      </TableCell>

                      <TableCell className="font-mono text-stone-700">
                        {formatPhone(client.phone || '')}
                      </TableCell>

                      <TableCell className="text-stone-600">
                        {client.email || '-'}
                      </TableCell>

                      <TableCell className="uppercase text-stone-700">
                        {defaultAddress ? `${defaultAddress.city} / ${defaultAddress.state}` : '-'}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => { setProfileClient(client); setIsProfileOpen(true); }}
                            className="border-stone-300 text-stone-800 text-[10px] uppercase font-bold"
                          >
                            FICHA
                          </Button>
                          <Button size="icon-xs" variant="ghost" onClick={() => handleOpenEditForm(client)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon-xs" variant="ghost" onClick={() => { setDeletingClient(client); setIsDeleteOpen(true); }} className="text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── EDIT / CREATE CLIENT DIALOG ────────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-6 py-4 border-b shrink-0 bg-white flex items-center gap-3" style={{ borderColor: '#e8e2d8' }}>
            <div className="h-10 w-10 rounded-xl grid place-items-center text-white shrink-0 shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
              <Users className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black uppercase tracking-tight" style={{ color: '#3d2b1f' }}>
                {editingClient ? 'EDITAR DADOS DO CLIENTE' : 'CADASTRAR NOVO CLIENTE / CHAVEIRO'}
              </DialogTitle>
              <DialogDescription className="text-xs font-medium mt-0.5" style={{ color: '#8b7355' }}>
                Informe os dados cadastrais completos e endereços de entrega.
              </DialogDescription>
            </div>
          </div>

          <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col">
            <div className="px-6 py-6 space-y-6 max-h-[75vh] overflow-y-auto font-sans" style={{ backgroundColor: '#faf8f5' }}>

              {/* TIPO DE CADASTRO */}
              <div className="space-y-1 bg-white p-4 rounded-xl border shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>TIPO DE CADASTRO</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setValue('type', 'pf')}
                    className={`h-11 border rounded-xl font-bold text-xs uppercase cursor-pointer transition ${
                      watchType === 'pf' ? 'text-white border-transparent shadow-xs' : 'bg-white text-stone-700 border-stone-300'
                    }`}
                    style={watchType === 'pf' ? { backgroundColor: '#3d2b1f' } : {}}
                  >
                    PESSOA FÍSICA (CPF)
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('type', 'pj')}
                    className={`h-11 border rounded-xl font-bold text-xs uppercase cursor-pointer transition ${
                      watchType === 'pj' ? 'text-white border-transparent shadow-xs' : 'bg-white text-stone-700 border-stone-300'
                    }`}
                    style={watchType === 'pj' ? { backgroundColor: '#3d2b1f' } : {}}
                  >
                    PESSOA JURÍDICA (CNPJ)
                  </button>
                </div>
              </div>

              {/* DADOS CADASTRAIS */}
              <div className="space-y-4 bg-white p-6 rounded-2xl border shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                <span className="text-xs font-black uppercase tracking-wider block border-b pb-2" style={{ color: '#3d2b1f', borderColor: '#e8e2d8' }}>
                  1. DADOS CADASTRAIS PRINCIPAIS
                </span>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>
                      {watchType === 'pf' ? 'Nome Completo' : 'Razão Social'} <span className="text-red-600">*</span>
                    </label>
                    <Input {...register('name')} placeholder="Nome ou Razão Social" className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                    {errors.name && <p className="text-[10px] text-red-600 font-mono mt-0.5">{errors.name.message?.toString()}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>
                      {watchType === 'pf' ? 'CPF' : 'CNPJ'}
                    </label>
                    <Input {...register('document')} placeholder={watchType === 'pf' ? '000.000.000-00' : '00.000.000/0001-00'} className="font-mono h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Telefone / WhatsApp</label>
                    <Input {...register('phone')} placeholder="(00) 00000-0000" className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>E-mail Principal</label>
                    <Input {...register('email')} placeholder="cliente@email.com" className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                  </div>
                </div>
              </div>

              {/* ENDEREÇO DE ENTREGA */}
              <div className="space-y-4 bg-white p-6 rounded-2xl border shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                <span className="text-xs font-black uppercase tracking-wider block border-b pb-2" style={{ color: '#3d2b1f', borderColor: '#e8e2d8' }}>
                  2. ENDEREÇO DE ENTREGA PRINCIPAL
                </span>

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-4 space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>CEP (Auto-preencher)</label>
                    <Input 
                      {...register('addresses.0.zip_code' as const)} 
                      placeholder="00000-000" 
                      className="font-mono h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" 
                      onBlur={(e) => handleCepSearch(e.target.value)}
                    />
                  </div>
                  <div className="col-span-8 space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Rua / Logradouro</label>
                    <Input {...register('addresses.0.street' as const)} placeholder="Rua..." className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-3 space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Número</label>
                    <Input {...register('addresses.0.number' as const)} placeholder="Nº" className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                  </div>
                  <div className="col-span-4 space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Bairro</label>
                    <Input {...register('addresses.0.neighborhood' as const)} placeholder="Bairro" className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>UF</label>
                    <select
                      {...register('addresses.0.state' as const)}
                      onChange={e => {
                        const uf = e.target.value;
                        setValue('addresses.0.state', uf);
                        const cities = BR_STATES_CITIES[uf] || [];
                        if (cities.length > 0) {
                          setValue('addresses.0.city', cities[0]);
                        }
                      }}
                      className="w-full h-11 px-3 bg-stone-50/50 border border-stone-200 rounded-xl text-[11px] font-semibold uppercase text-stone-850 cursor-pointer outline-none focus:ring-1 focus:ring-amber-500/20"
                    >
                      {Object.keys(BR_STATES_CITIES).map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Cidade</label>
                    <select
                      {...register('addresses.0.city' as const)}
                      className="w-full h-11 px-2 bg-stone-50/50 border border-stone-200 rounded-xl text-[11px] font-semibold uppercase text-stone-850 cursor-pointer outline-none focus:ring-1 focus:ring-amber-500/20"
                    >
                      {(() => {
                        const predefined = BR_STATES_CITIES[watchState] || [];
                        const merged = Array.from(new Set([...predefined, ...customCities]));
                        return merged.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ));
                      })()}
                    </select>
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
                SALVAR CLIENTE
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* PROFILE FICHA DO CLIENTE DIALOG */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-2xl w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-6 py-4 border-b bg-white shrink-0 flex items-center gap-3" style={{ borderColor: '#e8e2d8' }}>
            <div className="h-9 w-9 rounded-xl grid place-items-center text-white shrink-0 shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
              <Building2 className="h-4 w-4" />
            </div>
            <DialogTitle className="text-sm font-black uppercase" style={{ color: '#3d2b1f' }}>FICHA CADASTRAL DO CLIENTE</DialogTitle>
          </div>

          {profileClient && (
            <div className="p-6 space-y-4 text-xs font-sans" style={{ backgroundColor: '#faf8f5' }}>
              <div className="p-4 bg-white border rounded-xl space-y-1 shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                <span className="font-bold uppercase text-sm block" style={{ color: '#3d2b1f' }}>{profileClient.name}</span>
                <span className="font-mono block" style={{ color: '#c9a96e' }}>DOCUMENTO: {formatDocument(profileClient.document)}</span>
                <span className="block" style={{ color: '#8b7355' }}>E-MAIL: {profileClient.email || '-'} | CONTATO: {formatPhone(profileClient.phone || '')}</span>
              </div>

              <div className="space-y-2">
                <span className="font-bold uppercase block text-[11px]" style={{ color: '#8b7355' }}>ENDEREÇO CADASTRADO:</span>
                {profileClient.addresses && profileClient.addresses.length > 0 ? (
                  profileClient.addresses.map((addr, i) => (
                    <div key={i} className="p-3 border rounded-xl bg-white shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                      <p className="font-semibold text-stone-900">{addr.street}, Nº {addr.number} {addr.complement ? `- ${addr.complement}` : ''}</p>
                      <p className="font-mono text-[11px]" style={{ color: '#8b7355' }}>{addr.neighborhood} — {addr.city} / {addr.state} (CEP: {addr.zip_code})</p>
                    </div>
                  ))
                ) : (
                  <p className="text-stone-500 italic">Sem endereço cadastrado.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md w-full p-6 rounded-2xl bg-white border shadow-2xl" style={{ borderColor: '#e8e2d8' }}>
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-red-600">CONFIRMAR EXCLUSÃO DO CLIENTE?</DialogTitle>
          </DialogHeader>

          {deletingClient && (
            <div className="space-y-4 pt-2 text-xs">
              <p className="text-stone-600">Tem certeza que deseja remover <strong>{deletingClient.name}</strong> da base?</p>
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
