'use client';

import { useEffect, useRef } from 'react';
import { trackViewContent } from '@/lib/analytics';
import { useViewSubject } from '@/hooks/useCardView';

// ViewContent — TP-7 7A task 5.
//
// A página de detalhe é Server Component; o dataLayer só existe no navegador.
// Este componente é a menor ponte possível entre os dois: não renderiza nada,
// só dispara.
//
// Diferente de `card_view`, que é volume e vai em lote para o nosso banco, o
// ViewContent vai para a Meta e representa intenção — a pessoa abriu a
// oportunidade inteira, não passou por ela numa lista.

interface Props {
    unifiedOpportunityId: string;
}

export default function ViewContentTracker({ unifiedOpportunityId }: Props) {
    const subjectId = useViewSubject();

    // StrictMode monta duas vezes em dev. Sem esta trava o evento sai
    // duplicado, e como o event_id é determinístico a Meta deduplicaria — mas
    // o Preview do GTM mostraria dois disparos e faria qualquer um duvidar da
    // instrumentação na hora de validar.
    const sent = useRef<string | null>(null);

    useEffect(() => {
        if (!subjectId) return;

        const key = `${unifiedOpportunityId}:${subjectId}`;
        if (sent.current === key) return;
        sent.current = key;

        trackViewContent({ unifiedOpportunityId, subjectId });
    }, [unifiedOpportunityId, subjectId]);

    return null;
}
