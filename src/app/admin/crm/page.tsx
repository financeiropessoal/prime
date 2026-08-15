'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { CrmLead, CrmStage } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from '@hello-pangea/dnd';
import {
  Plus,
  Search,
  MapPin,
  Phone,
  MessageSquare,
  Users,
  Calendar,
  Navigation,
  Percent,
  CheckCircle2,
  ListTodo,
  Trash2,
  Edit,
  RefreshCw,
  Building2
} from 'lucide-react';

interface StageColumn {
  id: CrmStage;
  title: string;
  badgeBg: string;
}

const STAGES: StageColumn[] = [
  { id: 'novo_lead', title: 'NOVO LEAD', badgeBg: 'bg-stone-100 text-stone-700' },
  { id: 'contato_feito', title: 'CONTATO FEITO', badgeBg: 'bg-blue-50 text-blue-800' },
  { id: 'negociacao', title: 'NEGOCIAÇÃO', badgeBg: 'bg-amber-50 text-amber-900' },
  { id: 'aguardando_retorno', title: 'AGUARDANDO RETORNO', badgeBg: 'bg-purple-50 text-purple-900' },
  { id: 'cliente', title: 'CLIENTE CONVERTIDO', badgeBg: 'bg-emerald-50 text-emerald-800' },
  { id: 'pedido', title: 'PEDIDO FATURADO', badgeBg: 'bg-orange-50 text-orange-900' }
];

export default function CrmPage() {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [isMounted, setIsMounted] = useState(false);

  // Dialog state for adding/editing lead
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [formCompany, setFormCompany] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStage, setFormStage] = useState<CrmStage>('novo_lead');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    setIsMounted(true);
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await dbService.getLeads();
      setLeads(data);
    } catch (err) {
      console.error(err);
      toast.add({
        title: 'Erro de conexão',
        description: 'Não foi possível carregar os leads do CRM.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStage = destination.droppableId as CrmStage;

    // Optimistic UI update
    setLeads(prevLeads =>
      prevLeads.map(lead => {
        if (lead.id === draggableId) {
          return {
            ...lead,
            stage: newStage,
            is_client: newStage === 'cliente' || newStage === 'pedido' ? true : lead.is_client
          };
        }
        return lead;
      })
    );

    try {
      await dbService.updateLead(draggableId, {
        stage: newStage,
        is_client: newStage === 'cliente' || newStage === 'pedido'
      });
      toast.add({
        title: 'Estágio do Lead Atualizado',
        description: `Lead movido para ${STAGES.find(s => s.id === newStage)?.title}.`,
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      toast.add({
        title: 'Erro ao Atualizar',
        description: 'Não foi possível salvar a alteração.',
        type: 'error'
      });
      loadLeads();
    }
  };

  const handleStageSelect = async (leadId: string, newStage: CrmStage) => {
    setLeads(prevLeads =>
      prevLeads.map(lead => {
        if (lead.id === leadId) {
          return {
            ...lead,
            stage: newStage,
            is_client: newStage === 'cliente' || newStage === 'pedido' ? true : lead.is_client
          };
        }
        return lead;
      })
    );

    try {
      await dbService.updateLead(leadId, {
        stage: newStage,
        is_client: newStage === 'cliente' || newStage === 'pedido'
      });
      toast.add({
        title: 'Etapa Alterada',
        description: `Lead atualizado para ${STAGES.find(s => s.id === newStage)?.title}.`,
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      loadLeads();
    }
  };

  const handleOpenCreateModal = () => {
    setEditingLead(null);
    setFormCompany('');
    setFormContact('');
    setFormCity('Ribeirão Preto');
    setFormState('SP');
    setFormPhone('');
    setFormWhatsapp('');
    setFormEmail('');
    setFormStage('novo_lead');
    setFormNotes('');
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (lead: CrmLead) => {
    setEditingLead(lead);
    setFormCompany(lead.company_name);
    setFormContact(lead.contact_name);
    setFormCity(lead.city);
    setFormState(lead.state);
    setFormPhone(lead.phone || '');
    setFormWhatsapp(lead.whatsapp || '');
    setFormEmail(lead.email || '');
    setFormStage(lead.stage);
    setFormNotes(lead.notes || '');
    setIsFormOpen(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany || !formContact) {
      toast.add({
        title: 'Campos Obrigatórios',
        description: 'Preencha o nome do estabelecimento e do contato.',
        type: 'error'
      });
      return;
    }

    try {
      if (editingLead) {
        await dbService.updateLead(editingLead.id, {
          company_name: formCompany,
          contact_name: formContact,
          city: formCity,
          state: formState,
          phone: formPhone,
          whatsapp: formWhatsapp,
          email: formEmail,
          stage: formStage,
          notes: formNotes,
          is_client: formStage === 'cliente' || formStage === 'pedido'
        });
        toast.add({ title: 'Lead Atualizado', description: 'Dados salvos com sucesso.', type: 'success' });
      } else {
        await dbService.createLead({
          company_name: formCompany,
          contact_name: formContact,
          city: formCity,
          state: formState,
          phone: formPhone,
          whatsapp: formWhatsapp,
          email: formEmail,
          stage: formStage,
          notes: formNotes,
          is_client: formStage === 'cliente' || formStage === 'pedido',
          interactions: 0
        });
        toast.add({ title: 'Novo Lead Criado', description: 'Lead adicionado ao funil.', type: 'success' });
      }
      setIsFormOpen(false);
      loadLeads();
    } catch (err: any) {
      toast.add({
        title: 'Erro ao Salvar',
        description: err.message || 'Falha na operação.',
        type: 'error'
      });
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await dbService.deleteLead(id);
      toast.add({ title: 'Lead Excluído', description: 'Lead removido do funil.', type: 'success' });
      loadLeads();
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered leads
  const filteredLeads = leads.filter(l => {
    const matchesSearch =
      l.company_name.toLowerCase().includes(search.toLowerCase()) ||
      l.contact_name.toLowerCase().includes(search.toLowerCase()) ||
      l.city.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone && l.phone.includes(search)) ||
      (l.whatsapp && l.whatsapp.includes(search));

    const matchesCity = cityFilter === 'all' || l.city === cityFilter;

    return matchesSearch && matchesCity;
  });

  const cities = Array.from(new Set(leads.map(l => l.city))).sort();

  // KPIs
  const novosCount = leads.filter(l => l.stage === 'novo_lead').length;
  const negociacaoCount = leads.filter(l => l.stage === 'negociacao').length;
  const clientesCount = leads.filter(l => l.is_client || l.stage === 'cliente' || l.stage === 'pedido').length;
  const totalLeads = leads.length;
  const conversionRate = totalLeads > 0 ? Math.round((clientesCount / totalLeads) * 100) : 0;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className="border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs" style={{ backgroundColor: '#ffffff', borderColor: '#e8e2d8' }}>
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest block mb-1" style={{ color: '#c9a96e' }}>
            CRM & FUNIL COMERCIAL ERP
          </span>
          <h1 className="text-xl font-black uppercase tracking-tight" style={{ color: '#3d2b1f' }}>
            FUNIL COMERCIAL KANBAN (DRAG & DROP)
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: '#8b7355' }}>
            Arraste os cards entre as colunas para atualizar a etapa de negociação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            onClick={handleOpenCreateModal}
            size="sm"
            className="text-white font-bold text-xs uppercase px-5 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95"
            style={{ backgroundColor: '#c9a96e' }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> NOVO LEAD COMERCIAL
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-stone-300 p-3.5 rounded-[2px]">
          <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">NOVOS</span>
            <Users className="h-4 w-4 text-stone-400" />
          </div>
          <p className="text-2xl font-black font-mono text-stone-900 mt-1">{novosCount}</p>
        </div>

        <div className="bg-white border border-stone-300 p-3.5 rounded-[2px]">
          <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">NEGOCIAÇÃO</span>
            <MessageSquare className="h-4 w-4 text-[#e8590c]" />
          </div>
          <p className="text-2xl font-black font-mono text-stone-900 mt-1">{negociacaoCount}</p>
        </div>

        <div className="bg-white border border-stone-300 p-3.5 rounded-[2px]">
          <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">CLIENTES</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black font-mono text-stone-900 mt-1">{clientesCount}</p>
        </div>

        <div className="bg-white border border-stone-300 p-3.5 rounded-[2px]">
          <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">CONVERS. MÊS</span>
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black font-mono text-stone-900 mt-1">{clientesCount}</p>
        </div>

        <div className="bg-white border border-stone-300 p-3.5 rounded-[2px]">
          <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">TAXA CONV.</span>
            <Percent className="h-4 w-4 text-stone-400" />
          </div>
          <p className="text-2xl font-black font-mono text-stone-900 mt-1">{conversionRate}%</p>
        </div>

        <div className="bg-white border border-stone-300 p-3.5 rounded-[2px]">
          <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">TAREFAS</span>
            <ListTodo className="h-4 w-4 text-stone-400" />
          </div>
          <p className="text-2xl font-black font-mono text-stone-900 mt-1">0</p>
        </div>
      </div>

      {/* Search & City Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Buscar empresa, contato, WhatsApp ou cidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-[2px] bg-white border-stone-300 text-stone-900 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            className="h-10 px-3 bg-white border border-stone-300 rounded-[2px] text-xs text-stone-800 font-bold uppercase cursor-pointer"
          >
            <option value="all">Todas as Cidades</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => loadLeads()}
            className="h-10 w-10 border-stone-300 rounded-[2px] cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`h-4 w-4 text-stone-600 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {isMounted && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-start overflow-x-auto pb-4 min-h-[600px]">
            {STAGES.map(col => {
              const colLeads = filteredLeads.filter(l => l.stage === col.id);

              return (
                <div
                  key={col.id}
                  className="bg-stone-200/60 border border-stone-300 rounded-[2px] p-2 flex flex-col min-h-[500px]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-2 py-1 mb-2 border-b border-stone-300 pb-2">
                    <span className="text-[10px] font-black text-stone-900 tracking-wider uppercase">
                      {col.title}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-[2px] bg-stone-300 text-stone-800 font-mono">
                      {colLeads.length}
                    </span>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 space-y-2 p-1 rounded-[2px] transition-colors ${
                          snapshot.isDraggingOver ? 'bg-amber-500/10 border border-[#e8590c]' : ''
                        }`}
                      >
                        {colLeads.length === 0 ? (
                          <div className="h-24 flex items-center justify-center text-[10px] text-stone-400 italic font-mono uppercase">
                            Vazio
                          </div>
                        ) : (
                          colLeads.map((lead, index) => (
                            <Draggable key={lead.id} draggableId={lead.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white border rounded-[2px] p-3 shadow-2xs hover:border-stone-400 transition-all relative group ${
                                    snapshot.isDragging ? 'shadow-lg border-[#e8590c] ring-1 ring-[#e8590c]' : 'border-stone-300'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-1 mb-1">
                                    <h4 className="text-xs font-black text-stone-900 uppercase truncate">
                                      {lead.company_name}
                                    </h4>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {lead.is_client && (
                                        <Badge className="text-[8px] px-1 py-0 bg-emerald-100 text-emerald-800 border-emerald-300 font-bold uppercase">
                                          CLIENTE
                                        </Badge>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditModal(lead)}
                                        className="text-stone-400 hover:text-stone-800 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Editar lead"
                                      >
                                        <Edit className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>

                                  <p className="text-[11px] text-stone-600 truncate mb-1 font-semibold uppercase">
                                    {lead.contact_name}
                                  </p>

                                  <div className="flex items-center gap-1 text-[10px] text-stone-500 mb-2 font-mono uppercase">
                                    <MapPin className="h-3 w-3 text-stone-400 shrink-0" />
                                    <span>{lead.city} / {lead.state}</span>
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t border-stone-200 mt-2 text-stone-500">
                                    <div className="flex items-center gap-2">
                                      {lead.whatsapp && (
                                        <a
                                          href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, '')}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="p-1 hover:text-emerald-700 transition-colors"
                                          title={`WhatsApp: ${lead.whatsapp}`}
                                        >
                                          <MessageSquare className="h-3.5 w-3.5" />
                                        </a>
                                      )}
                                      {lead.phone && (
                                        <a
                                          href={`tel:${lead.phone}`}
                                          className="p-1 hover:text-blue-700 transition-colors"
                                          title={`Telefone: ${lead.phone}`}
                                        >
                                          <Phone className="h-3.5 w-3.5" />
                                        </a>
                                      )}
                                    </div>

                                    <select
                                      value={lead.stage}
                                      onChange={e => handleStageSelect(lead.id, e.target.value as CrmStage)}
                                      className="text-[9px] font-bold border border-stone-300 rounded-[2px] bg-stone-50 px-1 py-0.5 text-stone-800 uppercase focus:outline-none cursor-pointer"
                                    >
                                      {STAGES.map(s => (
                                        <option key={s.id} value={s.id}>
                                          {s.title}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* CREATE / EDIT LEAD MODAL (720px WIDE WITH 2 COL GRID & STICKY FOOTER) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-6 py-4 border-b shrink-0 bg-white flex items-center gap-3" style={{ borderColor: '#e8e2d8' }}>
            <div className="h-10 w-10 rounded-xl grid place-items-center text-white shrink-0 shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
              <Users className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black uppercase tracking-tight" style={{ color: '#3d2b1f' }}>
                {editingLead ? 'EDITAR LEAD COMERCIAL' : 'CADASTRAR NOVO LEAD DE CLIENTE / CHAVEIRO'}
              </DialogTitle>
              <DialogDescription className="text-xs font-medium mt-0.5" style={{ color: '#8b7355' }}>
                Informe os dados da empresa e contato comercial para acompanhamento no funil.
              </DialogDescription>
            </div>
          </div>

          <form onSubmit={handleSaveLead} className="flex flex-col">
            <div className="px-6 py-6 space-y-4 max-h-[70vh] overflow-y-auto font-sans" style={{ backgroundColor: '#faf8f5' }}>
              <div className="grid grid-cols-2 gap-4 bg-white p-6 rounded-2xl border shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>
                    Estabelecimento / Empresa <span className="text-red-600">*</span>
                  </label>
                  <Input
                    placeholder="Ex: Chaveiro Central"
                    value={formCompany}
                    onChange={e => setFormCompany(e.target.value)}
                    required
                    className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Contato Comercial</label>
                  <Input
                    placeholder="Ex: João da Silva"
                    value={formContact}
                    onChange={e => setFormContact(e.target.value)}
                    className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Cidade</label>
                  <Input
                    placeholder="Ex: Ribeirão Preto"
                    value={formCity}
                    onChange={e => setFormCity(e.target.value)}
                    className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Estado (UF)</label>
                  <Input
                    placeholder="Ex: SP"
                    maxLength={2}
                    value={formState}
                    onChange={e => setFormState(e.target.value.toUpperCase())}
                    className="uppercase font-mono h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>WhatsApp</label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={formWhatsapp}
                    onChange={e => setFormWhatsapp(e.target.value)}
                    className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>E-mail Comercial</label>
                  <Input
                    placeholder="contato@chaveiro.com.br"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    className="h-11 rounded-xl bg-stone-50/50 text-xs border-stone-200"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Etapa do Funil</label>
                  <select
                    value={formStage}
                    onChange={e => setFormStage(e.target.value as CrmStage)}
                    className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 text-xs font-bold uppercase focus:outline-none"
                    style={{ color: '#3d2b1f' }}
                  >
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="block text-[11px] font-bold uppercase" style={{ color: '#8b7355' }}>Anotações de Atendimento</label>
                  <textarea
                    placeholder="Anotações de conversas, preferências de peças..."
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50/50 p-3 text-xs focus:outline-none min-h-[70px] resize-none"
                    style={{ color: '#3d2b1f' }}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t flex justify-between items-center bg-white shrink-0" style={{ borderColor: '#e8e2d8' }}>
              {editingLead ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (editingLead) handleDeleteLead(editingLead.id);
                    setIsFormOpen(false);
                  }}
                  className="text-red-600 hover:bg-red-50 text-xs font-bold uppercase rounded-full h-11 px-4"
                >
                  <Trash2 className="h-4 w-4 mr-1" /> EXCLUIR LEAD
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs border-stone-300 font-bold uppercase rounded-full h-11 px-6"
                >
                  CANCELAR
                </Button>
                <Button
                  type="submit"
                  className="text-white font-bold text-xs uppercase px-8 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95"
                  style={{ backgroundColor: '#c9a96e' }}
                >
                  SALVAR LEAD
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
