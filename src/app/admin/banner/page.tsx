'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';
import { Banner } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import {
  Image as ImageIcon,
  Upload,
  Save,
  Eye,
  CheckCircle2,
  AlertCircle,
  Tag,
  Type,
  Link as LinkIcon,
  Sparkles,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';

export default function AdminBannerPage() {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonLink, setButtonLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadBanner();
  }, []);

  const loadBanner = async () => {
    setLoading(true);
    try {
      const data = await dbService.getBanner();
      setBanner(data);
      setTitle(data.title);
      setSubtitle(data.subtitle);
      setBadgeText(data.badge);
      setButtonText(data.button_text);
      setButtonLink(data.button_link);
      setImageUrl(data.image_url);
      setIsActive(data.is_active);
    } catch (e) {
      console.error(e);
      toast.add({ title: 'Erro', description: 'Não foi possível carregar as configurações do banner.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.add({ title: 'Arquivo inválido', description: 'Por favor, selecione um arquivo de imagem.', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(event.target.result as string);
        toast.add({
          title: 'Imagem Carregada!',
          description: 'A imagem foi atualizada no pré-visualizador.',
          type: 'success'
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dbService.updateBanner({
        title,
        subtitle,
        badge: badgeText,
        button_text: buttonText,
        button_link: buttonLink,
        image_url: imageUrl,
        is_active: isActive
      });

      toast.add({
        title: 'Banner Atualizado!',
        description: 'As alterações da oferta e imagem foram salvas e aplicadas na loja virtual.',
        type: 'success'
      });
      loadBanner();
    } catch (e: any) {
      toast.add({ title: 'Erro ao Salvar', description: e.message || 'Falha ao atualizar o banner.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center font-mono text-stone-500 text-xs">
        <div className="h-6 w-6 animate-spin border-2 border-[#e8590c] border-t-transparent mx-auto mb-2" />
        Carregando gerenciador de banners...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* ── HEADER BANNER ────────────────────────────────────────────── */}
      <div className="border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs" style={{ backgroundColor: '#ffffff', borderColor: '#e8e2d8' }}>
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest block mb-1" style={{ color: '#c9a96e' }}>
            GERENCIADOR DA LOJA VIRTUAL
          </span>
          <h1 className="text-xl font-black uppercase tracking-tight" style={{ color: '#3d2b1f' }}>
            GERENCIADOR DO BANNER PROMOCIONAL
          </h1>
          <p className="text-xs font-medium mt-1" style={{ color: '#8b7355' }}>
            Configure a foto em alta resolução, chamada da oferta, botão CTA e status de exibição da frente da loja.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="text-white font-bold text-xs uppercase px-6 h-11 rounded-full shadow-xs cursor-pointer transition hover:opacity-95"
          style={{ backgroundColor: '#c9a96e' }}
        >
          {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          SALVAR ALTERAÇÕES NA LOJA
        </Button>
      </div>

      {/* Live Preview Card */}
      <div className="bg-white border p-6 rounded-2xl space-y-4 shadow-xs" style={{ borderColor: '#e8e2d8' }}>
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: '#e8e2d8' }}>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" style={{ color: '#c9a96e' }} />
            <span className="text-xs font-black uppercase tracking-wider" style={{ color: '#3d2b1f' }}>
              PRÉ-VISUALIZAÇÃO EM TEMPO REAL DA FRENTE DA LOJA
            </span>
          </div>
          <Badge className={isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-mono text-[10px] uppercase rounded-full' : 'bg-red-100 text-red-800 border-red-300 font-mono text-[10px] uppercase rounded-full'}>
            {isActive ? 'BANNER ATIVO NA VITRINE' : 'BANNER OCULTO'}
          </Badge>
        </div>

        {/* Live Storefront Banner Box */}
        <div className="bg-stone-50 border border-stone-300 rounded-[6px] p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left Image (5 cols) */}
            <div className="md:col-span-5 aspect-[16/10] bg-stone-200 rounded-[4px] overflow-hidden border border-stone-300 relative shadow-inner">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Live Preview Banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 font-mono text-xs">
                  <ImageIcon className="h-8 w-8 mb-1" />
                  Sem Imagem
                </div>
              )}
            </div>

            {/* Right Offer Content (7 cols) */}
            <div className="md:col-span-7 space-y-3">
              {badgeText && (
                <Badge className="bg-[#e8590c] text-white border-none font-bold text-[9px] uppercase px-2.5 py-0.5">
                  {badgeText}
                </Badge>
              )}

              <h2 className="text-lg sm:text-xl font-black uppercase text-stone-900 leading-tight">
                {title || 'Título da Oferta Promocional'}
              </h2>

              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                {subtitle || 'Descrição da campanha promocional de atacado.'}
              </p>

              <div className="pt-2">
                <Button className="bg-stone-900 hover:bg-[#e8590c] text-white font-bold text-xs uppercase px-5 h-10 rounded-[4px] shadow-xs pointer-events-none">
                  {buttonText || 'VER OFERTAS'} <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Form */}
      <form onSubmit={handleSave} className="bg-white border border-stone-300 p-6 rounded-[2px] space-y-6">
        <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
          <SlidersHorizontal className="h-4 w-4 text-[#e8590c]" />
          <span className="text-xs font-black uppercase text-stone-900 tracking-wider">
            CONFIGURAÇÕES DA IMAGEM E CHAMADA DE OFERTA
          </span>
        </div>

        {/* Image Upload Box */}
        <div className="space-y-3 bg-stone-50 p-4 border border-stone-200 rounded-[4px]">
          <label className="block text-xs font-bold text-stone-900 uppercase">
            1. FOTO DO BANNER (CHAVES & PEÇAS AUTOMOTIVAS)
          </label>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="h-10 px-4 bg-stone-900 hover:bg-[#e8590c] text-white font-bold text-xs uppercase rounded-[4px] flex items-center gap-2 transition-colors">
                <Upload className="h-4 w-4" /> SELECIONAR IMAGEM DO COMPUTADOR
              </div>
            </label>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setImageUrl('/promo_banner_keys.jpg');
                toast.add({ title: 'Foto Padrão Aplicada', description: 'Foto HD de chaves codificadas selecionada.', type: 'info' });
              }}
              className="h-10 border-stone-300 text-stone-700 text-xs font-bold uppercase rounded-[4px]"
            >
              USAR FOTO HD PADRÃO (CHAVES)
            </Button>
          </div>

          <div className="space-y-1 pt-2">
            <label className="block text-[10px] font-bold text-stone-500 uppercase">OU INSIRA O LINK / URL DA IMAGEM:</label>
            <Input
              type="text"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://exemplo.com/imagem-banner.jpg"
              className="h-9 bg-white text-xs border-stone-300 rounded-[4px]"
            />
          </div>
        </div>

        {/* Text Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-900 uppercase mb-1">
              BADGE / TAG EM DESTAQUE (TEXTO CURTO COM COR) *
            </label>
            <Input
              type="text"
              value={badgeText}
              onChange={e => setBadgeText(e.target.value)}
              placeholder="Ex: OFERTA DE ATACADO — PRONTA ENTREGA"
              required
              className="h-10 text-xs border-stone-300 rounded-[4px]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-900 uppercase mb-1">
              STATUS DE EXIBIÇÃO NA VITRINE *
            </label>
            <select
              value={isActive ? 'active' : 'inactive'}
              onChange={e => setIsActive(e.target.value === 'active')}
              className="w-full h-10 bg-white border border-stone-300 text-stone-900 text-xs px-3 rounded-[4px] focus:border-[#e8590c] focus:outline-none cursor-pointer font-bold uppercase"
            >
              <option value="active">EXIBIR BANNER NA FRENTE DA LOJA</option>
              <option value="inactive">OCULTAR BANNER DA FRENTE DA LOJA</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-stone-900 uppercase mb-1">
              CHAMADA DA OFERTA / TÍTULO PRINCIPAL *
            </label>
            <Input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: CHAVES CODIFICADAS & CARCAÇAS DE ATACADO COM 20% OFF"
              required
              className="h-10 text-xs font-bold border-stone-300 rounded-[4px]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-stone-900 uppercase mb-1">
              SUBTÍTULO / DESCRIÇÃO DA CAMPANHA *
            </label>
            <textarea
              rows={3}
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              placeholder="Ex: Condição exclusiva para chaveiros, auto elétricas e concessionárias..."
              required
              className="w-full p-3 bg-white border border-stone-300 text-stone-900 text-xs rounded-[4px] focus:border-[#e8590c] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-900 uppercase mb-1">
              TEXTO DO BOTÃO CTA *
            </label>
            <Input
              type="text"
              value={buttonText}
              onChange={e => setButtonText(e.target.value)}
              placeholder="Ex: VER OFERTAS DE PACOTE"
              required
              className="h-10 text-xs border-stone-300 rounded-[4px]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-900 uppercase mb-1">
              LINK DE DESTINO DO BOTÃO *
            </label>
            <Input
              type="text"
              value={buttonLink}
              onChange={e => setButtonLink(e.target.value)}
              placeholder="Ex: /#catalogo"
              required
              className="h-10 text-xs border-stone-300 rounded-[4px]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-stone-200 flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="bg-[#e8590c] hover:bg-[#d9480f] text-white font-bold text-xs uppercase px-8 h-11 rounded-[4px] shadow-sm"
          >
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            SALVAR BANNER E PUBLICAR NA LOJA
          </Button>
        </div>
      </form>
    </div>
  );
}
