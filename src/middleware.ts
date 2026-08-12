import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  ATTR_COOKIES,
  attrCookieOptions,
  newAnonymousId,
  TRACKED_QUERY_PARAMS,
} from '@/lib/attribution';

// Captura de atribuição — TP-7 7B (+ preparação para 7A task 5).
//
// Duas mudanças em relação à versão anterior, que só olhava `ref`:
//
// 1. FIRST TOUCH DEIXA DE SER SOBRESCRITO. A versão anterior reescrevia
//    `nubo:referral` a cada visita, então quem descobria o Nubo por uma
//    influenciadora e voltava semanas depois por um disparo de CRM era
//    creditado ao CRM. O primeiro toque é o que responde "quem trouxe essa
//    pessoa", e era exatamente ele que se perdia.
//
// 2. `utm_*` e `fbclid` passam a ser retidos. Nem todo link sai do construtor
//    do Nubo: anúncio da Meta e sistema de parceiro chegam com utm_* na URL, e
//    os dois caminhos precisam desembocar na mesma atribuição. Sem `fbclid`
//    não há como derivar o `fbc` que o CAPI exige (7A) — hoje ele é descartado.
//
// A rota /r/<code> tem tratamento próprio e mais rico (resolve o link e grava o
// clique no banco); este middleware cobre o resto do tráfego.

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const response = NextResponse.next();

  // A rota /r/<code> escreve os próprios cookies, com o code já resolvido
  // contra o banco. Deixar o middleware escrever antes só criaria uma corrida.
  if (url.pathname.startsWith('/r/')) {
    return response;
  }

  // Identidade anônima estável: é a chave que costura os cliques pré-login ao
  // usuário quando ele se cadastra.
  if (!request.cookies.get(ATTR_COOKIES.anonymous)) {
    response.cookies.set(ATTR_COOKIES.anonymous, newAnonymousId(), attrCookieOptions);
  }

  const ref = url.searchParams.get('ref');

  if (ref) {
    // Só grava o primeiro toque se ainda não houver um.
    if (!request.cookies.get(ATTR_COOKIES.first)) {
      response.cookies.set(ATTR_COOKIES.first, ref, attrCookieOptions);
    }

    // O último toque é sempre o mais recente — este pode ser sobrescrito.
    response.cookies.set(ATTR_COOKIES.last, ref, attrCookieOptions);

    // Legado: o trigger handle_new_user lê este cookie para preencher
    // user_profiles.referral_source. Preserva o comportamento atual.
    response.cookies.set(ATTR_COOKIES.referral, ref, attrCookieOptions);
  }

  // Guarda os parâmetros de campanha da primeira visita que os trouxe. Também
  // sem sobrescrever: a origem original é a que importa.
  for (const param of TRACKED_QUERY_PARAMS) {
    const value = url.searchParams.get(param);
    if (!value) continue;

    const cookieName = `nubo:${param}`;
    if (!request.cookies.get(cookieName)) {
      response.cookies.set(cookieName, value, attrCookieOptions);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, assets, etc.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
