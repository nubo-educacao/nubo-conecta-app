'use client';

import { useEffect, useRef } from 'react';
import { openViewContent, trackViewContent, type ViewContentOpening } from '@/lib/analytics';

// ViewContent — TP-7 7A task 5; NUB-RD-85 (decisão humana de 15/10/2026).
//
// A página de detalhe é Server Component; o dataLayer só existe no navegador.
// Este componente é a menor ponte possível entre os dois: não renderiza nada,
// só dispara.
//
// Diferente de `card_view`, que é volume e vai em lote para o nosso banco, o
// ViewContent vai para a Meta e representa intenção — a pessoa abriu a
// oportunidade inteira, não passou por ela numa lista.
//
// Uma montagem deste componente para uma oportunidade = UMA abertura, com seu
// event_id. A abertura vive num ref: o efeito duplicado do StrictMode e os
// rerenders reencontram a mesma abertura e não emitem de novo. Revisita,
// recarga ou navegação para outra oportunidade é outra abertura.

interface Props {
    unifiedOpportunityId: string;
}

export default function ViewContentTracker({ unifiedOpportunityId }: Props) {
    const opening = useRef<ViewContentOpening | null>(null);

    useEffect(() => {
        if (opening.current?.unifiedOpportunityId !== unifiedOpportunityId) {
            opening.current = openViewContent(unifiedOpportunityId);
        }
        trackViewContent(opening.current);
    }, [unifiedOpportunityId]);

    return null;
}
