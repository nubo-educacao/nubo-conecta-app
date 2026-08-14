'use server';
// Server Action: costura de atribuição no cadastro — TP-7 7B
//
// O clique acontece anônimo, em /r/<code>. O user_id só existe depois que a
// pessoa se cadastra. Esta função amarra os dois usando o anonymous_id que o
// cookie carregou desde o primeiro clique.
//
// Sem isso, o evento que trouxe o cadastro fica órfão e a taxa de conversão por
// link nunca fecha — que é exatamente a métrica que hoje não existe.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ATTR_COOKIES } from '@/lib/attribution';

export type AttachResult =
  | { ok: true; attributed: boolean }
  | { ok: false; error: string };

/**
 * Chamar logo após o cadastro/primeiro login, com a sessão já estabelecida.
 *
 * Nunca lança: falha de atribuição não pode impedir alguém de entrar no
 * produto. Perder a origem custa uma linha de relatório; barrar o cadastro
 * custa o cadastro.
 */
export async function attachAttribution(userId: string): Promise<AttachResult> {
  try {
    const cookieStore = await cookies();

    const anonymousId = cookieStore.get(ATTR_COOKIES.anonymous)?.value;
    const firstCode = cookieStore.get(ATTR_COOKIES.first)?.value ?? null;
    const lastCode = cookieStore.get(ATTR_COOKIES.last)?.value ?? null;

    // Sem identidade anônima e sem code não há o que costurar. Não é erro:
    // é alguém que chegou digitando o endereço.
    if (!anonymousId && !firstCode && !lastCode) {
      return { ok: true, attributed: false };
    }

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

    const { data, error } = await supabase.rpc('attach_user_attribution', {
      p_user_id: userId,
      p_anonymous_id: anonymousId ?? '',
      p_first_code: firstCode,
      p_last_code: lastCode,
    });

    if (error) {
      console.error('[attribution] falha ao costurar:', error);
      return { ok: false, error: 'Não foi possível registrar a origem do cadastro.' };
    }

    const status = (data as { status?: string } | null)?.status;
    return { ok: true, attributed: status === 'ok' };
  } catch (err) {
    console.error('[attribution] erro inesperado:', err);
    return { ok: false, error: 'Não foi possível registrar a origem do cadastro.' };
  }
}
