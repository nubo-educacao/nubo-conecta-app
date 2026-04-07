'use client';

// MatchOnboarding — Sprint 03 Épico 1B — Estado 1
// Inline checklist showing what data is needed to generate a match.
// Calls onGenerate() when the user clicks "Gerar Match".

import { BookOpen, DollarSign, MapPin, Award, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface MatchOnboardingProps {
  onGenerate: () => void;
  isLoading: boolean;
}

const CHECKLIST = [
  { icon: BookOpen, label: 'Nota do ENEM', hint: 'Usamos para calcular compatibilidade com a nota de corte.' },
  { icon: DollarSign, label: 'Renda familiar', hint: 'Determina elegibilidade para bolsas e programas sociais.' },
  { icon: MapPin, label: 'Localização', hint: 'Priorizamos oportunidades próximas a você.' },
  { icon: Award, label: 'Áreas de interesse', hint: 'Encontramos cursos alinhados às suas aspirações.' },
];

export default function MatchOnboarding({ onGenerate, isLoading }: MatchOnboardingProps) {
  const { user, setShowAuthModal } = useAuth();

  function handleGenerate() {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    onGenerate();
  }

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8">
      {/* Header */}
      <div className="text-center">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
          style={{ background: 'linear-gradient(135deg, #38B1E4 0%, #024F86 100%)' }}
        >
          <Sparkles size={26} color="white" />
        </div>
        <h2
          className="text-xl font-bold mb-1"
          style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
        >
          Encontre seu match perfeito
        </h2>
        <p className="text-sm" style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}>
          Calculamos compatibilidade usando os seguintes fatores do seu perfil:
        </p>
      </div>

      {/* Checklist */}
      <ul className="w-full max-w-sm flex flex-col gap-3">
        {CHECKLIST.map(({ icon: Icon, label, hint }) => (
          <li
            key={label}
            className="flex items-start gap-3 rounded-xl p-3"
            style={{ background: 'rgba(56, 177, 228, 0.06)', border: '1px solid rgba(56,177,228,0.15)' }}
          >
            <span
              className="mt-0.5 flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: 'rgba(56, 177, 228, 0.15)' }}
            >
              <Icon size={16} style={{ color: '#38B1E4' }} />
            </span>
            <div>
              <p
                className="text-sm font-semibold leading-tight"
                style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
              >
                {label}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: '#707A7E', fontFamily: 'Montserrat, sans-serif' }}
              >
                {hint}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        onClick={handleGenerate}
        disabled={isLoading}
        className="w-full max-w-sm flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
        style={{
          background: isLoading
            ? '#94a3b8'
            : 'linear-gradient(135deg, #38B1E4 0%, #024F86 100%)',
          fontFamily: 'Montserrat, sans-serif',
        }}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
            </svg>
            Calculando match...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Gerar meu Match
          </>
        )}
      </button>

      {!user && (
        <p className="text-xs text-center" style={{ color: '#707A7E', fontFamily: 'Montserrat, sans-serif' }}>
          Você precisará entrar na sua conta para gerar o match.
        </p>
      )}
    </div>
  );
}
