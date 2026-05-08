'use client';

// InstitutionCard — Sprint 8.0
// Componente unificado para parceiras (com branding) e MEC (Nubo padrão).
// Baseado em v_unified_institutions.type para selecionar variante.

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import type { UnifiedInstitution } from '@/types/institutions';

interface InstitutionCardProps {
  institution: UnifiedInstitution;
  onClick?: () => void;
}

const NUBO_PRIMARY = '#38B1E4';
const NUBO_GRADIENT = 'linear-gradient(135deg, #38B1E4 0%, #024F86 100%)';

export default function InstitutionCard({ institution, onClick }: InstitutionCardProps) {
  const isPartner = institution.type === 'partner';
  const headerBg = isPartner
    ? institution.cover_url
      ? undefined
      : institution.brand_color ?? NUBO_GRADIENT
    : NUBO_GRADIENT;

  return (
    <div
      data-testid="institution-card"
      className="group rounded-[16px] overflow-hidden flex flex-col transition-all duration-300 hover:scale-[1.02]"
      style={{
        boxShadow: '0px 8px 24px -4px rgba(181,183,192,0.3)',
        background: '#fff',
      }}
      onClick={onClick}
    >
      {/* ── Header: cover/gradiente ── */}
      <div
        className="relative w-full h-[120px]"
        style={{ background: headerBg }}
      >
        {isPartner && institution.cover_url && (
          <img
            src={institution.cover_url}
            alt=""
            className="w-full h-full object-cover"
          />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

        {/* Chip parceira */}
        {isPartner && (
          <div
            data-testid="partner-chip"
            className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-white text-[10px] font-bold"
            style={{ backgroundColor: institution.brand_color ?? NUBO_PRIMARY }}
          >
            Instituição parceira
          </div>
        )}

        {/* Logo / ícone */}
        <div
          className="absolute bottom-[-24px] left-4 w-[48px] h-[48px] rounded-full bg-white border-2 border-white flex items-center justify-center overflow-hidden"
          style={{ boxShadow: '0px 4px 12px rgba(0,0,0,0.15)' }}
        >
          {isPartner && institution.logo_url ? (
            <img
              src={institution.logo_url}
              alt={`Logo ${institution.name}`}
              className="w-full h-full object-contain p-1"
            />
          ) : (
            <span data-testid="book-icon">
              <BookOpen size={20} style={{ color: institution.brand_color ?? NUBO_PRIMARY }} />
            </span>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-4 pt-9 pb-4 flex flex-col gap-2 flex-1">
        <h2
          className="font-bold text-[14px] line-clamp-2 leading-snug"
          style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
        >
          {institution.name}
        </h2>

        {institution.location && (
          <p
            className="text-[11px] font-medium"
            style={{ color: NUBO_PRIMARY, fontFamily: 'Montserrat, sans-serif' }}
          >
            📍 {institution.location}
          </p>
        )}

        {isPartner && institution.description && (
          <p
            className="text-[12px] line-clamp-2 leading-relaxed"
            style={{ color: 'rgba(58,66,78,0.7)', fontFamily: 'Montserrat, sans-serif' }}
          >
            {institution.description}
          </p>
        )}

        {/* CTA */}
        <div className="mt-auto pt-2">
          <Link
            href={`/instituicoes/${institution.id}`}
            className="inline-block w-full text-center py-2 rounded-[10px] text-[12px] font-bold text-white transition-opacity hover:opacity-90"
            style={{
              background: isPartner
                ? (institution.brand_color ?? NUBO_PRIMARY)
                : NUBO_PRIMARY,
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            Ver detalhes
          </Link>
        </div>
      </div>
    </div>
  );
}
