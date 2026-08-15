import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft, Search, Building2 } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-between font-sans text-stone-900">
      {/* Header */}
      <header className="bg-[#1a1a1a] text-white border-b border-stone-800 py-3.5 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img 
              src="/logo.png" 
              alt="Prime Chaves Codificadas" 
              className="h-9 w-auto object-contain brightness-0 invert" 
            />
          </Link>
          <Link href="/admin">
            <Button variant="outline" size="sm" className="border-stone-700 text-stone-300 hover:bg-stone-800 text-xs">
              Acesso ERP
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-stone-300 rounded-[2px] p-8 text-center shadow-xs">
          <div className="inline-flex p-3 bg-amber-50 text-[#e8590c] border border-amber-200 rounded-[2px] mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <h1 className="text-4xl font-black tracking-tight text-stone-900 mb-1 uppercase">404</h1>
          <h2 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">PÁGINA OU CÓDIGO NÃO ENCONTRADO</h2>

          <p className="text-xs text-stone-600 mb-6 leading-relaxed">
            A peça, código SKU ou rota solicitada não existe em nosso catálogo de autopeças ou foi descontinuada.
          </p>

          <div className="space-y-2">
            <Link href="/">
              <Button className="w-full bg-[#e8590c] hover:bg-[#d9480f] text-white font-bold uppercase tracking-wider text-xs">
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Catálogo de Peças
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-stone-900 border-t border-stone-800 py-4 px-6 text-center text-xs text-stone-500 font-mono">
        PRIME AUTOMOTIVE — SISTEMA INDUSTRIAL DE AUTOPEÇAS © 2026
      </footer>
    </div>
  );
}
