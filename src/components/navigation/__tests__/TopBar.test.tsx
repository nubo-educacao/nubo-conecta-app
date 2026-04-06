// @vitest-environment jsdom
// TDD — Issue #2: TopBar Navigation — Desktop inline nav
// Arquitetura: BottomNav gerencia mobile; TopBar expõe nav apenas no desktop (md+).
// Contratos críticos:
//   1. Desktop nav renderiza os 4 itens de navegação
//   2. Nav contém links para todas as rotas canônicas
//   3. Item ativo usa cor #048FAD (Nav Active token)
//   4. Item inativo usa cor #707A7E (Nav Inactive token)
//   5. Logo padrão "Nubo Conecta" e prop title customizada
//   6. Botão de usuário está presente

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { expect as vitestExpect } from 'vitest';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
vitestExpect.extend(jestDomMatchers);

// ─── Mocks ───────────────────────────────────────────────────────────────────

let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, setShowAuthModal: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    style,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <a href={href} className={className} style={style}>
      {children}
    </a>
  ),
}));

// ─── Import DEPOIS dos mocks ──────────────────────────────────────────────────

import TopBar from '../TopBar';

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('TopBar — desktop navigation', () => {
  beforeEach(() => {
    mockPathname = '/';
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ── Desktop nav estrutura ─────────────────────────────────────────────────

  it('renderiza os 4 itens de navegação no nav desktop', () => {
    render(<TopBar />);

    const desktopNav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(desktopNav).toBeDefined();

    const links = desktopNav.querySelectorAll('a');
    expect(links).toHaveLength(4);
  });

  it('nav desktop contém links para todas as rotas canônicas', () => {
    render(<TopBar />);

    const desktopNav = screen.getByRole('navigation', { name: 'Navegação principal' });
    const hrefs = Array.from(desktopNav.querySelectorAll('a')).map((a) => a.getAttribute('href'));

    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/oportunidades');
    expect(hrefs).toContain('/instituicoes');
    expect(hrefs).toContain('/candidaturas');
  });

  // ── Active / inactive state ───────────────────────────────────────────────

  it('link ativo usa cor Nav Active #048FAD', () => {
    mockPathname = '/oportunidades';
    render(<TopBar />);

    const desktopNav = screen.getByRole('navigation', { name: 'Navegação principal' });
    const activeLink = desktopNav.querySelector('a[href="/oportunidades"]') as HTMLElement;

    // JSDOM normaliza hex → rgb
    expect(activeLink.style.color).toBe('rgb(4, 143, 173)');
  });

  it('link inativo usa cor Nav Inactive #707A7E', () => {
    mockPathname = '/';
    render(<TopBar />);

    const desktopNav = screen.getByRole('navigation', { name: 'Navegação principal' });
    const inactiveLink = desktopNav.querySelector('a[href="/oportunidades"]') as HTMLElement;

    expect(inactiveLink.style.color).toBe('rgb(112, 122, 126)');
  });

  // ── Logo e título ─────────────────────────────────────────────────────────

  it('exibe "Nubo Conecta" como logo padrão', () => {
    render(<TopBar />);
    expect(screen.getByText('Nubo Conecta')).toBeDefined();
  });

  it('exibe título customizado quando prop title é fornecida', () => {
    render(<TopBar title="Oportunidades" />);
    expect(screen.getByRole('heading', { name: 'Oportunidades' })).toBeDefined();
  });

  // ── Botão de usuário ──────────────────────────────────────────────────────

  it('botão de usuário está presente com aria-label "Entrar" quando não autenticado', () => {
    render(<TopBar />);
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDefined();
  });

  // ── Contrato de dualidade mobile/desktop ──────────────────────────────────

  it('NÃO renderiza menu mobile (mobile nav é responsabilidade do BottomNav)', () => {
    render(<TopBar />);

    // Se qualquer elemento com aria-label "Menu mobile" existir, a arquitetura foi violada
    const mobileNav = screen.queryByRole('navigation', { name: 'Menu mobile' });
    expect(mobileNav).toBeNull();
  });
});
