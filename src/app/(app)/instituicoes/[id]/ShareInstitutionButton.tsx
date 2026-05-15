'use client';

import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareInstitutionButtonProps {
  institutionName: string;
  location: string | null;
  institutionId: string;
}

export default function ShareInstitutionButton({ institutionName, location, institutionId }: ShareInstitutionButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/instituicoes/${institutionId}`;
      const locationText = location ? ` em ${location}` : '';
      const text = `Olha que legal essa instituição que encontrei no Nubo Conecta!\n\n🎓 ${institutionName}${locationText}\n\nConfira as vagas disponíveis e dê o próximo passo no seu futuro:\n${url}`;
      
      if (navigator.share) {
        await navigator.share({
          title: institutionName,
          text: `Confira ${institutionName} no Nubo Conecta!`,
          url: url
        });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <button
      onClick={handleShare}
      className={cn(
        "flex items-center justify-center w-9 h-9 rounded-full backdrop-blur-sm transition-colors text-white",
        copied ? "bg-green-500 hover:bg-green-600" : "bg-white/20 hover:bg-white/30"
      )}
      title="Compartilhar"
    >
      {copied ? <Check size={18} /> : <Share2 size={18} />}
    </button>
  );
}
