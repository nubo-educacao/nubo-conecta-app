'use client';

import React from 'react';
import { Users, Award, GraduationCap, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

import { useProgram } from '@/hooks/useProgram';

interface SisuProuniCardProps {
  qt_inscricao_prev?: string | number | null;
  min_cutoff_score?: number | null;
  max_cutoff_score?: number | null;
  vagas_ociosas_prev?: boolean | null;
  opportunity_type: string;
  qt_aprovados?: number | null;
  cycle_year?: number;
  cycle_semester?: string;
  nu_media_minima_enem?: number | null;
  total_vacancies?: number | null;
}

function renderMarkdown(text: string, accentColor: string): React.ReactNode {
  if (!text) return null;

  const regex = /(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-[#3A424E]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        const [, linkText, url] = match;
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline hover:opacity-80 transition-opacity"
            style={{ color: accentColor }}
          >
            {linkText}
          </a>
        );
      }
    }
    return part;
  });
}

export default function SisuProuniCard({
  qt_inscricao_prev,
  min_cutoff_score,
  max_cutoff_score,
  vagas_ociosas_prev,
  opportunity_type,
  qt_aprovados,
  cycle_year,
  cycle_semester,
  nu_media_minima_enem,
  total_vacancies
}: SisuProuniCardProps) {
  const isSisu = opportunity_type.toLowerCase() === 'sisu';
  const accentColor = isSisu ? '#38B1E4' : '#7030C2';

  const { title, description } = useProgram(opportunity_type, cycle_year, cycle_semester);

  const [isExpanded, setIsExpanded] = React.useState(false);

  const badgeText = cycle_year
    ? `${opportunity_type} ${cycle_year}${cycle_semester && !isSisu ? `.${cycle_semester}` : ''}`.toUpperCase()
    : `${opportunity_type} 2025`.toUpperCase();

  return (
    <div className="space-y-6">
      {/* ── Descrição do Programa ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
      >
        <h3 className="text-[#3A424E] font-bold text-lg mb-3">
          {title}
        </h3>
        <p className={`text-sm text-[#636E7C] leading-relaxed whitespace-pre-line ${isExpanded ? '' : 'line-clamp-4 md:line-clamp-none'}`}>
          {renderMarkdown(description, accentColor)}
        </p>
        {description && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="md:hidden mt-3 text-sm font-semibold flex items-center gap-1 focus:outline-none"
            style={{ color: accentColor }}
          >
            {isExpanded ? 'Ver menos' : 'Ver mais'}
          </button>
        )}
      </motion.section>

      {/* ── Métricas do Curso ── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[#3A424E] font-bold text-lg">Métricas do Curso</h3>
          <div
            className="px-3 py-1 rounded-full text-[10px] font-black tracking-wider text-white"
            style={{ backgroundColor: accentColor }}
          >
            {badgeText}
          </div>
        </div>

        {(() => {
          const hasInscritosOrAprovados = isSisu && (qt_inscricao_prev != null || qt_aprovados != null);
          return (
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mt-2`}>
              {/* Inscritos / Aprovados (SiSU Only) */}
              {isSisu && hasInscritosOrAprovados && (
                <div className="bg-[#F9FAFB] p-4 rounded-2xl flex flex-col gap-2 h-full">
                  <div className="size-8 rounded-full bg-blue-50 flex items-center justify-center text-[#38B1E4]">
                    <Users size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#636E7C] font-bold uppercase">
                      {qt_inscricao_prev != null ? 'Inscritos' : 'Aprovados'}
                    </p>
                    <p className="text-xl font-black text-[#3A424E]">
                      {qt_inscricao_prev != null ? qt_inscricao_prev : qt_aprovados}
                    </p>
                  </div>
                </div>
              )}

              {/* Nota de Corte (SiSU Only) */}
              {isSisu && (
                <div className={`bg-[#F9FAFB] p-4 rounded-2xl flex ${hasInscritosOrAprovados ? 'flex-col gap-2' : 'items-center gap-4'} h-full`}>
                  <div className={`${hasInscritosOrAprovados ? 'size-8 rounded-full' : 'size-10 rounded-xl shrink-0'} bg-orange-50 flex items-center justify-center text-[#FF9900]`}>
                    <Award size={hasInscritosOrAprovados ? 16 : 20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#636E7C] font-bold uppercase">Nota de Corte</p>
                    <p className={`${hasInscritosOrAprovados ? 'text-xl' : 'text-sm'} font-black text-[#3A424E]`}>
                      {(() => {
                        if (min_cutoff_score && max_cutoff_score) {
                          return min_cutoff_score === max_cutoff_score
                            ? min_cutoff_score.toFixed(1)
                            : `${min_cutoff_score.toFixed(1)} a ${max_cutoff_score.toFixed(1)}`;
                        }
                        if (max_cutoff_score) return max_cutoff_score.toFixed(1);
                        if (min_cutoff_score) return min_cutoff_score.toFixed(1);
                        return '---';
                      })()}
                    </p>
                  </div>
                </div>
              )}

              {/* ProUni Metrics: Vagas Ofertadas & Vagas Ociosas */}
              {!isSisu && (
                <>
                  <div className="bg-[#F9FAFB] p-4 rounded-2xl flex items-center gap-4 h-full">
                    <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#38B1E4] shrink-0">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#636E7C] font-bold uppercase">Vagas Ofertadas</p>
                      <p className="text-xl font-black text-[#3A424E]">
                        {total_vacancies != null ? total_vacancies : '---'}
                      </p>
                    </div>
                  </div>

                  {vagas_ociosas_prev === true && (
                    <div className="bg-[#F9FAFB] p-4 rounded-2xl flex items-center gap-4 h-full">
                      <div className="size-10 rounded-xl bg-purple-50 flex items-center justify-center text-[#7030C2] shrink-0">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] text-[#636E7C] font-bold uppercase">Status das Vagas</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-wider">
                          Vagas Ociosas
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Média Mínima ENEM Pre-requisite Alert (SiSU Only) ── */}
              {isSisu && nu_media_minima_enem && Number(nu_media_minima_enem) > 0 ? (
                <div className={`bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-4 h-full ${hasInscritosOrAprovados ? 'md:col-span-2' : ''}`}>
                  <div className="size-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                    <Award size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-red-400 font-bold uppercase">Pré-requisito do Curso</p>
                    <p className="text-sm font-bold text-[#3A424E]">
                      Média Mínima ENEM exigida: <span className="text-red-600 font-black">{Number(nu_media_minima_enem).toFixed(1)}</span> pontos
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })()}

        {/* Progress / Context */}
        <div className="pt-2">
          <p className="text-[11px] text-[#636E7C] leading-tight">
            * Dados baseados no ciclo anterior do MEC. A concorrência pode variar conforme a demanda atual.
          </p>
        </div>
      </motion.section>
    </div>
  );
}
