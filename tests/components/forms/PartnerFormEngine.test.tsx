// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';
import { expect as vitestExpect } from 'vitest';
vitestExpect.extend(jestDomMatchers);
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import PartnerFormEngine, { type PartnerStep } from '@/components/forms/PartnerFormEngine';
import { type PartnerFormField } from '@/components/forms/FormFieldRenderer';

// Mock evaluateJsonLogic
vi.mock('@/utils/jsonLogic', () => ({
  evaluateJsonLogic: vi.fn(() => true),
}));

// Mock FormFieldRenderer to avoid react-hook-form registration complexity
vi.mock('@/components/forms/FormFieldRenderer', () => ({
  default: ({ field }: { field: PartnerFormField }) => (
    <div data-testid={`field-${field.field_name}`}>{field.question_text}</div>
  ),
}));

// Suppress localStorage errors in jsdom
const localStorageMock = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

const STEPS: PartnerStep[] = [
  { id: 's1', partner_id: 'p1', step_name: 'Identificação', sort_order: 1 },
  { id: 's2', partner_id: 'p1', step_name: 'Formação', sort_order: 2 },
];

const FIELDS: PartnerFormField[] = [
  {
    id: 'f1', partner_id: 'p1', step_id: 's1', field_name: 'full_name',
    question_text: 'Nome completo', field_type: 'text', sort_order: 1,
    is_required: false, is_criterion: false,
  } as unknown as PartnerFormField,
  {
    id: 'f2', partner_id: 'p1', step_id: 's2', field_name: 'education',
    question_text: 'Escolaridade', field_type: 'text', sort_order: 1,
    is_required: false, is_criterion: false,
  } as unknown as PartnerFormField,
];

describe('PartnerFormEngine — 9.4.2: onStepIndexChange callback', () => {
  const onSaveDraft = vi.fn(() => Promise.resolve());
  const onSubmitForm = vi.fn(() => Promise.resolve({ success: true }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chama onStepIndexChange(1) ao avançar do Step 1 para o Step 2', async () => {
    const onStepIndexChange = vi.fn();

    render(
      <PartnerFormEngine
        partnerName="Parceiro Teste"
        applicationId="app-1"
        steps={STEPS}
        fields={FIELDS}
        defaultValues={{ full_name: 'Test' }}
        localStorageKey="test_key"
        onSaveDraft={onSaveDraft}
        onSubmitForm={onSubmitForm}
        onStepIndexChange={onStepIndexChange}
      />
    );

    expect(screen.getByText('Identificação')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText(/Próximo/i));
    });

    await waitFor(() => {
      expect(onStepIndexChange).toHaveBeenCalledWith(1);
    });
  });

  it('chama onStepIndexChange(-1) ao entrar na tela de revisão', async () => {
    const onStepIndexChange = vi.fn();
    const singleStep = [STEPS[0]];

    render(
      <PartnerFormEngine
        partnerName="Parceiro Teste"
        applicationId="app-1"
        steps={singleStep}
        fields={[FIELDS[0]]}
        defaultValues={{}}
        localStorageKey="test_key"
        onSaveDraft={onSaveDraft}
        onSubmitForm={onSubmitForm}
        onStepIndexChange={onStepIndexChange}
      />
    );

    // Com 1 step, o botão de avanço é o de Revisão (dois <span> com "Revisar" / "Revisar e Enviar")
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Revisar/i }));
    });

    await waitFor(() => {
      expect(onStepIndexChange).toHaveBeenCalledWith(-1);
    });
  });

  it('chama onStepIndexChange(0) ao voltar do Step 2 para o Step 1', async () => {
    const onStepIndexChange = vi.fn();

    render(
      <PartnerFormEngine
        partnerName="Parceiro Teste"
        applicationId="app-1"
        steps={STEPS}
        fields={FIELDS}
        defaultValues={{}}
        localStorageKey="test_key"
        onSaveDraft={onSaveDraft}
        onSubmitForm={onSubmitForm}
        onStepIndexChange={onStepIndexChange}
      />
    );

    // Avança para step 2
    await act(async () => {
      fireEvent.click(screen.getByText(/Próximo/i));
    });
    await waitFor(() => expect(onStepIndexChange).toHaveBeenCalledWith(1));

    onStepIndexChange.mockClear();

    // Volta para step 1
    await act(async () => {
      fireEvent.click(screen.getByText(/Voltar/i));
    });

    await waitFor(() => {
      expect(onStepIndexChange).toHaveBeenCalledWith(0);
    });
  });

  it('não chama onStepIndexChange quando a prop não é passada (retrocompatibilidade)', async () => {
    // Deve renderizar sem erros mesmo sem a prop
    expect(() => {
      render(
        <PartnerFormEngine
          partnerName="Parceiro"
          applicationId="app-1"
          steps={STEPS}
          fields={FIELDS}
          defaultValues={{}}
          localStorageKey="test_key"
          onSaveDraft={onSaveDraft}
          onSubmitForm={onSubmitForm}
          // onStepIndexChange omitido
        />
      );
    }).not.toThrow();
  });
});
