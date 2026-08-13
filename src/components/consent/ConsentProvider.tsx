'use client';

// Estado de consentimento — TP-7 7A task 2.
//
// Guarda a escolha, publica no Consent Mode v2 e expõe para quem precisar
// condicionar comportamento. NÃO decide categorias nem redação: isso está em
// consulta com o encarregado (ver src/lib/consent.ts).

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
    CONSENT_COOKIE,
    CONSENT_MAX_AGE,
    CONSENT_POLICY_VERSION,
    DENIED,
    parseConsent,
    serializeConsent,
    toGoogleConsent,
    type ConsentRecord,
    type ConsentState,
} from '@/lib/consent';

interface ConsentContextValue {
    state: ConsentState;
    /** null = ainda não decidiu. É o que faz o banner aparecer. */
    record: ConsentRecord | null;
    decided: boolean;
    save: (state: ConsentState) => void;
    reopen: () => void;
    isOpen: boolean;
}

const ConsentContext = createContext<ConsentContextValue | undefined>(undefined);

function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(
        new RegExp('(?:^|; )' + name.replace(/[:.]/g, '\\$&') + '=([^;]*)'),
    );
    return match ? match[1] : null;
}

function writeCookie(name: string, value: string) {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${value}; path=/; max-age=${CONSENT_MAX_AGE}; SameSite=Lax${secure}`;
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
    const [record, setRecord] = useState<ConsentRecord | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const stored = parseConsent(readCookie(CONSENT_COOKIE));
        setRecord(stored);
        // Sem decisão registrada, o banner abre. `parseConsent` devolve null
        // também quando a versão do texto mudou — nesse caso repergunta, porque
        // a pessoa concordou com outra redação.
        setIsOpen(stored === null);

        // Republicar a escolha no carregamento: o bloco `default` do <head>
        // roda antes deste componente existir, então sem isto uma pessoa que
        // já aceitou ficaria negada até interagir de novo.
        if (stored && typeof window !== 'undefined') {
            const w = window as unknown as { gtag?: (...args: unknown[]) => void };
            w.gtag?.('consent', 'update', toGoogleConsent(stored.state));
        }
    }, []);

    const save = useCallback((state: ConsentState) => {
        const next: ConsentRecord = {
            state,
            policyVersion: CONSENT_POLICY_VERSION,
            // Registro auditável: sem data, hora e versão do texto não há como
            // provar o consentimento depois.
            decidedAt: new Date().toISOString(),
        };

        writeCookie(CONSENT_COOKIE, serializeConsent(next));
        setRecord(next);
        setIsOpen(false);

        const w = window as unknown as { gtag?: (...args: unknown[]) => void };
        w.gtag?.('consent', 'update', toGoogleConsent(state));
    }, []);

    // Revogar precisa ser tão fácil quanto aceitar (LGPD, Art. 8º §5º:
    // procedimento gratuito e facilitado). Daí o link permanente no rodapé.
    const reopen = useCallback(() => setIsOpen(true), []);

    const value = useMemo<ConsentContextValue>(
        () => ({
            state: record?.state ?? DENIED,
            record,
            decided: record !== null,
            save,
            reopen,
            isOpen,
        }),
        [record, save, reopen, isOpen],
    );

    return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
    const ctx = useContext(ConsentContext);
    if (!ctx) throw new Error('useConsent precisa estar dentro de ConsentProvider');
    return ctx;
}
