'use server';
// Server Action: submitPartnerSolicitation — TP-5 5b, card 7410a5bc
//
// Porta o formulário "Seja um parceiro Nubo" do nubo-hub-app (legado) para o
// nubo-conecta-app. PLAYBOOK § 2: mutações via Server Action.
//
// Por que Server Action e não insert direto do client, como fazia o legado:
// a policy de INSERT em partner_solicitations é pública (`WITH CHECK true`) —
// ela existe em produção e NÃO deve ser recriada. Uma policy aberta significa
// que qualquer pessoa com a anon key pode escrever nessa tabela. Expor o insert
// direto do browser é entregar o endpoint pronto. Passando por Server Action, a
// validação, o honeypot e a deduplicação rodam no servidor, onde o cliente não
// alcança.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface PartnerSolicitationInput {
  institution_name: string;
  contact_name: string;
  whatsapp?: string;
  email?: string;
  how_did_you_know: string;
  goals?: string;
  /** Honeypot. Campo escondido no formulário: humano nunca preenche, bot preenche. */
  website?: string;
}

export type SubmitResult =
  | { ok: true; duplicate: boolean }
  | { ok: false; error: string };

/** Limites de tamanho — a tabela aceita texto livre; sem teto, um POST enche a tabela. */
const MAX = {
  institution_name: 200,
  contact_name: 150,
  whatsapp: 20,
  email: 254,
  how_did_you_know: 500,
  goals: 2000,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Janela de deduplicação: reenvio do mesmo contato dentro dela é tratado como idempotente. */
const DEDUPE_WINDOW_HOURS = 24;

function clean(value: string | undefined, max: number): string {
  return (value ?? '').trim().slice(0, max);
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Registra uma solicitação de parceria.
 *
 * Nunca lança para o cliente: devolve `{ ok: false, error }` com mensagem
 * genérica. Detalhe de erro do banco vira log do servidor — mensagem de erro
 * detalhada num formulário público é superfície de reconhecimento.
 */
export async function submitPartnerSolicitation(
  input: PartnerSolicitationInput,
): Promise<SubmitResult> {
  // ── Honeypot ───────────────────────────────────────────────────────────────
  // Responde sucesso, não erro: dizer "você é um bot" ensina o bot a contornar.
  if (clean(input.website, 100).length > 0) {
    console.warn('[partner-solicitation] honeypot acionado, submissão descartada');
    return { ok: true, duplicate: false };
  }

  const institution_name = clean(input.institution_name, MAX.institution_name);
  const contact_name = clean(input.contact_name, MAX.contact_name);
  const how_did_you_know = clean(input.how_did_you_know, MAX.how_did_you_know);
  const goals = clean(input.goals, MAX.goals);
  const email = clean(input.email, MAX.email).toLowerCase();
  const whatsappRaw = clean(input.whatsapp, MAX.whatsapp);
  const whatsappDigits = digitsOnly(whatsappRaw);

  // ── Validação (espelha a do modal legado) ──────────────────────────────────
  if (!institution_name) return { ok: false, error: 'Informe o nome da instituição.' };
  if (!contact_name) return { ok: false, error: 'Informe o nome do responsável.' };
  if (!how_did_you_know) return { ok: false, error: 'Conte como conheceu a Nubo.' };

  const hasPhone = whatsappDigits.length >= 10;
  const hasEmail = EMAIL_RE.test(email);
  if (!hasPhone && !hasEmail) {
    return { ok: false, error: 'Informe um WhatsApp válido ou um e-mail válido.' };
  }
  if (email && !hasEmail) {
    return { ok: false, error: 'O e-mail informado não parece válido.' };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  // ── Deduplicação / idempotência ────────────────────────────────────────────
  // Duplo clique e reenvio por ansiedade são o caso comum; sem isto a equipe
  // comercial recebe o mesmo lead três vezes. Devolve sucesso, porque do ponto
  // de vista de quem preencheu o formulário deu certo — e deu.
  const since = new Date(Date.now() - DEDUPE_WINDOW_HOURS * 3600_000).toISOString();
  const contactFilters: string[] = [];
  if (hasEmail) contactFilters.push(`email.eq.${email}`);
  if (hasPhone) contactFilters.push(`whatsapp.eq.${whatsappRaw}`);

  if (contactFilters.length > 0) {
    const { data: existing, error: dedupeError } = await supabase
      .from('partner_solicitations')
      .select('id')
      .eq('institution_name', institution_name)
      .gte('created_at', since)
      .or(contactFilters.join(','))
      .limit(1);

    if (dedupeError) {
      // Falha na checagem não bloqueia o lead: um duplicado custa menos que um
      // lead perdido. Só registra.
      console.error('[partner-solicitation] falha ao checar duplicidade:', dedupeError);
    } else if (existing && existing.length > 0) {
      return { ok: true, duplicate: true };
    }
  }

  const { error } = await supabase.from('partner_solicitations').insert({
    institution_name,
    contact_name,
    whatsapp: whatsappRaw || null,
    email: email || null,
    how_did_you_know,
    goals: goals || null,
  });

  if (error) {
    console.error('[partner-solicitation] falha ao inserir:', error);
    return { ok: false, error: 'Não foi possível enviar agora. Tente novamente em instantes.' };
  }

  console.info('[partner-solicitation] lead registrado:', { institution_name });
  return { ok: true, duplicate: false };
}
