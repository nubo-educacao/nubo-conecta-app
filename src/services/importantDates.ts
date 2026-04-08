// importantDates.ts — Sprint 3.5 (rev. schema fix)
// Colunas reais no banco: start_date, end_date, type (NÃO date/category/is_urgent).
// O mapeamento JS converte o schema real para o contrato da UI (IImportantDate).

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export type ImportantDateCategory = 'purple' | 'orange' | 'green' | 'blue';

export interface IImportantDate {
  id: string;
  title: string;
  description: string | null;
  /** Data principal para exibição — mapeada de start_date */
  date: string;
  category: ImportantDateCategory;
  /** Derivado do campo `type` — true quando type indica urgência/prazo */
  is_urgent: boolean;
  created_at: string;
}

// Shape real da linha retornada pelo Supabase
interface ImportantDateRow {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  type: string;
  created_at: string;
}

/**
 * Mapeia o campo `type` do banco para a categoria de cor da UI.
 * Aceita tanto valores de cor diretos ('purple', 'orange', ...)
 * quanto strings semânticas ('deadline', 'event', 'warning', etc.).
 */
function mapTypeToCategory(type: string): ImportantDateCategory {
  const normalized = type.toLowerCase().trim();

  // Mapeamento direto se o valor já for uma cor do design system
  if (normalized === 'purple') return 'purple';
  if (normalized === 'orange') return 'orange';
  if (normalized === 'green')  return 'green';
  if (normalized === 'blue')   return 'blue';

  // Mapeamento semântico
  if (['deadline', 'prazo', 'inscricao', 'inscrição'].some(k => normalized.includes(k))) return 'orange';
  if (['warning', 'aviso', 'alerta', 'urgente'].some(k => normalized.includes(k))) return 'purple';
  if (['success', 'resultado', 'aprovado', 'event', 'evento'].some(k => normalized.includes(k))) return 'green';

  return 'blue'; // fallback
}

/** is_urgent = true quando o type sugere urgência ou prazo iminente */
function deriveIsUrgent(type: string): boolean {
  const normalized = type.toLowerCase().trim();
  return ['urgente', 'prazo', 'deadline', 'alerta', 'warning'].some(k => normalized.includes(k));
}

function mapRowToDate(row: ImportantDateRow): IImportantDate {
  return {
    id:          row.id,
    title:       row.title,
    description: row.description,
    date:        row.start_date,          // UI usa start_date como data principal
    category:    mapTypeToCategory(row.type),
    is_urgent:   deriveIsUrgent(row.type),
    created_at:  row.created_at,
  };
}

export async function getImportantDates(): Promise<IImportantDate[]> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // read-only em Server Component
      },
    },
  );

  const { data, error } = await supabase
    .from('important_dates')
    .select('id, title, description, start_date, end_date, type, created_at')
    .order('start_date', { ascending: true })
    .limit(6);

  if (error) {
    // Fail Loud para debugging — allSettled em page.tsx captura sem obliterar
    throw new Error(`getImportantDates failed: ${error.message} (code: ${error.code})`);
  }

  if (!data) return [];
  return (data as ImportantDateRow[]).map(mapRowToDate);
}
