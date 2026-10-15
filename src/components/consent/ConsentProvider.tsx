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
    allowsAdvertising,
    allowsTagManager,
    readStoredConsent,
    serializeConsent,
    toGoogleConsent,
    type ConsentRecord,
    type ConsentState,
} from '@/lib/consent';
import { clearAdvertisingStorage, loadTagManager } from '@/lib/analytics';

interface ConsentContextValue {
    state: ConsentState;
    /** null = ainda não decidiu. É o que faz o banner aparecer. */
    record: ConsentRecord | null;
    decided: boolean;
    save: (state: ConsentState) => void;
    reopen: () => void;
    close: () => void;
    isOpen: boolean;
}

const ConsentContext = createContext<ConsentContextValue | undefined>(undefined);

function publish(state: ConsentState) {
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    w.gtag?.('consent', 'update', toGoogleConsent(state));

    // Só DEPOIS do update: o container sobe já sabendo a escolha. Sem opt-in
    // de categoria que ele serve, não sobe (NUB-RD-85 R5; f74d1cd9 §3.4).
    if (allowsTagManager(state)) loadTagManager();
}

function writeCookie(name: string, value: string) {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${value}; path=/; max-age=${CONSENT_MAX_AGE}; SameSite=Lax${secure}`;
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
    const [record, setRecord] = useState<ConsentRecord | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const stored = readStoredConsent();
        setRecord(stored);
        // Sem decisão registrada, o banner abre. Devolve null também quando a
        // versão do texto mudou — nesse caso repergunta, porque a pessoa
        // concordou com outra redação — e quando o cookie expirou.
        setIsOpen(stored === null);

        // Republicar a escolha no carregamento: o bloco `default` do <head>
        // roda antes deste componente existir, então sem isto uma pessoa que
        // já aceitou ficaria negada até interagir de novo — e o container,
        // que agora só sobe depois desta escolha, nunca subiria.
        if (stored) publish(stored.state);
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

        // Revogação de publicidade: apaga o que o PRÓPRIO app guardou para
        // esse fim. Cookies que terceiros já gravaram (_fbp etc.) e o container
        // já executado ficam como estão — tratar isso é decisão do encarregado.
        if (!allowsAdvertising(state)) clearAdvertisingStorage();
        publish(state);
    }, []);

    // Revogar precisa ser tão fácil quanto aceitar (LGPD, Art. 8º §5º:
    // procedimento gratuito e facilitado). Daí o link permanente no rodapé.
    const reopen = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);

    const value = useMemo<ConsentContextValue>(
        () => ({
            state: record?.state ?? DENIED,
            record,
            decided: record !== null,
            save,
            reopen,
            close,
            isOpen,
        }),
        [record, save, reopen, close, isOpen],
    );

    return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
    const ctx = useContext(ConsentContext);
    if (!ctx) throw new Error('useConsent precisa estar dentro de ConsentProvider');
    return ctx;
}
