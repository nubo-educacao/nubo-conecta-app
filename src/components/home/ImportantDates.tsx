'use client';

// ImportantDates — Sprint 3.5 (rev. Design Review)
// Seção "Avisos e Datas Importantes".
// Mobile: Calendar box com cores dinâmicas e texto bold colorido pela categoria.
// Desktop: CalendarAccordion interativo completo com AppCalendar e CalendarDatesList (estilo Hub).
// Cores: ProUni = roxo, Sisu = azul, Parceiros = laranja/amarelo.

import React, { useState } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import type { IImportantDate, ImportantDateCategory } from '@/services/importantDates';
import AppCalendar from './AppCalendar';
import CalendarDatesList from './CalendarDatesList';

const CATEGORY_STYLES: Record<
  ImportantDateCategory,
  { bg: string; border: string; dateColor: string; dot: string; icon: string }
> = {
  purple: {
    bg: 'rgba(151, 71, 255, 0.1)',
    border: 'rgba(151, 71, 255, 0.2)',
    dateColor: '#9747FF',
    dot: 'text-[#9747FF]',
    icon: 'text-[#9747FF]',
  },
  blue: {
    bg: 'rgba(56, 177, 228, 0.1)',
    border: 'rgba(56, 177, 228, 0.2)',
    dateColor: '#38B1E4',
    dot: 'text-[#38B1E4]',
    icon: 'text-[#38B1E4]',
  },
  orange: {
    bg: 'rgba(255, 153, 0, 0.1)',
    border: 'rgba(255, 153, 0, 0.2)',
    dateColor: '#FF9900',
    dot: 'text-[#FF9900]',
    icon: 'text-[#FF9900]',
  },
  green: {
    bg: 'rgba(22, 163, 74, 0.1)',
    border: 'rgba(22, 163, 74, 0.2)',
    dateColor: '#16A34A',
    dot: 'text-[#16A34A]',
    icon: 'text-[#16A34A]',
  },
};

const formatMonth = (date: Date) => {
  const month = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
  return month.charAt(0).toUpperCase() + month.slice(1);
};

const formatDateRange = (start: string, end?: string) => {
  const d1 = new Date(start);
  const d1Str = `${d1.getDate().toString().padStart(2, '0')} ${formatMonth(d1)}`;
  
  if (end) {
    const d2 = new Date(end);
    const d2Str = `${d2.getDate().toString().padStart(2, '0')} ${formatMonth(d2)}`;
    return `${d1Str} - ${d2Str}`;
  }

  return d1Str;
};

interface ImportantDatesProps {
  dates: IImportantDate[];
}

export default function ImportantDates({ dates }: ImportantDatesProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();

  if (dates.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 px-4 w-full">
      <h2
        className="text-base font-bold"
        style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
      >
        Datas importantes
      </h2>

      {/* MOBILE VERSION (Cards) */}
      <div className="flex flex-col gap-3 md:hidden">
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
                <Calendar size={18} style={{ color: styles.dateColor }} strokeWidth={1.75} />
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
                  {formatDateRange(item.date, item.endDate)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP VERSION (Calendar side-by-side with dates list) */}
      <div className="hidden md:block w-full">
        <div className="flex flex-col md:flex-row gap-6 items-stretch w-full">
          <div className="shrink-0 flex flex-col">
            <AppCalendar
              dates={dates}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              selectedDay={selectedDay}
              onDaySelect={setSelectedDay}
            />
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <CalendarDatesList dates={dates} selectedMonth={selectedMonth} />
          </div>
        </div>
      </div>
    </section>
  );
}
