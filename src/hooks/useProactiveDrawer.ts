'use client';

/**
 * useProactiveDrawer — Hook de abertura proativa do Drawer Cloudinha.
 *
 * Aguarda 5 segundos e abre o drawer automaticamente,
 * caso ainda não tenha sido mostrado nesta sessão de navegação.
 *
 * Guards:
 * - Não abre se o drawer já está aberto (isDrawerOpen = true)
 * - Não abre se sessionStorage "nubo_proactive_shown" = "true"
 * - Não abre em rotas de auth/legal (/privacidade, /termos)
 * - Timer é cancelado no unmount do componente
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const PROACTIVE_KEY = 'nubo_proactive_shown';
const DELAY_MS = 5_000;

const EXCLUDED_ROUTES = ['/privacidade', '/termos'];

interface UseProactiveDrawerOptions {
  isDrawerOpen: boolean;
  onOpen: () => void;
}

export function useProactiveDrawer({ isDrawerOpen, onOpen }: UseProactiveDrawerOptions): void {
  const pathname = usePathname();

  useEffect(() => {
    if (isDrawerOpen) return;
    if (EXCLUDED_ROUTES.some((route) => pathname.startsWith(route))) return;
    if (typeof window !== 'undefined' && sessionStorage.getItem(PROACTIVE_KEY) === 'true') return;

    const timerId = setTimeout(() => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(PROACTIVE_KEY, 'true');
      }
      onOpen();
    }, DELAY_MS);

    return () => clearTimeout(timerId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
}
