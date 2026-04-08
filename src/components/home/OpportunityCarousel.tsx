'use client';

// OpportunityCarousel — Sprint 03 Épico 1A / atualizado Sprint 3.5
// Mobile: carrossel horizontal com scroll nativo.
// Desktop (md+): grid 2 colunas; lg+: grid 3 colunas, limitado a 3 cards (Regra Grid-3).

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CardOportunidades from '@/components/opportunities/CardOportunidades';
import type { IUnifiedOpportunity } from '@/types/opportunities';

interface OpportunityCarouselProps {
  title: string;
  opportunities: IUnifiedOpportunity[];
  seeAllHref?: string;
  /** Se true, limita a 3 itens no desktop e renderiza como grid (Regra Grid-3). */
  desktopGridMode?: boolean;
}

export default function OpportunityCarousel({
  title,
  opportunities,
  seeAllHref = '/oportunidades',
  desktopGridMode = false,
}: OpportunityCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(dir: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  }

  if (opportunities.length === 0) return null;

  // Desktop: máximo 3 items quando em grid mode (Regra Grid-3 da Sprint 3.5)
  const desktopItems = desktopGridMode ? opportunities.slice(0, 3) : opportunities;

  return (
    <section className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-4">
        <h2
          className="text-base font-bold"
          style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
        >
          {title}
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
            style={{ color: '#38B1E4', fontFamily: 'Montserrat, sans-serif' }}
          >
            Ver tudo
          </a>
        </div>
      </div>

      {/* Mobile: carrossel — oculto em md+ quando desktopGridMode */}
      <div
        ref={scrollRef}
        className={`flex gap-4 overflow-x-auto pb-2 pl-4 pr-4 snap-x snap-mandatory scroll-smooth ${
          desktopGridMode ? 'md:hidden' : ''
        }`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {opportunities.map((opp) => (
          <div
            key={opp.id}
            className="flex-shrink-0 snap-start"
            style={{ width: 'min(361px, 85vw)' }}
          >
            <CardOportunidades opportunity={opp} />
          </div>
        ))}
      </div>

      {/* Desktop: grid — visível apenas em md+ quando desktopGridMode */}
      {desktopGridMode && (
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
          {desktopItems.map((opp) => (
            <CardOportunidades key={opp.id} opportunity={opp} />
          ))}
        </div>
      )}
    </section>
  );
}
