'use client';
// CTA "Seja Instituição Parceira" — TP-5 5b, card 7410a5bc
//
// Aparece em três contextos, todos escolhidos por intenção declarada e não por
// volume de tráfego: quem está olhando a aba de instituições parceiras, ou
// filtrando por programa de bolsa, ou por programa educacional, já demonstrou
// que o assunto é parceria institucional.

import { useState } from 'react';
import { Handshake } from 'lucide-react';
import PartnerSolicitationModal from './PartnerSolicitationModal';

interface BecomePartnerCTAProps {
  /** 'banner' ocupa a largura; 'inline' acompanha uma linha de pills. */
  variant?: 'banner' | 'inline';
  className?: string;
}

export default function BecomePartnerCTA({
  variant = 'banner',
  className = '',
}: BecomePartnerCTAProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {variant === 'banner' ? (
        <div
          className={`flex flex-col items-start gap-3 rounded-2xl border border-[#E2E8F0] bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
        >
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-bold text-[#024F86]">
              Representa uma instituição?
            </p>
            <p className="text-xs text-[#636E7C]">
              Torne-se parceira e apareça para milhares de estudantes.
            </p>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-full bg-[#024F86] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#023F6B]"
          >
            <Handshake size={16} />
            Seja Instituição Parceira
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border border-[#024F86] px-4 py-2 text-sm font-semibold text-[#024F86] transition-all hover:bg-[#024F86] hover:text-white ${className}`}
        >
          <Handshake size={15} />
          Seja Instituição Parceira
        </button>
      )}

      <PartnerSolicitationModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
