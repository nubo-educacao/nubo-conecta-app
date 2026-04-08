// ImportantDates — Sprint 3.5 (rev. Design Review)
// Seção "Avisos e Datas Importantes".
// Calendar box: bg-white rounded-full shadow-sm, ícone grafite (#3A424E).
// Data: texto bold colorido pela categoria — SEM badge/background.
// AlertCircle vermelho quando is_urgent === true.

import { Calendar, AlertCircle } from 'lucide-react';
import type { IImportantDate, ImportantDateCategory } from '@/services/importantDates';

const CATEGORY_STYLES: Record<
  ImportantDateCategory,
  { bg: string; border: string; dateColor: string }
> = {
  purple: {
    bg: 'rgba(112,48,194,0.07)',
    border: 'rgba(112,48,194,0.18)',
    dateColor: '#7030C2',
  },
  orange: {
    bg: 'rgba(234,88,12,0.07)',
    border: 'rgba(234,88,12,0.18)',
    dateColor: '#EA580C',
  },
  green: {
    bg: 'rgba(22,163,74,0.07)',
    border: 'rgba(22,163,74,0.18)',
    dateColor: '#16A34A',
  },
  blue: {
    bg: 'rgba(56,177,228,0.07)',
    border: 'rgba(56,177,228,0.18)',
    dateColor: '#38B1E4',
  },
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface ImportantDatesProps {
  dates: IImportantDate[];
}

export default function ImportantDates({ dates }: ImportantDatesProps) {
  if (dates.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 px-4">
      <h2
        className="text-base font-bold"
        style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
      >
        Avisos e Datas Importantes
      </h2>

      <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
        {dates.map((item) => {
          const styles = CATEGORY_STYLES[item.category] ?? CATEGORY_STYLES.blue;
          return (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-2xl p-4"
              style={{
                background: styles.bg,
                border: `1px solid ${styles.border}`,
              }}
            >
              {/* Calendário: bg-white rounded-full shadow-sm, ícone grafite */}
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm mt-0.5">
                <Calendar size={18} style={{ color: '#3A424E' }} strokeWidth={1.75} />
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                {/* Título com AlertCircle urgente */}
                <div className="flex items-start gap-1.5">
                  <p
                    className="font-bold text-sm leading-snug"
                    style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {item.title}
                  </p>
                  {item.is_urgent && (
                    <AlertCircle
                      size={14}
                      className="text-red-500 shrink-0 mt-0.5"
                      strokeWidth={2}
                      aria-label="Urgente"
                    />
                  )}
                </div>

                {item.description && (
                  <p
                    className="text-xs mt-0.5 leading-relaxed line-clamp-2"
                    style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
                  >
                    {item.description}
                  </p>
                )}

                {/* Data: texto bold colorido — sem badge/background */}
                <p
                  className="text-xs font-bold mt-1.5"
                  style={{ color: styles.dateColor, fontFamily: 'Montserrat, sans-serif' }}
                >
                  {formatDate(item.date)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
