"use client";

import React from "react";
import type { IImportantDate, DateType } from "@/services/importantDates";
import { DATE_TYPE_COLORS, DATE_TYPE_LABELS } from "@/services/importantDates";
import { format, areIntervalsOverlapping, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CalendarDatesListProps {
  dates: IImportantDate[];
  selectedMonth: Date;
}

export default function CalendarDatesList({ dates, selectedMonth }: CalendarDatesListProps) {
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  // Filter dates that fall within or overlap the selected month
  const monthDates = dates.filter((d) => {
    const start = new Date(d.date);
    const end = d.endDate ? new Date(d.endDate) : start;
    return areIntervalsOverlapping(
      { start, end },
      { start: monthStart, end: monthEnd },
      { inclusive: true }
    );
  });

  const formatDateRange = (startStr: string, endStr?: string | null) => {
    const start = new Date(startStr);
    const startFormatted = format(start, "dd MMM", { locale: ptBR });

    if (endStr) {
      const end = new Date(endStr);
      if (format(start, "ddMMyyyy") === format(end, "ddMMyyyy")) {
          return startFormatted;
      }
      const endFormatted = format(end, "dd MMM", { locale: ptBR });
      return `${startFormatted} — ${endFormatted}`;
    }

    return startFormatted;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden h-full min-h-[400px]">
      <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50">
        <h3 className="font-extrabold text-[#024F86] text-sm uppercase tracking-wider">
          Datas de {format(selectedMonth, "MMMM", { locale: ptBR })}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {monthDates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
             <p className="text-sm italic font-medium">Nenhuma data cadastrada para este mês.</p>
          </div>
        ) : (
          monthDates.map((date) => {
            const typeColor = DATE_TYPE_COLORS[date.type as DateType] || "#999";
            const typeLabel = DATE_TYPE_LABELS[date.type as DateType] || date.type;

            return (
              <div
                key={date.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-slate-50/30 hover:bg-slate-50 transition-all duration-200 border border-transparent hover:border-slate-100"
              >
                <div
                  className="w-1.5 rounded-full self-stretch shrink-0 mt-0.5"
                  style={{ backgroundColor: typeColor }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-[#024F86] text-sm leading-tight">
                      {date.title}
                    </span>
                    <span 
                      className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border shrink-0 tracking-wider"
                      style={{ 
                        borderColor: `${typeColor}40`, 
                        color: typeColor,
                        backgroundColor: `${typeColor}08`
                      }}
                    >
                      {typeLabel}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-[#38B1E4]">
                    {formatDateRange(date.date, date.endDate)}
                  </p>
                  {date.description && (
                    <p className="text-[12px] text-slate-500 mt-2 line-clamp-3 leading-relaxed font-medium">
                      {date.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
