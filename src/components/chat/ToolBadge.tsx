'use client';

// ToolBadge — Sprint 03 Épico 1C
// Shows an animated "Cloudinha está pesquisando..." badge while tool is active.

import { Search, Loader2 } from 'lucide-react';

const TOOL_LABELS: Record<string, string> = {
  search_opportunities: 'pesquisando oportunidades',
  get_institution: 'buscando instituição',
  get_application_status: 'verificando candidatura',
  cep_lookup: 'buscando localização',
  pesquisando: 'pesquisando',
};

interface ToolBadgeProps {
  toolName: string;
}

export default function ToolBadge({ toolName }: ToolBadgeProps) {
  const label = TOOL_LABELS[toolName] ?? toolName;

  return (
    <div className="flex justify-start px-4 mb-1">
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
        style={{
          background: 'rgba(56,177,228,0.1)',
          color: '#38B1E4',
          border: '1px solid rgba(56,177,228,0.2)',
          fontFamily: 'Montserrat, sans-serif',
        }}
      >
        <Loader2 size={12} className="animate-spin" />
        <span>Cloudinha está {label}...</span>
        <Search size={12} />
      </div>
    </div>
  );
}
