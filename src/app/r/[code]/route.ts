// Rota /r/<code> — resolve um link de canal, registra o clique e redireciona.
// TP-7 7B task 10 · card fbc7273e · governance doc f74d1cd9 §3.3
//
// É aqui que o clique vira dado. Hoje não existe: `referral_source` só nasce se
// a pessoa se cadastra, então há numerador e não há denominador — não dá para
// dizer que um influencer tem 2.000 cliques e 1% de conversão enquanto outro
// tem 200 e 30%.
//
// Route Handler e não página: não há nada para renderizar, e um redirect
// server-side não deixa o visitante ver um flash de tela intermediária.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { ATTR_COOKIES, attrCookieOptions, newAnonymousId } from '@/lib/attribution';

export const dynamic = 'force-dynamic';

interface ResolveResult {
  status: 'ok' | 'not_found' | 'invalid';
  link_id?: string;
  destination_path?: string;
  archived?: boolean;
  utm?: Record<string, string>;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const origin = request.nextUrl.origin;

  // Identidade do visitante antes do login. Se já existe, é reaproveitada — é
  // ela que permite costurar os cliques ao usuário no cadastro.
  const existingAid = request.cookies.get(ATTR_COOKIES.anonymous)?.value;
  const anonymousId = existingAid || newAnonymousId();

  let result: ResolveResult = { status: 'not_found' };

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } },
    );

    const { data, error } = await supabase.rpc('resolve_channel_link', {
      p_code: code,
      p_anonymous_id: anonymousId,
      // event_id derivado do link + sessão + minuto: recarregar a página no
      // mesmo minuto não vira clique novo, mas voltar depois vira.
      p_event_id: `link:${code}:${anonymousId}:${new Date().toISOString().slice(0, 16)}`,
    });

    if (error) {
      console.error('[/r] falha ao resolver link', { code, error });
    } else {
      result = data as ResolveResult;
    }
  } catch (err) {
    // Falha de tracking NUNCA pode impedir a pessoa de chegar ao site. O clique
    // perdido custa uma linha de métrica; o redirect quebrado custa a visita.
    console.error('[/r] erro inesperado', { code, err });
  }

  const destination = new URL(
    result.status === 'ok' ? (result.destination_path ?? '/') : '/',
    origin,
  );

  // UTMs vão para a URL final para que o GTM e o pixel enxerguem a origem
  // (TP-7 7A). O banco já registrou o clique; isto é para a camada de tags.
  if (result.status === 'ok' && result.utm) {
    for (const [key, value] of Object.entries(result.utm)) {
      if (value) destination.searchParams.set(key, value);
    }
  }

  const response = NextResponse.redirect(destination, { status: 307 });

  response.cookies.set(ATTR_COOKIES.anonymous, anonymousId, attrCookieOptions);

  if (result.status === 'ok') {
    // FIRST TOUCH: escrito só se ainda não existe. É o ponto inteiro desta
    // rota. O middleware antigo reescrevia `nubo:referral` a cada visita, e por
    // isso creditava o cadastro ao último link em vez de a quem trouxe a
    // pessoa — quem descobriu o Nubo por uma influenciadora e voltou por um
    // disparo de CRM aparecia como se tivesse vindo do CRM.
    if (!request.cookies.get(ATTR_COOKIES.first)) {
      response.cookies.set(ATTR_COOKIES.first, code, attrCookieOptions);
    }

    response.cookies.set(ATTR_COOKIES.last, code, attrCookieOptions);

    // Legado: o trigger handle_new_user ainda lê este cookie para preencher
    // user_profiles.referral_source. Mantido até os consumidores migrarem.
    response.cookies.set(ATTR_COOKIES.referral, code, attrCookieOptions);
  }

  return response;
}
