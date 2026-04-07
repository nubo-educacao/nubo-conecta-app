'use client';

// OpportunityCarousel — Sprint 03 Épico 1A
// Horizontal scrollable carousel of opportunity cards.
// Uses native overflow-x scroll with snap for mobile UX.

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CardOportunidades from '@/components/opportunities/CardOportunidades';
import type { IUnifiedOpportunity } from '@/types/opportunities';

interface OpportunityCarouselProps {
  title: string;
  opportunities: IUnifiedOpportunity[];
  seeAllHref?: string;
}

export default function OpportunityCarousel({
  title,
  opportunities,
  seeAllHref = '/oportunidades',
}: OpportunityCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(dir: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  }

  if (opportunities.length === 0) return null;

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
          {/* Scroll arrows — desktop only */}
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
          <a
            href={seeAllHref}
            className="text-xs font-semibold"
            style={{ color: '#38B1E4', fontFamily: 'Montserrat, sans-serif' }}
          >
            Ver tudo
          </a>
        </div>
      </div>

      {/* Scroll track */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 pl-4 pr-4 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {opportunities.map((opp) => (
          <div key={opp.id} className="flex-shrink-0 w-[300px] snap-start">
            <CardOportunidades opportunity={opp} />
          </div>
        ))}
      </div>
    </section>
  );
}
