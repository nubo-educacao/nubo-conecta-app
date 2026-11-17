// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PartnerDescriptionCard from '@/components/opportunities/PartnerDescriptionCard';

describe('PartnerDescriptionCard', () => {
  it('preserva formatação, cor e expansão de uma descrição longa', () => {
    const description = 'Linha 1\nLinha 2\nLinha 3\nLinha 4\n**Linha 5** [site](https://example.com)';
    const { container } = render(<PartnerDescriptionCard description={description} brandColor="#123456" />);
    const paragraph = container.querySelector('p');

    expect(paragraph).toHaveClass('whitespace-pre-wrap', 'line-clamp-4');
    expect(screen.getByText('Linha 5').tagName).toBe('STRONG');
    const link = screen.getByRole('link', { name: 'site' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveStyle({ color: '#123456' });
    fireEvent.click(screen.getByRole('button', { name: 'Ver mais' }));
    expect(paragraph).not.toHaveClass('line-clamp-4');
    expect(screen.getByRole('button', { name: 'Ver menos' })).toBeInTheDocument();
  });

  it('não oferece expansão para até quatro linhas', () => {
    render(<PartnerDescriptionCard description={'1\n2\n3\n4'} />);
    expect(screen.queryByRole('button', { name: 'Ver mais' })).not.toBeInTheDocument();
  });
});
