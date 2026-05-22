'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ProgramData {
  title: string;
  description: string;
  status: string;
}

const FALLBACKS: Record<string, ProgramData> = {
  sisu: {
    title: 'Sobre o SiSU',
    description:
      'O SiSU (Sistema de Seleção Unificada) utiliza a nota do ENEM para classificar candidatos em vagas de instituições públicas. A concorrência é baseada na nota de corte, que varia diariamente durante o período de inscrição.',
    status: 'inactive',
  },
  prouni: {
    title: 'Sobre o ProUni',
    description:
      'O ProUni concede bolsas de estudo integrais e parciais em instituições privadas. Além da nota do ENEM, o programa considera critérios de renda e escolaridade do candidato.',
    status: 'inactive',
  },
};

export function useProgram(
  opportunityType: string,
  year?: number,
  semester?: string
): ProgramData & { loading: boolean } {
  const normalizedType = opportunityType.toLowerCase();
  const fallback = FALLBACKS[normalizedType] || {
    title: `Sobre o ${opportunityType}`,
    description: `Programa de acesso ao ensino superior ${opportunityType}.`,
    status: 'inactive',
  };

  const [data, setData] = useState<ProgramData>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchProgram = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('programs')
          .select('title, description, status')
          .eq('type', normalizedType);

        if (year) {
          query = query.eq('cycle_year', year);
        }
        if (semester) {
          query = query.eq('cycle_semester', semester);
        }

        const { data: row, error } = await query.maybeSingle();

        if (cancelled) return;

        if (row) {
          setData({
            title: row.title ?? fallback.title,
            description: row.description ?? fallback.description,
            status: row.status ?? fallback.status,
          });
          setLoading(false);
          return;
        }

        // If no direct match is found for the cycle, fetch the latest program of this type
        const { data: latestRow, error: latestError } = await supabase
          .from('programs')
          .select('title, description, status')
          .eq('type', normalizedType)
          .order('cycle_year', { ascending: false })
          .order('cycle_semester', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (latestRow) {
          setData({
            title: latestRow.title ?? fallback.title,
            description: latestRow.description ?? fallback.description,
            status: latestRow.status ?? fallback.status,
          });
        } else {
          setData(fallback);
        }
      } catch (err) {
        if (!cancelled) {
          setData(fallback);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProgram();

    return () => {
      cancelled = true;
    };
  }, [normalizedType, year, semester]);

  return { ...data, loading };
}
