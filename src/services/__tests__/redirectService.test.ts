// TDD — Wave 3: trackAndRedirect service tests.
// Verifies the HARD CONTRACT: INSERT must be called BEFORE the URL is returned.
// Uses vi.mock to intercept @supabase/ssr and next/headers — no real DB connection.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock next/headers (Server Action environment) ---
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    setAll: () => {},
  }),
}));

// --- Mock @supabase/ssr ---
const mockInsert = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Import AFTER mocks are set up
import { trackAndRedirect } from '../redirectService';

describe('trackAndRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls INSERT before returning the URL (happy path)', async () => {
    // Arrange: simulate successful INSERT
    mockInsert.mockResolvedValueOnce({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    // Act
    const result = await trackAndRedirect(
      'user-uuid-001',
      'institution-uuid-001',
      'https://example.com/apply',
      'catalog_card',
    );

    // Assert: INSERT was called exactly once with the correct payload
    expect(mockFrom).toHaveBeenCalledWith('external_redirect_clicks');
    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockInsert).toHaveBeenCalledWith({
      user_id:      'user-uuid-001',
      partner_id:   'institution-uuid-001',
      redirect_url: 'https://example.com/apply',
      source:       'catalog_card',
    });

    // Assert: URL returned only after INSERT
    expect(result.url).toBe('https://example.com/apply');
  });

  it('throws and does NOT return URL when INSERT fails', async () => {
    // Arrange: simulate INSERT failure
    mockInsert.mockResolvedValueOnce({ error: { message: 'RLS violation' } });
    mockFrom.mockReturnValue({ insert: mockInsert });

    // Act & Assert: must throw, never resolve with URL
    await expect(
      trackAndRedirect(
        'user-uuid-002',
        null,
        'https://example.com/apply',
        'opportunity_detail',
      ),
    ).rejects.toThrow('trackAndRedirect: failed to record click');

    // INSERT was called (we attempted tracking)
    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it('accepts null partnerId for non-partner (MEC) opportunities', async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const result = await trackAndRedirect(
      'user-uuid-003',
      null,                              // null partnerId — MEC opportunity
      'https://sisu.mec.gov.br',
      'mec_opportunity',
    );

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ partner_id: null }),
    );
    expect(result.url).toBe('https://sisu.mec.gov.br');
  });
});
