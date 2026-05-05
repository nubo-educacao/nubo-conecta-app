// snapsApiService — Sprint 1.0: Integração Frontend & Unificação
// Client for the Snaps public API. Used by BugReportForm and FeatureRequestForm
// to create cards on the Snaps board.

export type CardType = 'bug' | 'feature';

export interface BugPayload {
  title: string;
  description: string;
  environment: string;
  steps_to_reproduce: string;
  expected_behavior: string;
  actual_behavior: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface FeaturePayload {
  title: string;
  description: string;
  pain_point: string;
  expected_impact: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface CreateCardRequest {
  card_type: CardType;
  title: string;
  description: string;
  metadata: BugPayload | FeaturePayload;
}

export interface CreateCardResponse {
  id: string;
  card_type: CardType;
  title: string;
  status: string;
  created_at: string;
}

export async function createCard(
  payload: CreateCardRequest,
): Promise<CreateCardResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_SNAPS_API_URL ?? 'https://snaps.antigravity.dev';
  const projectId = process.env.NEXT_PUBLIC_SNAPS_PROJECT_ID ?? '';
  const apiKey = process.env.NEXT_PUBLIC_SNAPS_API_KEY ?? '';

  const url = `${baseUrl}/public/projects/${projectId}/cards`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`snapsApiService.createCard: request failed with status ${response.status}`);
  }

  return response.json() as Promise<CreateCardResponse>;
}
