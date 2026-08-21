// TP-7 7A task 2 — núcleo de consentimento.
//
// Estes testes não são sobre UI. São sobre as invariantes que sustentam a
// validade jurídica do consentimento: começar negado, não herdar consentimento
// entre versões de texto, e registrar o suficiente para provar depois.

import { describe, it, expect } from 'vitest';
import {
    CONSENT_POLICY_VERSION,
    DENIED,
    GRANTED,
    parseConsent,
    serializeConsent,
    toGoogleConsent,
    type ConsentRecord,
} from '@/lib/consent';
import { eventId } from '@/lib/analytics';

const record = (over: Partial<ConsentRecord> = {}): ConsentRecord => ({
    state: GRANTED,
    policyVersion: CONSENT_POLICY_VERSION,
    decidedAt: '2026-08-13T10:00:00.000Z',
    ...over,
});

describe('estado padrão', () => {
    it('nega analytics e publicidade por padrão', () => {
        // A invariante mais importante do arquivo. Se isto inverter, o produto
        // volta a tratar dado antes de qualquer manifestação do titular.
        expect(DENIED.analytics).toBe(false);
        expect(DENIED.advertising).toBe(false);
    });

    it('mantém os essenciais sempre ativos', () => {
        expect(DENIED.essential).toBe(true);
        expect(GRANTED.essential).toBe(true);
    });

    it('traduz recusa para denied em todos os sinais de publicidade', () => {
        const g = toGoogleConsent(DENIED);
        expect(g.ad_storage).toBe('denied');
        expect(g.ad_user_data).toBe('denied');
        expect(g.ad_personalization).toBe('denied');
        expect(g.analytics_storage).toBe('denied');
    });

    it('nunca nega funcionalidade e segurança', () => {
        // Sessão e antifraude não são opcionais: sem eles não há serviço.
        for (const state of [DENIED, GRANTED]) {
            const g = toGoogleConsent(state);
            expect(g.functionality_storage).toBe('granted');
            expect(g.security_storage).toBe('granted');
        }
    });

    it('permite aceitar só analytics, sem publicidade', () => {
        const g = toGoogleConsent({ essential: true, analytics: true, advertising: false });
        expect(g.analytics_storage).toBe('granted');
        expect(g.ad_storage).toBe('denied');
    });
});

describe('persistência da escolha', () => {
    it('sobrevive à serialização', () => {
        const r = record();
        expect(parseConsent(serializeConsent(r))).toEqual(r);
    });

    it('trata cookie ausente como "ainda não decidiu"', () => {
        expect(parseConsent(null)).toBeNull();
        expect(parseConsent('')).toBeNull();
    });

    it('trata cookie corrompido como "ainda não decidiu", sem lançar', () => {
        expect(parseConsent('nao-e-json')).toBeNull();
        expect(parseConsent(encodeURIComponent('{"state":null}'))).toBeNull();
    });

    it('INVALIDA consentimento dado sobre outra versão do texto', () => {
        // A pessoa concordou com outra redação. Herdar esse "sim" é atribuir a
        // ela uma manifestação que nunca houve.
        const antigo = serializeConsent(record({ policyVersion: '2020-01-1' }));
        expect(parseConsent(antigo)).toBeNull();
    });

    it('guarda o suficiente para provar o consentimento depois', () => {
        const r = parseConsent(serializeConsent(record()))!;
        expect(r.decidedAt).toBeTruthy();
        expect(r.policyVersion).toBe(CONSENT_POLICY_VERSION);
        expect(r.state).toBeTruthy();
    });
});

describe('event_id determinístico', () => {
    it('produz o mesmo valor para o mesmo usuário', () => {
        // É o que impede a Meta contar cada cadastro duas vezes quando o CAPI
        // entrar: navegador e servidor precisam chegar ao mesmo id sem se falar.
        expect(eventId('lead', 'user-1')).toBe(eventId('lead', 'user-1'));
    });

    it('não depende de tempo nem de aleatoriedade', () => {
        const a = eventId('lead', 'user-1');
        const b = eventId('lead', 'user-1');
        expect(a).toBe(b);
        expect(a).not.toMatch(/\d{13}/); // sem timestamp embutido
    });

    it('distingue usuários e tipos de evento', () => {
        expect(eventId('lead', 'user-1')).not.toBe(eventId('lead', 'user-2'));
        expect(eventId('lead', 'user-1')).not.toBe(eventId('complete_registration', 'user-1'));
    });
});
