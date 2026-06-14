'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

interface PartnerDescriptionCardProps {
  title?: string;
  description: string;
  brandColor?: string;
}

function renderMarkdown(text: string, accentColor: string): React.ReactNode {
  if (!text) return null;

  const regex = /(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-[#3A424E]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        const [, linkText, url] = match;
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline hover:opacity-80 transition-opacity"
            style={{ color: accentColor }}
          >
            {linkText}
          </a>
        );
      }
    }
    return part;
  });
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
        {renderMarkdown(description, brandColor)}
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
