'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import DescriptionMarkdown from '@/components/DescriptionMarkdown';

interface PartnerDescriptionCardProps {
  title?: string;
  description: string;
  brandColor?: string;
}

export default function PartnerDescriptionCard({
  title = 'Sobre o Programa',
  description,
  brandColor = '#7030C2',
}: PartnerDescriptionCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
    >
      <h3 className="text-[#3A424E] font-bold text-lg mb-3 flex items-center gap-2">
        <BookOpen size={20} style={{ color: brandColor }} />
        {title}
      </h3>
      <p className={`text-sm text-[#636E7C] leading-relaxed whitespace-pre-wrap ${isExpanded ? '' : 'line-clamp-4 md:line-clamp-none'}`}>
        <DescriptionMarkdown text={description} variant="opportunity" accentColor={brandColor} />
      </p>
      {description && description.split('\n').length > 4 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="md:hidden mt-3 text-sm font-semibold flex items-center gap-1 focus:outline-none"
          style={{ color: brandColor }}
        >
          {isExpanded ? 'Ver menos' : 'Ver mais'}
        </button>
      )}
    </motion.section>
  );
}
