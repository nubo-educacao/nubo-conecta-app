'use client';

// DynamicCTA — Sprint 15.0 Figma Aligned & Premium Refactor
// Five-state CTA that adapts to user authentication, profile and application status.
// 1. visitor: Crie sua conta (Figma node 273-3973 / 273-4018)
// 2. no-profile: Complete seu perfil (Figma node 273-3958 / 273-4004)
// 3. no-applications: Primeira candidatura (Figma node 273-3949 / 273-3996)
// 4. application-in-progress: Candidatura em andamento (Figma node 273-3937 / 273-3985)
// 5. completed-application: Buscar Novas Vagas + Minhas Inscrições (Adapted visual style)

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
      <div className="flex justify-center items-center py-8 min-h-[88px] md:min-h-[96px] w-full">
        <Loader2 size={28} className="animate-spin text-[#38B1E4]" />
      </div>
    );
  }

  // Base card styles with premium aesthetics (Geometria de Marca, smooth active scale, premium shadow)
  const cardBaseClass = "w-full min-h-[88px] md:min-h-[96px] rounded-[20px] px-5 py-4 md:px-6 md:py-5 flex items-center gap-4 md:gap-5 transition-all duration-300 hover:shadow-lg active:scale-[0.99] border text-left cursor-pointer focus:outline-none";

  if (state === 'visitor') {
    return (
      <button
        onClick={onOpenAuth}
        className={cardBaseClass}
        style={{ 
          background: 'linear-gradient(135deg, #38B1E4 0%, #024F86 100%)', 
          borderColor: 'rgba(255, 255, 255, 0.15)', 
          color: 'white',
          boxShadow: '0 8px 30px rgba(2, 79, 134, 0.15)'
        }}
      >
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 md:w-[52px] md:h-[52px] rounded-[14px] bg-white/20 backdrop-blur-md shadow-inner transition-transform duration-300 group-hover:scale-105">
          <LogIn size={24} className="text-white" />
        </div>
        <div className="flex flex-col gap-0.5 justify-center">
          <h3 className="font-bold text-base md:text-lg leading-tight tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Crie sua conta
          </h3>
          <p className="text-xs md:text-sm opacity-90 leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
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
        style={{ 
          background: '#FFFDF5', 
          borderColor: '#FEF3C7', 
          color: '#B45309',
          boxShadow: '0 8px 30px rgba(217, 119, 6, 0.05)'
        }}
      >
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 md:w-[52px] md:h-[52px] rounded-[14px] bg-[#FEF3C7] shadow-sm">
          <UserCog size={24} className="text-[#B45309]" />
        </div>
        <div className="flex flex-col gap-0.5 justify-center">
          <h3 className="font-bold text-base md:text-lg leading-tight tracking-tight text-[#92400E]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Complete seu perfil
          </h3>
          <p className="text-xs md:text-sm text-[#B45309]/90 leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Adicione seus dados para ver oportunidades para você
          </p>
        </div>
      </Link>
    );
  }

  if (state === 'no-applications') {
    return (
      <Link
        href="/oportunidades"
        className={cardBaseClass}
        style={{ 
          background: '#FFFFFF', 
          borderColor: 'rgba(56, 177, 228, 0.25)', 
          color: '#024F86',
          boxShadow: '0 8px 30px rgba(56, 177, 228, 0.06)'
        }}
      >
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 md:w-[52px] md:h-[52px] rounded-[14px] bg-[#024F86]/10 shadow-sm">
          <Plus size={24} className="text-[#024F86]" />
        </div>
        <div className="flex flex-col gap-0.5 justify-center">
          <h3 className="font-bold text-base md:text-lg leading-tight tracking-tight text-[#024F86]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Primeira candidatura
          </h3>
          <p className="text-xs md:text-sm text-[#636E7C] leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
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
        style={{ 
          background: '#F0F9FF', 
          borderColor: '#BAE6FD', 
          color: '#0369A1',
          boxShadow: '0 8px 30px rgba(3, 105, 161, 0.05)'
        }}
      >
        <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 md:w-[52px] md:h-[52px] rounded-[14px] bg-[#BAE6FD] shadow-sm">
          <ClipboardList size={24} className="text-[#0369A1]" />
        </div>
        <div className="flex flex-col gap-0.5 justify-center">
          <h3 className="font-bold text-base md:text-lg leading-tight tracking-tight text-[#0369A1]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Candidatura em andamento
          </h3>
          <p className="text-xs md:text-sm text-[#0284C7] leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Continue de onde você parou
          </p>
        </div>
      </Link>
    );
  }

  // completed-application (Adapted to the premium design language with 2 buttons)
  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full">
      <Link
        href="/oportunidades"
        className="flex-1 rounded-[20px] px-5 py-5 md:px-6 md:py-6 flex flex-col gap-4 transition-all duration-300 hover:shadow-lg active:scale-[0.98] border border-transparent"
        style={{ 
          background: 'linear-gradient(135deg, #38B1E4 0%, #024F86 100%)', 
          color: 'white',
          boxShadow: '0 8px 30px rgba(2, 79, 134, 0.12)'
        }}
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-[14px] bg-white/20 backdrop-blur-md">
          <Search size={26} className="text-white" />
        </div>
        <div className="flex flex-col gap-1 text-left">
          <h3 className="font-bold text-base md:text-lg leading-tight tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Buscar Novas Vagas
          </h3>
          <p className="text-xs md:text-sm opacity-90" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Explore oportunidades
          </p>
        </div>
      </Link>

      <Link
        href="/candidaturas"
        className="flex-1 rounded-[20px] px-5 py-5 md:px-6 md:py-6 flex flex-col gap-4 transition-all duration-300 hover:shadow-lg active:scale-[0.98] bg-white border border-[#E2E8F0]"
        style={{
          boxShadow: '0 8px 30px rgba(100, 116, 139, 0.05)'
        }}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center justify-center w-12 h-12 rounded-[14px] bg-[#F59E0B]/10">
            <ClipboardList size={26} className="text-[#F59E0B]" />
          </div>
          {countInProgress > 0 && (
            <div className="w-6 h-6 rounded-full bg-[#EF4444] text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
              {countInProgress}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 text-left">
          <h3 className="font-bold text-base md:text-lg leading-tight tracking-tight text-[#1E293B]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Minhas Inscrições
          </h3>
          <p className="text-xs md:text-sm text-[#64748B]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {countInProgress} {countInProgress === 1 ? 'candidatura' : 'candidaturas'} em andamento
          </p>
        </div>
      </Link>
    </div>
  );
}
