'use client';

import React from 'react';
import { Shield, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { humanizeJsonLogic } from '@/utils/jsonLogic';

interface CriterionField {
  id: string;
  field_name: string;
  question_text: string;
  criterion_type: 'eligibility' | 'priority';
  criterion_rule: string | null;
  conditional_rule: string | null;
}

interface CriteriaSectionProps {
  partnerOpportunityId: string;
  legacyCriteria?: any;
}

export default function CriteriaSection({ partnerOpportunityId, legacyCriteria }: CriteriaSectionProps) {
  const [criteria, setCriteria] = React.useState<CriterionField[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    supabase
      .from('partner_forms')
      .select('id, field_name, question_text, criterion_type, criterion_rule, conditional_rule')
      .eq('partner_id', partnerOpportunityId)
      .eq('is_criterion', true)
      .order('sort_order')
      .then(({ data }: { data: CriterionField[] | null }) => {
        if (cancelled) return;
        if (data && data.length > 0) setCriteria(data);
        setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [partnerOpportunityId]);

  if (!loaded) return null;

  // If no structured criteria, fall back to legacy JSONB
  if (criteria.length === 0) {
    if (!legacyCriteria) return null;
    return (
      <LegacyBlock data={legacyCriteria} />
    );
  }

  const topLevelCriteria = criteria.filter((c) => !c.conditional_rule);
  const eligibility = topLevelCriteria.filter((c) => c.criterion_type !== 'priority');
  const priority = topLevelCriteria.filter((c) => c.criterion_type === 'priority');

  return (
    <div className="space-y-6">
      {eligibility.length > 0 && (
        <CriteriaBlock
          icon={<Shield size={24} />}
          title="Você é elegível?"
          subtitle="Critérios eliminatórios"
          items={eligibility}
          color="#3092BB"
          bgClass="bg-[#F8FBFF] border-blue-100/50"
        />
      )}
      {priority.length > 0 && (
        <CriteriaBlock
          icon={<Star size={24} />}
          title="O que priorizam?"
          subtitle="Critérios preferenciais"
          items={priority}
          color="#FF9900"
          bgClass="bg-[#FFFBF5] border-orange-100/50"
        />
      )}
    </div>
  );
}

function CriteriaBlock({ icon, title, subtitle, items, color, bgClass }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  items: CriterionField[];
  color: string;
  bgClass: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`rounded-[32px] p-8 border ${bgClass}`}
    >
      <h3 className="text-[#3A424E] font-black text-xl mb-1 flex items-center gap-3">
        <div className="size-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${color}15`, color }}>
          {icon}
        </div>
        {title}
      </h3>
      <p className="text-xs text-[#707A7E] font-medium mb-6 ml-[52px]">{subtitle}</p>
      <div className="space-y-3">
        {items.map((item) => {
          const ruleText = humanizeJsonLogic(item.criterion_rule);
          return (
            <div key={item.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-start gap-3">
              <div className="size-2 rounded-full mt-2 shrink-0" style={{ backgroundColor: color }} />
              <div>
                <p className="text-sm font-bold text-[#3A424E]">{item.question_text}</p>
                {ruleText && (
                  <p className="text-xs text-[#707A7E] mt-1">{ruleText}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

function LegacyBlock({ data }: { data: any }) {
  if (typeof data === 'string') {
    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-[#F8FBFF] rounded-[32px] p-8 border border-blue-100/50"
      >
        <h3 className="text-[#3A424E] font-black text-xl mb-6 flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-[#3092BB]/10 flex items-center justify-center text-[#3092BB]">
            <Shield size={24} />
          </div>
          Critérios de Elegibilidade
        </h3>
        <p className="text-sm text-[#636E7C] leading-relaxed">{data}</p>
      </motion.section>
    );
  }

  // Object/record fallback
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-[#F8FBFF] rounded-[32px] p-8 border border-blue-100/50"
    >
      <h3 className="text-[#3A424E] font-black text-xl mb-6 flex items-center gap-3">
        <div className="size-10 rounded-2xl bg-[#3092BB]/10 flex items-center justify-center text-[#3092BB]">
          <Shield size={24} />
        </div>
        Critérios de Elegibilidade
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(data).filter(([k]) => k !== 'badges').map(([key, value]) => (
          <div key={key} className="bg-white rounded-xl p-3 border border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase font-bold">{key.replace('_', ' ')}</p>
            <p className="text-sm font-semibold text-[#3A424E]">{String(value)}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
