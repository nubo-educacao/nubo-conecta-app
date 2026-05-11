// @vitest-environment jsdom
// TDD — Sprint 8.0: InstitutionCard
// BDD cenários cobertos:
//   1. Variante parceira: chip 'Instituição parceira', logo circular, brand_color, botão 'Ver detalhes'
//   2. Variante MEC: fundo Nubo, ícone livro, SEM chip parceira, botão 'Ver detalhes' primário
//   3. Aceita tipo unificado de v_unified_institutions (campo 'type')

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { expect as vitestExpect } from 'vitest';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
vitestExpect.extend(jestDomMatchers);

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import InstitutionCard from '@/components/InstitutionCard';
import type { UnifiedInstitution } from '@/types/institutions';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const partnerInstitution: UnifiedInstitution = {
  id: 'inst-partner-001',
  name: 'Universidade Parceira XYZ',
  location: 'São Paulo, SP',
  logo_url: 'https://example.com/logo.png',
  cover_url: 'https://example.com/cover.png',
  brand_color: '#C82D26',
  description: 'Uma instituição parceira com programas exclusivos.',
  type: 'partner',
};

const mecInstitution: UnifiedInstitution = {
  id: 'inst-mec-001',
  name: 'Universidade Federal do Estado',
  location: null,
  logo_url: null,
  cover_url: null,
  brand_color: null,
  description: null,
  type: 'mec',
};

// ─── Suite ───────────────────────────────────────────────────────────────────

afterEach(() => cleanup());

describe('InstitutionCard — variante parceira', () => {
  it('exibe chip "Instituição parceira"', () => {
    render(<InstitutionCard institution={partnerInstitution} />);
    expect(screen.getByText('Instituição parceira')).toBeDefined();
  });

  it('chip usa brand_color como fundo', () => {
    const { container } = render(<InstitutionCard institution={partnerInstitution} />);
    const chip = container.querySelector('[data-testid="partner-chip"]');
    expect(chip).not.toBeNull();
    expect((chip as HTMLElement).style.backgroundColor).toBe('rgb(200, 45, 38)');
  });

  it('exibe o logo circular quando logo_url está presente', () => {
    const { container } = render(<InstitutionCard institution={partnerInstitution} />);
    const logo = container.querySelector('img[alt="Logo Universidade Parceira XYZ"]');
    expect(logo).not.toBeNull();
  });

  it('exibe nome da instituição', () => {
    render(<InstitutionCard institution={partnerInstitution} />);
    expect(screen.getByText('Universidade Parceira XYZ')).toBeDefined();
  });

  it('exibe localização quando presente', () => {
    render(<InstitutionCard institution={partnerInstitution} />);
    expect(screen.getByText(/São Paulo, SP/)).toBeDefined();
  });

  it('exibe botão "Ver detalhes" linkando para /instituicoes/:id', () => {
    const { container } = render(<InstitutionCard institution={partnerInstitution} />);
    const link = container.querySelector('a[href="/instituicoes/inst-partner-001"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain('Ver detalhes');
  });
});

describe('InstitutionCard — variante MEC', () => {
  it('NÃO exibe chip "Instituição parceira"', () => {
    render(<InstitutionCard institution={mecInstitution} />);
    expect(screen.queryByText('Instituição parceira')).toBeNull();
  });

  it('exibe ícone de livro no lugar do logo', () => {
    const { container } = render(<InstitutionCard institution={mecInstitution} />);
    const bookIcon = container.querySelector('[data-testid="book-icon"]');
    expect(bookIcon).not.toBeNull();
  });

  it('exibe nome da instituição', () => {
    render(<InstitutionCard institution={mecInstitution} />);
    expect(screen.getByText('Universidade Federal do Estado')).toBeDefined();
  });

  it('exibe botão "Ver detalhes" linkando para /instituicoes/:id', () => {
    const { container } = render(<InstitutionCard institution={mecInstitution} />);
    const link = container.querySelector('a[href="/instituicoes/inst-mec-001"]');
    expect(link).not.toBeNull();
    expect(link?.textContent).toContain('Ver detalhes');
  });
});

describe('InstitutionCard — contrato de tipo', () => {
  it('usa variante correta baseada no campo type=partner', () => {
    render(<InstitutionCard institution={partnerInstitution} />);
    expect(screen.getByText('Instituição parceira')).toBeDefined();
  });

  it('usa variante correta baseada no campo type=mec', () => {
    render(<InstitutionCard institution={mecInstitution} />);
    expect(screen.queryByText('Instituição parceira')).toBeNull();
  });

  it('aceita onClick como prop opcional e chama ao clicar', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <InstitutionCard institution={partnerInstitution} onClick={handleClick} />,
    );
    const card = container.querySelector('[data-testid="institution-card"]');
    (card as HTMLElement)?.click();
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
