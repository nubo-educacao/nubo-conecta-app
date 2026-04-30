'use client';

import React from 'react';
import { Users, Award, GraduationCap, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface SisuProuniCardProps {
  qt_inscricao_2025?: string | number;
  max_cutoff_score?: number;
  vagas_ociosas_2025?: number;
  nu_vagas_autorizadas?: string | number;
  opportunity_type: string;
}

export default function SisuProuniCard({
  qt_inscricao_2025,
  max_cutoff_score,
  vagas_ociosas_2025,
  nu_vagas_autorizadas,
  opportunity_type
}: SisuProuniCardProps) {
  const isSisu = opportunity_type.toLowerCase() === 'sisu';
  const accentColor = isSisu ? '#3092BB' : '#7030C2';

  const description = isSisu
    ? "O SiSU (Sistema de Seleção Unificada) utiliza a nota do ENEM para classificar candidatos em vagas de instituições públicas. A concorrência é baseada na nota de corte, que varia diariamente durante o período de inscrição."
    : "O ProUni concede bolsas de estudo integrais e parciais em instituições privadas. Além da nota do ENEM, o programa considera critérios de renda e escolaridade do candidato.";

  return (
    <div className="space-y-6">
      {/* ── Descrição do Programa ── */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
      >
        <h3 className="text-[#3A424E] font-bold text-lg mb-3">
          Sobre o {isSisu ? 'SiSU' : 'ProUni'}
        </h3>
        <p className="text-sm text-[#636E7C] leading-relaxed">
          {description}
        </p>
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
          <span 
            className="text-[10px] font-bold px-3 py-1 rounded-full text-white uppercase tracking-wider"
            style={{ backgroundColor: accentColor }}
          >
            {opportunity_type} 2025
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Inscritos / Concorrência */}
          <div className="bg-[#F9FAFB] p-4 rounded-2xl flex flex-col gap-2">
            <div className="size-8 rounded-full bg-blue-50 flex items-center justify-center text-[#3092BB]">
              <Users size={16} />
            </div>
            <div>
              <p className="text-[10px] text-[#636E7C] font-bold uppercase">Inscritos</p>
              <p className="text-xl font-black text-[#3A424E]">{qt_inscricao_2025 || '---'}</p>
            </div>
          </div>

          {/* Nota de Corte */}
          <div className="bg-[#F9FAFB] p-4 rounded-2xl flex flex-col gap-2">
            <div className="size-8 rounded-full bg-orange-50 flex items-center justify-center text-[#FF9900]">
              <Award size={16} />
            </div>
            <div>
              <p className="text-[10px] text-[#636E7C] font-bold uppercase">Nota de Corte</p>
              <p className="text-xl font-black text-[#3A424E]">{max_cutoff_score?.toFixed(1) || '---'}</p>
            </div>
          </div>

          {/* Vagas Ofertadas */}
          <div className="bg-[#F9FAFB] p-4 rounded-2xl flex flex-col gap-2">
            <div className="size-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <GraduationCap size={16} />
            </div>
            <div>
              <p className="text-[10px] text-[#636E7C] font-bold uppercase">Vagas</p>
              <p className="text-xl font-black text-[#3A424E]">{nu_vagas_autorizadas || '---'}</p>
            </div>
          </div>

          {/* Vagas Ociosas / Tendência */}
          <div className="bg-[#F9FAFB] p-4 rounded-2xl flex flex-col gap-2">
            <div className="size-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <TrendingUp size={16} />
            </div>
            <div>
              <p className="text-[10px] text-[#636E7C] font-bold uppercase">Vagas Ociosas</p>
              <p className="text-xl font-black text-[#3A424E]">{vagas_ociosas_2025 || '0'}</p>
            </div>
          </div>
        </div>

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
