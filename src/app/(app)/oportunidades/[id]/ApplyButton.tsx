'use client';

// ApplyButton — Sprint 04.5 Plan C (BUG-010)
// Redirects to the Nubo Form Engine (/new-application/[id]) for partner opportunities
// that use internal forms instead of external redirect.
// Auth gate: opens AuthModal if user is not authenticated.

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface ApplyButtonProps {
  opportunityId:   string;
  institutionName: string;
}

export default function ApplyButton({ opportunityId, institutionName }: ApplyButtonProps) {
  const { user, setShowAuthModal } = useAuth();
  const router = useRouter();

  const handleClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    // opportunityId is the unified_id (partner_<uuid>); strip prefix to get partner_opportunities.id
    const partnerOppId = opportunityId.replace(/^partner_/, '');
    router.push(`/new-application/${partnerOppId}`);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center justify-center rounded-[62px] text-[14px] font-semibold transition-opacity hover:opacity-90"
      style={{
        height:     48,
        background: 'rgba(151,71,255,0.15)',
        color:      '#9747FF',
        fontFamily: 'Montserrat, sans-serif',
        border:     '1px solid rgba(151,71,255,0.3)',
      }}
    >
      Candidatar-se em {institutionName}
    </button>
  );
}
