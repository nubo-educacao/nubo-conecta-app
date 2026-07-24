"use client";

import React from "react";
import { DayPicker, DayButtonProps, DayButton } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { ptBR } from "date-fns/locale";
import type { IImportantDate, DateType } from "@/types/importantDates";
import { DATE_TYPE_COLORS } from "@/types/importantDates";

interface AppCalendarProps {
  dates: IImportantDate[];
  selectedMonth: Date;
  onMonthChange: (month: Date) => void;
  selectedDay: Date | undefined;
  onDaySelect: (day: Date | undefined) => void;
}

export default function AppCalendar({
  dates,
  selectedMonth,
  onMonthChange,
  selectedDay,
  onDaySelect,
}: AppCalendarProps) {
  // Build a map of day -> types for dot rendering
  const dayTypeMap = new Map<string, Set<string>>();

  dates.forEach((d) => {
    const start = new Date(d.date);
    const end = d.endDate ? new Date(d.endDate) : start;
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endNorm = new Date(end);
    endNorm.setHours(0, 0, 0, 0);

    while (current <= endNorm) {
      const key = current.toISOString().split("T")[0];
      if (!dayTypeMap.has(key)) {
        dayTypeMap.set(key, new Set());
      }
      dayTypeMap.get(key)!.add(d.type || d.category);
      current.setDate(current.getDate() + 1);
    }
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 h-full flex flex-col items-center justify-center min-w-[460px]">
      <style>{`
        .app-calendar .rdp-root {
          --rdp-accent-color: #024F86;
          --rdp-accent-background-color: #f1f5f9;
          --rdp-day-width: 54px;
          --rdp-day-height: 54px;
          --rdp-day-font-size: 1.1rem;
          margin: 0;
        }
        
        .app-calendar .rdp-month_grid {
          border-collapse: separate;
          border-spacing: 6px;
        }
        
        .app-calendar .rdp-day {
          border-radius: 14px;
          font-weight: 600;
          color: #334155;
        }
        
        .app-calendar .rdp-day_selected {
          background-color: #024F86 !important;
          color: white !important;
          font-weight: 800;
          box-shadow: 0 4px 12px rgba(2, 79, 134, 0.2);
        }

        .app-calendar .rdp-weekday {
          text-transform: uppercase;
          font-size: 0.8rem;
          font-weight: 800;
          color: #94a3b8;
          padding-bottom: 1.5rem;
        }
        
        .app-calendar .rdp-month_caption {
          margin-bottom: 2rem;
          padding-left: 0.5rem;
        }

        .app-calendar .rdp-caption_label {
          font-weight: 900;
          color: #024F86;
          font-size: 1.5rem;
          text-transform: capitalize;
        }

        .app-calendar .day-button-content {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .app-calendar .calendar-dots {
          display: flex;
          gap: 3px;
          position: absolute;
          bottom: 6px;
        }

        .app-calendar .calendar-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          border: 1px solid white;
        }
        
        .app-calendar .rdp-nav {
          color: #024F86;
          gap: 0.5rem;
        }

        .app-calendar .rdp-button_next, 
        .app-calendar .rdp-button_previous {
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #f1f5f9;
          width: 40px;
          height: 40px;
          transition: all 0.2s ease;
        }

        .app-calendar .rdp-button_next:hover, 
        .app-calendar .rdp-button_previous:hover {
          background: white;
          border-color: #024F86;
          color: #024F86;
        }
      `}</style>
      <div className="app-calendar">
        <DayPicker
          mode="single"
          locale={ptBR}
          selected={selectedDay}
          onSelect={onDaySelect}
          month={selectedMonth}
          onMonthChange={onMonthChange}
          showOutsideDays
          components={{
            DayButton: (props: DayButtonProps) => {
              const { day, modifiers, ...buttonProps } = props;
              const date = day.date;
              const key = date.toISOString().split("T")[0];
              const types = dayTypeMap.get(key);

              return (
                <DayButton {...props}>
                  <div className="day-button-content">
                    <span>{date.getDate()}</span>
                    {types && types.size > 0 && (
                      <div className="calendar-dots">
                        {Array.from(types).map((type) => (
                          <div
                            key={type}
                            className="calendar-dot"
                            style={{
                              backgroundColor: DATE_TYPE_COLORS[type as DateType] || "#999",
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </DayButton>
              );
            },
          }}
        />
      </div>
    </div>
  );
}
