// types/importantDates.ts — Sprint QA-7
// Tipos e constantes client-safe do domínio "Datas importantes", extraídos
// de src/services/importantDates.ts. Esse serviço importa `next/headers`
// (server-only) para montar o client do Supabase — qualquer Client Component
// que importe QUALQUER símbolo dele (mesmo só um tipo ou uma constante) puxa
// o módulo inteiro para o bundle do cliente e quebra o build do Next.js
// ("You're importing a module that depends on next/headers... in the Pages
// Router" / boundary violation do App Router). Este arquivo não importa nada
// server-only, então pode ser importado livremente por Client Components
// como CalendarDatesList.tsx e AppCalendar.tsx.

export type ImportantDateCategory = 'purple' | 'orange' | 'green' | 'blue';

export type DateType = "prouni" | "sisu" | "partners" | "general";

export const DATE_TYPE_COLORS: Record<DateType, string> = {
  prouni: "#9747FF",
  sisu: "#024F86",
  partners: "#FF9900",
  general: "#38B1E4",
};

export const DATE_TYPE_LABELS: Record<DateType, string> = {
  prouni: "ProUni",
  sisu: "Sisu",
  partners: "Parceiros",
  general: "Geral",
};

export interface IImportantDate {
  id: string;
  title: string;
  description: string | null;
  /** Data principal para exibição — mapeada de start_date */
  date: string;
  /** Data final do período, se houver */
  endDate?: string;
  type: string;
  category: ImportantDateCategory;
  /** Derivado do campo `type` — true quando type indica urgência/prazo */
  is_urgent: boolean;
  created_at: string;
}
