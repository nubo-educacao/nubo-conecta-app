'use client';

// DynamicCTA — Sprint 15.0 Figma High-Fidelity Refactor
// Matches the exact design specifications for WEB (600px) and MOBILE (330px) breakpoints:
// 1. visitor: Navy blue gradient with CTA button & Cloudinha avatar
// 2. no-profile: Cream/amber border with "AÇÃO NECESSÁRIA" badge, title, progress bar (5 dashes) & Cloudinha avatar
// 3. no-applications: White background with dashed blue border, "⚡ Começar agora" button, title, description & Cloudinha avatar with heart overlay
// 4. application-in-progress: Light blue background, solid blue progress bar, "65% concluído" & Cloudinha avatar

import Link from 'next/link';
import { ChevronRight, Loader2, Sparkles, Search, ClipboardList } from 'lucide-react';

export type CTAState =
  | 'loading'
  | 'visitor'
  | 'no-profile'
  | 'no-applications'
  | 'application-in-progress'
  | 'application-ready-to-submit'
  | 'completed-application'
  | 'phase-updated';

interface DynamicCTAProps {
  state: CTAState;
  onOpenAuth?: () => void;
  lastDraftId?: string | null;
  countInProgress?: number;
  draftProgress?: number;
  phaseData?: {
    phaseId: string;
    opportunityName: string;
    phaseName: string;
    onClick: (phaseId: string) => void;
  };
}

export default function DynamicCTA({
  state,
  onOpenAuth,
  lastDraftId,
  countInProgress = 0,
  draftProgress = 0,
  phaseData,
}: DynamicCTAProps) {
  if (state === 'loading') {
    return (
      <div className="flex justify-center items-center py-8 min-h-[96px] w-full">
        <Loader2 size={28} className="animate-spin text-[#3092bb]" />
      </div>
    );
  }

  // Common styles for premium card experience
  const cardBorderRadius = "rounded-2xl md:rounded-[20px]";

  if (state === 'phase-updated' && phaseData) {
    return (
      <div
        onClick={() => phaseData.onClick(phaseData.phaseId)}
        className={`w-full ${cardBorderRadius} p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all duration-300 hover:shadow-lg active:scale-[0.99] border border-transparent text-left cursor-pointer relative overflow-hidden`}
        style={{
          background: 'linear-gradient(135deg, #635bff 0%, #8075ff 100%)',
          color: 'white',
          boxShadow: '0 8px 32px rgba(99, 91, 255, 0.15)'
        }}
      >
        <div className="absolute right-[-20px] top-[-20px] w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
        
        <div className="flex items-center gap-4 flex-1">
          {/* Cloudinha Avatar (Hidden on Mobile top right, shown on desktop left) */}
          <div className="relative hidden md:flex flex-shrink-0 w-[72px] h-[72px] rounded-full bg-white/10 items-center justify-center overflow-hidden border border-white/10 shadow-inner">
            <img src="/assets/cloudinha-candidaturas.png" alt="Cloudinha" className="w-[60px] h-[60px] object-contain" />
            <span className="absolute top-1 right-2 w-3 h-3 rounded-full bg-[#25d366] border-2 border-[#635bff] animate-pulse" />
          </div>

          <div className="flex flex-col gap-0.5 flex-1 pr-12 md:pr-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] md:text-[11px] uppercase font-extrabold tracking-wider bg-white/20 px-2 py-0.5 rounded-full" style={{ fontFamily: 'Montserrat, sans-serif' }}>Atualização</span>
              <span className="md:hidden w-2 h-2 rounded-full bg-[#25d366] animate-pulse" />
            </div>
            
            {/* Title */}
            <h3 className="font-bold text-base md:text-xl leading-tight tracking-tight text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Processo Seletivo Ativo!
            </h3>

            {/* Description */}
            <p className="text-xs md:text-sm text-white/90 leading-normal mt-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Você avançou para a fase <strong className="underline">{phaseData.phaseName}</strong> em <strong className="font-semibold">{phaseData.opportunityName}</strong>.
            </p>
          </div>

          {/* Cloudinha Avatar (Shown on Mobile top right) */}
          <div className="relative flex md:hidden absolute top-4 right-4 flex-shrink-0 w-12 h-12 rounded-full bg-white/10 items-center justify-center overflow-hidden border border-white/10">
            <img src="/assets/cloudinha-candidaturas.png" alt="Cloudinha" className="w-10 h-10 object-contain" />
          </div>
        </div>

        {/* Right Side: CTA Button */}
        <div className="w-full md:w-auto mt-2 md:mt-0 relative z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              phaseData.onClick(phaseData.phaseId);
            }}
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-white text-[#635bff] text-sm font-bold shadow-sm transition-all hover:bg-slate-50 active:scale-95 flex items-center justify-center gap-2"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Acompanhar Candidatura →
          </button>
        </div>
      </div>
    );
  }

  if (state === 'visitor') {
    return (
      <div
        onClick={onOpenAuth}
        className={`w-full ${cardBorderRadius} p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all duration-300 hover:shadow-lg active:scale-[0.99] border border-transparent text-left cursor-pointer`}
        style={{
          background: 'linear-gradient(135deg, #024F86 0%, #01375E 100%)',
          color: 'white',
          boxShadow: '0 8px 32px rgba(2, 79, 134, 0.15)'
        }}
      >
        {/* Left Side: Avatar + Text */}
        <div className="flex items-center gap-4 flex-1">
          {/* Cloudinha Avatar (Hidden on Mobile top right, shown on desktop left) */}
          <div className="relative hidden md:flex flex-shrink-0 w-[72px] h-[72px] rounded-full bg-white/10 items-center justify-center overflow-hidden border border-white/10 shadow-inner">
            <img src="/assets/cloudinha-candidaturas.png" alt="Cloudinha" className="w-[60px] h-[60px] object-contain" />
          </div>

          <div className="flex flex-col gap-0.5 flex-1 pr-12 md:pr-0">
            <span className="text-[11px] md:text-xs font-semibold text-[#3092bb] tracking-wider uppercase" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Rápido e fácil!
            </span>
            {/* Desktop Title */}
            <h3 className="hidden md:block font-bold text-lg md:text-xl leading-tight tracking-tight text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Crie sua conta e descubra vagas para você
            </h3>
            {/* Mobile Title */}
            <h3 className="block md:hidden font-bold text-base leading-tight tracking-tight text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Descubra vagas para você
            </h3>

            {/* Desktop Description */}
            <p className="hidden md:block text-xs md:text-sm text-white/80 leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Mais de 12 mil oportunidades te esperando
            </p>
            {/* Mobile Description */}
            <p className="block md:hidden text-xs text-white/80 leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              +12 mil oportunidades disponíveis
            </p>
          </div>

          {/* Cloudinha Avatar (Shown on Mobile top right) */}
          <div className="relative flex md:hidden absolute top-4 right-4 flex-shrink-0 w-12 h-12 rounded-full bg-white/10 items-center justify-center overflow-hidden border border-white/10">
            <img src="/assets/cloudinha-candidaturas.png" alt="Cloudinha" className="w-10 h-10 object-contain" />
          </div>
        </div>

        {/* Right Side: CTA Button */}
        <div className="w-full md:w-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenAuth?.();
            }}
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-white text-[#024F86] text-sm font-bold shadow-sm transition-all hover:bg-slate-50 active:scale-95"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Criar conta →
          </button>
        </div>
      </div>
    );
  }

  if (state === 'no-profile') {
    return (
      <Link
        href="/oportunidades?tab=para-voce"
        className={`w-full ${cardBorderRadius} p-5 md:p-6 flex items-center justify-between gap-4 transition-all duration-300 hover:shadow-lg active:scale-[0.99] border border-[#FFE4A3] text-left cursor-pointer`}
        style={{
          background: '#FFFDF6',
          boxShadow: '0 8px 24px rgba(217, 119, 6, 0.04)'
        }}
      >
        <div className="flex items-center gap-4 flex-1">
          {/* Cloudinha Avatar */}
          <div className="relative flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center overflow-hidden">
            <img src="/assets/cloudinha-candidaturas.png" alt="Cloudinha" className="w-12 h-12 md:w-14 md:h-14 object-contain" />
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            {/* Badge */}
            <span className="px-2 py-0.5 rounded-md bg-[#F59E0B] text-white text-[9px] font-bold tracking-wider w-fit uppercase" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Ação necessária
            </span>

            <h3 className="font-bold text-base md:text-lg leading-tight tracking-tight text-[#92400E]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Complete seu perfil
            </h3>

            {/* Description (Web only) */}
            <p className="hidden md:block text-xs md:text-sm text-[#B45309] opacity-90" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Falta pouco! Complete seu perfil para não perder oportunidades disponíveis
            </p>

            {/* Dash Indicators (Progress) */}
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className={`h-1.5 w-8 rounded-full ${idx <= 3 ? 'bg-[#F59E0B]' : 'bg-[#E2E8F0]'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Chevron right */}
        <div className="flex-shrink-0 text-[#F59E0B]">
          <ChevronRight size={24} />
        </div>
      </Link>
    );
  }

  if (state === 'no-applications') {
    return (
      <Link
        href="/oportunidades"
        className={`w-full ${cardBorderRadius} p-5 md:p-6 flex items-center justify-between gap-4 transition-all duration-300 hover:shadow-lg active:scale-[0.99] border-2 border-dashed border-[#3092bb]/50 bg-white text-left cursor-pointer`}
        style={{
          boxShadow: '0 8px 24px rgba(56, 177, 228, 0.05)'
        }}
      >
        <div className="flex items-center gap-4 flex-1">
          {/* Cloudinha Avatar with custom heart eye overlays for premium visual fidelity */}
          <div className="relative flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center overflow-hidden">
            <img src="/assets/cloudinha-candidaturas.png" alt="Cloudinha" className="w-12 h-12 md:w-14 md:h-14 object-contain filter saturate-[0.85]" />
            <span className="absolute top-[18px] left-[15px] text-[8px] md:text-[10px] animate-pulse">❤️</span>
            <span className="absolute top-[18px] right-[15px] text-[8px] md:text-[10px] animate-pulse">❤️</span>
          </div>

          <div className="flex flex-col gap-1 md:gap-1.5 flex-1">
            {/* Responsive text matching Figma */}
            <h3 className="font-bold text-base md:text-lg leading-tight tracking-tight text-[#024F86]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              <span className="block md:hidden">Sua primeira vaga te espera</span>
              <span className="hidden md:block">Sua primeira candidatura te espera</span>
            </h3>

            <p className="text-xs md:text-sm text-[#64748B]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              <span className="block md:hidden">Encontre oportunidades para você</span>
              <span className="hidden md:block">Encontre vagas que combinam com o seu perfil</span>
            </p>

            <button
              className="mt-1 flex items-center gap-1 px-3 py-1 rounded-full bg-[#F0F9FF] border border-[#BAE6FD] text-[#0369A1] text-xs font-bold w-fit transition-colors hover:bg-[#E0F2FE]"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              <Sparkles size={11} className="fill-current" />
              Começar agora
            </button>
          </div>
        </div>

        {/* Chevron right */}
        <div className="flex-shrink-0 text-[#3092bb]">
          <ChevronRight size={24} />
        </div>
      </Link>
    );
  }

  if (state === 'application-in-progress') {
    const href = lastDraftId ? `/partner-forms/${lastDraftId}` : '/candidaturas';
    return (
      <Link
        href={href}
        className={`w-full ${cardBorderRadius} p-5 md:p-6 flex items-center justify-between gap-4 transition-all duration-300 hover:shadow-lg active:scale-[0.99] border border-[#BAE6FD] text-left cursor-pointer`}
        style={{
          background: '#F4F9FF',
          boxShadow: '0 8px 24px rgba(3, 105, 161, 0.04)'
        }}
      >
        <div className="flex items-center gap-4 flex-1">
          {/* Cloudinha Avatar */}
          <div className="relative flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center overflow-hidden">
            <img src="/assets/cloudinha-candidaturas.png" alt="Cloudinha" className="w-12 h-12 md:w-14 md:h-14 object-contain" />
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            <h3 className="font-bold text-base md:text-lg leading-tight tracking-tight text-[#024F86]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Candidatura em andamento
            </h3>

            <p className="text-xs md:text-sm text-[#0369A1]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              <span className="block md:hidden">Continue de onde parou</span>
              <span className="hidden md:block">Continue de onde você parou</span>
            </p>

            {/* Continuous Progress Bar */}
            <div className="w-full max-w-xs flex flex-col gap-1 mt-1">
              <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                <div className="h-full bg-[#0284C7] rounded-full" style={{ width: `${draftProgress}%` }} />
              </div>
              <span className="text-[10px] md:text-xs text-[#0369A1] font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                <span className="block md:hidden">{draftProgress}% concluído</span>
                <span className="hidden md:block">{draftProgress}% concluído · Falta pouco!</span>
              </span>
            </div>
          </div>
        </div>

        {/* Chevron right */}
        <div className="flex-shrink-0 text-[#0369A1]">
          <ChevronRight size={24} />
        </div>
      </Link>
    );
  }

  if (state === 'application-ready-to-submit') {
    const href = lastDraftId ? `/partner-forms/${lastDraftId}` : '/candidaturas';
    return (
      <Link
        href={href}
        className={`w-full ${cardBorderRadius} p-5 md:p-6 flex items-center justify-between gap-4 transition-all duration-300 hover:shadow-lg active:scale-[0.99] border border-[#BBF7D0] text-left cursor-pointer`}
        style={{
          background: '#F0FDF4',
          boxShadow: '0 8px 24px rgba(34, 197, 94, 0.06)'
        }}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center overflow-hidden">
            <img src="/assets/cloudinha-candidaturas.png" alt="Cloudinha" className="w-12 h-12 md:w-14 md:h-14 object-contain" />
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#22C55E] border-2 border-white flex items-center justify-center text-white text-[8px] font-bold">✓</span>
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            <span className="px-2 py-0.5 rounded-md bg-[#22C55E] text-white text-[9px] font-bold tracking-wider w-fit uppercase" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Pronto para enviar!
            </span>

            <h3 className="font-bold text-base md:text-lg leading-tight tracking-tight text-[#15803D]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Candidatura completa
            </h3>

            <p className="text-xs md:text-sm text-[#16A34A]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              <span className="block md:hidden">Envie sua candidatura agora</span>
              <span className="hidden md:block">Tudo preenchido — envie sua candidatura agora</span>
            </p>
          </div>
        </div>

        <div className="flex-shrink-0">
          <button
            className="px-4 py-2 rounded-xl bg-[#22C55E] text-white text-sm font-bold shadow-sm transition-all hover:bg-[#16A34A] active:scale-95 whitespace-nowrap"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Finalizar candidatura →
          </button>
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
          background: 'linear-gradient(135deg, #3092bb 0%, #024F86 100%)',
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
