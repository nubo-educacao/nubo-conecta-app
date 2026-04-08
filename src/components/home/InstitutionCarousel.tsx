'use client';

// InstitutionCarousel — Sprint 3.8
// Premium horizontal scrollable carousel with logo/cover cards.
// Uses App shadow system and Montserrat typography.

import { useRef } from 'react';
import { BookOpen } from 'lucide-react';

interface Institution {
  id: string;
  name: string;
  location: string;
  logo_url?: string | null;
  cover_url?: string | null;
  description?: string | null;
  brand_color?: string | null;
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
            className="flex-shrink-0 snap-start flex flex-col rounded-[16px] overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg"
            style={{
              width: 200,
              boxShadow: '0px 8px 24px -4px rgba(181,183,192,0.3)',
              background: '#fff',
            }}
          >
            {/* Cover / Brand Color header */}
            <div
              className="relative w-full h-[80px]"
              style={{
                background: inst.cover_url
                  ? undefined
                  : inst.brand_color
                    ? inst.brand_color
                    : 'linear-gradient(135deg, #38B1E4 0%, #024F86 100%)',
              }}
            >
              {inst.cover_url && (
                <img
                  src={inst.cover_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
              {/* Logo overlay */}
              {inst.logo_url ? (
                <div
                  className="absolute -bottom-4 left-3 w-[36px] h-[36px] rounded-full bg-white border-2 border-white flex items-center justify-center overflow-hidden"
                  style={{
                    boxShadow: '0px 2px 8px rgba(0,0,0,0.12)',
                  }}
                >
                  <img src={inst.logo_url} alt={inst.name} className="w-full h-full object-contain p-0.5" />
                </div>
              ) : (
                <div
                  className="absolute -bottom-4 left-3 w-[36px] h-[36px] rounded-full bg-white border-2 border-white flex items-center justify-center"
                  style={{
                    boxShadow: '0px 2px 8px rgba(0,0,0,0.12)',
                  }}
                >
                  <BookOpen size={14} style={{ color: '#38B1E4' }} />
                </div>
              )}
            </div>

            {/* Body */}
            <div className="px-3 pt-6 pb-3 flex flex-col gap-1">
              <p
                className="text-xs font-bold line-clamp-2 leading-tight"
                style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
              >
                {inst.name}
              </p>
              {inst.location && (
                <p
                  className="text-[10px]"
                  style={{ color: '#707A7E', fontFamily: 'Montserrat, sans-serif' }}
                >
                  {inst.location}
                </p>
              )}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
