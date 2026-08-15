'use client';

import React, { useState, useEffect } from 'react';

import { dbService } from '@/services/db';
import { CrmLead, Client, CrmStage } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Compass,
  MapPin,
  Search,
  Plus,
  UserPlus,
  Navigation,
  Phone,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  ListPlus,
  Route,
  Building2,
  Map,
  Sparkles
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

interface ProspectLocksmith {
  id: string;
  name: string;
  trade_name: string;
  city: string;
  state: string;
  address: string;
  neighborhood: string;
  phone: string;
  whatsapp: string;
  distanceKm: number;
  specialty: string;
  source: string;
  latitude: number;
  longitude: number;
}

interface VisitRecord {
  prospectId: string;
  type: 'visita' | 'venda';
  notes: string;
  visitedAt: string;
}

export default function ProspeccaoPage() {
  const [activeTab, setActiveTab] = useState<'prospeccao' | 'rota'>('prospeccao');
  const [selectedState, setSelectedState] = useState('SP');
  const [selectedCity, setSelectedCity] = useState('Campinas');
  const [activeCity, setActiveCity] = useState('Campinas');
  const [activeState, setActiveState] = useState('SP');
  const [existingLeads, setExistingLeads] = useState<CrmLead[]>([]);
  const [dbClients, setDbClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [prospects, setProspects] = useState<ProspectLocksmith[]>([]);

  // GPS Coordinates state
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsActive, setGpsActive] = useState(false);

  // Helpers to extract address info from JSONB addresses array
  const getClientCity = (client: Client) => {
    if (Array.isArray(client.addresses) && client.addresses.length > 0) {
      return (client.addresses[0] as any).city || '';
    }
    return '';
  };
  const getClientState = (client: Client) => {
    if (Array.isArray(client.addresses) && client.addresses.length > 0) {
      return (client.addresses[0] as any).state || '';
    }
    return '';
  };
  const getClientAddressStr = (client: Client) => {
    if (Array.isArray(client.addresses) && client.addresses.length > 0) {
      const addr = client.addresses[0] as any;
      return `${addr.street || ''}, ${addr.number || ''}`;
    }
    return 'Endereço não cadastrado';
  };
  const getClientNeighborhood = (client: Client) => {
    if (Array.isArray(client.addresses) && client.addresses.length > 0) {
      return (client.addresses[0] as any).neighborhood || '';
    }
    return '';
  };

  // States and Cities loaded dynamically from IBGE API
  const [statesList, setStatesList] = useState<{ sigla: string; nome: string }[]>([]);
  const [citiesList, setCitiesList] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  // Visit states
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [hideVisited, setHideVisited] = useState(false);
  const [hideCold, setHideCold] = useState(true);
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);

  // Temperature & Block persistence states
  const [prospectTemperatures, setProspectTemperatures] = useState<Record<string, 'quente' | 'morno' | 'frio'>>({});
  const [blockedProspectIds, setBlockedProspectIds] = useState<string[]>([]);

  // Visit Modal state
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [selectedProspectForVisit, setSelectedProspectForVisit] = useState<ProspectLocksmith | null>(null);
  const [visitType, setVisitType] = useState<'visita' | 'venda'>('visita');
  const [visitNotes, setVisitNotes] = useState('');
  const [selectedTemperature, setSelectedTemperature] = useState<'quente' | 'morno' | 'frio'>('morno');
  const [selectedCrmStage, setSelectedCrmStage] = useState<CrmStage>('novo_lead');

  // Load IBGE states list
  const loadIbgeStates = async () => {
    try {
      const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
      const data = await res.json();
      const formatted = data.map((item: any) => ({
        sigla: item.sigla,
        nome: item.nome
      }));
      setStatesList(formatted);
      return formatted;
    } catch (err) {
      console.error("Error fetching states from IBGE:", err);
      const fallback = [
        { sigla: 'SP', nome: 'São Paulo' },
        { sigla: 'GO', nome: 'Goiás' },
        { sigla: 'DF', nome: 'Distrito Federal' },
        { sigla: 'MG', nome: 'Minas Gerais' },
        { sigla: 'RJ', nome: 'Rio de Janeiro' }
      ];
      setStatesList(fallback);
      return fallback;
    }
  };

  // Load IBGE cities list for selected state
  const loadIbgeCities = async (uf: string, defaultCity?: string) => {
    setLoadingLocations(true);
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
      const data = await res.json();
      const names: string[] = data.map((item: any) => item.nome);
      setCitiesList(names);
      
      const targetCity = defaultCity || names[0] || '';
      setSelectedCity(targetCity);
      return targetCity;
    } catch (err) {
      console.error("Error fetching cities from IBGE:", err);
      const fallbackCities: Record<string, string[]> = {
        SP: ['Campinas', 'Sorocaba', 'São Paulo', 'Santos', 'Ribeirão Preto', 'Barretos'],
        GO: ['Goiânia', 'Anápolis', 'Aparecida de Goiânia'],
        DF: ['Brasília', 'Taguatinga'],
        MG: ['Belo Horizonte', 'Uberlândia'],
        RJ: ['Rio de Janeiro', 'Niterói']
      };
      const list = fallbackCities[uf] || ['Centro'];
      setCitiesList(list);
      const targetCity = defaultCity || list[0] || '';
      setSelectedCity(targetCity);
      return targetCity;
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleStateChange = async (uf: string) => {
    setSelectedState(uf);
    const targetCity = await loadIbgeCities(uf);
    executeSearch(targetCity, uf);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [leads, clientsData] = await Promise.all([
        dbService.getLeads(),
        dbService.getClients()
      ]);
      setExistingLeads(leads);
      setDbClients(clientsData);
      const savedVisits = localStorage.getItem('prospect_visits');
      if (savedVisits) {
        setVisits(JSON.parse(savedVisits));
      }
      const savedTemps = localStorage.getItem('prospect_temperatures');
      if (savedTemps) {
        setProspectTemperatures(JSON.parse(savedTemps));
      }
      const savedBlocked = localStorage.getItem('prospect_blocked_ids');
      if (savedBlocked) {
        setBlockedProspectIds(JSON.parse(savedBlocked));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVisitModal = (prospect: ProspectLocksmith) => {
    setSelectedProspectForVisit(prospect);
    setVisitType('visita');
    setVisitNotes('');
    const currentTemp = prospectTemperatures[prospect.id] || 'morno';
    setSelectedTemperature(currentTemp);

    // Pre-fill CRM Stage based on whether they are already in the CRM
    const cleanPhone = prospect.phone.replace(/\D/g, '');
    const existingLead = existingLeads.find(l => {
      const leadPhone = (l.phone || '').replace(/\D/g, '');
      return (
        (leadPhone && cleanPhone && leadPhone.includes(cleanPhone)) ||
        l.company_name.toLowerCase() === prospect.trade_name.toLowerCase() ||
        l.contact_name.toLowerCase() === prospect.name.toLowerCase()
      );
    });

    if (existingLead) {
      setSelectedCrmStage(existingLead.stage);
    } else {
      setSelectedCrmStage('contato_feito'); // Pre-fill with "Contato Feito" for new interactions
    }

    setIsVisitModalOpen(true);
  };

  const handleBlockProspect = (id: string) => {
    const updatedBlocked = [...blockedProspectIds, id];
    setBlockedProspectIds(updatedBlocked);
    localStorage.setItem('prospect_blocked_ids', JSON.stringify(updatedBlocked));
    toast.add({ title: 'Chaveiro Bloqueado', description: 'Removido da lista de prospecção e rotas.', type: 'warning' });
  };

  const handleUnblockProspect = (id: string) => {
    const updatedBlocked = blockedProspectIds.filter(bid => bid !== id);
    setBlockedProspectIds(updatedBlocked);
    localStorage.setItem('prospect_blocked_ids', JSON.stringify(updatedBlocked));
    toast.add({ title: 'Chaveiro Desbloqueado', description: 'Retornou para a lista de prospecção.', type: 'success' });
  };

  const handleSaveVisit = async () => {
    if (!selectedProspectForVisit) return;
    
    // Save/update temperature
    const updatedTemps = {
      ...prospectTemperatures,
      [selectedProspectForVisit.id]: selectedTemperature
    };
    setProspectTemperatures(updatedTemps);
    localStorage.setItem('prospect_temperatures', JSON.stringify(updatedTemps));

    const newVisit: VisitRecord = {
      prospectId: selectedProspectForVisit.id,
      type: visitType,
      notes: visitNotes,
      visitedAt: new Date().toISOString()
    };

    const updatedVisits = [...visits, newVisit];
    setVisits(updatedVisits);
    localStorage.setItem('prospect_visits', JSON.stringify(updatedVisits));

    try {
      const cleanPhone = selectedProspectForVisit.phone.replace(/\D/g, '');
      const existingLead = existingLeads.find(l => {
        const leadPhone = (l.phone || '').replace(/\D/g, '');
        return (
          (leadPhone && cleanPhone && leadPhone.includes(cleanPhone)) ||
          l.company_name.toLowerCase() === selectedProspectForVisit.trade_name.toLowerCase() ||
          l.contact_name.toLowerCase() === selectedProspectForVisit.name.toLowerCase()
        );
      });

      const noteText = `[VISITA: ${visitType === 'venda' ? 'COM VENDA' : 'SEM VENDA'}] ${visitNotes}`;

      if (existingLead) {
        await dbService.updateLead(existingLead.id, {
          notes: existingLead.notes ? `${existingLead.notes}\n\n${noteText}` : noteText,
          interactions: (existingLead.interactions || 0) + 1,
          stage: selectedCrmStage,
          is_client: selectedCrmStage === 'cliente' || selectedCrmStage === 'pedido' || visitType === 'venda' || existingLead.is_client
        });
      } else {
        await dbService.createLead({
          contact_name: selectedProspectForVisit.name,
          company_name: selectedProspectForVisit.trade_name,
          city: selectedProspectForVisit.city,
          state: selectedProspectForVisit.state,
          phone: selectedProspectForVisit.phone,
          email: `contato@${selectedProspectForVisit.trade_name.toLowerCase().replace(/\s+/g, '')}.com.br`,
          stage: selectedCrmStage,
          notes: `Importado via Registro de Visita do Chaveiros.net. Endereço: ${selectedProspectForVisit.address}, ${selectedProspectForVisit.neighborhood} - ${selectedProspectForVisit.city}/${selectedProspectForVisit.state}\n\n${noteText}`,
          is_client: selectedCrmStage === 'cliente' || selectedCrmStage === 'pedido' || visitType === 'venda',
          interactions: 1
        });
      }

      toast.add({
        title: 'Visita Registrada!',
        description: `Visita para ${selectedProspectForVisit.name} gravada no histórico do CRM.`,
        type: 'success'
      });
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.add({ title: 'Erro ao salvar no CRM', description: err.message || 'Erro operacional.', type: 'error' });
    } finally {
      setIsVisitModalOpen(false);
      setSelectedProspectForVisit(null);
      setVisitNotes('');
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadData();
      await loadIbgeStates();
      // Default to SP / Campinas on initial load
      const defaultState = 'SP';
      setSelectedState(defaultState);
      const defaultCity = await loadIbgeCities(defaultState, 'Campinas');
      executeSearch(defaultCity, defaultState);
    };
    init();
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.add({ title: 'GPS Indisponível', description: 'Seu navegador não suporta geolocalização.', type: 'error' });
      return;
    }

    setSearching(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ latitude, longitude });
        setGpsActive(true);
        toast.add({ 
          title: 'GPS Ativado com Sucesso!', 
          description: `Localização de referência: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}. Calculando distâncias e organizando...`, 
          type: 'success' 
        });

        // Recalculate distance for current prospects list based on these coordinates
        setProspects(prev => {
          const updated = prev.map(p => {
            const d = calculateDistance(latitude, longitude, p.latitude, p.longitude);
            return {
              ...p,
              distanceKm: Math.round(d * 10) / 10
            };
          });
          return [...updated].sort((a, b) => a.distanceKm - b.distanceKm);
        });
        setSearching(false);
      },
      (error) => {
        console.error(error);
        toast.add({ title: 'Falha no GPS', description: 'Não foi possível ler as coordenadas. Verifique as permissões.', type: 'error' });
        setSearching(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const getCityCenterCoords = (city: string, state: string) => {
    const centers: Record<string, { lat: number; lng: number }> = {
      'campinas': { lat: -22.9064, lng: -47.0616 },
      'sorocaba': { lat: -23.5015, lng: -47.4581 },
      'são paulo': { lat: -23.5505, lng: -46.6333 },
      'santos': { lat: -23.9631, lng: -46.3137 },
      'barretos': { lat: -20.5574, lng: -48.5678 },
      'ribeirão preto': { lat: -21.1704, lng: -47.8103 },
      'goiânia': { lat: -16.6869, lng: -49.2648 },
      'brasília': { lat: -15.7942, lng: -47.8822 },
      'belo horizonte': { lat: -19.9173, lng: -43.9345 },
      'rio de janeiro': { lat: -22.9068, lng: -43.1729 }
    };
    return centers[city.toLowerCase()] || { lat: -22.9, lng: -47.0 };
  };

  const executeSearch = async (targetCity: string, targetState: string) => {
    setSearching(true);
    setActiveCity(targetCity);
    setActiveState(targetState);

    try {
      // 1. Fetch real scraped leads from Chaveiros.net via our API Route
      const webRes = await fetch(`/api/prospeccao?city=${encodeURIComponent(targetCity)}&state=${encodeURIComponent(targetState)}`);
      const webLeads: ProspectLocksmith[] = await webRes.json();

      // 2. Filter real clients from database belonging to this city
      const realClientsInCity = dbClients.filter(c => {
        const cCity = getClientCity(c);
        const cState = getClientState(c);
        return cCity.toLowerCase().includes(targetCity.toLowerCase()) && 
               cState.toUpperCase() === targetState.toUpperCase();
      }).map((c, idx) => ({
        id: `db-cli-${c.id}`,
        name: c.name,
        trade_name: c.name,
        city: getClientCity(c),
        state: getClientState(c),
        address: getClientAddressStr(c),
        neighborhood: getClientNeighborhood(c),
        phone: c.phone || 'Sem Telefone',
        whatsapp: c.phone ? c.phone.replace(/\D/g, '') : '',
        distanceKm: Math.round((Math.random() * 3 + 0.5) * 10) / 10,
        specialty: 'Cliente Cadastrado no ERP',
        source: 'erp-db',
        latitude: getCityCenterCoords(targetCity, targetState).lat + (Math.random() - 0.5) * 0.04,
        longitude: getCityCenterCoords(targetCity, targetState).lng + (Math.random() - 0.5) * 0.04
      }));

      const mergedList = [...realClientsInCity, ...webLeads];

      // If user GPS coordinates are active, calculate actual distance based on GPS!
      const mappedList = userCoords ? mergedList.map(item => {
        const d = calculateDistance(userCoords.latitude, userCoords.longitude, item.latitude, item.longitude);
        return {
          ...item,
          distanceKm: Math.round(d * 10) / 10
        };
      }) : mergedList;

      // Sort by distance (nearest to farthest)
      mappedList.sort((a, b) => a.distanceKm - b.distanceKm);
      setProspects(mappedList);
    } catch (err) {
      console.error("Error executing search:", err);
      toast.add({ title: 'Erro de Busca', description: 'Não foi possível carregar a lista de chaveiros da web.', type: 'error' });
    } finally {
      setSearching(false);
    }
  };

  // Check if prospect is already in CRM
  const isAlreadyInCrm = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return existingLeads.some(l => {
      const leadPhone = (l.phone || '').replace(/\D/g, '');
      return (
        (leadPhone && cleanPhone && leadPhone.includes(cleanPhone)) ||
        l.company_name.toLowerCase() === name.toLowerCase() ||
        l.contact_name.toLowerCase() === name.toLowerCase()
      );
    });
  };

  // Import single lead to CRM
  const handleImportToCrm = async (prospect: ProspectLocksmith) => {
    try {
      await dbService.createLead({
        contact_name: prospect.name,
        company_name: prospect.trade_name,
        city: prospect.city,
        state: prospect.state,
        phone: prospect.phone,
        email: `contato@${prospect.trade_name.toLowerCase().replace(/\s+/g, '')}.com.br`,
        stage: 'novo_lead',
        notes: `Importado via Chaveiros.net. Endereço: ${prospect.address}, ${prospect.neighborhood} - ${prospect.city}/${prospect.state}. Especialidade: ${prospect.specialty}`,
        is_client: false,
        interactions: 0
      });
      toast.add({ title: 'Lead Importado!', description: `${prospect.name} adicionado ao CRM com sucesso.`, type: 'success' });
      loadData();
    } catch (e: any) {
      toast.add({ title: 'Erro ao Importar', description: e.message || 'Falha ao adicionar no CRM.', type: 'error' });
    }
  };

  // Bulk Import all new prospects for the city into CRM
  const handleImportAll = async () => {
    const toImport = prospects.filter(p => !isAlreadyInCrm(p.phone, p.name));
    if (toImport.length === 0) {
      toast.add({ title: 'Tudo Importado', description: 'Todos os chaveiros desta cidade já constam no CRM.', type: 'warning' });
      return;
    }

    let count = 0;
    for (const p of toImport) {
      try {
        await dbService.createLead({
          contact_name: p.name,
          company_name: p.trade_name,
          city: p.city,
          state: p.state,
          phone: p.phone,
          email: `contato@${p.trade_name.toLowerCase().replace(/\s+/g, '')}.com.br`,
          stage: 'novo_lead',
          notes: `Importação em lote via Chaveiros.net. Endereço: ${p.address}, ${p.neighborhood} - ${p.city}/${p.state}`,
          is_client: false,
          interactions: 0
        });
        count++;
      } catch (e) {
        console.error(e);
      }
    }
    toast.add({ title: 'Importação Concluída!', description: `${count} novos chaveiros cadastrados no CRM.`, type: 'success' });
    loadData();
  };

  const isCurrentMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const visibleProspects = prospects.filter(p => {
    // Filter based on active tab
    if (activeTab === 'prospeccao') {
      const inCrm = isAlreadyInCrm(p.phone, p.name);
      if (p.source === 'erp-db' || inCrm) return false;
    } else {
      const inCrm = isAlreadyInCrm(p.phone, p.name);
      if (p.source !== 'erp-db' && !inCrm) return false;
    }

    const isBlocked = blockedProspectIds.includes(p.id);
    if (showBlockedOnly) {
      return isBlocked;
    }

    if (isBlocked) return false;

    const isVisited = visits.some(v => v.prospectId === p.id && isCurrentMonth(v.visitedAt));
    
    // Resolve temperature from DB lead notes or localStorage fallback
    const cleanPhone = p.phone.replace(/\D/g, '');
    const existingLead = existingLeads.find(l => {
      const leadPhone = (l.phone || '').replace(/\D/g, '');
      return (
        (leadPhone && cleanPhone && leadPhone.includes(cleanPhone)) ||
        l.company_name.toLowerCase() === p.trade_name.toLowerCase() ||
        l.contact_name.toLowerCase() === p.name.toLowerCase()
      );
    });
    const match = (existingLead?.notes || '').match(/\[TEMPERATURA:\s*(QUENTE|MORNO|FRIO)\]/i);
    const dbTemp = match ? match[1].toLowerCase() as 'quente' | 'morno' | 'frio' : null;
    const temp = dbTemp || prospectTemperatures[p.id] || 'morno';

    const matchesVisited = !hideVisited || !isVisited;
    const matchesCold = !hideCold || temp !== 'frio';

    return matchesVisited && matchesCold;
  });

  // Generate Google Maps Route URL with waypoints (nearest to farthest) for visible prospects only
  const generateGoogleMapsRouteUrl = () => {
    if (visibleProspects.length === 0) return '#';
    const sorted = [...visibleProspects].sort((a, b) => a.distanceKm - b.distanceKm);
    const origin = encodeURIComponent(`${activeCity}, ${activeState}`);
    const destination = encodeURIComponent(`${sorted[sorted.length - 1].address}, ${sorted[sorted.length - 1].city}, ${activeState}`);
    
    const waypoints = sorted.slice(0, sorted.length - 1).map(p => encodeURIComponent(`${p.address}, ${p.city}, ${activeState}`)).join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
  };

  const totalKmEstimate = visibleProspects.reduce((s, p) => s + p.distanceKm, 0);

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* HEADER BANNER */}
      <div className="bg-white border rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderColor: '#e8e2d8' }}>
        <div>
          <span className="text-[10px] font-medium uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-1.5" style={{ backgroundColor: '#f5f0e8', color: '#c9a96e' }}>
            INTELIGÊNCIA DE VENDAS ERP & CHAVEIROS.NET
          </span>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#3d2b1f' }}>
            Prospecção de Chaveiros & Rota Otimizada
          </h1>
          <p className="text-xs font-normal mt-0.5" style={{ color: '#8b7355' }}>
            Pesquise por cidade, visualize os chaveiros mais próximos ordenados por distância e importe direto para seu CRM.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {activeTab === 'prospeccao' ? (
            <Button
              onClick={handleImportAll}
              className="h-11 px-5 rounded-full text-xs font-medium uppercase shadow-xs cursor-pointer transition hover:opacity-95"
              style={{ backgroundColor: '#c9a96e', color: '#3d2b1f' }}
            >
              <ListPlus className="h-4 w-4 mr-1.5 text-[#3d2b1f]" /> IMPORTAR TODOS PARA O CRM
            </Button>
          ) : (
            <a
              href={generateGoogleMapsRouteUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-5 rounded-full text-xs font-medium uppercase bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center shadow-xs transition"
            >
              <Route className="h-4 w-4 mr-1.5" /> ABRIR ROTA OTIMIZADA NO MAPS
            </a>
          )}
        </div>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex border-b border-stone-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('prospeccao')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition cursor-pointer relative ${
            activeTab === 'prospeccao' ? 'text-amber-850 font-black' : 'text-stone-550 hover:text-stone-800 font-medium'
          }`}
          style={activeTab === 'prospeccao' ? { color: '#3d2b1f' } : {}}
        >
          🔍 Prospecção de Novos (Buscar na Internet)
          {activeTab === 'prospeccao' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c9a96e]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rota')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition cursor-pointer relative ${
            activeTab === 'rota' ? 'text-amber-850 font-black' : 'text-stone-550 hover:text-stone-800 font-medium'
          }`}
          style={activeTab === 'rota' ? { color: '#3d2b1f' } : {}}
        >
          🗺️ Minha Rota de Visitas (Clientes & Leads Salvos)
          {activeTab === 'rota' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c9a96e]" />
          )}
        </button>
      </div>

      {/* SEARCH BAR & CITY PRESETS */}
      <div className="bg-white border p-6 rounded-2xl shadow-2xs space-y-4" style={{ borderColor: '#e8e2d8' }}>
        <div className="flex flex-col md:flex-row items-end gap-4 w-full">
          {/* Select Estado */}
          <div className="flex-1 w-full">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1.5">
              1. Escolha o Estado (UF)
            </label>
            <select
              value={selectedState}
              onChange={e => handleStateChange(e.target.value)}
              className="w-full h-11 px-3 bg-stone-50/50 border border-stone-200 rounded-xl text-xs font-semibold uppercase text-stone-850 cursor-pointer outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              {statesList.map(st => (
                <option key={st.sigla} value={st.sigla}>{st.nome} ({st.sigla})</option>
              ))}
            </select>
          </div>

          {/* Select Cidade */}
          <div className="flex-1 w-full">
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1.5">
              2. Selecione a Cidade
            </label>
            <select
              value={selectedCity}
              disabled={loadingLocations}
              onChange={e => {
                const city = e.target.value;
                setSelectedCity(city);
                executeSearch(city, selectedState);
              }}
              className="w-full h-11 px-3 bg-stone-50/50 border border-stone-200 rounded-xl text-xs font-semibold uppercase text-stone-850 cursor-pointer outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
            >
              {loadingLocations ? (
                <option>Carregando cidades...</option>
              ) : (
                citiesList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))
              )}
            </select>
          </div>

          {/* GPS Button */}
          <div className="w-full md:w-auto shrink-0">
            <Button
              type="button"
              onClick={handleDetectLocation}
              className={`h-11 px-6 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-1.5 w-full cursor-pointer shadow-xs ${
                gpsActive 
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-500 animate-pulse' 
                  : 'bg-stone-900 hover:bg-stone-800 text-white'
              }`}
            >
              <Navigation className="h-4 w-4" /> 
              {gpsActive ? 'GPS Ativo (Organizado)' : 'Organizar por GPS (Mais Perto)'}
            </Button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-dashed border-stone-200">
          <div className="text-[11px] font-semibold uppercase text-stone-500">
            Estado ativo: <span className="text-[#3d2b1f] font-bold">{activeState}</span> | Cidade ativa: <span className="text-[#3d2b1f] font-bold">{activeCity}</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold uppercase text-stone-700">
              <input
                type="checkbox"
                checked={hideVisited}
                onChange={e => setHideVisited(e.target.checked)}
                className="accent-[#c9a96e] h-4 w-4 rounded cursor-pointer"
              />
              Ocultar Visitados
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold uppercase text-stone-700">
              <input
                type="checkbox"
                checked={hideCold}
                onChange={e => setHideCold(e.target.checked)}
                className="accent-[#c9a96e] h-4 w-4 rounded cursor-pointer"
              />
              ❄️ Ocultar Frios
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold uppercase text-stone-700">
              <input
                type="checkbox"
                checked={showBlockedOnly}
                onChange={e => setShowBlockedOnly(e.target.checked)}
                className="accent-[#c9a96e] h-4 w-4 rounded cursor-pointer"
              />
              🔒 Ver Bloqueados ({blockedProspectIds.length})
            </label>
          </div>
        </div>
      </div>

      {/* SUMMARY ROUTE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {activeTab === 'prospeccao' ? (
          <>
            <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
              <span className="text-[10px] font-semibold uppercase block" style={{ color: '#8b7355' }}>CHAVEIROS DISPONÍVEIS NA WEB EM {activeCity.toUpperCase()}</span>
              <p className="text-2xl font-bold font-mono mt-1" style={{ color: '#3d2b1f' }}>{visibleProspects.length} ESTABELECIMENTOS</p>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
              <span className="text-[10px] font-semibold uppercase block text-emerald-800">NOVOS LEADS NÃO IMPORTADOS</span>
              <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                {visibleProspects.length} CHAVEIROS
              </p>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
              <span className="text-[10px] font-semibold uppercase block text-amber-800">DISTÂNCIA MÉDIA ESTIMADA</span>
              <p className="text-2xl font-bold font-mono text-amber-900 mt-1">
                ~{(totalKmEstimate / (visibleProspects.length || 1)).toFixed(1)} KM
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
              <span className="text-[10px] font-semibold uppercase block text-amber-800">PONTOS DE VISITA NA ROTA ({activeCity.toUpperCase()})</span>
              <p className="text-2xl font-bold font-mono text-amber-900 mt-1">{visibleProspects.length} PARADAS</p>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
              <span className="text-[10px] font-semibold uppercase block text-emerald-800">CLIENTES FATURANDO ATIVOS</span>
              <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                {visibleProspects.filter(p => p.source === 'erp-db').length} CLIENTES
              </p>
            </div>

            <div className="bg-white border p-5 rounded-2xl shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
              <span className="text-[10px] font-semibold uppercase block text-emerald-850">DISTÂNCIA TOTAL DA ROTA OTIMIZADA</span>
              <p className="text-2xl font-bold font-mono text-stone-900 mt-1">
                ~{totalKmEstimate.toFixed(1)} KM
              </p>
            </div>
          </>
        )}
      </div>

      {/* PROSPECT LOCKSMITHS TABLE */}
      <div className="bg-white border rounded-2xl shadow-2xs overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
        <div className="px-6 py-4 bg-white border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: '#e8e2d8' }}>
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4" style={{ color: '#c9a96e' }} />
            <span className="text-xs font-semibold uppercase" style={{ color: '#3d2b1f' }}>
              {activeTab === 'prospeccao' 
                ? `RELAÇÃO DE PROSPECTS DISPONÍVEIS NA WEB EM ${activeCity.toUpperCase()} (NÃO SALVOS)`
                : `ROTA DE VISITAS PROGRAMADAS EM ${activeCity.toUpperCase()} (DISTÂNCIA GPS OTIMIZADA)`}
            </span>
          </div>

          <span className="text-[11px] font-medium text-stone-500 font-mono">
            {activeTab === 'prospeccao' ? 'Fonte: Chaveiros.net Geolocation & Google Places' : 'Fonte: Base de Dados ERP & CRM'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>

            <TableHeader>
              <TableRow style={{ backgroundColor: '#f5f0e8', borderColor: '#e8e2d8' }}>
                <TableHead className="font-semibold uppercase text-[10px]" style={{ color: '#8b7355' }}>
                  PROXIMIDADE {gpsActive ? '🧭 (GPS)' : '🏙️ (Centro)'}
                </TableHead>
                <TableHead className="font-semibold uppercase text-[10px]" style={{ color: '#8b7355' }}>
                  {activeTab === 'prospeccao' ? 'CHAVEIRO / ESTABELECIMENTO' : 'CLIENTE / CHAVEIRO'}
                </TableHead>
                <TableHead className="font-semibold uppercase text-[10px]" style={{ color: '#8b7355' }}>ENDEREÇO / BAIRRO</TableHead>
                <TableHead className="font-semibold uppercase text-[10px]" style={{ color: '#8b7355' }}>CONTATO & WHATSAPP</TableHead>
                <TableHead className="font-semibold uppercase text-[10px]" style={{ color: '#8b7355' }}>
                  {activeTab === 'prospeccao' ? 'STATUS NO CRM' : 'STATUS CADASTRO'}
                </TableHead>
                <TableHead className="text-right font-semibold uppercase text-[10px]" style={{ color: '#8b7355' }}>
                  {activeTab === 'prospeccao' ? 'AÇÕES DE PROSPECÇÃO' : 'AÇÕES DE ROTA'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {searching ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 font-mono text-stone-500">
                    {activeTab === 'prospeccao' 
                      ? 'Buscando novos chaveiros locais na internet...' 
                      : 'Carregando rota de visitas de clientes da cidade...'}
                  </TableCell>
                </TableRow>
              ) : visibleProspects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 font-mono text-stone-500">
                    Nenhum chaveiro localizado nesta cidade.
                  </TableCell>
                </TableRow>
              ) : (
                visibleProspects.map((p, idx) => {
                  const cleanPhone = p.phone.replace(/\D/g, '');
                  const existingLead = existingLeads.find(l => {
                    const leadPhone = (l.phone || '').replace(/\D/g, '');
                    return (
                      (leadPhone && cleanPhone && leadPhone.includes(cleanPhone)) ||
                      l.company_name.toLowerCase() === p.trade_name.toLowerCase() ||
                      l.contact_name.toLowerCase() === p.name.toLowerCase()
                    );
                  });

                  const inCrm = !!existingLead;
                  const visit = visits.find(v => v.prospectId === p.id);
                  const isVisited = !!visit || !!existingLead;

                  // Resolve temperature from DB lead notes or localStorage fallback
                  const match = (existingLead?.notes || '').match(/\[TEMPERATURA:\s*(QUENTE|MORNO|FRIO)\]/i);
                  const dbTemp = match ? match[1].toLowerCase() as 'quente' | 'morno' | 'frio' : null;
                  const temp = dbTemp || prospectTemperatures[p.id] || 'morno';

                  const displayNotes = existingLead?.notes || (visit ? visit.notes : '');

                  return (
                    <TableRow key={p.id} className={`hover:bg-[#f5f0e8]/50 transition ${temp === 'frio' ? 'opacity-70 hover:opacity-100 bg-stone-50/50' : ''}`}>
                      <TableCell>
                        <Badge className="bg-amber-100 text-amber-900 font-mono font-bold text-[10px] rounded-full px-2.5 py-0.5 border-none">
                          #{idx + 1} — {p.distanceKm} km
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <span className="font-semibold block" style={{ color: '#3d2b1f' }}>{p.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-stone-500 uppercase font-mono">{p.specialty}</span>
                          {(() => {
                            const icon = temp === 'quente' ? '🔥' : temp === 'morno' ? '⚡' : '❄️';
                            const color = temp === 'quente' ? 'text-red-650' : temp === 'morno' ? 'text-amber-600' : 'text-blue-500';
                            return (
                              <span className={`text-[9px] font-bold uppercase ${color}`} title={`Temperatura: ${temp}`}>
                                {icon} {temp}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Visual Alert Box depending on Temperature */}
                        {temp === 'frio' && (
                          <div className="mt-1.5 p-2 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-900 flex items-start gap-1.5 max-w-sm">
                            <span className="text-xs shrink-0">⚠️</span>
                            <div>
                              <span className="font-bold uppercase block text-[9px] text-red-750">FRIO - NÃO REVISITAR:</span>
                              <span className="block mt-0.5 font-medium leading-relaxed">
                                {displayNotes ? displayNotes.replace(/\[TEMPERATURA:\s*(QUENTE|MORNO|FRIO)\]/gi, '').replace(/\[VISITA:[^\]]*\]/gi, '').trim() : 'Sem observações.'}
                              </span>
                            </div>
                          </div>
                        )}

                        {temp === 'quente' && displayNotes && (
                          <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-900 flex items-start gap-1.5 max-w-sm">
                            <span className="text-xs shrink-0">🔥</span>
                            <div>
                              <span className="font-bold uppercase block text-[9px] text-amber-750">ÚLTIMO RETORNO (QUENTE):</span>
                              <span className="block mt-0.5 font-medium leading-relaxed font-semibold">
                                {displayNotes.replace(/\[TEMPERATURA:\s*(QUENTE|MORNO|FRIO)\]/gi, '').replace(/\[VISITA:[^\]]*\]/gi, '').trim()}
                              </span>
                            </div>
                          </div>
                        )}

                        {temp === 'morno' && displayNotes && (
                          <div className="mt-1.5 p-2 bg-stone-50 border border-stone-200 rounded-lg text-[10px] text-stone-700 flex items-start gap-1.5 max-w-sm">
                            <span className="text-xs shrink-0">⚡</span>
                            <div>
                              <span className="font-bold uppercase block text-[9px] text-stone-500">Última Observação:</span>
                              <span className="block mt-0.5 font-medium leading-relaxed">
                                {displayNotes.replace(/\[TEMPERATURA:\s*(QUENTE|MORNO|FRIO)\]/gi, '').replace(/\[VISITA:[^\]]*\]/gi, '').trim()}
                              </span>
                            </div>
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <span className="font-medium block text-stone-800">{p.address}</span>
                        <span className="text-[10px] text-stone-500 block uppercase">{p.neighborhood} — {p.city}/{p.state}</span>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-1 font-mono text-stone-700">
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-stone-400" /> {p.phone}</span>
                          <a
                            href={`https://wa.me/${p.whatsapp}?text=Olá!%20Sou%20da%20Chaveiro%20Auto,%20vi%20seu%20cadastro%20no%20Chaveiros.net%20e%20gostaria%20de%20apresentar%20nossos%20produtos.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                          >
                            <MessageCircle className="h-3 w-3 text-emerald-600" /> WhatsApp Direto
                          </a>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {p.source === 'erp-db' ? (
                            <Badge className="bg-[#3d2b1f] text-[#c9a96e] border border-[#c9a96e]/20 font-bold text-[9px] rounded-full px-2.5 py-0.5 w-fit">
                              ✔ CLIENTE ATIVO
                            </Badge>
                          ) : inCrm ? (
                            <Badge className="bg-emerald-100 text-emerald-950 border-none font-semibold text-[10px] rounded-full px-2.5 py-0.5 w-fit">
                              <CheckCircle2 className="h-3 w-3 mr-1 inline" /> JÁ É LEAD
                            </Badge>
                          ) : (
                            <Badge className="bg-stone-100 text-stone-750 border-none font-semibold text-[10px] rounded-full px-2.5 py-0.5 w-fit">
                              NOVO PROSPECT
                            </Badge>
                          )}

                          {isVisited && (
                            <Badge className={`border-none font-semibold text-[10px] rounded-full px-2.5 py-0.5 w-fit ${
                              (visit?.type === 'venda' || existingLead?.stage === 'pedido') ? 'bg-emerald-200 text-emerald-950' : 'bg-amber-200 text-amber-950'
                            }`}>
                              {(visit?.type === 'venda' || existingLead?.stage === 'pedido') ? 'VISITA COM VENDA' : 'VISITADO'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.source === 'erp-db' ? (
                            <span className="text-[10px] font-black text-[#c9a96e] uppercase tracking-wider pr-3">
                              Faturamento Ativo
                            </span>
                          ) : showBlockedOnly ? (
                            <Button
                              size="xs"
                              onClick={() => handleUnblockProspect(p.id)}
                              className="font-bold text-[10px] uppercase px-3 h-8 rounded-full shadow-xs cursor-pointer bg-stone-900 text-white hover:bg-stone-850"
                            >
                              🔓 Desbloquear
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="xs"
                                onClick={() => handleOpenVisitModal(p)}
                                className="font-semibold text-[10px] uppercase px-3 h-8 rounded-full shadow-xs cursor-pointer hover:opacity-95"
                                style={{ backgroundColor: '#f5f0e8', color: '#3d2b1f' }}
                              >
                                {isVisited ? 'Re-visitar' : 'Marcar Visita'}
                              </Button>

                              {!inCrm ? (
                                <Button
                                  size="xs"
                                  onClick={() => handleImportToCrm(p)}
                                  className="font-semibold text-[10px] uppercase px-3 h-8 rounded-full shadow-xs cursor-pointer hover:opacity-95"
                                  style={{ backgroundColor: '#c9a96e', color: '#3d2b1f' }}
                                >
                                  <UserPlus className="h-3 w-3 mr-1 text-[#3d2b1f]" /> IMPORTAR CRM
                                </Button>
                              ) : (
                                <Button size="xs" variant="outline" disabled className="text-[10px] uppercase font-medium rounded-full opacity-60">
                                  CADASTRADO
                                </Button>
                              )}

                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleBlockProspect(p.id)}
                                className="text-stone-500 hover:text-red-750 hover:bg-red-50 text-[10px] uppercase font-semibold rounded-full h-8 px-2.5 border-stone-200"
                              >
                                🔒 Bloquear
                              </Button>
                            </>
                          )}

                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name}, ${p.address}, ${p.city}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-stone-600 hover:text-emerald-700 hover:bg-stone-100 rounded-full transition"
                            title="Ver no Google Maps"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
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

      {/* VISIT RECORDING DIALOG */}
      <Dialog open={isVisitModalOpen} onOpenChange={setIsVisitModalOpen}>
        <DialogContent className="max-w-md w-full p-0 gap-0 rounded-2xl bg-white border shadow-2xl flex flex-col overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-6 py-4 border-b bg-white shrink-0 flex items-center gap-3" style={{ borderColor: '#e8e2d8' }}>
            <div className="h-9 w-9 rounded-xl grid place-items-center text-white shrink-0 shadow-xs" style={{ backgroundColor: '#c9a96e' }}>
              <Navigation className="h-4 w-4 text-[#3d2b1f]" />
            </div>
            <DialogTitle className="text-base font-semibold uppercase" style={{ color: '#3d2b1f' }}>REGISTRAR VISITA COMERCIAL</DialogTitle>
          </div>

          <div className="p-6 space-y-4 font-sans text-xs" style={{ backgroundColor: '#faf8f5' }}>
            {selectedProspectForVisit && (
              <div className="p-3 bg-white border rounded-xl space-y-0.5 shadow-2xs" style={{ borderColor: '#e8e2d8' }}>
                <span className="font-semibold block text-stone-900">{selectedProspectForVisit.name}</span>
                <span className="block text-stone-500">{selectedProspectForVisit.address}, {selectedProspectForVisit.neighborhood}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="block font-semibold uppercase text-stone-750">Tipo de Visita Realizada *</label>
              <div className="flex border rounded-full bg-stone-100 p-1" style={{ borderColor: '#e8e2d8' }}>
                <button
                  type="button"
                  onClick={() => {
                    setVisitType('visita');
                    setSelectedCrmStage('contato_feito');
                  }}
                  className={`flex-1 py-2 text-xs font-semibold uppercase rounded-full cursor-pointer transition-colors ${
                    visitType === 'visita' ? 'shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                  style={{
                    backgroundColor: visitType === 'visita' ? '#c9a96e' : 'transparent',
                    color: '#3d2b1f'
                  }}
                >
                  📌 Apenas Visita
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVisitType('venda');
                    setSelectedCrmStage('pedido');
                  }}
                  className={`flex-1 py-2 text-xs font-semibold uppercase rounded-full cursor-pointer transition-colors ${
                    visitType === 'venda' ? 'shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                  style={{
                    backgroundColor: visitType === 'venda' ? '#c9a96e' : 'transparent',
                    color: '#3d2b1f'
                  }}
                >
                  💰 Visita com Venda
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-semibold uppercase text-stone-750">Temperatura do Prospect / Cliente</label>
              <div className="flex border rounded-full bg-stone-100 p-1" style={{ borderColor: '#e8e2d8' }}>
                <button
                  type="button"
                  onClick={() => setSelectedTemperature('quente')}
                  className={`flex-1 py-1.5 text-[11px] font-semibold uppercase rounded-full cursor-pointer transition-colors ${
                    selectedTemperature === 'quente' ? 'shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                  style={{
                    backgroundColor: selectedTemperature === 'quente' ? '#ef4444' : 'transparent',
                    color: selectedTemperature === 'quente' ? '#ffffff' : '#3d2b1f'
                  }}
                >
                  🔥 Quente
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemperature('morno')}
                  className={`flex-1 py-1.5 text-[11px] font-semibold uppercase rounded-full cursor-pointer transition-colors ${
                    selectedTemperature === 'morno' ? 'shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                  style={{
                    backgroundColor: selectedTemperature === 'morno' ? '#f59e0b' : 'transparent',
                    color: selectedTemperature === 'morno' ? '#ffffff' : '#3d2b1f'
                  }}
                >
                  ⚡ Morno
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTemperature('frio')}
                  className={`flex-1 py-1.5 text-[11px] font-semibold uppercase rounded-full cursor-pointer transition-colors ${
                    selectedTemperature === 'frio' ? 'shadow-xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                  style={{
                    backgroundColor: selectedTemperature === 'frio' ? '#3b82f6' : 'transparent',
                    color: selectedTemperature === 'frio' ? '#ffffff' : '#3d2b1f'
                  }}
                >
                  ❄️ Frio
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-semibold uppercase text-stone-750">Estágio / Coluna no CRM</label>
              <select
                value={selectedCrmStage}
                onChange={e => setSelectedCrmStage(e.target.value as CrmStage)}
                className="w-full h-11 px-3 bg-white border border-stone-200 rounded-xl text-xs font-semibold uppercase text-stone-850 cursor-pointer outline-none focus:ring-1 focus:ring-[#c9a96e]"
              >
                <option value="novo_lead">NOVO LEAD</option>
                <option value="contato_feito">CONTATO FEITO</option>
                <option value="negociacao">NEGOCIAÇÃO</option>
                <option value="aguardando_retorno">AGUARDANDO RETORNO</option>
                <option value="cliente">CLIENTE CONVERTIDO</option>
                <option value="pedido">PEDIDO FATURADO</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-semibold uppercase text-stone-750">Anotações / Relato da Visita</label>
              <textarea
                value={visitNotes}
                onChange={e => setVisitNotes(e.target.value)}
                placeholder="Ex: Visitei o estabelecimento. O proprietário elogiou a van, mas hoje não comprou nada porque está com estoque cheio de chaves Fiat."
                className="w-full min-h-24 p-3 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#c9a96e] resize-none"
                style={{ color: '#3d2b1f' }}
              />
            </div>

            <DialogFooter className="pt-4 border-t flex justify-between items-center bg-white -mx-6 -mb-6 p-6 mt-4 shrink-0" style={{ borderColor: '#e8e2d8' }}>
              <Button type="button" variant="outline" onClick={() => setIsVisitModalOpen(false)} className="border-stone-300 text-xs font-semibold uppercase rounded-full h-11 px-6">
                CANCELAR
              </Button>
              <Button
                type="button"
                onClick={handleSaveVisit}
                className="font-bold text-xs uppercase px-8 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95 text-stone-900"
                style={{ backgroundColor: '#c9a96e' }}
              >
                CONFIRMAR VISITA
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
