'use client';

import type { ExploreFilters } from '@/types/opportunities';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

import { createPortal } from 'react-dom';

const MODALITY_OPTIONS = [
  { label: 'Todas as modalidades', value: '' },
  { label: 'Presencial',           value: 'presential' },
  { label: 'Online / EaD',         value: 'online' },
];

const UF_OPTIONS = [
  { label: 'Todos os estados', value: '' },
  'AC','AL','AP','AM','BA','CE','DF','ES','GO',
  'MA','MT','MS','MG','PA','PB','PR','PE','PI',
  'RJ','RN','RS','RO','RR','SC','SP','SE','TO',
].map((uf) =>
  typeof uf === 'string' ? { label: uf, value: uf } : uf,
);

const SHIFT_OPTIONS = ['Matutino', 'Vespertino', 'Noturno', 'Integral', 'EaD'];

const PROGRAM_OPTIONS = [
  { label: 'Todos',            value: '' },
  { label: 'SISU',             value: 'sisu' },
  { label: 'ProUni',           value: 'prouni' },
  { label: 'Bolsa (parceiro)', value: 'programa de bolsa' },
];

const UNIVERSITY_OPTIONS = [
  { label: 'Todas',    value: '' },
  { label: 'Pública',  value: 'publica' },
  { label: 'Privada',  value: 'privada' },
];

const QUOTA_OPTIONS = [
  { label: 'Ampla Concorrência', value: 'AMPLA_CONCORRENCIA' },
  { label: 'PPI (Preto, Pardo, Indígena)', value: 'PPI' },
  { label: 'PCD',                value: 'PCD' },
  { label: 'Escola Pública',     value: 'ESCOLA_PUBLICA' },
  { label: 'Baixa Renda',        value: 'BAIXA_RENDA' },
];

interface FilterModalProps {
  open: boolean;
  onClose: () => void;
  modality?: string;
  location?: string;
  city?: string;
  shifts?: string[];
  quota_types?: string[];
  program_preference?: string;
  university_preference?: string;
  onApply: (filters: Partial<ExploreFilters>) => void;
}

export default function FilterModal(props: FilterModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!props.open || !mounted) return null;

  return createPortal(
    <ModalContent {...props} />,
    document.body
  );
}

function ModalContent({
  onClose,
  modality,
  location,
  city,
  shifts,
  quota_types,
  program_preference,
  university_preference,
  onApply,
}: Omit<FilterModalProps, 'open'>) {
  const [localModality, setLocalModality]     = useState<string>(modality ?? '');
  const [localLocation, setLocalLocation]     = useState<string>(location ?? '');
  const [localCity, setLocalCity]             = useState<string>(city ?? '');
  const [localShifts, setLocalShifts]         = useState<string[]>(shifts ?? []);
  const [localQuotas, setLocalQuotas]         = useState<string[]>(quota_types ?? []);
  const [localProgram, setLocalProgram]       = useState<string>(program_preference ?? '');
  const [localUniversity, setLocalUniversity] = useState<string>(university_preference ?? '');

  useEffect(() => {
    setLocalModality(modality ?? '');
    setLocalLocation(location ?? '');
    setLocalCity(city ?? '');
    setLocalShifts(shifts ?? []);
    setLocalQuotas(quota_types ?? []);
    setLocalProgram(program_preference ?? '');
    setLocalUniversity(university_preference ?? '');
  }, [modality, location, city, shifts, quota_types, program_preference, university_preference]);

  const toggleShift = (s: string) =>
    setLocalShifts(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const toggleQuota = (q: string) =>
    setLocalQuotas(prev => prev.includes(q) ? prev.filter(x => x !== q) : [...prev, q]);

  const handleApply = () => {
    onApply({
      modality:              (localModality as ExploreFilters['modality']) || undefined,
      location:              localLocation || undefined,
      city:                  localCity || undefined,
      shifts:                localShifts.length ? localShifts : undefined,
      quota_types:           localQuotas.length ? localQuotas : undefined,
      program_preference:    localProgram || undefined,
      university_preference: localUniversity || undefined,
    });
  };

  const chipBase = 'px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all cursor-pointer select-none';
  const chipActive = 'bg-nubo-primary border-nubo-primary text-white';
  const chipInactive = 'bg-white border-nubo-line text-nubo-text-head';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className={cn(
          "relative w-full sm:max-w-md bg-white shadow-2xl flex flex-col gap-5 transform transition-all overflow-y-auto",
          "rounded-t-[32px] sm:rounded-[24px]",
          "p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pb-6",
          "max-h-[90dvh]",
        )}
        role="dialog"
        aria-label="Filtros avançados"
      >
        {/* Mobile Drag Indicator */}
        <div className="w-full flex justify-center sm:hidden -mt-2">
          <div className="w-12 h-1.5 bg-nubo-line rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-sans font-bold text-[18px] text-nubo-text-head">
            Filtros
          </span>
          <button onClick={onClose} aria-label="Fechar filtros" className="text-nubo-nav-inactive hover:text-nubo-text-head transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Programa */}
        <div className="flex flex-col gap-2">
          <label className="font-sans font-semibold text-[13px] text-nubo-text-head">Programa</label>
          <div className="flex flex-wrap gap-2">
            {PROGRAM_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setLocalProgram(prev => prev === opt.value ? '' : opt.value)}
                className={cn(chipBase, localProgram === opt.value ? chipActive : chipInactive)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Instituição */}
        <div className="flex flex-col gap-2">
          <label className="font-sans font-semibold text-[13px] text-nubo-text-head">Tipo de Instituição</label>
          <div className="flex flex-wrap gap-2">
            {UNIVERSITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setLocalUniversity(prev => prev === opt.value ? '' : opt.value)}
                className={cn(chipBase, localUniversity === opt.value ? chipActive : chipInactive)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Turnos */}
        <div className="flex flex-col gap-2">
          <label className="font-sans font-semibold text-[13px] text-nubo-text-head">Turno</label>
          <div className="flex flex-wrap gap-2">
            {SHIFT_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => toggleShift(s)}
                className={cn(chipBase, localShifts.includes(s) ? chipActive : chipInactive)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Modalidade */}
        <div className="flex flex-col gap-2">
          <label className="font-sans font-semibold text-[13px] text-nubo-text-head">Modalidade</label>
          <select
            value={localModality}
            onChange={(e) => setLocalModality(e.target.value)}
            className="w-full rounded-[12px] px-4 h-[48px] text-[15px] font-sans font-medium text-nubo-text-head bg-white outline-none border border-nubo-line focus:border-nubo-primary focus:ring-1 focus:ring-nubo-primary transition-all"
          >
            {MODALITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Estado */}
        <div className="flex flex-col gap-2">
          <label className="font-sans font-semibold text-[13px] text-nubo-text-head">Estado</label>
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

        {/* Cidade */}
        <div className="flex flex-col gap-2">
          <label className="font-sans font-semibold text-[13px] text-nubo-text-head">Cidade</label>
          <input
            type="text"
            value={localCity}
            onChange={(e) => setLocalCity(e.target.value)}
            placeholder="Ex: São Paulo, Campinas..."
            className="w-full rounded-[12px] px-4 h-[48px] text-[15px] font-sans font-medium text-nubo-text-head bg-white outline-none border border-nubo-line focus:border-nubo-primary focus:ring-1 focus:ring-nubo-primary transition-all"
          />
        </div>

        {/* Cotas */}
        <div className="flex flex-col gap-2">
          <label className="font-sans font-semibold text-[13px] text-nubo-text-head">Cotas</label>
          <div className="flex flex-col gap-2">
            {QUOTA_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localQuotas.includes(opt.value)}
                  onChange={() => toggleQuota(opt.value)}
                  className="w-4 h-4 accent-nubo-primary rounded"
                />
                <span className="text-[14px] text-nubo-text-head font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
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
  );
}
