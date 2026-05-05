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
  weights: Weights;
}

export default function SisuScoreDisplay({ weights }: SisuScoreDisplayProps) {
  const [score, setScore] = React.useState<number | null>(null);
  const [year, setYear] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchScore = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Fetch all years, pick the one with highest weighted score
      const { data: rows } = await supabase
        .from('user_enem_scores')
        .select('year, nota_linguagens, nota_ciencias_humanas, nota_ciencias_natureza, nota_matematica, nota_redacao')
        .eq('user_id', user.id);

      if (!rows || rows.length === 0) { setLoading(false); return; }

      let best: { score: number; year: number } | null = null;

      for (const row of rows) {
        const ling = row.nota_linguagens ?? 0;
        const hum = row.nota_ciencias_humanas ?? 0;
        const nat = row.nota_ciencias_natureza ?? 0;
        const mat = row.nota_matematica ?? 0;
        const red = row.nota_redacao ?? 0;

        const wLing = weights.linguagens ?? 1;
        const wHum  = weights.humanas    ?? 1;
        const wNat  = weights.natureza   ?? 1;
        const wMat  = weights.matematica ?? 1;
        const wRed  = weights.redacao    ?? 1;
        const totalWeight = wLing + wHum + wNat + wMat + wRed;

        const weighted = totalWeight > 0
          ? (ling * wLing + hum * wHum + nat * wNat + mat * wMat + red * wRed) / totalWeight
          : 0;

        if (!best || weighted > best.score) {
          best = { score: weighted, year: row.year };
        }
      }

      if (best) { setScore(best.score); setYear(best.year); }
      setLoading(false);
    };

    fetchScore();
  }, [weights]);

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
        Sua Nota Ponderada para este Curso
      </h3>
      <p className="text-white/70 text-[11px] mb-4">
        Calculada com os pesos oficiais · Melhor ano: {year}
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
