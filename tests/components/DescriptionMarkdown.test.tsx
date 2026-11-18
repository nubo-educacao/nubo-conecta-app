// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DescriptionMarkdown from '@/components/DescriptionMarkdown';

describe('DescriptionMarkdown', () => {
  it('renderiza blocos, quebras e formatação da instituição', () => {
    const text = '# Título 🚀\n\nPrimeira linha\nSegunda com **negrito** e *itálico*.\n\n- Item\n\n[Site](https://example.com)';
    const { container } = render(<DescriptionMarkdown text={text} variant="institution" />);

    expect(screen.getByRole('heading', { name: 'Título 🚀' })).toBeInTheDocument();
    expect(screen.getByText('negrito').tagName).toBe('STRONG');
    expect(screen.getByText('itálico').tagName).toBe('EM');
    expect(screen.getByText('Item').tagName).toBe('LI');
    expect(screen.getByRole('link', { name: 'Site' })).toHaveAttribute('href', 'https://example.com');
    const paragraph = container.querySelector('p');
    expect(paragraph).toHaveClass('whitespace-pre-line');
    expect(paragraph?.textContent).toContain('Primeira linha\nSegunda');
  });

  it('mantém a interpretação limitada e o texto literal das oportunidades', () => {
    const text = '# Não é título\n- Não é lista\n\n__literal__ ~~literal~~ **negrito** *itálico* [site](https://example.com) 🚀';
    const { container } = render(
      <p><DescriptionMarkdown text={text} variant="opportunity" accentColor="#7030C2" /></p>,
    );

    expect(container.querySelector('h1, ul, li')).toBeNull();
    expect(container.querySelector('p')?.textContent).toBe(
      '# Não é título\n- Não é lista\n\n__literal__ ~~literal~~ negrito itálico site 🚀',
    );
    expect(screen.getByText('negrito')).toHaveClass('font-bold', 'text-[#3A424E]');
    expect(screen.getByText('itálico')).toHaveClass('italic');
    const link = screen.getByRole('link', { name: 'site' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveStyle({ color: '#7030C2' });
  });

  it.each(['institution', 'opportunity'] as const)(
    'não interpreta HTML nem permite URL javascript na variante %s',
    (variant) => {
      const { container } = render(
        <DescriptionMarkdown
          text={'<img src=x onerror=alert(1)>\n\n[perigoso](JaVaScRiPt:alert) [dados](data:text/html,alert)'}
          variant={variant}
        />,
      );

      expect(container.querySelector('img')).toBeNull();
      expect(screen.getByText('perigoso')).not.toHaveAttribute('href');
      expect(screen.getByText('dados')).not.toHaveAttribute('href');
    },
  );
});
