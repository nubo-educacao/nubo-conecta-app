'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, GraduationCap } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Weights {
  redacao?: number;
  matematica?: number;
  linguagens?: number;
  humanas?: number;
  natureza?: number;
}

interface SisuScoreDisplayProps {
  weights?: Weights | null;
  opportunity_type?: string;
  cycle_year?: number;
}

export default function SisuScoreDisplay({ weights, opportunity_type = 'sisu', cycle_year }: SisuScoreDisplayProps) {
  const [score, setScore] = React.useState<number | null>(null);
  const [year, setYear] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchScore = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[SisuScoreDisplay] user:', user?.id, 'type:', opportunity_type, 'cycle_year:', cycle_year);
      if (!user) { setLoading(false); return; }

      const { data: rows, error } = await supabase
        .from('user_enem_scores')
        .select('year, nota_linguagens, nota_ciencias_humanas, nota_ciencias_natureza, nota_matematica, nota_redacao')
        .eq('user_id', user.id);

      console.log('[SisuScoreDisplay] enem rows:', rows, 'error:', error);
      if (!rows || rows.length === 0) { setLoading(false); return; }

      let best: { score: number; year: number } | null = null;

      const currentYear = new Date().getFullYear();
      const lastEnem = currentYear - 1; // ENEM is applied the prior year (e.g. in 2026, last ENEM = 2025)
      const isProuni = opportunity_type.toLowerCase() === 'prouni';
      
      // SiSU: last 3 ENEM editions (e.g. 2025, 2024, 2023)
      // ProUni: last 2 ENEM editions (e.g. 2025, 2024)
      const allowedYears = isProuni 
        ? [lastEnem, lastEnem - 1] 
        : [lastEnem, lastEnem - 1, lastEnem - 2];

      console.log('[SisuScoreDisplay] currentYear:', currentYear, 'allowedYears:', allowedYears);

      for (const row of rows) {
        if (!allowedYears.includes(row.year)) {
          console.log('[SisuScoreDisplay] skipping row year:', row.year, '(not in allowed years)');
          continue;
        }

        const ling = row.nota_linguagens ?? 0;
        const hum = row.nota_ciencias_humanas ?? 0;
        const nat = row.nota_ciencias_natureza ?? 0;
        const mat = row.nota_matematica ?? 0;
        const red = row.nota_redacao ?? 0;

        const wLing = weights?.linguagens ?? 1;
        const wHum  = weights?.humanas    ?? 1;
        const wNat  = weights?.natureza   ?? 1;
        const wMat  = weights?.matematica ?? 1;
        const wRed  = weights?.redacao    ?? 1;
        const totalWeight = wLing + wHum + wNat + wMat + wRed;

        const weighted = totalWeight > 0
          ? (ling * wLing + hum * wHum + nat * wNat + mat * wMat + red * wRed) / totalWeight
          : 0;

        console.log('[SisuScoreDisplay] row year:', row.year, 'weighted:', weighted);

        if (!best || weighted > best.score) {
          best = { score: weighted, year: row.year };
        }
      }

      console.log('[SisuScoreDisplay] best:', best);
      if (best) { setScore(best.score); setYear(best.year); }
      setLoading(false);
    };

    fetchScore();
  }, [weights, opportunity_type, cycle_year]);

  if (loading || score === null) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-gradient-to-r from-[#024F86] to-[#38B1E4] rounded-3xl p-6 shadow-sm"
    >
      <h3 className="text-white font-bold text-base mb-1 flex items-center gap-2">
        <Sparkles size={18} className="opacity-80" />
        Sua Nota para este Curso
      </h3>
      <p className="text-white/70 text-[11px] mb-4">
        {opportunity_type.toLowerCase() === 'prouni' 
          ? `Média simples (Peso 1) · Melhor ENEM elegível: ${year}`
          : `Calculada com os pesos oficiais · Melhor ENEM elegível: ${year}`}
      </p>
      <div className="flex items-end gap-3">
        <span className="text-5xl font-black text-white leading-none">
          {score.toFixed(1)}
        </span>
        <div className="flex items-center gap-1.5 mb-1 text-white/80">
          <GraduationCap size={16} />
          <span className="text-[12px] font-bold">/ 1000</span>
        </div>
      </div>
    </motion.section>
  );
}
