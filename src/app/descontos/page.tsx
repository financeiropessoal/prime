'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  TrendingUp,
  Trophy,
  Check,
  Building2,
  Tag,
  ShoppingCart
} from 'lucide-react';

export default function DescontosPage() {
  return (
    <div className="min-h-screen w-full font-sans antialiased pb-20" style={{ backgroundColor: '#faf8f5', color: '#3d2b1f' }}>

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ backgroundColor: 'rgba(255,255,255,0.9)', borderColor: '#e8e2d8' }}>
        <div className="max-w-5xl mx-auto h-14 px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img 
              src="/logo.png" 
              alt="Prime Chaves Codificadas" 
              className="h-9 w-auto object-contain"
            />
          </Link>

          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold px-4 h-9 rounded-full border transition hover:bg-stone-100" style={{ borderColor: '#e8e2d8', color: '#3d2b1f' }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Catálogo
          </Link>
        </div>
      </header>

      {/* ── HERO EXPLANATION ────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pt-10 pb-6 text-center space-y-4">
        <span className="inline-block text-[11px] font-black tracking-[0.25em] uppercase px-4 py-1.5 rounded-full shadow-2xs" style={{ backgroundColor: '#c9a96e', color: '#ffffff' }}>
          COMO VOCÊ ECONOMIZA
        </span>

        <h1 className="text-3xl sm:text-5xl font-black leading-[1.05] tracking-tight" style={{ color: '#3d2b1f' }}>
          Quanto mais você leva, <span style={{ color: '#c9a96e' }}>mais barato fica.</span>
        </h1>

        <p className="text-base sm:text-lg max-w-2xl mx-auto font-medium" style={{ color: '#8b7355' }}>
          Nosso preço muda automaticamente conforme o valor total do seu pedido. Sem cupom, sem cadastro especial, sem letrinha miúda.
        </p>
      </section>

      {/* ── 3 STEPS CARDS ───────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-4">
        <div className="rounded-3xl p-6 sm:p-8 grid gap-4 sm:grid-cols-3 border shadow-xs" style={{ backgroundColor: '#ffffff', borderColor: '#e8e2d8' }}>
          <div className="flex gap-3 items-start">
            <span className="h-10 w-10 shrink-0 grid place-items-center rounded-full font-black text-sm" style={{ backgroundColor: '#f5f0e8', color: '#c9a96e' }}>
              1
            </span>
            <div>
              <div className="font-bold text-sm" style={{ color: '#3d2b1f' }}>Você monta seu pedido</div>
              <div className="text-xs font-medium mt-0.5" style={{ color: '#8b7355' }}>Escolhe as peças que quer levar.</div>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <span className="h-10 w-10 shrink-0 grid place-items-center rounded-full font-black text-sm" style={{ backgroundColor: '#f5f0e8', color: '#c9a96e' }}>
              2
            </span>
            <div>
              <div className="font-bold text-sm" style={{ color: '#3d2b1f' }}>O sistema soma tudo</div>
              <div className="text-xs font-medium mt-0.5" style={{ color: '#8b7355' }}>Somamos o valor total do carrinho pra você.</div>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <span className="h-10 w-10 shrink-0 grid place-items-center rounded-full font-black text-sm" style={{ backgroundColor: '#f5f0e8', color: '#c9a96e' }}>
              3
            </span>
            <div>
              <div className="font-bold text-sm" style={{ color: '#3d2b1f' }}>O preço cai sozinho</div>
              <div className="text-xs font-medium mt-0.5" style={{ color: '#8b7355' }}>Cada peça passa para a tabela correspondente.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── THE 3 DISCOUNT TABLES ───────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-xl sm:text-2xl font-black mb-1" style={{ color: '#3d2b1f' }}>
          As três tabelas de desconto
        </h2>
        <p className="text-sm mb-6 font-medium" style={{ color: '#8b7355' }}>
          Exemplo real com uma <b className="text-stone-900">capa</b>, uma <b className="text-stone-900">chave</b> e um <b className="text-stone-900">controle</b>:
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Tabela 1 */}
          <div className="rounded-3xl p-6 flex flex-col border-2 bg-white" style={{ borderColor: '#e8e2d8' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-10 w-10 grid place-items-center rounded-xl" style={{ backgroundColor: 'rgba(139,115,85,0.12)', color: '#8b7355' }}>
                <Sparkles className="h-5 w-5" />
              </span>
            </div>
            <div className="text-lg font-black" style={{ color: '#3d2b1f' }}>Tabela de Desconto 1</div>
            <div className="text-xs font-bold mt-1" style={{ color: '#8b7355' }}>Compras até R$ 499</div>
            <p className="text-xs mt-2 mb-5 font-medium" style={{ color: '#8b7355' }}>Ideal para começar. Preço já pensado para o revendedor.</p>
            
            <div className="rounded-2xl p-4 space-y-3 mt-auto" style={{ backgroundColor: '#f5f0e8' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: '#8b7355' }}>Capa</span>
                <span className="text-base font-black" style={{ color: '#3d2b1f' }}>R$ 4,50</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: '#8b7355' }}>Chave</span>
                <span className="text-base font-black" style={{ color: '#3d2b1f' }}>R$ 45,00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: '#8b7355' }}>Controle</span>
                <span className="text-base font-black" style={{ color: '#3d2b1f' }}>R$ 35,00</span>
              </div>
            </div>
          </div>

          {/* Tabela 2 */}
          <div className="rounded-3xl p-6 flex flex-col border-2 bg-white" style={{ borderColor: '#e8e2d8' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-10 w-10 grid place-items-center rounded-xl" style={{ backgroundColor: 'rgba(166,124,82,0.15)', color: '#a67c52' }}>
                <TrendingUp className="h-5 w-5" />
              </span>
            </div>
            <div className="text-lg font-black" style={{ color: '#3d2b1f' }}>Tabela de Desconto 2</div>
            <div className="text-xs font-bold mt-1" style={{ color: '#a67c52' }}>Compras de R$ 500 a R$ 999</div>
            <p className="text-xs mt-2 mb-5 font-medium" style={{ color: '#8b7355' }}>Passou de R$ 500 no carrinho? Todas as peças ficam mais baratas.</p>
            
            <div className="rounded-2xl p-4 space-y-3 mt-auto" style={{ backgroundColor: '#f5f0e8' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: '#8b7355' }}>Capa</span>
                <span className="text-base font-black" style={{ color: '#3d2b1f' }}>R$ 4,30</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: '#8b7355' }}>Chave</span>
                <span className="text-base font-black" style={{ color: '#3d2b1f' }}>R$ 43,00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: '#8b7355' }}>Controle</span>
                <span className="text-base font-black" style={{ color: '#3d2b1f' }}>R$ 33,00</span>
              </div>
            </div>
          </div>

          {/* Tabela 3 */}
          <div className="rounded-3xl p-6 flex flex-col border-2 bg-white shadow-lg relative overflow-hidden" style={{ borderColor: '#c9a96e' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="h-10 w-10 grid place-items-center rounded-xl" style={{ backgroundColor: 'rgba(201,169,110,0.2)', color: '#c9a96e' }}>
                <Trophy className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: '#c9a96e' }}>
                MELHOR PREÇO
              </span>
            </div>
            <div className="text-lg font-black" style={{ color: '#3d2b1f' }}>Tabela de Desconto 3</div>
            <div className="text-xs font-bold mt-1" style={{ color: '#c9a96e' }}>Compras a partir de R$ 1.000</div>
            <p className="text-xs mt-2 mb-5 font-medium" style={{ color: '#8b7355' }}>O melhor preço da casa. É o preço que também vale nos pacotes fechados.</p>
            
            <div className="rounded-2xl p-4 space-y-3 mt-auto" style={{ backgroundColor: '#f5f0e8' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: '#8b7355' }}>Capa</span>
                <span className="text-base font-black" style={{ color: '#3d2b1f' }}>R$ 4,00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: '#8b7355' }}>Chave</span>
                <span className="text-base font-black" style={{ color: '#3d2b1f' }}>R$ 40,00</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: '#8b7355' }}>Controle</span>
                <span className="text-base font-black" style={{ color: '#3d2b1f' }}>R$ 30,00</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── REAL LIFE EXAMPLE ───────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-8">
        <div className="rounded-3xl p-6 sm:p-8 bg-white border" style={{ borderColor: '#e8e2d8' }}>
          <h2 className="text-xl sm:text-2xl font-black mb-2" style={{ color: '#3d2b1f' }}>
            Um exemplo pra ficar fácil
          </h2>
          <p className="text-sm mb-5 font-medium" style={{ color: '#8b7355' }}>
            Digamos que você monte um pedido com <b className="text-stone-900">10 chaves</b>:
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl p-4 border" style={{ backgroundColor: '#f5f0e8', borderColor: '#e8e2d8' }}>
              <div className="text-sm font-bold" style={{ color: '#3d2b1f' }}>Só 10 chaves</div>
              <div className="text-xs mt-1 font-medium" style={{ color: '#8b7355' }}>Total do pedido: R$ 450</div>
              <div className="inline-block mt-3 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full" style={{ backgroundColor: '#e8e2d8', color: '#3d2b1f' }}>
                Tabela 1
              </div>
              <div className="text-lg font-black mt-2" style={{ color: '#3d2b1f' }}>R$ 45,00 cada</div>
            </div>

            <div className="rounded-2xl p-4 bg-white border" style={{ borderColor: '#c9a96e' }}>
              <div className="text-sm font-bold" style={{ color: '#3d2b1f' }}>Adicionou mais 2 chaves</div>
              <div className="text-xs mt-1 font-medium" style={{ color: '#8b7355' }}>Total do pedido: R$ 516</div>
              <div className="inline-block mt-3 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: '#c9a96e' }}>
                Tabela 2
              </div>
              <div className="text-lg font-black mt-2" style={{ color: '#3d2b1f' }}>R$ 43,00 cada</div>
            </div>

            <div className="rounded-2xl p-4 bg-white border" style={{ borderColor: '#c9a96e' }}>
              <div className="text-sm font-bold" style={{ color: '#3d2b1f' }}>Fechou 25 chaves</div>
              <div className="text-xs mt-1 font-medium" style={{ color: '#8b7355' }}>Total do pedido: R$ 1.000</div>
              <div className="inline-block mt-3 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: '#c9a96e' }}>
                Tabela 3
              </div>
              <div className="text-lg font-black mt-2" style={{ color: '#3d2b1f' }}>R$ 40,00 cada</div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl p-4 flex gap-3 items-start" style={{ backgroundColor: '#f5f0e8' }}>
            <Check className="h-5 w-5 shrink-0 mt-0.5" style={{ color: '#c9a96e' }} />
            <p className="text-sm font-medium" style={{ color: '#3d2b1f' }}>
              <b>Não precisa recalcular nada.</b> Enquanto você monta o carrinho, o próprio sistema troca o preço de todas as peças assim que o total do pedido chega em uma nova tabela.
            </p>
          </div>
        </div>
      </section>

      {/* ── CLOSED PACKAGES ─────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-10">
        <div className="rounded-3xl p-6 sm:p-8 border" style={{ backgroundColor: '#f5f0e8', borderColor: '#e8e2d8' }}>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-5 w-5" style={{ color: '#c9a96e' }} />
            <h2 className="text-lg sm:text-xl font-black" style={{ color: '#3d2b1f' }}>
              E os pacotes fechados?
            </h2>
          </div>

          <p className="text-sm mb-4 font-medium" style={{ color: '#3d2b1f' }}>
            Toda peça vendida em <b className="text-stone-900">pacote fechado</b> já sai direto no preço da <b>Tabela de Desconto 3</b> — o melhor preço da casa. É a forma mais rápida de garantir o menor valor por peça.
          </p>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-2xl p-4 bg-white border" style={{ borderColor: '#e8e2d8' }}>
              <div className="text-xs uppercase tracking-wider font-bold" style={{ color: '#8b7355' }}>Capas</div>
              <div className="text-2xl font-black mt-1" style={{ color: '#c9a96e' }}>Pacote com 10</div>
              <div className="text-xs mt-1 font-medium" style={{ color: '#8b7355' }}>do mesmo modelo</div>
            </div>

            <div className="rounded-2xl p-4 bg-white border" style={{ borderColor: '#e8e2d8' }}>
              <div className="text-xs uppercase tracking-wider font-bold" style={{ color: '#8b7355' }}>Controles</div>
              <div className="text-2xl font-black mt-1" style={{ color: '#c9a96e' }}>Pacote com 10</div>
              <div className="text-xs mt-1 font-medium" style={{ color: '#8b7355' }}>do mesmo modelo</div>
            </div>

            <div className="rounded-2xl p-4 bg-white border" style={{ borderColor: '#e8e2d8' }}>
              <div className="text-xs uppercase tracking-wider font-bold" style={{ color: '#8b7355' }}>Chaves</div>
              <div className="text-2xl font-black mt-1" style={{ color: '#c9a96e' }}>Pacote com 5</div>
              <div className="text-xs mt-1 font-medium" style={{ color: '#8b7355' }}>do mesmo modelo</div>
            </div>
          </div>

          <p className="text-xs mt-4 font-medium" style={{ color: '#8b7355' }}>
            * Pacotes são sempre do <b>mesmo modelo</b> — não é possível misturar modelos diferentes dentro de um mesmo pacote.
          </p>
        </div>
      </section>

      {/* ── BOTTOM CTA ──────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 text-center space-y-3">
        <Link href="/">
          <button
            className="inline-flex items-center gap-2 h-12 px-8 rounded-full text-sm font-black shadow-md transition hover:opacity-95 cursor-pointer"
            style={{ backgroundColor: '#c9a96e', color: '#ffffff' }}
          >
            <span>Montar meu pedido agora</span>
            <ShoppingCart className="h-4 w-4" />
          </button>
        </Link>
        <p className="text-xs font-medium" style={{ color: '#8b7355' }}>
          Dúvidas? Fale com a gente: (34) 99865-1112
        </p>
      </section>

    </div>
  );
}
