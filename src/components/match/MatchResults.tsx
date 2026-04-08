'use client';

// MatchResults — Sprint 03 Épico 1B — Estado 2
// Grid of matched opportunities with score badges.
// Fetches opportunity details from v_unified_opportunities filtered by IDs.

import { useEffect, useState } from 'react';
import { RefreshCcw, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MatchScoreBadge from './MatchScoreBadge';
import type { MatchResult } from '@/services/matchService';

interface EnrichedMatch extends MatchResult {
  title: string;
  institution_name: string;
  location: string;
  opportunity_type: string;
  is_partner: boolean;
}

interface MatchResultsProps {
  results: MatchResult[];
  onRegenerate: () => void;
  isLoading: boolean;
}

export default function MatchResults({ results, onRegenerate, isLoading }: MatchResultsProps) {
  const [enriched, setEnriched] = useState<EnrichedMatch[]>([]);

  useEffect(() => {
    if (results.length === 0) return;

    const ids = results.map((r) => r.unified_opportunity_id);

    supabase
      .from('v_unified_opportunities')
      .select('unified_id, title, provider_name, location, opportunity_type, is_partner')
      .in('unified_id', ids)
      .then(({ data }) => {
        if (!data) return;
        const detailMap = new Map(data.map((row) => [row.unified_id, row]));
        const merged: EnrichedMatch[] = results
          .map((r) => {
            const detail = detailMap.get(r.unified_opportunity_id);
            if (!detail) return null;
            return {
              ...r,
              title: detail.title,
              institution_name: detail.provider_name,
              location: detail.location,
              opportunity_type: detail.opportunity_type,
              is_partner: detail.is_partner,
            } as EnrichedMatch;
          })
          .filter((x): x is EnrichedMatch => x !== null);
        setEnriched(merged);
      });
  }, [results]);

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-lg font-bold"
            style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
          >
            Para Você
          </h2>
          <p className="text-xs" style={{ color: '#707A7E', fontFamily: 'Montserrat, sans-serif' }}>
            {enriched.length} oportunidades compatíveis
          </p>
        </div>
        <button
          onClick={onRegenerate}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
          style={{
            background: 'rgba(56,177,228,0.1)',
            color: '#38B1E4',
            fontFamily: 'Montserrat, sans-serif',
          }}
        >
          <RefreshCcw size={13} className={isLoading ? 'animate-spin' : ''} />
          Refazer match
        </button>
      </div>

      {/* Results grid */}
      <div className="flex flex-col gap-3">
        {enriched.map((item) => (
          <a
            key={item.unified_opportunity_id}
            href={`/oportunidades/${item.unified_opportunity_id}`}
            className="group flex items-center gap-4 rounded-2xl p-4 transition-all hover:shadow-md"
            style={{
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(56,177,228,0.2)',
            }}
          >
            {/* Score ring */}
            <div
              className="flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl"
              style={{
                background:
                  item.match_score >= 80
                    ? 'linear-gradient(135deg, #16a34a22, #16a34a11)'
                    : item.match_score >= 60
                    ? 'linear-gradient(135deg, #ca8a0422, #ca8a0411)'
                    : 'linear-gradient(135deg, #dc262622, #dc262611)',
                border: `2px solid ${
                  item.match_score >= 80
                    ? '#16a34a44'
                    : item.match_score >= 60
                    ? '#ca8a0444'
                    : '#dc262644'
                }`,
              }}
            >
              <span
                className="text-base font-bold leading-none"
                style={{
                  color:
                    item.match_score >= 80
                      ? '#16a34a'
                      : item.match_score >= 60
                      ? '#ca8a04'
                      : '#dc2626',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                {Math.round(item.match_score)}%
              </span>
              <span className="text-[9px] font-medium" style={{ color: '#707A7E' }}>
                match
              </span>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3
                  className="text-sm font-bold leading-tight line-clamp-2 flex-1"
                  style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
                >
                  {item.title}
                </h3>
                {item.is_partner && (
                  <span
                    className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: 'rgba(255,184,0,0.15)',
                      color: '#b45309',
                      fontFamily: 'Montserrat, sans-serif',
                    }}
                  >
                    Parceiro
                  </span>
                )}
              </div>
              <p
                className="text-xs line-clamp-1 mb-1.5"
                style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
              >
                {item.institution_name}
              </p>
              <div className="flex items-center gap-1 text-xs" style={{ color: '#9ca3af' }}>
                <MapPin size={11} />
                <span className="truncate">{item.location}</span>
              </div>
            </div>
          </a>
        ))}
      </div>

      {enriched.length === 0 && !isLoading && (
        <p
          className="text-center text-sm py-8"
          style={{ color: '#707A7E', fontFamily: 'Montserrat, sans-serif' }}
        >
          Nenhum resultado encontrado. Tente refazer o match.
        </p>
      )}
    </div>
  );
}
