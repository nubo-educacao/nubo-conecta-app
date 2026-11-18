// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InstitutionDetailPage from '@/app/(app)/instituicoes/[id]/page';
import { getUnifiedInstitutionById } from '@/services/institutions';

vi.mock('@/services/institutions', () => ({ getUnifiedInstitutionById: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: null }));
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => {
    const query = {
      data: [],
      count: 0,
      select: () => query,
      eq: () => query,
      order: () => query,
      range: () => query,
    };
    return { from: () => query };
  },
}));
vi.mock('@/components/layout/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/opportunities/ImportantDatesSection', () => ({ default: () => null }));
vi.mock('@/app/(app)/instituicoes/[id]/CoverImage', () => ({ default: () => null }));
vi.mock('@/app/(app)/instituicoes/[id]/FavoriteInstitutionButton', () => ({ default: () => null }));
vi.mock('@/app/(app)/instituicoes/[id]/ShareInstitutionButton', () => ({ default: () => null }));
vi.mock('@/app/(app)/instituicoes/[id]/CampusFilter', () => ({ default: () => null }));

describe('InstitutionDetailPage Markdown', () => {
  it('renderiza a descrição real da página sem HTML nem URLs perigosas', async () => {
    vi.mocked(getUnifiedInstitutionById).mockResolvedValue({
      id: 'institution-id',
      name: 'Instituição de teste',
      type: 'partner',
      location: null,
      logo_url: null,
      cover_url: null,
      brand_color: null,
      description: '# Título 🚀\n\nLinha um\nLinha **dois** e *três*.\n\n- Item\n\n[Site](https://example.com)\n\n[Perigoso](javascript:alert)\n\n<img src=x onerror=alert(1)>',
    });

    const page = await InstitutionDetailPage({
      params: Promise.resolve({ id: 'institution-id' }),
      searchParams: Promise.resolve({}),
    });
    const { container } = render(page);

    expect(screen.getByRole('heading', { name: 'Título 🚀' })).toBeInTheDocument();
    expect(screen.getByText('dois').tagName).toBe('STRONG');
    expect(screen.getByText('três').tagName).toBe('EM');
    expect(screen.getByText('Item').tagName).toBe('LI');
    expect(screen.getByRole('link', { name: 'Site' })).toHaveAttribute('href', 'https://example.com');
    expect(screen.getByText('Perigoso')).not.toHaveAttribute('href');
    expect(container.querySelector('img')).toBeNull();
    const paragraph = screen.getByText('dois').closest('p');
    expect(paragraph).toHaveClass('whitespace-pre-line');
    expect(paragraph?.textContent).toContain('Linha um\nLinha dois');
  });
});
