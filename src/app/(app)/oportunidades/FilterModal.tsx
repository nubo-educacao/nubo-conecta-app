'use client';

import type { ExploreFilters } from '@/types/opportunities';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const SHIFT_OPTIONS = [
  { label: 'Todos os turnos', value: '' },
  { label: 'Matutino',       value: 'Matutino' },
  { label: 'Vespertino',     value: 'Vespertino' },
  { label: 'Noturno',        value: 'Noturno' },
  { label: 'Integral',       value: 'Integral' },
  { label: 'EaD / Online',   value: 'EaD' },
];

const IGC_OPTIONS = [
  { label: 'Qualquer conceito', value: '' },
  { label: 'Conceito 3+',      value: '3' },
  { label: 'Conceito 4+',      value: '4' },
  { label: 'Conceito 5',       value: '5' },
];

const PRICE_OPTIONS = [
  { label: 'Todos os preços', value: '' },
  { label: 'Gratuito',       value: 'free' },
  { label: 'Pago / Parceiro', value: 'paid' },
];

const UF_OPTIONS = [
  { label: 'Todos os estados', value: '' },
  'AC','AL','AP','AM','BA','CE','DF','ES','GO',
  'MA','MT','MS','MG','PA','PB','PR','PE','PI',
  'RJ','RN','RS','RO','RR','SC','SP','SE','TO',
].map((uf) =>
  typeof uf === 'string' ? { label: uf, value: uf } : uf,
);

interface FilterModalProps {
  open: boolean;
  onClose: () => void;
  modality?: string;
  location?: string;
  shift?: string;
  min_igc?: number;
  price_range?: string;
  onApply: (filters: Partial<ExploreFilters>) => void;
}

export default function FilterModal({ 
  open, 
  onClose, 
  location, 
  shift, 
  min_igc, 
  price_range, 
  onApply 
}: FilterModalProps) {
  const [localLocation, setLocalLocation] = useState<string>(location ?? '');
  const [localShift, setLocalShift] = useState<string>(shift ?? '');
  const [localMinIGC, setLocalMinIGC] = useState<string>(min_igc?.toString() ?? '');
  const [localPriceRange, setLocalPriceRange] = useState<string>(price_range ?? '');

  // Reset local state when modal opens
  useEffect(() => {
    if (open) {
      setLocalLocation(location ?? '');
      setLocalShift(shift ?? '');
      setLocalMinIGC(min_igc?.toString() ?? '');
      setLocalPriceRange(price_range ?? '');
    }
  }, [open, location, shift, min_igc, price_range]);

  const handleApply = () => {
    onApply({
      location: localLocation || undefined,
      shift: (localShift as any) || undefined,
      min_igc: localMinIGC ? parseInt(localMinIGC) : undefined,
      price_range: (localPriceRange as any) || undefined,
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Hybrid Modal Card */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className={cn(
               "relative w-full sm:max-w-md bg-white shadow-2xl flex flex-col gap-6 transform transition-all",
               "rounded-t-[32px] sm:rounded-[24px]", // Mobile bottom sheet vs Desktop modal
               "p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pb-6" // Safe area padding
            )}
            role="dialog"
            aria-label="Filtros avançados"
          >
            {/* Mobile Drag Indicator */}
            <div className="w-full flex justify-center sm:hidden pb-2 -mt-2">
              <div className="w-12 h-1.5 bg-nubo-line rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="font-sans font-bold text-[18px] text-nubo-text-head">
                Filtros
              </span>
              <button 
                onClick={onClose} 
                aria-label="Fechar filtros"
                className="text-nubo-nav-inactive hover:text-nubo-text-head transition-colors"
              >
                <X size={20} />
              </button>
            </div>


            {/* Turno */}
            <div className="flex flex-col gap-2">
              <label className="font-sans font-semibold text-[13px] text-nubo-text-head">
                Turno
              </label>
              <select
                value={localShift}
                onChange={(e) => setLocalShift(e.target.value)}
                className="w-full rounded-[12px] px-4 h-[48px] text-[15px] font-sans font-medium text-nubo-text-head bg-white outline-none border border-nubo-line focus:border-nubo-primary focus:ring-1 focus:ring-nubo-primary transition-all"
              >
                {SHIFT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Conceito MEC (IGC) */}
            <div className="flex flex-col gap-2">
              <label className="font-sans font-semibold text-[13px] text-nubo-text-head">
                Qualidade MEC (Conceito IGC)
              </label>
              <select
                value={localMinIGC}
                onChange={(e) => setLocalMinIGC(e.target.value)}
                className="w-full rounded-[12px] px-4 h-[48px] text-[15px] font-sans font-medium text-nubo-text-head bg-white outline-none border border-nubo-line focus:border-nubo-primary focus:ring-1 focus:ring-nubo-primary transition-all"
              >
                {IGC_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Preço */}
            <div className="flex flex-col gap-2">
              <label className="font-sans font-semibold text-[13px] text-nubo-text-head">
                Preço
              </label>
              <select
                value={localPriceRange}
                onChange={(e) => setLocalPriceRange(e.target.value)}
                className="w-full rounded-[12px] px-4 h-[48px] text-[15px] font-sans font-medium text-nubo-text-head bg-white outline-none border border-nubo-line focus:border-nubo-primary focus:ring-1 focus:ring-nubo-primary transition-all"
              >
                {PRICE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div className="flex flex-col gap-2">
              <label className="font-sans font-semibold text-[13px] text-nubo-text-head">
                Estado
              </label>
              <select
                value={localLocation}
                onChange={(e) => setLocalLocation(e.target.value)}
                className="w-full rounded-[12px] px-4 h-[48px] text-[15px] font-sans font-medium text-nubo-text-head bg-white outline-none border border-nubo-line focus:border-nubo-primary focus:ring-1 focus:ring-nubo-primary transition-all"
              >
                {UF_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Aplicar */}
            <button
              onClick={handleApply}
              className="w-full rounded-[12px] h-[52px] font-sans font-semibold text-[16px] text-white bg-nubo-primary hover:bg-nubo-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-nubo-primary/20 mt-2"
            >
              Aplicar filtros
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
