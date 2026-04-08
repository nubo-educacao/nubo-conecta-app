'use client';

// CardOportunidadeParceira — Sprint 02 Wave 4
// Figma reference: node 41:1311
// Design tokens (lei — do not deviate):
//   Background:     linear-gradient(239.861deg, rgba(112,48,194,0.6) 6.45%, rgb(112,48,194) 59.27%)
//   Badge topo:     bg-[#9747ff] h-[20px] w-full rounded-[100px_100px_6px_6px] text white Montserrat Medium 12px with star icon
//   CTA:            bg-[rgba(151,71,255,0.2)] text #9747FF
//   Chip categoria: border #FFB800, text #FFB800 (same as CardOportunidades)
//   Favoritar:      bg-white rounded-[36px] size-[35px] (same)
//   SVG nuvem:      absolute bottom-[-1px] (same)
//   Hover:          border #FF9900 1px solid (same)
//
// Structural layout is identical to CardOportunidades — only gradient and partner badge differ.
// Auth logic (handleFavorite, handleViewDetails) is identical.

import React, { useState, useEffect } from 'react';
import { Heart, MapPin, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { IUnifiedOpportunity } from '@/types/opportunities';

interface CardOportunidadeParceiraProps {
  opportunity: IUnifiedOpportunity;
  onFavorite?: (id: string) => void;
  isFavorited?: boolean;
}

export default function CardOportunidadeParceira({
  opportunity,
  onFavorite,
  isFavorited = false,
}: CardOportunidadeParceiraProps) {
  const { user, setShowAuthModal } = useAuth();
  const isAuthenticated = !!user;

  const [localFavorited, setLocalFavorited] = useState(isFavorited);

  useEffect(() => {
    setLocalFavorited(isFavorited);
  }, [isFavorited]);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setLocalFavorited(prev => !prev);
    onFavorite?.(opportunity.id);
  };

  const handleViewDetails = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    window.location.href = `/oportunidades/${opportunity.id}`;
  };

  // Category label for partner cards.
  // Use the specific opportunity_type (bolsa|bootcamp|mentoria) capitalized.
  const typeLabel =
    opportunity.is_partner && opportunity.opportunity_type
      ? opportunity.opportunity_type.charAt(0).toUpperCase() + opportunity.opportunity_type.slice(1)
      : opportunity.category_label;

  return (
    <div
      onClick={handleViewDetails}
      className="group relative h-[277px] w-full rounded-[16px] overflow-hidden shadow-lg hover:shadow-xl border border-transparent hover:border-[#FF9900] cursor-pointer transition-all duration-300"
      style={{
        background: 'linear-gradient(239.861deg, rgba(112,48,194,0.6) 6.45%, rgb(112,48,194) 59.27%)',
      }}
    >
      {/* Partner banner — Figma: bg-[#9747ff] h-[20px] w-full rounded-[100px_100px_6px_6px] */}
      <div
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-center gap-1"
        style={{
          background: '#9747ff',
          height: 20,
          borderRadius: '100px 100px 6px 6px',
        }}
      >
        <Star size={10} color="white" fill="white" />
        <span
          className="text-white font-medium"
          style={{ fontSize: 12, fontFamily: 'Montserrat, sans-serif' }}
        >
          Oportunidade parceira
        </span>
      </div>

      {/* Top row: category chip + favorite button */}
      <div className="absolute top-7 left-4 right-4 z-20 flex justify-between items-center">
        <span
          className="px-3 py-1 rounded-full text-[13px] font-medium border"
          style={{ borderColor: '#FFB800', color: '#FFB800', fontFamily: 'Montserrat, sans-serif' }}
        >
          {typeLabel}
        </span>

        <button
          onClick={handleFavorite}
          className="bg-white rounded-[36px] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-sm"
          style={{ width: 35, height: 35 }}
        >
          <Heart
            size={19}
            color={localFavorited ? '#ef4444' : '#9747ff'}
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

          {/* Match Badge — Purple themed */}
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] text-white overflow-hidden shrink-0"
            style={{ backgroundColor: '#9747ff' }}
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
            <span className="truncate">{opportunity.education_level || 'Graduação, Pós-graduação e intercâmbio'}</span>
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); handleViewDetails(); }}
          className="w-full flex items-center justify-center rounded-[12px] text-[14px] font-bold transition-all hover:opacity-90 py-2"
          style={{
            background: 'rgba(151, 71, 255, 0.15)',
            color: '#9747ff',
            fontFamily: 'Montserrat, sans-serif'
          }}
        >
          Candidatar
        </button>
      </div>
    </div>
  );
}
