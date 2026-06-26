"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import type { IImportantDate } from "@/services/importantDates";
import AppCalendar from "./AppCalendar";
import CalendarDatesList from "./CalendarDatesList";

interface CalendarAccordionProps {
  dates: IImportantDate[];
}

export default function CalendarAccordion({ dates }: CalendarAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();

  return (
    <div className="w-full h-full flex flex-col">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-[#024F86]/30 transition-all duration-200 group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#024F86]/5 flex items-center justify-center text-[#024F86] group-hover:bg-[#024F86] group-hover:text-white transition-all duration-300 shadow-sm">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h3 className="font-extrabold text-[#024F86] text-xl uppercase tracking-tight">
              Calendário de Datas
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Prazos oficiais Sisu, ProUni e Parceiros
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "backOut" }}
          className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#024F86] group-hover:bg-[#024F86]/10"
        >
          <ChevronDown className="w-6 h-6" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden mt-4"
          >
            <div className="flex flex-col md:flex-row gap-6 items-stretch">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
