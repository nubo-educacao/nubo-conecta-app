'use client';

// InstitutionCarousel — Sprint 3.8
// Premium horizontal scrollable carousel with logo/cover cards.
// Updated to use InstitutionCard.tsx

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import InstitutionCard from '@/components/InstitutionCard';
import type { UnifiedInstitution } from '@/types/institutions';

interface InstitutionCarouselProps {
  institutions: UnifiedInstitution[];
  seeAllHref?: string;
  desktopGridMode?: boolean;
}

export default function InstitutionCarousel({
  institutions,
  seeAllHref = '/instituicoes',
  desktopGridMode = false,
}: InstitutionCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(dir: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  }

  if (institutions.length === 0) return null;

  // Deduplicate institutions by id to prevent React duplicate key errors (fail-safe)
  const uniqueInstitutions = Array.from(
    new Map(institutions.map((inst) => [inst.id, inst])).values()
  );

  // Desktop: máximo 3 items quando em grid mode (Regra Grid-3 da Sprint 3.5)
  const desktopItems = desktopGridMode ? uniqueInstitutions.slice(0, 3) : uniqueInstitutions;

  return (
    <section className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <h2
          className="text-base font-bold"
          style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
        >
          Instituições em destaque
        </h2>
        <div className="flex items-center gap-2">
          {/* Scroll arrows — desktop, só no modo carrossel */}
          {!desktopGridMode && (
            <>
              <button
                onClick={() => scroll('left')}
                className="hidden md:flex items-center justify-center w-7 h-7 rounded-full transition-all hover:bg-black/5"
                aria-label="Anterior"
              >
                <ChevronLeft size={16} style={{ color: '#636e7c' }} />
              </button>
              <button
                onClick={() => scroll('right')}
                className="hidden md:flex items-center justify-center w-7 h-7 rounded-full transition-all hover:bg-black/5"
                aria-label="Próximo"
              >
                <ChevronRight size={16} style={{ color: '#636e7c' }} />
              </button>
            </>
          )}
          <a
            href={seeAllHref}
            className="text-xs font-semibold"
            style={{ color: '#3092bb', fontFamily: 'Montserrat, sans-serif' }}
          >
            Ver todas
          </a>
        </div>
      </div>

      {/* Mobile: carrossel — oculto em md+ quando desktopGridMode */}
      <div
        ref={scrollRef}
        className={`flex gap-4 overflow-x-auto pb-2 pl-4 pr-4 snap-x snap-mandatory scroll-smooth scroll-pl-4 ${
          desktopGridMode ? 'md:hidden' : ''
        }`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {uniqueInstitutions.map((inst) => (
          <div
            key={inst.id}
            className="flex-shrink-0 snap-start"
            style={{ width: 'min(361px, 85vw)' }}
          >
            <InstitutionCard surface="home_carrossel_instituicoes" institution={inst} />
          </div>
        ))}
      </div>

      {/* Desktop: grid — visível apenas em md+ quando desktopGridMode */}
      {desktopGridMode && (
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
          {desktopItems.map((inst) => (
            <InstitutionCard key={inst.id} institution={inst} />
          ))}
        </div>
      )}
    </section>
  );
}
