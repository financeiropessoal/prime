import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft, Search, Building2 } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col justify-between font-sans text-stone-900" style={{ backgroundColor: '#faf8f5' }}>
      {/* Header */}
      <header className="bg-white border-b py-3.5 px-6" style={{ borderColor: '#e8e2d8' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img 
              src="/logo.png" 
              alt="Prime Chaves Codificadas" 
              className="h-9 w-auto object-contain" 
            />
          </Link>
          <Link href="/admin">
            <Button variant="outline" size="sm" className="text-xs font-bold rounded-full transition border" style={{ borderColor: '#c9a96e', color: '#5a4633' }}>
              Acesso ERP
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border rounded-2xl p-8 text-center shadow-md" style={{ borderColor: '#e8e2d8' }}>
          <div className="inline-flex p-3 rounded-full mb-4" style={{ backgroundColor: '#faf8f5', border: '1px solid #e8e2d8', color: '#c9a96e' }}>
            <ShieldAlert className="h-8 w-8" />
          </div>

          <h1 className="text-5xl font-black tracking-tight mb-1 uppercase" style={{ color: '#3d2b1f' }}>404</h1>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#8b7355' }}>PÁGINA OU CÓDIGO NÃO ENCONTRADO</h2>

          <p className="text-xs text-stone-600 mb-6 leading-relaxed">
            A peça, código SKU ou rota solicitada não existe em nosso catálogo de autopeças ou foi descontinuada.
          </p>

          <div className="space-y-2">
            <Link href="/">
              <Button className="w-full text-white font-extrabold uppercase tracking-wider text-xs h-11 rounded-full shadow-md transition hover:opacity-90 active:scale-95" style={{ backgroundColor: '#c9a96e' }}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Catálogo de Peças
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 px-6 text-center text-xs font-mono" style={{ backgroundColor: '#faf8f5', borderColor: '#e8e2d8', color: '#8b7355' }}>
        PRIME AUTOMOTIVE — SISTEMA INDUSTRIAL DE AUTOPEÇAS © 2026
      </footer>
    </div>
  );
}
