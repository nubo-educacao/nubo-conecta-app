'use client';

// RedirectButton — Sprint 02 Wave 4
// Client component extracted from opportunity detail page.
// Calls trackAndRedirect Server Action and opens the URL in a new tab.
// Auth gate: shows AuthModal if user is not authenticated.

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { trackAndRedirect } from '@/services/redirectService';

interface RedirectButtonProps {
  opportunityId:   string;
  redirectUrl:     string;
  institutionName: string;
}

export default function RedirectButton({
  opportunityId,
  redirectUrl,
  institutionName,
}: RedirectButtonProps) {
  const { user, setShowAuthModal } = useAuth();
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleClick = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { url } = await trackAndRedirect(
        user.id,
        null,
        redirectUrl,
        'opportunity_detail',
      );
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Não foi possível abrir o link. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full flex items-center justify-center rounded-[62px] text-[14px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{
          height:     48,
          background: 'rgba(151,71,255,0.15)',
          color:      '#9747FF',
          fontFamily: 'Montserrat, sans-serif',
          border:     '1px solid rgba(151,71,255,0.3)',
        }}
      >
        {loading ? 'Abrindo...' : `Candidatar em ${institutionName}`}
      </button>
      {error && (
        <p className="text-red-500 text-[12px] text-center">{error}</p>
      )}
    </div>
  );
}
