// BDD E2E Tests — Sprint 1.0: Track C (QA & Automations)
// Card: E2E Test: Validar preenchimento do formulário de Bug gerando Card no Snaps
// Card: E2E Test: Validar preenchimento do formulário de Feature Request
//
// These tests cover the HARD CONTRACT:
//   POST /public/projects/:projectId/cards → 201
//   Response body contains the correct card_type and a valid id.
//
// fetch is mocked globally — no real HTTP calls to Snaps API.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCard, CreateCardRequest } from '../snapsApiService';

// ---------------------------------------------------------------------------
// Shared fetch mock setup
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  // Reset env so the URL is predictable
  process.env.NEXT_PUBLIC_SNAPS_API_URL = 'https://snaps.antigravity.dev';
  process.env.NEXT_PUBLIC_SNAPS_PROJECT_ID = 'test-project-uuid';
  process.env.NEXT_PUBLIC_SNAPS_API_KEY = 'test-api-key';
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helper: build a mock 201 Response
// ---------------------------------------------------------------------------
function make201Response(body: object): Response {
  return new Response(JSON.stringify(body), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Cenário: Bug Report
// ---------------------------------------------------------------------------
describe('Cenário: Bug — POST /public/projects/.../cards com card_type=bug', () => {
  const bugPayload: CreateCardRequest = {
    card_type: 'bug',
    title: '[Bug] Formulário de suporte não submete',
    description: 'Ao clicar em "Enviar", nada acontece.',
    metadata: {
      title: '[Bug] Formulário de suporte não submete',
      description: 'Ao clicar em "Enviar", nada acontece.',
      environment: 'production',
      steps_to_reproduce: '1. Abrir /suporte\n2. Preencher formulário\n3. Clicar em Enviar',
      expected_behavior: 'Modal fecha e card aparece no board Snaps',
      actual_behavior: 'Nada acontece — sem feedback visual',
      severity: 'high',
    },
  };

  it('Given: unified UI and Snaps client are configured — When: E2E test submits a valid Bug report — Then: backend returns 201', async () => {
    // Arrange
    const responseBody = {
      id: 'card-uuid-bug-001',
      card_type: 'bug',
      title: bugPayload.title,
      status: 'todo',
      created_at: '2026-05-05T12:00:00Z',
    };
    mockFetch.mockResolvedValueOnce(make201Response(responseBody));

    // Act
    const result = await createCard(bugPayload);

    // Assert: request hit the correct endpoint
    expect(mockFetch).toHaveBeenCalledOnce();
    const [calledUrl, calledOptions] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe(
      'https://snaps.antigravity.dev/public/projects/test-project-uuid/cards',
    );
    expect(calledOptions.method).toBe('POST');

    // Assert: authorization header present
    const headers = calledOptions.headers as Record<string, string>;
    expect(headers['X-API-Key']).toBe('test-api-key');
    expect(headers['Content-Type']).toBe('application/json');

    // Assert: payload body carries the correct card_type
    const body = JSON.parse(calledOptions.body as string) as CreateCardRequest;
    expect(body.card_type).toBe('bug');

    // Assert: response resolves with the new card id
    expect(result.id).toBe('card-uuid-bug-001');
    expect(result.card_type).toBe('bug');
  });

  it('And: the Card must appear in Snaps DB with type "bug" — response carries card_type=bug', async () => {
    const responseBody = {
      id: 'card-uuid-bug-002',
      card_type: 'bug',
      title: bugPayload.title,
      status: 'todo',
      created_at: '2026-05-05T12:00:00Z',
    };
    mockFetch.mockResolvedValueOnce(make201Response(responseBody));

    const result = await createCard(bugPayload);

    expect(result.card_type).toBe('bug');
    expect(result.id).toBeTruthy();
  });

  it('And: description must contain the structured RCA payload — body is serialized correctly', async () => {
    mockFetch.mockResolvedValueOnce(
      make201Response({ id: 'x', card_type: 'bug', title: '', status: 'todo', created_at: '' }),
    );

    await createCard(bugPayload);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as CreateCardRequest;
    const meta = body.metadata as { steps_to_reproduce: string; severity: string };

    expect(meta.steps_to_reproduce).toContain('/suporte');
    expect(meta.severity).toBe('high');
  });

  it('Negative contract: throws when API returns non-2xx status', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('{"error":"Unauthorized"}', { status: 401 }),
    );

    await expect(createCard(bugPayload)).rejects.toThrow(
      'snapsApiService.createCard: request failed with status 401',
    );
  });
});

// ---------------------------------------------------------------------------
// Cenário: Feature Request
// ---------------------------------------------------------------------------
describe('Cenário: Feature Request — POST /public/projects/.../cards com card_type=feature', () => {
  const featurePayload: CreateCardRequest = {
    card_type: 'feature',
    title: '[Melhoria] Adicionar filtro por modalidade de bolsa',
    description: 'Usuários precisam filtrar oportunidades por Prouni/Sisu/FIES.',
    metadata: {
      title: '[Melhoria] Adicionar filtro por modalidade de bolsa',
      description: 'Usuários precisam filtrar oportunidades por Prouni/Sisu/FIES.',
      pain_point: 'Sem filtro de modalidade, o usuário visualiza oportunidades irrelevantes.',
      expected_impact: 'Redução de 30% no tempo de busca por oportunidade elegível.',
      priority: 'high',
    },
  };

  it('Given: unified UI and Snaps client — When: E2E test submits valid Feature Request — Then: backend returns 201', async () => {
    const responseBody = {
      id: 'card-uuid-feature-001',
      card_type: 'feature',
      title: featurePayload.title,
      status: 'todo',
      created_at: '2026-05-05T12:00:00Z',
    };
    mockFetch.mockResolvedValueOnce(make201Response(responseBody));

    const result = await createCard(featurePayload);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [calledUrl] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe(
      'https://snaps.antigravity.dev/public/projects/test-project-uuid/cards',
    );

    expect(result.id).toBe('card-uuid-feature-001');
    expect(result.card_type).toBe('feature');
  });

  it('And: the Card must appear in Snaps DB with type "feature" — response carries card_type=feature', async () => {
    mockFetch.mockResolvedValueOnce(
      make201Response({
        id: 'card-uuid-feature-002',
        card_type: 'feature',
        title: featurePayload.title,
        status: 'todo',
        created_at: '2026-05-05T12:00:00Z',
      }),
    );

    const result = await createCard(featurePayload);

    expect(result.card_type).toBe('feature');
    expect(result.id).toBeTruthy();
  });

  it('And: request body encodes pain_point and expected_impact fields', async () => {
    mockFetch.mockResolvedValueOnce(
      make201Response({ id: 'y', card_type: 'feature', title: '', status: 'todo', created_at: '' }),
    );

    await createCard(featurePayload);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as CreateCardRequest;
    const meta = body.metadata as { pain_point: string; expected_impact: string };

    expect(meta.pain_point).toBeTruthy();
    expect(meta.expected_impact).toContain('30%');
  });

  it('Negative contract: throws when API returns 422 (invalid payload)', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('{"error":"Validation failed"}', { status: 422 }),
    );

    await expect(createCard(featurePayload)).rejects.toThrow(
      'snapsApiService.createCard: request failed with status 422',
    );
  });
});
