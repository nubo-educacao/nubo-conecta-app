'use client';

// CardOportunidades — Sprint 02 Wave 4
// Figma reference: node 42:1487
// Design tokens extracted from TDD brief (lei — do not deviate):
//   Container:   h-[277px] w-[361px] rounded-[16px] shadow-[0px_24px_44px_-11px_rgba(181,183,192,0.3)]
//   Background:  linear-gradient(239.861deg, rgba(48,146,187,0.5) 9.15%, rgb(48,146,187) 59.27%)
//   Chip:        border #FFB800, text #FFB800, Montserrat Medium 13px, rounded-full
//   Favoritar:   bg-white rounded-[36px] size-[35px], heart 19px
//   Metadata:    rgba(58,66,78,0.7), Montserrat Medium 14px
//   CTA:         bg-[rgba(4,143,173,0.2)] rounded-[62px] h-[30px], text #3092bb SemiBold 14px
//   SVG nuvem:   absolute bottom-[-1px]
//   Hover:       border #FF9900 1px solid
//
// Logic extracted (READ-ONLY reference) from nubo-hub-app/components/OpportunityCard.tsx:
//   - handleFavorite with optimistic update + auth gate
//   - handleViewDetails with auth gate
//   - cutoffDisplay (min/max badge range — adapted for badges[] array)
//   - uniqueTypes (deduplicated type badges)
//   - shiftsConfig (shift icon mapping)

import React, { useState, useEffect } from 'react';
import { Heart, MapPin, Sun, Sunset, Moon, SunMoon, Laptop } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { IUnifiedOpportunity } from '@/types/opportunities';

interface CardOportunidadesProps {
  opportunity: IUnifiedOpportunity;
  onFavorite?: (id: string) => void;
  isFavorited?: boolean;
}

// shiftsConfig: maps shift label tokens from badges[] to icon + display label
// Extracted from nubo-hub-app/components/OpportunityCard.tsx shiftsConfig pattern
const SHIFT_ICONS = [
  { key: 'Matutino',              Icon: Sun,     label: 'Matutino'    },
  { key: 'Vespertino',            Icon: Sunset,  label: 'Vespertino'  },
  { key: 'Noturno',               Icon: Moon,    label: 'Noturno'     },
  { key: 'Integral',              Icon: SunMoon, label: 'Integral'    },
  { key: 'EaD',                   Icon: Laptop,  label: 'EAD'         },
  { key: 'Curso a distância',     Icon: Laptop,  label: 'EAD'         },
] as const;

export default function CardOportunidades({
  opportunity,
  onFavorite,
  isFavorited = false,
}: CardOportunidadesProps) {
  const { user, setShowAuthModal } = useAuth();
  const isAuthenticated = !!user;

  // Optimistic update state for favorite (adapted from nubo-hub-app handleFavorite)
  const [localFavorited, setLocalFavorited] = useState(isFavorited);

  useEffect(() => {
    setLocalFavorited(isFavorited);
  }, [isFavorited]);

  // handleFavorite: optimistic update + auth gate (pattern from nubo-hub-app)
  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    // Optimistic update
    setLocalFavorited(prev => !prev);
    onFavorite?.(opportunity.id);
  };

  // handleViewDetails: auth gate before navigation
  const handleViewDetails = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    window.location.href = `/oportunidades/${opportunity.id}`;
  };

  // cutoffDisplay: extract numeric range from badges (adapted from nubo-hub-app cutoffDisplay)
  // Badges may contain "750 - 800" style strings from the view's jsonb_build_array
  const numericBadges = opportunity.badges
    .flatMap(b => b.match(/\d+(?:[.,]\d+)?/g) ?? [])
    .map(n => parseFloat(n.replace(',', '.')))
    .filter(n => !isNaN(n) && n > 100); // cutoff scores are typically > 100

  const minCutoff = numericBadges.length > 0 ? Math.min(...numericBadges) : null;
  const maxCutoff = numericBadges.length > 0 ? Math.max(...numericBadges) : null;
  const cutoffDisplay =
    minCutoff !== null && maxCutoff !== null
      ? minCutoff === maxCutoff
        ? `${minCutoff}`
        : `${minCutoff} – ${maxCutoff}`
      : null;

  // uniqueTypes: deduplicated non-shift badges for category chips (adapted from nubo-hub-app)
  const typeBadges = opportunity.badges
    .filter(b => !SHIFT_ICONS.some(s => s.key === b) && b !== '100% Gratuito')
    .slice(0, 2);

  // Active shifts from badges
  const activeShifts = SHIFT_ICONS.filter(s =>
    opportunity.badges.some(b => b === s.key),
  ).slice(0, 3); // Display up to 3 shift icons

  const categoryLabel =
    opportunity.type === 'prouni'
      ? 'ProUni'
      : opportunity.type === 'sisu'
        ? 'SISU'
        : opportunity.category_label;

  return (
    <div
      onClick={handleViewDetails}
      className="group relative h-[277px] w-full rounded-[16px] overflow-hidden shadow-lg hover:shadow-xl border border-transparent hover:border-[#FF9900] cursor-pointer transition-all duration-300"
      style={{
        background: 'linear-gradient(239.861deg, rgba(48,146,187,0.5) 9.15%, rgb(48,146,187) 59.27%)',
      }}
    >
      {/* Top row: category chip + favorite button */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
        <span
          className="px-3 py-1 rounded-full text-[13px] font-medium border"
          style={{ borderColor: '#FFB800', color: '#FFB800', fontFamily: 'Montserrat, sans-serif' }}
        >
          {categoryLabel}
        </span>

        <button
          onClick={handleFavorite}
          className="bg-white rounded-[36px] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-sm"
          style={{ width: 35, height: 35 }}
        >
          <Heart
            size={19}
            color={localFavorited ? '#ef4444' : '#3092bb'}
            fill={localFavorited ? '#ef4444' : 'none'}
            strokeWidth={2.5}
          />
        </button>
      </div>

      {/* SVG cloud decoration */}
      <img
        src="/assets/card-background.svg"
        alt=""
        className="absolute bottom-0 left-0 w-full z-10 pointer-events-none"
      />

      {/* Content area */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-4 flex flex-col">
        {/* Title and Match Badge row */}
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="flex-1">
            <h3
              className="font-bold text-[16px] leading-tight line-clamp-2 mb-0.5"
              style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
            >
              {opportunity.title}
            </h3>
            <p
              className="text-[14px] font-medium line-clamp-1"
              style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
            >
              {opportunity.institution_name}
            </p>
          </div>

          {/* Match Badge — Figma style from screenshot */}
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-white overflow-hidden shrink-0"
            style={{ backgroundColor: '#3092bb' }}
          >
            <div className="bg-white/20 rounded-full p-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[12px] font-bold">95%</span>
              <span className="text-[10px] font-medium opacity-90">match</span>
            </div>
          </div>
        </div>

        {/* Metadata section */}
        <div className="flex flex-col gap-1 mb-4">
          <div className="flex items-center gap-2 text-[13px] font-medium" style={{ color: '#636e7c' }}>
            <MapPin size={14} className="text-[#9747ff]" />
            <span className="truncate">{opportunity.location}</span>
          </div>
          <div className="flex items-center gap-2 text-[13px] font-medium" style={{ color: '#636e7c' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
              <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
            </svg>
            <span className="truncate">{opportunity.education_level || 'Graduação'}</span>
          </div>
        </div>

        {/* Wide CTA Button */}
        <button
          onClick={(e) => { e.stopPropagation(); handleViewDetails(); }}
          className="w-full flex items-center justify-center rounded-[12px] text-[14px] font-bold transition-all hover:opacity-90 py-2"
          style={{
            background: 'rgba(48, 146, 187, 0.15)',
            color: '#3092bb',
            fontFamily: 'Montserrat, sans-serif'
          }}
        >
          {cutoffDisplay ? `Nota: ${cutoffDisplay}` : 'Candidatar'}
        </button>
      </div>
    </div>
  );
}
