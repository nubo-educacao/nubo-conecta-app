'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface DateItem {
  label: string;
  date: string; // ISO
  endDate?: string;
  active: boolean;
}

interface ImportantDatesSectionProps {
  isPartner: boolean;
  /** MEC: 'sisu' | 'prouni' */
  opportunityType?: string;
  /** Partner: starts_at / ends_at from opportunity */
  startsAt?: string;
  endsAt?: string;
  /** Pre-fetched MEC dates from parent (avoids duplicate query) */
  mecDates?: { title: string; start_date: string; end_date: string | null }[];
  /** IDs for dynamic querying */
  institutionId?: string;
  opportunityId?: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function ImportantDatesSection({ isPartner, opportunityType, startsAt, endsAt, mecDates: prefetchedDates, institutionId, opportunityId }: ImportantDatesSectionProps) {
  const [dates, setDates] = React.useState<DateItem[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    if (isPartner) {
      if (institutionId) {
        // Fetch from important_dates for partners
        const nowIso = new Date().toISOString();
        let query = supabase
          .from('important_dates')
          .select('title, start_date, end_date, partner_id, opportunity_id')
          .eq('partner_id', institutionId)
          .or(`end_date.gte.${nowIso},and(end_date.is.null,start_date.gte.${nowIso})`)
          .order('start_date', { ascending: true });

        if (opportunityId) {
          // On opp page: show dates for this opp OR general dates for the partner
          query = query.or(`opportunity_id.eq.${opportunityId},opportunity_id.is.null`);
        }

        query.limit(10).then(({ data }: { data: any[] | null }) => {
          if (cancelled) return;
          if (data && data.length > 0) {
            const now = new Date();
            const futureDates = data; // Already filtered in DB
            setDates(futureDates.map((d: any) => ({
              label: d.title,
              date: d.start_date,
              endDate: d.end_date || undefined,
              active: now >= new Date(d.start_date) && (!d.end_date || now <= new Date(d.end_date)),
            })));
            setLoaded(true);
          } else {
            // Fallback to startsAt/endsAt if no dates found in DB
            const items: DateItem[] = [];
            const now = new Date();
            if (startsAt) {
              items.push({ label: 'Início das inscrições', date: startsAt, active: now >= new Date(startsAt) });
            }
            if (endsAt) {
              items.push({ label: 'Encerramento', date: endsAt, active: now <= new Date(endsAt) });
            }
            setDates(items);
            setLoaded(true);
          }
        });
        return () => { cancelled = true; };
      } else {
        // Legacy fallback
        const items: DateItem[] = [];
        const now = new Date();
        if (startsAt) {
          items.push({ label: 'Início das inscrições', date: startsAt, active: now >= new Date(startsAt) });
        }
        if (endsAt) {
          items.push({ label: 'Encerramento', date: endsAt, active: now <= new Date(endsAt) });
        }
        setDates(items);
        setLoaded(true);
      }
    } else if (prefetchedDates && prefetchedDates.length > 0) {
      const now = new Date();
      // Only show dates that haven't fully passed yet
      const futureDates = prefetchedDates.filter((d) => {
        const relevantEnd = d.end_date ? new Date(d.end_date) : new Date(d.start_date);
        return relevantEnd >= now;
      }).slice(0, 8);
      setDates(futureDates.map((d) => ({
        label: d.title,
        date: d.start_date,
        endDate: d.end_date || undefined,
        active: now >= new Date(d.start_date) && (!d.end_date || now <= new Date(d.end_date)),
      })));
      setLoaded(true);
    } else {
      // MEC fallback: fetch from important_dates table
      let cancelled = false;
      const type = opportunityType?.toLowerCase() || 'sisu';
      const nowIso = new Date().toISOString();
      supabase
        .from('important_dates')
        .select('title, start_date, end_date')
        .ilike('type', `%${type}%`)
        .or(`end_date.gte.${nowIso},and(end_date.is.null,start_date.gte.${nowIso})`)
        .order('start_date', { ascending: true })
        .limit(10)
        .then(({ data }: { data: { title: string; start_date: string; end_date: string | null }[] | null }) => {
          if (cancelled) return;
          if (data && data.length > 0) {
            const now = new Date();
            // Already filtered in DB
            const futureDates = data;
            setDates(futureDates.map((d) => ({
              label: d.title,
              date: d.start_date,
              endDate: d.end_date || undefined,
              active: now >= new Date(d.start_date) && (!d.end_date || now <= new Date(d.end_date)),
            })));
          }
          setLoaded(true);
        });
      return () => { cancelled = true; };
    }
  }, [isPartner, opportunityType, startsAt, endsAt, prefetchedDates]);

  if (!loaded || dates.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-gray-100"
    >
      <h3 className="text-[#3A424E] font-black text-xl mb-6 flex items-center gap-3">
        <div className="size-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
          <Calendar size={24} />
        </div>
        Datas Importantes
      </h3>

      {/* Desktop: horizontal timeline */}
      <div className="hidden md:block">
        <div className="relative flex items-start gap-0">
          {/* Connecting line */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 z-0" />
          {dates.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center relative z-10">
              <div className={`size-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${d.active ? 'bg-orange-500 ring-4 ring-orange-100' : 'bg-gray-300'}`}>
                {i + 1}
              </div>
              <p className={`text-xs font-bold mt-2 text-center ${d.active ? 'text-orange-600' : 'text-[#707A7E]'}`}>
                {formatDate(d.date)}
                {d.endDate && ` — ${formatDate(d.endDate)}`}
              </p>
              <p className="text-[11px] text-[#3A424E] font-medium text-center mt-1 max-w-[120px] leading-tight">
                {d.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: vertical list */}
      <div className="md:hidden space-y-3">
        {dates.map((d, i) => (
          <div key={i} className={`flex items-center gap-4 rounded-2xl p-4 border ${d.active ? 'bg-orange-50/50 border-orange-200/50' : 'bg-gray-50 border-gray-100'}`}>
            <div className={`size-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${d.active ? 'bg-orange-500' : 'bg-gray-300'}`}>
              {i + 1}
            </div>
            <div>
              <p className={`text-xs font-bold ${d.active ? 'text-orange-600' : 'text-[#707A7E]'}`}>
                {formatDate(d.date)}
                {d.endDate && ` — ${formatDate(d.endDate)}`}
              </p>
              <p className="text-sm font-semibold text-[#3A424E]">{d.label}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
