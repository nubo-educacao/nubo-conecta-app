'use client';

// InstitutionsClient — Sprint 8.0
// Client component: filter pills (Todas/Parceiras/Outras) + search com debounce 300ms.
// Recebe a lista completa do Server Component e filtra client-side.

import { useState, useEffect, useRef } from 'react';
import { Search, BookOpen } from 'lucide-react';
import InstitutionCard from '@/components/InstitutionCard';
import type { UnifiedInstitution } from '@/types/institutions';

type FilterTab = 'all' | 'partner' | 'other';

interface InstitutionsClientProps {
  institutions: UnifiedInstitution[];
}

export default function InstitutionsClient({ institutions }: InstitutionsClientProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [query, setQuery]               = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search 300ms
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  const filtered = institutions.filter((inst) => {
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'partner' && inst.type === 'partner') ||
      (activeFilter === 'other'   && inst.type === 'mec');

    const matchesQuery = debouncedQuery.length === 0 ||
      inst.name.toLowerCase().includes(debouncedQuery.toLowerCase());

    return matchesFilter && matchesQuery;
  });

  const TABS: { id: FilterTab; label: string }[] = [
    { id: 'all',     label: 'Todas'     },
    { id: 'partner', label: 'Parceiras' },
    { id: 'other',   label: 'Outras'    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Search */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-[12px]"
        style={{ background: 'rgba(255,255,255,0.8)', boxShadow: '0px 2px 8px rgba(181,183,192,0.2)' }}
      >
        <Search size={16} style={{ color: '#707A7E' }} />
        <input
          type="text"
          placeholder="Buscar instituição..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none text-[13px]"
          style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
          data-testid="search-input"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2" role="group" aria-label="Filtros">
        {TABS.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              data-testid={`filter-${tab.id}`}
              className="px-4 py-1.5 rounded-full text-[12px] font-bold transition-colors"
              style={{
                background: isActive ? '#38B1E4' : 'rgba(56,177,228,0.1)',
                color:      isActive ? '#fff'    : '#38B1E4',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 gap-4 rounded-[16px]"
          style={{ background: 'rgba(255,255,255,0.7)', boxShadow: '0px 8px 24px -4px rgba(181,183,192,0.3)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(56,177,228,0.1)' }}
          >
            <BookOpen size={24} style={{ color: '#38B1E4' }} />
          </div>
          <p
            className="text-[14px]"
            style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
          >
            Nenhuma instituição encontrada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((inst) => (
            <InstitutionCard key={inst.id} institution={inst} />
          ))}
        </div>
      )}
    </div>
  );
}
