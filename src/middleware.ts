import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const ref = url.searchParams.get('ref');

  // Continua a requisição normal
  const response = NextResponse.next();

  // Se houver um parâmetro 'ref', salva em um cookie por 30 dias
  if (ref) {
    response.cookies.set('nubo:referral', ref, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  return response;
}

// Configura em quais rotas o middleware vai rodar
// Evita rodar em arquivos estáticos e de build
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
