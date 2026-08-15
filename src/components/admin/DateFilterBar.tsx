'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { DatePreset } from '@/lib/date-filters';

interface DateFilterBarProps {
  preset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  className?: string;
}

export function DateFilterBar({
  preset,
  onPresetChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  className = ''
}: DateFilterBarProps) {
  const presets: { id: DatePreset; label: string }[] = [
    { id: 'all', label: 'TODOS' },
    { id: 'hj', label: 'HJ' },
    { id: 'semana', label: 'ESSA SEMANA' },
    { id: 'mes', label: 'ESSE MÊS' },
    { id: 'mes_passado', label: 'MÊS PASSADO' },
    { id: 'custom', label: 'PERSONALIZADO' },
  ];

  return (
    <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-2 bg-[#fdfcfb] border rounded-2xl lg:rounded-full shadow-2xs ${className}`} style={{ borderColor: '#e8e2d8' }}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 text-white" style={{ backgroundColor: '#e8590c' }}>
          <Calendar className="h-3.5 w-3.5" />
          <span>PERÍODO</span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          {presets.map(p => {
            const isActive = preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPresetChange(p.id)}
                className="px-3.5 py-1.5 text-[10px] font-bold uppercase rounded-full cursor-pointer transition-all duration-200 active:scale-[0.97]"
                style={{
                  backgroundColor: isActive ? '#3d2b1f' : 'transparent',
                  color: isActive ? '#ffffff' : '#8b7355'
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 shrink-0 animate-in fade-in slide-in-from-right-3 duration-200 px-2 lg:px-4 py-1 lg:py-0 border-t lg:border-t-0 lg:border-l border-stone-200">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: '#8b7355' }}>De:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => onStartDateChange(e.target.value)}
              className="h-8 px-3 bg-stone-50 border border-stone-200 rounded-full text-xs font-mono font-medium outline-none focus:border-[#e8590c] focus:ring-1 focus:ring-[#e8590c] transition-all"
              style={{ color: '#3d2b1f' }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: '#8b7355' }}>Até:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => onEndDateChange(e.target.value)}
              className="h-8 px-3 bg-stone-50 border border-stone-200 rounded-full text-xs font-mono font-medium outline-none focus:border-[#e8590c] focus:ring-1 focus:ring-[#e8590c] transition-all"
              style={{ color: '#3d2b1f' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
