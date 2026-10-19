// NUB-RD-96 (TP-H §3 96c/96e) — guarda anti-fantasma.
//
// 1. Todo caller de OpportunityCarousel/InstitutionCarousel passa `surface`
//    (e a certa para o lugar onde está).
// 2. RedirectButton.tsx (código morto, segunda implementação de redirect) não
//    volta: uma única implementação — DetailsLayout → mecRedirect → trackAndRedirect.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../../src');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Todas as tags JSX de `<Tag ... />` no arquivo (até o `/>` que fecha). */
function jsxTags(source: string, tag: string): string[] {
  const re = new RegExp(`<${tag}\\b[\\s\\S]*?/>`, 'g');
  return source.match(re) ?? [];
}

const CAROUSEL_TAGS = ['OpportunityCarousel', 'InstitutionCarousel'] as const;

describe('callers dos carrosséis passam surface', () => {
  const files = walk(SRC).filter((f) => !/components[\\/]home[\\/](Opportunity|Institution)Carousel\.tsx$/.test(f));

  it('nenhum uso de carrossel fica sem `surface=`', () => {
    const missing: string[] = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      for (const tag of CAROUSEL_TAGS) {
        for (const jsx of jsxTags(source, tag)) {
          if (!/\bsurface=/.test(jsx)) missing.push(`${path.relative(SRC, file)} <${tag}>`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  const EXPECTED: Array<[string, RegExp, string]> = [
    ['components/opportunities/DetailsLayout.tsx', /SURFACES\.DETALHE_SIMILARES/, 'Outras Oportunidades para Você'],
    ['components/forms/PartnerFormEngine.tsx', /SURFACES\.PARTNER_FORMS_SUGESTOES/, 'sugestões no formulário'],
    ['app/(protected)/partner-forms/[id]/page.tsx', /SURFACES\.PARTNER_FORMS_SUGESTOES/, 'sugestões no partner-forms'],
    ['app/(protected)/perfil/components/FavoritosTab.tsx', /SURFACES\.PERFIL_FAVORITOS/, 'favoritos'],
  ];

  it.each(EXPECTED)('%s usa a superfície do seu lugar (%s)', (rel, expectedSurface) => {
    const source = fs.readFileSync(path.join(SRC, rel), 'utf8');
    const tags = CAROUSEL_TAGS.flatMap((t) => jsxTags(source, t));
    expect(tags.length).toBeGreaterThan(0);
    for (const jsx of tags) expect(jsx).toMatch(expectedSurface);
  });

  it('HomeClient: match_carousel = home_para_voce; opportunity_carousel e institution_carousel têm as suas', () => {
    const source = fs.readFileSync(path.join(SRC, 'app/HomeClient.tsx'), 'utf8');
    const matchCase = source.slice(source.indexOf("case 'match_carousel'"), source.indexOf("case 'opportunity_carousel'"));
    expect(matchCase).toMatch(/SURFACES\.HOME_PARA_VOCE/);
    const oppCase = source.slice(source.indexOf("case 'opportunity_carousel'"), source.indexOf("case 'institution_carousel'"));
    expect(oppCase).toMatch(/SURFACES\.HOME_CARROSSEL_OPORTUNIDADES/);
    const instCase = source.slice(source.indexOf("case 'institution_carousel'"), source.indexOf("case 'dates'"));
    expect(instCase).toMatch(/SURFACES\.HOME_CARROSSEL_INSTITUICOES/);
  });
});

describe('uma única implementação de redirect', () => {
  it('RedirectButton.tsx não existe', () => {
    const file = path.join(SRC, 'app/(app)/oportunidades/[id]/RedirectButton.tsx');
    expect(fs.existsSync(file)).toBe(false);
  });

  it('nenhum arquivo importa RedirectButton', () => {
    const offenders = walk(SRC).filter((f) => /from\s+['"][^'"]*RedirectButton['"]/.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
