'use client';

// ExploreClient — Sprint 2.5
// Encapsula toda a lógica da aba "Explorar Todas":
//   SearchBar (debounce 300ms → ?q=), Category Pills (?category=), botão Filtros (FilterModal).
// Todos os estados são serializados em URL via router.replace — sem useState puro.
// Figma nodes: SearchBar+Filtros (22:1967), Category Pills (62:1349), View Completa (22:1948).

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useCallback } from 'react';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import BecomePartnerCTA from '@/components/forms/BecomePartnerCTA';
import FilterModal from './FilterModal';
import type { IUnifiedOpportunity, ExploreFilters } from '@/types/opportunities';
import { useState } from 'react';

// Ordem de prioridade do produto: Sisu, Prouni, depois opções de parceiros
const ALL_CATEGORY_PILLS = [
  { label: 'Todas',                  value: '' },
  { label: 'Sisu',                   value: 'sisu' },
  { label: 'Prouni',                 value: 'prouni' },
  { label: 'Programas de Bolsa',      value: 'programa de bolsa' },
  { label: 'Programas Educacionais', value: 'programa educacional' },
];

interface ExploreClientProps {
  opportunities: IUnifiedOpportunity[];
  filters: ExploreFilters;
  currentPage?: number;
  pageSize?: number;
  availableCategories?: string[];
}

export default function ExploreClient({
  opportunities,
  filters,
  currentPage = 0,
  pageSize = 15,
  availableCategories
}: ExploreClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParam = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      // Preserve tab=explore, reset page on filter change
      params.set('tab', 'explore');
      params.delete('page');
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'explore');
    if (p > 0) params.set('page', String(p));
    else params.delete('page');
    router.push(`?${params.toString()}`, { scroll: true });
  };

  const handleSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParam({ q: value || undefined });
      }, 300);
    },
    [updateParam],
  );

  const handleCategoryPill = (value: string) => {
    updateParam({ category: value || undefined });
  };

  const handleFilterApply = (partial: Partial<ExploreFilters>) => {
    updateParam({
      location:              partial.location,
      city:                  partial.city,
      shifts:                partial.shifts?.join(','),
      quota_types:           partial.quota_types?.join(','),
      program_preference:    partial.program_preference,
      university_preference: partial.university_preference,
    });
    setFilterModalOpen(false);
  };

  const activeCategory = filters.category ?? '';

  return (
    <div className="flex flex-col gap-4">
      {/* SearchBar + Filtros — Figma node 22:1967 */}
      <div className="flex items-center gap-2">
        <div
          className="flex-1 flex items-center gap-2 rounded-[16px] px-4 transition-all focus-within:ring-2 focus-within:ring-[#3092bb]/20"
          style={{
            background: '#ffffff',
            border: '1px solid #f3f4f6',
            boxShadow: '0px 2px 8px rgba(0,0,0,0.04)',
            height: 52,
          }}
        >
          <Search size={18} color="#636e7c" />
          <input
            type="text"
            defaultValue={filters.q ?? ''}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar oportunidades..."
            className="flex-1 bg-transparent outline-none text-[14px]"
            style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
          />
        </div>
        <button
          onClick={() => setFilterModalOpen(true)}
          className="flex items-center justify-center rounded-[12px] flex-shrink-0"
          style={{ background: '#3092bb', width: 48, height: 48 }}
          aria-label="Abrir filtros avançados"
        >
          <SlidersHorizontal size={18} color="#ffffff" />
        </button>
      </div>

      {/* Category Pills — Figma node 62:1349 */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {(availableCategories === undefined 
          ? ALL_CATEGORY_PILLS 
          : ALL_CATEGORY_PILLS.filter(pill => 
              pill.value === '' || availableCategories.includes(pill.value)
            )
        ).map((pill) => {
          const isActive = activeCategory === pill.value;
          return (
            <button
              key={pill.value}
              onClick={() => handleCategoryPill(pill.value)}
              className="whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-150 flex-shrink-0"
              style={{
                background:  isActive ? '#3092bb' : 'transparent',
                border:      isActive ? '1px solid #3092bb' : '1px solid #e5e7eb',
                color:       isActive ? '#ffffff' : '#636e7c',
                fontFamily:  'Montserrat, sans-serif',
                fontWeight:  isActive ? 600 : 500,
              }}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* CTA de parceria — só nas categorias de oferta institucional (TP-5 5b).
          Nas categorias MEC (Sisu/Prouni) não aparece: quem filtra por elas
          está procurando vaga pública, não fechando parceria. */}
      {(activeCategory === 'programa de bolsa' ||
        activeCategory === 'programa educacional') && (
        <BecomePartnerCTA variant="banner" />
      )}

      {/* Results grid */}
      {opportunities.length === 0 ? (
        <p
          className="text-center py-12 text-[14px]"
          style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
        >
          Nenhuma oportunidade encontrada.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {opportunities.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} surface="oportunidades_explorar" />
            ))}
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between pt-2">
            <p
              className="text-[12px]"
              style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
            >
              {currentPage * pageSize + 1}–{currentPage * pageSize + opportunities.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="flex items-center justify-center w-9 h-9 rounded-full transition-all disabled:opacity-30"
                style={{ background: 'rgba(48,146,187,0.1)' }}
                aria-label="Página anterior"
              >
                <ChevronLeft size={16} style={{ color: '#3092bb' }} />
              </button>
              <span
                className="text-[13px] font-bold px-3 py-1.5 rounded-full"
                style={{ background: '#3092bb', color: '#fff', fontFamily: 'Montserrat, sans-serif' }}
              >
                {currentPage + 1}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={opportunities.length < pageSize}
                className="flex items-center justify-center w-9 h-9 rounded-full transition-all disabled:opacity-30"
                style={{ background: 'rgba(48,146,187,0.1)' }}
                aria-label="Próxima página"
              >
                <ChevronRight size={16} style={{ color: '#3092bb' }} />
              </button>
            </div>
          </div>
        </>
      )}

      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        location={filters.location}
        city={filters.city}
        shifts={filters.shifts}
        quota_types={filters.quota_types}
        program_preference={filters.program_preference}
        university_preference={filters.university_preference}
        onApply={handleFilterApply}
      />
    </div>
  );
}
