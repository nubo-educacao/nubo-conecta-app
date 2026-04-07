'use client';

// DynamicCTA — Sprint 03 Épico 1A
// Five-state CTA that adapts to user authentication and profile completion status.
//
// Estado 0: Visitante — CTA para entrar/cadastrar
// Estado 1: Autenticado, sem preferências — CTA para completar perfil
// Estado 2: Tem preferências, sem matches — CTA para gerar match
// Estado 3: Tem matches — link para ver resultados
// Estado 4: Loading

import Link from 'next/link';
import { LogIn, UserCog, Sparkles, Trophy, Loader2 } from 'lucide-react';

export type CTAState = 'loading' | 'visitor' | 'no-profile' | 'no-match' | 'has-match';

interface DynamicCTAProps {
  state: CTAState;
  onOpenAuth?: () => void;
  onGenerateMatch?: () => void;
  matchCount?: number;
}

export default function DynamicCTA({
  state,
  onOpenAuth,
  onGenerateMatch,
  matchCount = 0,
}: DynamicCTAProps) {
  if (state === 'loading') {
    return (
      <div className="flex justify-center py-4">
        <Loader2 size={24} className="animate-spin" style={{ color: '#38B1E4' }} />
      </div>
    );
  }

  if (state === 'visitor') {
    return (
      <div
        className="rounded-2xl px-6 py-5 flex flex-col items-center gap-4 text-center"
        style={{ background: 'linear-gradient(135deg, rgba(56,177,228,0.12) 0%, rgba(2,79,134,0.08) 100%)', border: '1px solid rgba(56,177,228,0.2)' }}
      >
        <div
          className="flex items-center justify-center w-12 h-12 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #38B1E4, #024F86)' }}
        >
          <LogIn size={22} color="white" />
        </div>
        <div>
          <h3
            className="font-bold text-base mb-1"
            style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
          >
            Entre para descobrir suas oportunidades
          </h3>
          <p className="text-sm" style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}>
            Criamos um perfil personalizado e encontramos as bolsas e vagas certas para você.
          </p>
        </div>
        <button
          onClick={onOpenAuth}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #38B1E4 0%, #024F86 100%)', fontFamily: 'Montserrat, sans-serif' }}
        >
          Entrar / Cadastrar
        </button>
      </div>
    );
  }

  if (state === 'no-profile') {
    return (
      <div
        className="rounded-2xl px-6 py-5 flex flex-col items-center gap-4 text-center"
        style={{ background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.25)' }}
      >
        <div
          className="flex items-center justify-center w-12 h-12 rounded-xl"
          style={{ background: 'rgba(255,184,0,0.2)' }}
        >
          <UserCog size={22} style={{ color: '#b45309' }} />
        </div>
        <div>
          <h3
            className="font-bold text-base mb-1"
            style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
          >
            Complete seu perfil
          </h3>
          <p className="text-sm" style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}>
            Adicione sua nota do ENEM, renda e interesses para gerar seu match personalizado.
          </p>
        </div>
        <Link
          href="/perfil"
          className="w-full py-3 rounded-xl text-sm font-bold text-center transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'rgba(255,184,0,0.2)', color: '#b45309', fontFamily: 'Montserrat, sans-serif' }}
        >
          Completar perfil
        </Link>
      </div>
    );
  }

  if (state === 'no-match') {
    return (
      <div
        className="rounded-2xl px-6 py-5 flex flex-col items-center gap-4 text-center"
        style={{ background: 'linear-gradient(135deg, rgba(56,177,228,0.12) 0%, rgba(2,79,134,0.08) 100%)', border: '1px solid rgba(56,177,228,0.2)' }}
      >
        <div
          className="flex items-center justify-center w-12 h-12 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #38B1E4, #024F86)' }}
        >
          <Sparkles size={22} color="white" />
        </div>
        <div>
          <h3
            className="font-bold text-base mb-1"
            style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
          >
            Gere seu Match agora
          </h3>
          <p className="text-sm" style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}>
            Calculamos sua compatibilidade com todas as oportunidades disponíveis.
          </p>
        </div>
        <button
          onClick={onGenerateMatch}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #38B1E4 0%, #024F86 100%)', fontFamily: 'Montserrat, sans-serif' }}
        >
          <Sparkles size={15} className="inline mr-1.5" />
          Gerar meu Match
        </button>
      </div>
    );
  }

  // has-match
  return (
    <div
      className="rounded-2xl px-6 py-5 flex items-center justify-between gap-4"
      style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl"
          style={{ background: 'rgba(22,163,74,0.15)' }}
        >
          <Trophy size={20} style={{ color: '#16a34a' }} />
        </div>
        <div>
          <p
            className="font-bold text-sm"
            style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
          >
            {matchCount} oportunidades encontradas
          </p>
          <p className="text-xs" style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}>
            Baseado no seu perfil completo
          </p>
        </div>
      </div>
      <Link
        href="/oportunidades?tab=para-voce"
        className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90"
        style={{ background: 'rgba(22,163,74,0.15)', color: '#16a34a', fontFamily: 'Montserrat, sans-serif' }}
      >
        Ver tudo
      </Link>
    </div>
  );
}
