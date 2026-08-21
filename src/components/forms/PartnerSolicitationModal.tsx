'use client';
// Modal "Seja um parceiro Nubo" — TP-5 5b, card 7410a5bc
// Portado de nubo-hub-app/components/PartnerModal.tsx. Mudanças em relação ao
// original: submissão via Server Action (não insert direto do browser), campo
// honeypot, e estado de sucesso/erro inline — o app não tem sonner.

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Loader2 } from 'lucide-react';
import { submitPartnerSolicitation } from '@/services/partnerSolicitations';

interface PartnerSolicitationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY = {
  institutionName: '',
  contactName: '',
  whatsapp: '',
  email: '',
  howDidYouKnow: '',
  goals: '',
  website: '',
};

export default function PartnerSolicitationModal({
  isOpen,
  onClose,
}: PartnerSolicitationModalProps) {
  const [form, setForm] = useState(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY);
      setIsLoading(false);
      setSubmitted(false);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const set = useCallback(
    (field: keyof typeof EMPTY) => (value: string) =>
      setForm((prev) => ({ ...prev, [field]: value })),
    [],
  );

  const formatPhone = (value: string) => {
    const limited = value.replace(/\D/g, '').slice(0, 11);
    if (limited.length <= 2) return limited;
    if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  };

  const canSubmit =
    form.institutionName.trim().length > 0 &&
    form.contactName.trim().length > 0 &&
    form.howDidYouKnow.trim().length > 0 &&
    (form.whatsapp.replace(/\D/g, '').length >= 10 || EMAIL_RE.test(form.email.trim()));

  const handleSubmit = async () => {
    if (!canSubmit || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await submitPartnerSolicitation({
        institution_name: form.institutionName,
        contact_name: form.contactName,
        whatsapp: form.whatsapp,
        email: form.email,
        how_did_you_know: form.howDidYouKnow,
        goals: form.goals,
        website: form.website,
      });

      if (result.ok) {
        setSubmitted(true);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Não foi possível enviar agora. Tente novamente em instantes.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const inputClass =
    'w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm text-[#3A424E] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#024F86]/20 focus:border-[#024F86] transition-all';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 z-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        data-testid="partner-modal-backdrop"
      />

      <div className="relative z-10 w-full max-w-[500px] max-h-[90vh] overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl md:p-8">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-neutral-400 transition-colors hover:text-neutral-600"
          aria-label="Fechar"
        >
          <X size={24} />
        </button>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="rounded-full bg-[#024F86]/10 p-4">
              <Check className="text-[#024F86]" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-[#024F86]">Solicitação enviada</h2>
            <p className="max-w-[80%] text-sm font-medium text-[#636E7C]">
              Recebemos seus dados e entraremos em contato para formalizar a parceria.
            </p>
            <button
              onClick={onClose}
              className="mt-4 rounded-full bg-[#024F86] px-8 py-3 text-base font-bold text-white transition-all hover:bg-[#023F6B]"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-col items-center gap-2">
              <h2 className="text-center text-2xl font-bold text-[#024F86]">
                Seja um parceiro Nubo
              </h2>
              <p className="max-w-[80%] text-center text-sm font-medium text-[#636E7C]">
                Preencha os dados abaixo e entraremos em contato para formalizar nossa parceria.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              {/* Honeypot: invisível para humanos, preenchido por bots. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={form.website}
                onChange={(e) => set('website')(e.target.value)}
                className="absolute left-[-9999px] h-0 w-0 opacity-0"
                data-testid="partner-honeypot"
              />

              <Field label="Nome da instituição *">
                <input
                  type="text"
                  value={form.institutionName}
                  onChange={(e) => set('institutionName')(e.target.value)}
                  placeholder="Digite o nome da sua instituição"
                  className={inputClass}
                />
              </Field>

              <Field label="Nome do responsável *">
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => set('contactName')(e.target.value)}
                  placeholder="Com quem falaremos?"
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Whatsapp *">
                  <input
                    type="tel"
                    value={form.whatsapp}
                    onChange={(e) => set('whatsapp')(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className={inputClass}
                  />
                </Field>

                <Field label="E-mail *">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email')(e.target.value)}
                    placeholder="seu@email.com"
                    className={inputClass}
                  />
                </Field>
              </div>
              <p className="-mt-3 px-1 text-[10px] text-[#94A3B8]">
                * Pelo menos um contato é obrigatório
              </p>

              <Field label="Como conheceu a Nubo? *">
                <textarea
                  value={form.howDidYouKnow}
                  onChange={(e) => set('howDidYouKnow')(e.target.value)}
                  placeholder="Indicação, redes sociais, pesquisa..."
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </Field>

              <Field label="O que busca na parceria?">
                <textarea
                  value={form.goals}
                  onChange={(e) => set('goals')(e.target.value)}
                  placeholder="Conte um pouco sobre seus objetivos..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </Field>

              {error && (
                <p role="alert" className="px-1 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={isLoading || !canSubmit}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#024F86] px-6 py-4 shadow-lg shadow-[#024F86]/20 transition-all duration-200 hover:bg-[#023F6B] active:bg-[#012F50] disabled:cursor-not-allowed disabled:bg-[#94A3B8] disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin text-white" size={20} />
                ) : (
                  <span className="text-base font-bold text-white">Enviar solicitação</span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 block">
      <span className="ml-1 block text-xs font-medium text-[#636E7C]">{label}</span>
      {children}
    </label>
  );
}
