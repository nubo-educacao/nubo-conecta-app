'use client';

// DynamicCTA — Sprint 05 Home Refactor
// Five-state CTA that adapts to user authentication, profile and application status.
// 1. Visitante: Criar conta
// 2. Autenticado, sem perfil: Completar perfil
// 3. Perfil ok, sem candidaturas: "Você ainda não fez nenhuma candidatura"
// 4. Candidatura em rascunho: "Candidatura em andamento"
// 5. Concluiu pelo menos 1: "Buscar Novas Vagas" + "Minhas Inscrições"

import Link from 'next/link';
import { LogIn, UserCog, Search, ClipboardList, Loader2, Plus } from 'lucide-react';

export type CTAState = 
  | 'loading' 
  | 'visitor' 
  | 'no-profile' 
  | 'no-applications' 
  | 'application-in-progress' 
  | 'completed-application';

interface DynamicCTAProps {
  state: CTAState;
  onOpenAuth?: () => void;
  lastDraftId?: string | null;
  countInProgress?: number;
}

export default function DynamicCTA({
  state,
  onOpenAuth,
  lastDraftId,
  countInProgress = 0,
}: DynamicCTAProps) {
  if (state === 'loading') {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={24} className="animate-spin" style={{ color: '#38B1E4' }} />
      </div>
    );
  }

  // Common card styles
  const cardBaseClass = "w-full rounded-2xl px-6 py-5 flex items-center gap-4 transition-all hover:shadow-md active:scale-[0.99] border";
  
  if (state === 'visitor') {
    return (
      <button
        onClick={onOpenAuth}
        className={cardBaseClass}
        style={{ background: 'linear-gradient(135deg, #38B1E4 0%, #024F86 100%)', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
      >
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-white/20">
          <LogIn size={24} color="white" />
        </div>
        <div className="text-left">
          <h3 className="font-bold text-base leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Criar conta
          </h3>
          <p className="text-xs opacity-90" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Entre para descobrir suas oportunidades ideais
          </p>
        </div>
      </button>
    );
  }

  if (state === 'no-profile') {
    return (
      <Link
        href="/oportunidades?tab=para-voce"
        className={cardBaseClass}
        style={{ background: '#FFF8E6', borderColor: '#FFE4A3', color: '#B45309' }}
      >
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-[#FFE4A3]">
          <UserCog size={24} color="#B45309" />
        </div>
        <div className="text-left">
          <h3 className="font-bold text-base leading-tight" style={{ color: '#92400E', fontFamily: 'Montserrat, sans-serif' }}>
            Completar perfil
          </h3>
          <p className="text-xs opacity-80" style={{ color: '#B45309', fontFamily: 'Montserrat, sans-serif' }}>
            Adicione seus dados para ver oportunidades para você
          </p>
        </div>
      </Link>
    );
  }

  if (state === 'no-applications') {
    return (
      <Link
        href="/new-application"
        className={cardBaseClass}
        style={{ background: 'white', borderColor: 'rgba(56,177,228,0.2)', color: '#024F86' }}
      >
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-[#024F86]/10">
          <Plus size={24} color="#024F86" />
        </div>
        <div className="text-left">
          <h3 className="font-bold text-base leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Você ainda não fez nenhuma candidatura
          </h3>
          <p className="text-xs text-[#636E7C]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Comece agora e conquiste sua vaga
          </p>
        </div>
      </Link>
    );
  }

  if (state === 'application-in-progress') {
    const href = lastDraftId ? `/partner-forms/${lastDraftId}` : '/candidaturas';
    return (
      <Link
        href={href}
        className={cardBaseClass}
        style={{ background: '#F0F9FF', borderColor: '#BAE6FD', color: '#0369A1' }}
      >
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-[#BAE6FD]">
          <ClipboardList size={24} color="#0369A1" />
        </div>
        <div className="text-left">
          <h3 className="font-bold text-base leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Candidatura em andamento
          </h3>
          <p className="text-xs opacity-80" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Continue de onde você parou
          </p>
        </div>
      </Link>
    );
  }

  // completed-application (Final state: 2 buttons)
  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full">
      <Link
        href="/oportunidades"
        className="flex-1 rounded-2xl px-5 py-6 flex flex-col gap-3 transition-all hover:shadow-md active:scale-[0.98] border border-transparent"
        style={{ background: 'linear-gradient(135deg, #38B1E4 0%, #024F86 100%)', color: 'white' }}
      >
        <Search size={28} color="white" />
        <div>
          <h3 className="font-bold text-lg leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Buscar Novas Vagas
          </h3>
          <p className="text-sm opacity-80" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Explore oportunidades
          </p>
        </div>
      </Link>

      <Link
        href="/candidaturas"
        className="flex-1 rounded-2xl px-5 py-6 flex flex-col gap-3 transition-all hover:shadow-md active:scale-[0.98] bg-white border border-[#E2E8F0]"
      >
        <div className="relative w-fit">
          <ClipboardList size={28} color="#F59E0B" />
          {countInProgress > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
              {countInProgress}
            </div>
          )}
        </div>
        <div>
          <h3 className="font-bold text-lg leading-tight text-[#1E293B]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Minhas Inscrições
          </h3>
          <p className="text-sm text-[#64748B]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {countInProgress} em andamento
          </p>
        </div>
      </Link>
    </div>
  );
}
