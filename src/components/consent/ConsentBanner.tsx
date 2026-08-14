'use client';

// Banner de consentimento — TP-7 7A task 2.
//
// ⚠️ A REDAÇÃO É RASCUNHO, pendente de revisão do encarregado. O texto vive em
//    `src/lib/consent.ts` justamente para que a revisão seja um diff legível
//    por quem não lê React.
//
// Decisão de desenho que NÃO é estética: "Aceitar todos" e "Recusar" têm o
// mesmo peso visual. Botão de recusa escondido, apagado ou em fonte menor é
// padrão escuro e enfraquece a validade do consentimento — o que anula o
// propósito de ter o banner.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import {
    CONSENT_CATEGORIES,
    CONSENT_COPY,
    DENIED,
    GRANTED,
    type ConsentState,
} from '@/lib/consent';
import { useConsent } from './ConsentProvider';

export default function ConsentBanner() {
    const { isOpen, decided, state, save, close } = useConsent();
    const [customizing, setCustomizing] = useState(false);
    const [draft, setDraft] = useState<ConsentState>(DENIED);

    useEffect(() => {
        if (!isOpen) return;
        setDraft(state);
        setCustomizing(false);
    }, [isOpen, state]);

    if (!isOpen) return null;

    const toggle = (id: 'analytics' | 'advertising') =>
        setDraft((prev) => ({ ...prev, [id]: !prev[id] }));

    return (
        <div
            className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4"
            role="dialog"
            aria-modal="false"
            aria-label={CONSENT_COPY.title}
        >
            <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/5 sm:p-6">
                <div className="mb-3 flex items-start justify-between gap-4">
                    <h2 className="text-base font-bold text-[#024F86]">{CONSENT_COPY.title}</h2>
                    {decided && (
                        <button
                            onClick={close}
                            aria-label="Fechar"
                            className="text-neutral-400 transition-colors hover:text-neutral-600"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                <p className="text-sm leading-relaxed text-[#636E7C]">
                    {CONSENT_COPY.body}{' '}
                    <Link
                        href={CONSENT_COPY.policyLink}
                        className="underline underline-offset-2 hover:text-[#024F86]"
                    >
                        {CONSENT_COPY.policyLabel}
                    </Link>
                    .
                </p>

                {customizing && (
                    <ul className="mt-4 flex flex-col gap-3 border-t border-[#E2E8F0] pt-4">
                        {CONSENT_CATEGORIES.map((cat) => {
                            const checked =
                                cat.locked || draft[cat.id as 'analytics' | 'advertising'];
                            return (
                                <li key={cat.id} className="flex items-start gap-3">
                                    <input
                                        id={`consent-${cat.id}`}
                                        type="checkbox"
                                        checked={checked}
                                        disabled={cat.locked}
                                        onChange={() => toggle(cat.id as 'analytics' | 'advertising')}
                                        className="mt-1 h-4 w-4 shrink-0 accent-[#024F86] disabled:opacity-60"
                                    />
                                    <label htmlFor={`consent-${cat.id}`} className="flex flex-col">
                                        <span className="text-sm font-semibold text-[#3A424E]">
                                            {cat.label}
                                            {cat.locked && (
                                                <span className="ml-2 text-xs font-normal text-[#94A3B8]">
                                                    sempre ativos
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-xs text-[#636E7C]">
                                            {cat.description}
                                        </span>
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
                    {customizing ? (
                        <button
                            onClick={() => save(draft)}
                            className="rounded-full bg-[#024F86] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#023F6B]"
                        >
                            {CONSENT_COPY.save}
                        </button>
                    ) : (
                        <button
                            onClick={() => save(GRANTED)}
                            className="rounded-full bg-[#024F86] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#023F6B]"
                        >
                            {CONSENT_COPY.acceptAll}
                        </button>
                    )}

                    {/* Mesmo tamanho, mesma área de clique, mesma legibilidade
                        que o de aceitar. Só a cor difere. */}
                    <button
                        onClick={() => save(DENIED)}
                        className="rounded-full border border-[#024F86] px-6 py-3 text-sm font-bold text-[#024F86] transition-all hover:bg-[#024F86]/5"
                    >
                        {CONSENT_COPY.rejectAll}
                    </button>

                    {!customizing && (
                        <button
                            onClick={() => setCustomizing(true)}
                            className="px-2 py-3 text-sm font-medium text-[#636E7C] underline underline-offset-2 sm:mr-auto"
                        >
                            {CONSENT_COPY.customize}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
