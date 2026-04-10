'use client';

// RedirectButton — Sprint 04.5 Plan C (BUG-010)
// Shows a confirmation modal before tracking + redirecting.
// Auth gate: opens AuthModal if user is not authenticated.

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { trackAndRedirect } from '@/services/redirectService';
import { ExternalLink, X } from 'lucide-react';

interface RedirectButtonProps {
  opportunityId:   string;
  partnerId:       string;
  redirectUrl:     string;
  institutionName: string;
  modalTitle:      string;
  modalMessage:    string;
  modalButtonText: string;
  redirectType:    'external' | 'whatsapp';
}

export default function RedirectButton({
  opportunityId,
  partnerId,
  redirectUrl,
  institutionName,
  modalTitle,
  modalMessage,
  modalButtonText,
  redirectType,
}: RedirectButtonProps) {
  const { user, setShowAuthModal } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleButtonClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setError(null);
    setShowModal(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const { url } = await trackAndRedirect(
        user!.id,
        partnerId,
        redirectUrl,
        'opportunity_detail',
      );
      setShowModal(false);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Não foi possível abrir o link. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const isWhatsapp = redirectType === 'whatsapp';
  const accentColor = isWhatsapp ? '#25D366' : '#9747FF';
  const accentBg    = isWhatsapp ? 'rgba(37,211,102,0.15)' : 'rgba(151,71,255,0.15)';
  const accentBorder = isWhatsapp ? 'rgba(37,211,102,0.3)' : 'rgba(151,71,255,0.3)';

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={handleButtonClick}
        className="w-full flex items-center justify-center gap-2 rounded-[62px] text-[14px] font-semibold transition-opacity hover:opacity-90"
        style={{
          height:     48,
          background: accentBg,
          color:      accentColor,
          fontFamily: 'Montserrat, sans-serif',
          border:     `1px solid ${accentBorder}`,
        }}
      >
        <ExternalLink size={16} />
        Candidatar em {institutionName}
      </button>

      {/* Confirmation modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="w-full sm:max-w-[400px] sm:mx-4 rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-4"
            style={{
              background:   'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(20px)',
              boxShadow:    '0 8px 40px rgba(0,0,0,0.18)',
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <h2
                className="font-bold text-[17px] leading-snug"
                style={{ color: '#3a424e', fontFamily: 'Montserrat, sans-serif' }}
              >
                {modalTitle}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="shrink-0 mt-0.5 opacity-40 hover:opacity-70 transition-opacity"
              >
                <X size={20} style={{ color: '#3a424e' }} />
              </button>
            </div>

            {/* Message */}
            <p
              className="text-[14px] leading-relaxed"
              style={{ color: 'rgba(58,66,78,0.8)', fontFamily: 'Montserrat, sans-serif' }}
            >
              {modalMessage}
            </p>

            {/* Error */}
            {error && (
              <p className="text-red-500 text-[12px]">{error}</p>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-[62px] text-[14px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{
                  height:     48,
                  background: accentBg,
                  color:      accentColor,
                  fontFamily: 'Montserrat, sans-serif',
                  border:     `1px solid ${accentBorder}`,
                }}
              >
                <ExternalLink size={16} />
                {loading ? 'Abrindo...' : modalButtonText}
              </button>

              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="w-full flex items-center justify-center rounded-[62px] text-[14px] font-medium transition-opacity hover:opacity-70 disabled:opacity-50"
                style={{
                  height:     44,
                  color:      'rgba(58,66,78,0.5)',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
