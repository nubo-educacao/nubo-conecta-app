"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sun, Sunset, Moon, SunMoon, Laptop, Info, Award } from "lucide-react";

export interface Opportunity {
  id: string;
  shift: string;
  scholarship_type?: string;
  concurrency_type?: string;
  concurrency_tags?: string[][];
  scholarship_tags?: string[][];
  cutoff_score: number | null;
  opportunity_type: string;
  year?: number;
  semester?: string;
}

interface OpportunitiesListCardProps {
  opportunities: Opportunity[];
  highlightedOpportunityId?: string;
}

const getTagStyle = (tag: string) => {
  switch (tag) {
    case 'AMPLA_CONCORRENCIA': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', label: 'Ampla Concorrência' };
    case 'ESCOLA_PUBLICA': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', label: 'Escola Pública' };
    case 'BAIXA_RENDA': return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-100', label: 'Baixa Renda' };
    case 'PPI': return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', label: 'PPI' };
    case 'PCD': return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', label: 'PcD' };
    case 'QUILOMBOLAS': return { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-100', label: 'Quilombolas' };
    case 'INDIGENAS': return { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-100', label: 'Indígenas' };
    case 'RURAL': return { bg: 'bg-lime-50', text: 'text-lime-800', border: 'border-lime-100', label: 'Rural' };
    case 'PROFESSOR': return { bg: 'bg-pink-50', text: 'text-pink-800', border: 'border-pink-100', label: 'Professor' };
    case 'TRANS': return { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-100', label: 'Trans' };
    case 'REFUGIADOS': return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100', label: 'Refugiados' };
    case 'BOLSA_INTEGRAL': return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100', label: 'Bolsa Integral' };
    case 'BOLSA_PARCIAL': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', label: 'Bolsa Parcial' };
    case 'MILITAR': return { bg: 'bg-zinc-50', text: 'text-zinc-800', border: 'border-zinc-100', label: 'Militar/Policial' };
    default: return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100', label: tag || 'Outros' };
  }
};

const getShiftDetails = (shift: string) => {
  switch (shift) {
    case 'Matutino': return { icon: Sun, label: 'Matutino', color: 'text-orange-500' };
    case 'Vespertino': return { icon: Sunset, label: 'Vespertino', color: 'text-amber-500' };
    case 'Noturno': return { icon: Moon, label: 'Noturno', color: 'text-indigo-500' };
    case 'Integral': return { icon: SunMoon, label: 'Integral', color: 'text-blue-500' };
    case 'EaD':
    case 'Curso a distância': return { icon: Laptop, label: 'EAD', color: 'text-slate-500' };
    default: return { icon: Sun, label: shift, color: 'text-slate-400' };
  }
};

export default function OpportunitiesListCard({ opportunities, highlightedOpportunityId }: OpportunitiesListCardProps) {
  
  const renderTags = (tags: any) => {
    if (!tags || tags.length === 0) return null;

    let groups: string[][] = Array.isArray(tags[0]) ? tags : [tags];

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {groups.map((group, groupIndex) => (
          <React.Fragment key={groupIndex}>
            {groupIndex > 0 && (
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">OU</span>
            )}
            <div className="flex flex-wrap gap-1">
              {group.map((tag: string) => {
                const style = getTagStyle(tag);
                return (
                  <span 
                    key={tag} 
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${style.bg} ${style.text} ${style.border} whitespace-nowrap`}
                  >
                    {style.label}
                  </span>
                );
              })}
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
        <h3 className="text-[#3A424E] font-bold text-lg">Opções Disponíveis</h3>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold text-[#636E7C] uppercase tracking-wider">Ciclo 2025.1</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[#F9FAFB] text-[#636E7C] text-[10px] uppercase font-bold tracking-wider">
            <tr>
              <th className="px-6 py-4 w-[120px]">Turno</th>
              <th className="px-6 py-4">Modalidade e Cotas</th>
              <th className="px-6 py-4 text-right w-[150px]">Nota de Corte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {opportunities.map((opp) => {
              const { icon: Icon, label, color } = getShiftDetails(opp.shift);
              const isHighlighted = opp.id === highlightedOpportunityId;
              
              return (
                <tr 
                  key={opp.id} 
                  className={`transition-colors group ${isHighlighted ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`size-8 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center ${color}`}>
                        <Icon size={16} />
                      </div>
                      <span className="text-xs font-bold text-[#3A424E]">{label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {renderTags(opp.concurrency_tags || opp.scholarship_tags)}
                      
                      {!opp.concurrency_tags && !opp.scholarship_tags && (
                        <span className="text-xs text-[#636E7C]">
                          {opp.concurrency_type || opp.scholarship_type || 'Ampla Concorrência'}
                        </span>
                      )}

                      <div className="relative group/info">
                        <Info size={14} className="text-slate-300 cursor-help hover:text-[#3092BB] transition-colors" />
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-[#3A424E] text-white text-[10px] rounded-lg opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl leading-tight">
                          {opp.concurrency_type || opp.scholarship_type || 'Vaga regular sem restrições de cota.'}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#3A424E]" />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5">
                        <Award size={14} className="text-[#FF9900]" />
                        <span className="text-sm font-black text-[#3A424E]">
                          {opp.cutoff_score ? opp.cutoff_score.toFixed(1) : '---'}
                        </span>
                      </div>
                      <span className="text-[9px] text-[#636E7C] font-medium">Nota de corte final</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {opportunities.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-sm text-[#636E7C]">Nenhuma modalidade disponível para este curso.</p>
        </div>
      )}
    </motion.section>
  );
}
