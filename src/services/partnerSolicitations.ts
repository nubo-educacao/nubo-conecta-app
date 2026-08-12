'use server';
// Server Action: submitPartnerSolicitation — TP-5 5b, card 7410a5bc
//
// Porta o formulário "Seja um parceiro Nubo" do nubo-hub-app (legado).
// PLAYBOOK § 2: mutações via Server Action.
//
// A escrita NÃO acontece aqui: esta função valida o que dá para validar barato,
// resolve o IP e delega para a RPC `submit_partner_solicitation`, que é a única
// porta de entrada da tabela (migration 20260812120000).
//
// Por que a RPC e não um insert daqui:
//
//   1. Deduplicar exige LER a tabela, e a policy de leitura é restrita a admin
//      (`permission = 'Dashboard'`). Um visitante anônimo não tem auth.uid(),
//      então o SELECT volta vazio SEMPRE — não "às vezes". Uma primeira versão
//      desta função deduplicava assim e a dedupe nunca disparava. A RPC é
//      SECURITY DEFINER e enxerga o que o RLS esconderia.
//
//   2. Rate limit precisa de estado compartilhado entre invocações. Contador em
//      memória não serve em serverless: cada instância teria o seu, e quem
//      abusa cai numa instância nova a cada request. O banco JÁ é esse estado
//      compartilhado — a RPC conta as tentativas por hash de IP lá dentro. Não
//      é preciso Redis nem WAF.
//
//   3. A migration 20260812120100 removeu a policy de INSERT público. Não
//      existe mais caminho alternativo de escrita para quem não é admin.

import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

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

const MESSAGES: Record<string, string> = {
  institution_name: 'Informe o nome da instituição.',
  contact_name: 'Informe o nome do responsável.',
  how_did_you_know: 'Conte como conheceu a Nubo.',
  contact: 'Informe um WhatsApp válido ou um e-mail válido.',
};

const GENERIC_ERROR = 'Não foi possível enviar agora. Tente novamente em instantes.';
const RATE_LIMITED =
  'Recebemos várias solicitações deste dispositivo. Aguarde alguns minutos e tente de novo.';

/** Primeiro IP do encadeamento de proxies; os seguintes são dos próprios proxies. */
async function resolveClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return h.get('x-real-ip');
}

/**
 * Registra uma solicitação de parceria.
 *
 * Nunca lança para o cliente e nunca devolve detalhe do banco: mensagem de erro
 * detalhada em formulário público é superfície de reconhecimento.
 */
export async function submitPartnerSolicitation(
  input: PartnerSolicitationInput,
): Promise<SubmitResult> {
  // Honeypot barrado aqui, antes de gastar uma ida ao banco. Responde sucesso e
  // não erro: dizer "você é um bot" ensina o bot a contornar na próxima.
  if ((input.website ?? '').trim().length > 0) {
    console.warn('[partner-solicitation] honeypot acionado, submissão descartada');
    return { ok: true, duplicate: false };
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

  const ip = await resolveClientIp();

  const { data, error } = await supabase.rpc('submit_partner_solicitation', {
    p_institution_name: input.institution_name ?? '',
    p_contact_name: input.contact_name ?? '',
    p_how_did_you_know: input.how_did_you_know ?? '',
    p_whatsapp: input.whatsapp ?? null,
    p_email: input.email ?? null,
    p_goals: input.goals ?? null,
    p_ip: ip,
  });

  if (error) {
    console.error('[partner-solicitation] falha na RPC:', error);
    return { ok: false, error: GENERIC_ERROR };
  }

  const status = (data as { status?: string; field?: string } | null)?.status;
  const field = (data as { field?: string } | null)?.field;

  switch (status) {
    case 'created':
      console.info('[partner-solicitation] lead registrado');
      return { ok: true, duplicate: false };

    case 'duplicate':
      // Sucesso do ponto de vista de quem preencheu: preencheu uma vez e deu
      // certo. O que não pode é o comercial receber o mesmo lead três vezes.
      return { ok: true, duplicate: true };

    case 'rate_limited':
      console.warn('[partner-solicitation] rate limit atingido');
      return { ok: false, error: RATE_LIMITED };

    case 'invalid':
      return { ok: false, error: MESSAGES[field ?? ''] ?? GENERIC_ERROR };

    default:
      console.error('[partner-solicitation] status inesperado da RPC:', data);
      return { ok: false, error: GENERIC_ERROR };
  }
}
