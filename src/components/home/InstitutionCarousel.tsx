'use client';

// InstitutionCarousel — Sprint 03 Épico 1A
// Horizontal scrollable list of institution pills/cards.

import { useRef } from 'react';
import { BookOpen } from 'lucide-react';

interface Institution {
  id: string;
  name: string;
  location: string;
  opportunityCount?: number;
}

interface InstitutionCarouselProps {
  institutions: Institution[];
  seeAllHref?: string;
}

export default function InstitutionCarousel({
  institutions,
  seeAllHref = '/instituicoes',
}: InstitutionCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (institutions.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-4">
        <h2
          className="text-base font-bold"
          style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
        >
          Instituições em destaque
        </h2>
        <a
          href={seeAllHref}
          className="text-xs font-semibold"
          style={{ color: '#38B1E4', fontFamily: 'Montserrat, sans-serif' }}
        >
          Ver todas
        </a>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 pl-4 pr-4 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {institutions.map((inst) => (
          <a
            key={inst.id}
            href={`/instituicoes/${inst.id}`}
            className="flex-shrink-0 snap-start flex flex-col gap-2 p-4 rounded-2xl transition-all hover:shadow-md"
            style={{
              width: 180,
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(56,177,228,0.15)',
            }}
          >
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={{ background: 'rgba(56,177,228,0.1)' }}
            >
              <BookOpen size={18} style={{ color: '#38B1E4' }} />
            </div>
            <div>
              <p
                className="text-xs font-bold line-clamp-2 leading-tight"
                style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
              >
                {inst.name}
              </p>
              <p
                className="text-[10px] mt-0.5"
                style={{ color: '#707A7E', fontFamily: 'Montserrat, sans-serif' }}
              >
                {inst.location}
              </p>
            </div>
            {inst.opportunityCount !== undefined && (
              <span
                className="text-[10px] font-semibold"
                style={{ color: '#38B1E4', fontFamily: 'Montserrat, sans-serif' }}
              >
                {inst.opportunityCount} oportunidade{inst.opportunityCount !== 1 ? 's' : ''}
              </span>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
