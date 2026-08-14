'use client';

// InstitutionsClient — Sprint 8.0
// Client component: filters (Todas/Parceiras/Outras) + search.
// SSR-Safe: Synchronizes state with URL params (?tab, ?page, ?q).
// Pagination: 15 cards per page.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import InstitutionCard from '@/components/InstitutionCard';
import BecomePartnerCTA from '@/components/forms/BecomePartnerCTA';
import type { UnifiedInstitution } from '@/types/institutions';

type FilterTab = 'all' | 'partner' | 'other';

interface InstitutionsClientProps {
  institutions: UnifiedInstitution[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  activeTab: FilterTab;
  searchQuery: string;
}

export default function InstitutionsClient({ 
  institutions, 
  totalCount, 
  currentPage, 
  pageSize, 
  activeTab, 
  searchQuery 
}: InstitutionsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParams = useCallback((updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === '' || (key === 'page' && value === '0')) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    router.push(`?${params.toString()}`, { scroll: true });
  }, [router, searchParams]);

  // Handle search with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query === searchQuery) return;

    debounceRef.current = setTimeout(() => {
      updateParams({ q: query || undefined, page: undefined });
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchQuery, updateParams]);

  const handleTabChange = (tab: FilterTab) => {
    updateParams({ tab: tab === 'all' ? undefined : tab, page: undefined });
  };

  const goToPage = (p: number) => {
    updateParams({ page: String(p) });
  };

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
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
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

      {/* CTA de parceria — só na aba Parceiras (TP-5 5b).
          Quem chegou nesta aba já demonstrou interesse no assunto; nas outras o
          convite seria ruído. */}
      {activeTab === 'partner' && <BecomePartnerCTA variant="banner" />}

      {/* Cards grid */}
      {institutions.length === 0 ? (
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
          {institutions.map((inst) => (
            <InstitutionCard surface="instituicoes_lista" key={inst.id} institution={inst} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="flex items-center justify-between pt-2">
          {/* Info */}
          <p
            className="text-[12px]"
            style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
          >
            {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, totalCount)} de {totalCount} instituições
          </p>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="flex items-center justify-center w-9 h-9 rounded-full transition-all disabled:opacity-30"
              style={{ background: 'rgba(56,177,228,0.1)' }}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} style={{ color: '#38B1E4' }} />
            </button>

            <span
              className="w-9 h-9 flex items-center justify-center rounded-full text-[12px] font-bold"
              style={{
                background: '#38B1E4',
                color:      '#fff',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {currentPage + 1}
            </span>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={(currentPage + 1) * pageSize >= totalCount}
              className="flex items-center justify-center w-9 h-9 rounded-full transition-all disabled:opacity-30"
              style={{ background: 'rgba(56,177,228,0.1)' }}
              aria-label="Próxima página"
            >
              <ChevronRight size={16} style={{ color: '#38B1E4' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
