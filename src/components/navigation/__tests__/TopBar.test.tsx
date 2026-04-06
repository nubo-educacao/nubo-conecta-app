// @vitest-environment jsdom
// TDD — Issue #2: TopBar Navigation Unification
// Contratos críticos:
//   1. Desktop: 4 nav items renderizados no <nav> principal
//   2. Mobile: botão hamburger presente (aria-label "Abrir menu")
//   3. Clicar no hamburger abre o menu mobile (aria-label "Menu mobile")
//   4. Menu mobile contém todos os 4 itens de navegação
//   5. Clicar num link do menu mobile fecha o menu
//   6. Item ativo usa cor #048FAD

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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
    onClick,
    style,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    style?: React.CSSProperties;
  }) => (
    <a href={href} className={className} onClick={onClick} style={style}>
      {children}
    </a>
  ),
}));

// ─── Import DEPOIS dos mocks ──────────────────────────────────────────────────

import TopBar from '../TopBar';

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('TopBar — navegação unificada', () => {
  beforeEach(() => {
    mockPathname = '/';
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ── Desktop nav ───────────────────────────────────────────────────────────

  it('renderiza os 4 itens de navegação no nav desktop', () => {
    render(<TopBar />);

    const desktopNav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(desktopNav).toBeDefined();

    const links = desktopNav.querySelectorAll('a');
    expect(links).toHaveLength(4);
  });

  it('nav desktop contém links para todas as rotas', () => {
    render(<TopBar />);

    const desktopNav = screen.getByRole('navigation', { name: 'Navegação principal' });
    const hrefs = Array.from(desktopNav.querySelectorAll('a')).map((a) => a.getAttribute('href'));

    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/oportunidades');
    expect(hrefs).toContain('/instituicoes');
    expect(hrefs).toContain('/candidaturas');
  });

  // ── Mobile hamburger ─────────────────────────────────────────────────────

  it('exibe botão hamburger (aria-label "Abrir menu")', () => {
    render(<TopBar />);

    const hamburger = screen.getByRole('button', { name: 'Abrir menu' });
    expect(hamburger).toBeDefined();
  });

  it('menu mobile NÃO está visível antes de clicar no hamburger', () => {
    render(<TopBar />);

    const mobileNav = screen.queryByRole('navigation', { name: 'Menu mobile' });
    expect(mobileNav).toBeNull();
  });

  it('clicar no hamburger abre o menu mobile', () => {
    render(<TopBar />);

    const hamburger = screen.getByRole('button', { name: 'Abrir menu' });
    fireEvent.click(hamburger);

    const mobileNav = screen.getByRole('navigation', { name: 'Menu mobile' });
    expect(mobileNav).toBeDefined();
  });

  it('menu mobile aberto contém os 4 itens de navegação', () => {
    render(<TopBar />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));

    const mobileNav = screen.getByRole('navigation', { name: 'Menu mobile' });
    const links = mobileNav.querySelectorAll('a');
    expect(links).toHaveLength(4);
  });

  it('clicar num link do menu mobile fecha o menu', () => {
    render(<TopBar />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    expect(screen.getByRole('navigation', { name: 'Menu mobile' })).toBeDefined();

    const mobileNav = screen.getByRole('navigation', { name: 'Menu mobile' });
    const firstLink = mobileNav.querySelector('a')!;
    fireEvent.click(firstLink);

    expect(screen.queryByRole('navigation', { name: 'Menu mobile' })).toBeNull();
  });

  it('após abrir o menu o botão muda para aria-label "Fechar menu"', () => {
    render(<TopBar />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    expect(screen.getByRole('button', { name: 'Fechar menu' })).toBeDefined();
  });

  // ── Active state ─────────────────────────────────────────────────────────

  it('link ativo no desktop usa cor #048FAD', () => {
    mockPathname = '/oportunidades';
    render(<TopBar />);

    const desktopNav = screen.getByRole('navigation', { name: 'Navegação principal' });
    const activeLink = desktopNav.querySelector('a[href="/oportunidades"]') as HTMLElement;

    expect(activeLink.style.color).toBe('rgb(4, 143, 173)');
  });

  it('link ativo no mobile usa cor #048FAD', () => {
    mockPathname = '/candidaturas';
    render(<TopBar />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));

    const mobileNav = screen.getByRole('navigation', { name: 'Menu mobile' });
    const activeLink = mobileNav.querySelector('a[href="/candidaturas"]') as HTMLElement;

    expect(activeLink.style.color).toBe('rgb(4, 143, 173)');
  });

  // ── Logo ─────────────────────────────────────────────────────────────────

  it('exibe "Nubo Conecta" como logo padrão', () => {
    render(<TopBar />);
    expect(screen.getByText('Nubo Conecta')).toBeDefined();
  });

  it('exibe título customizado quando prop title é fornecida', () => {
    render(<TopBar title="Oportunidades" />);
    expect(screen.getByRole('heading', { name: 'Oportunidades' })).toBeDefined();
  });
});
