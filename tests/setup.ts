/**
 * Vitest Global Setup
 * Mocks globais para Next.js no ambiente de testes.
 * Qualquer hook do next/navigation pode ser sobrescrito per-test com `vi.mocked(useRouter).mockReturnValue(...)`.
 */
import { vi } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
    getAll: vi.fn().mockReturnValue([]),
    has: vi.fn().mockReturnValue(false),
    toString: vi.fn().mockReturnValue(''),
    entries: vi.fn().mockReturnValue([]),
    keys: vi.fn().mockReturnValue([]),
    values: vi.fn().mockReturnValue([]),
    forEach: vi.fn(),
  }),
  usePathname: () => '/',
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    createElement('a', { href, className }, children),
}));

import { createElement } from 'react';
