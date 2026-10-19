// @vitest-environment jsdom
// NUB-RD-96 (TP-H §3 96e) — o grid desktop dos carrosséis deixa de cair em `unknown`.
//
// Antes: o strip mobile passava `surface="home_carrossel_*"` e o grid desktop
// (desktopGridMode) renderizava o card SEM surface → `unknown` no card_view.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('@/components/opportunities/OpportunityCard', () => ({
  default: ({ opportunity, surface }: { opportunity: { id: string }; surface?: string }) => (
    <div data-testid="opp-card" data-surface={surface} data-id={opportunity.id} />
  ),
}));

vi.mock('@/components/InstitutionCard', () => ({
  default: ({ institution, surface }: { institution: { id: string }; surface?: string }) => (
    <div data-testid="inst-card" data-surface={surface} data-id={institution.id} />
  ),
}));

import OpportunityCarousel from '@/components/home/OpportunityCarousel';
import InstitutionCarousel from '@/components/home/InstitutionCarousel';

afterEach(() => cleanup());

const opps = [{ id: 'mec_1' }, { id: 'mec_2' }, { id: 'partner_3' }] as any[];
const insts = [{ id: 'i1' }, { id: 'i2' }] as any[];

function surfacesOf(container: HTMLElement, testId: string) {
  return Array.from(container.querySelectorAll(`[data-testid="${testId}"]`)).map(
    (n) => n.getAttribute('data-surface'),
  );
}

describe('OpportunityCarousel', () => {
  it('desktopGridMode: strip E grid emitem a surface recebida (nenhum unknown)', () => {
    const { container } = render(
      <OpportunityCarousel
        title="Para Você"
        opportunities={opps}
        surface="home_para_voce"
        desktopGridMode
      />,
    );

    const surfaces = surfacesOf(container, 'opp-card');
    // 3 no strip mobile + 3 no grid desktop
    expect(surfaces).toHaveLength(6);
    expect(new Set(surfaces)).toEqual(new Set(['home_para_voce']));
  });

  it('sem desktopGridMode: só o strip, com a surface recebida', () => {
    const { container } = render(
      <OpportunityCarousel
        title="Novidades"
        opportunities={opps}
        surface="home_carrossel_oportunidades"
      />,
    );

    const surfaces = surfacesOf(container, 'opp-card');
    expect(surfaces).toHaveLength(3);
    expect(new Set(surfaces)).toEqual(new Set(['home_carrossel_oportunidades']));
  });

  it('a superfície vem do caller: "Para Você" e carrossel genérico são distinguíveis', () => {
    const a = render(<OpportunityCarousel title="A" opportunities={opps} surface="home_para_voce" />);
    const b = render(<OpportunityCarousel title="B" opportunities={opps} surface="home_carrossel_oportunidades" />);

    expect(surfacesOf(a.container, 'opp-card')[0]).not.toBe(surfacesOf(b.container, 'opp-card')[0]);
  });
});

describe('InstitutionCarousel', () => {
  it('desktopGridMode: strip E grid emitem a surface recebida (nenhum unknown)', () => {
    const { container } = render(
      <InstitutionCarousel
        institutions={insts}
        surface="home_carrossel_instituicoes"
        desktopGridMode
      />,
    );

    const surfaces = surfacesOf(container, 'inst-card');
    expect(surfaces).toHaveLength(4); // 2 strip + 2 grid
    expect(new Set(surfaces)).toEqual(new Set(['home_carrossel_instituicoes']));
  });

  it('perfil/favoritos: usa a surface do caller, não a da home', () => {
    const { container } = render(
      <InstitutionCarousel institutions={insts} surface="perfil_favoritos" />,
    );

    expect(new Set(surfacesOf(container, 'inst-card'))).toEqual(new Set(['perfil_favoritos']));
  });
});
