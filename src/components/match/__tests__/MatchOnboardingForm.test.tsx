/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MatchOnboardingForm from '../MatchOnboardingForm';
import * as profileService from '@/services/profileService';
import * as matchService from '@/services/matchService';

// Mock services
vi.mock('@/services/profileService', () => ({
  saveUserData: vi.fn(),
  saveUserIncome: vi.fn(),
  saveUserEnemScore: vi.fn(),
  saveUserPreferences: vi.fn(),
  markOnboardingComplete: vi.fn(),
}));

vi.mock('@/services/matchService', () => ({
  generateMatch: vi.fn(),
}));

describe('MatchOnboardingForm — Fluxo de 3 Passos', () => {
  const mockOnComplete = vi.fn();
  const userId = 'test-user-id';

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock CEP fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        localidade: 'São Paulo',
        uf: 'SP',
        bairro: 'Sé',
        logradouro: 'Praça da Sé',
        erro: false
      })
    });
  });

  it('renderiza o Passo 1 inicialmente e valida campos obrigatórios', async () => {
    render(<MatchOnboardingForm userId={userId} onComplete={mockOnComplete} />);
    
    expect(screen.getByText(/Identificação/i)).toBeInTheDocument();
    
    // Tenta avançar sem preencher
    const nextBtn = screen.getByText(/Continuar/i);
    fireEvent.click(nextBtn);
    
    // Deve mostrar erros (simulados por bordas vermelhas no componente, mas aqui checamos se não mudou o passo)
    expect(screen.getByText(/Identificação/i)).toBeInTheDocument();
    expect(screen.queryByText(/Desempenho & Renda/i)).not.toBeInTheDocument();
  });

  it('avança para o Passo 2 após preencher Passo 1 corretamente', async () => {
    render(<MatchOnboardingForm userId={userId} onComplete={mockOnComplete} />);
    
    // Preenche campos obrigatórios do Passo 1
    fireEvent.change(screen.getByPlaceholderText(/Ex: Maria Oliveira Santos/i), { target: { value: 'João Silva' } });
    fireEvent.change(screen.getByLabelText(/Data de Nascimento/i), { target: { value: '2000-01-01' } });
    fireEvent.change(screen.getByLabelText(/Escolaridade/i), { target: { value: 'Ensino Médio Completo' } });
    
    // Endereço
    fireEvent.change(screen.getByPlaceholderText(/00000-000/i), { target: { value: '01001000' } });
    
    // Espera o preenchimento automático do CEP
    await waitFor(() => {
      expect(screen.getByDisplayValue(/São Paulo/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/SP/i)).toBeInTheDocument();
    });
    
    // Clicar em continuar
    fireEvent.change(screen.getByLabelText(/Rua/i), { target: { value: 'Rua Teste' } });
    fireEvent.change(screen.getByLabelText(/Nº/i), { target: { value: '123' } });
    
    const nextBtn = screen.getByText(/Continuar/i);
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/Desempenho & Renda/i)).toBeInTheDocument();
    });
  });

  it('executa todas as chamadas de salvamento ao finalizar o Passo 3', async () => {
    // Renderiza direto no Passo 3 ou simula a jornada
    render(<MatchOnboardingForm userId={userId} onComplete={mockOnComplete} />);
    
    // Passo 1 -> Passo 2
    fireEvent.change(screen.getByPlaceholderText(/Ex: Maria Oliveira Santos/i), { target: { value: 'João Silva' } });
    fireEvent.change(screen.getByLabelText(/Data de Nascimento/i), { target: { value: '2000-01-01' } });
    fireEvent.change(screen.getByLabelText(/Escolaridade/i), { target: { value: 'Ensino Médio Completo' } });
    fireEvent.change(screen.getByPlaceholderText(/00000-000/i), { target: { value: '01001000' } });
    
    await waitFor(() => expect(screen.getByDisplayValue(/São Paulo/i)).toBeInTheDocument());
    
    fireEvent.change(screen.getByLabelText(/Rua/i), { target: { value: 'Rua Teste' } });
    fireEvent.change(screen.getByLabelText(/Nº/i), { target: { value: '123' } });
    
    fireEvent.click(screen.getByText(/Continuar/i));

    // Passo 2 -> Passo 3
    await waitFor(() => expect(screen.getByText(/Desempenho & Renda/i)).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/Ex: 720.5/i), { target: { value: '750' } });
    fireEvent.change(screen.getByPlaceholderText(/Valor em R\$/i), { target: { value: '1500' } });
    
    fireEvent.click(screen.getByText(/Continuar/i));

    // Passo 3 -> Submit
    await waitFor(() => expect(screen.getByText(/Interesses & Filtros/i)).toBeInTheDocument());
    
    const finishBtn = screen.getByText(/Finalizar e Ver Matches/i);
    fireEvent.click(finishBtn);

    await waitFor(() => {
      expect(profileService.saveUserData).toHaveBeenCalled();
      expect(profileService.saveUserIncome).toHaveBeenCalled();
      expect(profileService.saveUserEnemScore).toHaveBeenCalled();
      expect(profileService.saveUserPreferences).toHaveBeenCalled();
      expect(matchService.generateMatch).toHaveBeenCalledWith(userId);
      expect(profileService.markOnboardingComplete).toHaveBeenCalled();
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });
});
