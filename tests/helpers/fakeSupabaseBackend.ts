// NUB-RD-85 — backend Supabase em memória para os contratos de conversão.
//
// Atende o `fetch` dos clientes REAIS (@supabase/ssr + auth-js + postgrest-js):
// os testes exercitam o ciclo de sessão de verdade (verifyOtp → SIGNED_IN,
// BroadcastChannel entre abas, nova página → INITIAL_SESSION, updateUser),
// sem nenhuma requisição sair do processo.
//
// A semântica de `claim_conversion_event` espelha a migration
// nubo-conecta-admin 20261015140000_conversion_event_claims.sql, que tem teste
// SQL próprio. Aqui ela só serve de servidor para o app.

export const FAKE_SUPABASE_URL = 'http://127.0.0.1:54399';
export const FAKE_ANON_KEY = 'fake-anon-key-for-tests';

interface FakeUser {
    id: string;
    phone: string;
    createdAfterCutover: boolean;
    confirmed: boolean;
    metadata: Record<string, unknown>;
}

interface Claim {
    eventId: string;
    eligible: boolean;
    claimedAt: number | null;
    requestId: string | null;
}

export interface ClaimCall {
    userId: string;
    kind: string;
    requestId: string;
    result: Array<{ event_id: string; should_emit: boolean }>;
}

function b64url(obj: unknown) {
    return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

export function createFakeSupabaseBackend() {
    const users = new Map<string, FakeUser>();
    const tokens = new Map<string, string>(); // access_token → userId
    const claims = new Map<string, Claim>(); // `${userId}:${kind}`
    const claimCalls: ClaimCall[] = [];
    const unexpected: string[] = [];
    let seq = 0;

    /** Próximas N chamadas à RPC: o servidor COMITA e a resposta se perde. */
    let dropClaimResponses = 0;
    /** Próximo updateUser falha (persistência do onboarding). */
    let failNextUpdateUser = false;

    function newUuid() {
        return globalThis.crypto.randomUUID();
    }

    function addUser(opts: { id: string; phone: string; createdAfterCutover: boolean; confirmed?: boolean; metadata?: Record<string, unknown> }) {
        const user: FakeUser = {
            id: opts.id,
            phone: opts.phone,
            createdAfterCutover: opts.createdAfterCutover,
            confirmed: opts.confirmed ?? false,
            metadata: opts.metadata ?? {},
        };
        users.set(user.id, user);
        // Trigger on_auth_user_created_lead_eligibility: só contas novas.
        if (user.createdAfterCutover) {
            claims.set(`${user.id}:lead`, { eventId: newUuid(), eligible: true, claimedAt: null, requestId: null });
        }
        return user;
    }

    function publicUser(u: FakeUser) {
        return {
            id: u.id,
            aud: 'authenticated',
            role: 'authenticated',
            phone: u.phone,
            phone_confirmed_at: u.confirmed ? '2026-10-15T12:00:00.000Z' : null,
            created_at: '2026-10-15T12:00:00.000Z',
            app_metadata: { provider: 'phone' },
            user_metadata: u.metadata,
            identities: [],
        };
    }

    function issueSession(u: FakeUser) {
        seq += 1;
        const exp = Math.floor(Date.now() / 1000) + 3600;
        const accessToken = [
            b64url({ alg: 'HS256', typ: 'JWT' }),
            b64url({ sub: u.id, role: 'authenticated', aud: 'authenticated', exp, session_id: `s${seq}` }),
            'sig',
        ].join('.');
        tokens.set(accessToken, u.id);
        return {
            access_token: accessToken,
            token_type: 'bearer',
            expires_in: 3600,
            expires_at: exp,
            refresh_token: `refresh-${seq}`,
            user: publicUser(u),
        };
    }

    function userFromAuth(headers: Headers): FakeUser | null {
        const auth = headers.get('authorization') ?? '';
        const token = auth.replace(/^Bearer\s+/i, '');
        const id = tokens.get(token);
        return id ? users.get(id) ?? null : null;
    }

    function claim(user: FakeUser, kind: string, requestId: string) {
        const key = `${user.id}:${kind}`;
        if (kind === 'lead') {
            if (!user.confirmed) return [];
            const c = claims.get(key);
            if (c && c.eligible && c.claimedAt === null) {
                c.claimedAt = Date.now();
                c.requestId = requestId;
                return [{ event_id: c.eventId, should_emit: true }];
            }
        } else if (kind === 'complete_registration') {
            if (user.metadata.onboarding_completed !== true) return [];
            if (!claims.has(key)) {
                const c = { eventId: newUuid(), eligible: true, claimedAt: Date.now(), requestId };
                claims.set(key, c);
                return [{ event_id: c.eventId, should_emit: true }];
            }
        } else {
            throw new Error(`kind inválido: ${kind}`);
        }
        const c = claims.get(key);
        if (c && c.claimedAt !== null) return [{ event_id: c.eventId, should_emit: c.requestId === requestId }];
        return [];
    }

    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const req = new Request(input, init);
        const url = new URL(req.url);
        if (url.origin !== FAKE_SUPABASE_URL) {
            unexpected.push(req.url);
            throw new TypeError(`fake backend: host não permitido ${url.origin}`);
        }
        const body = req.method === 'GET' || req.method === 'HEAD' ? null : await req.text();
        const data = body ? JSON.parse(body) : {};
        const path = url.pathname;

        if (path === '/auth/v1/otp' && req.method === 'POST') {
            const existing = [...users.values()].find((u) => u.phone === data.phone);
            if (!existing) addUser({ id: newUuid(), phone: data.phone, createdAfterCutover: true });
            return json(200, {});
        }
        if (path === '/auth/v1/verify' && req.method === 'POST') {
            const u = [...users.values()].find((x) => x.phone === data.phone);
            if (!u || data.token !== '123456') return json(400, { error: 'invalid_grant', error_description: 'Token inválido' });
            u.confirmed = true;
            return json(200, issueSession(u));
        }
        if (path === '/auth/v1/user' && req.method === 'GET') {
            const u = userFromAuth(req.headers);
            return u ? json(200, publicUser(u)) : json(401, { msg: 'invalid JWT' });
        }
        if (path === '/auth/v1/user' && req.method === 'PUT') {
            const u = userFromAuth(req.headers);
            if (!u) return json(401, { msg: 'invalid JWT' });
            if (failNextUpdateUser) {
                failNextUpdateUser = false;
                return json(500, { msg: 'falha simulada de persistência' });
            }
            u.metadata = { ...u.metadata, ...(data.data ?? {}) };
            return json(200, publicUser(u));
        }
        if (path === '/auth/v1/logout') return new Response(null, { status: 204 });
        if (path === '/rest/v1/rpc/claim_conversion_event' && req.method === 'POST') {
            const u = userFromAuth(req.headers);
            if (!u) return json(401, { code: '42501', message: 'requer sessão autenticada' });
            const result = claim(u, data.p_kind, data.p_request_id);
            claimCalls.push({ userId: u.id, kind: data.p_kind, requestId: data.p_request_id, result });
            if (dropClaimResponses > 0) {
                dropClaimResponses -= 1;
                throw new TypeError('fake backend: conexão caiu depois do commit');
            }
            return json(200, result);
        }

        unexpected.push(`${req.method} ${path}`);
        return json(404, { message: `fake backend: rota não modelada ${req.method} ${path}` });
    };

    return {
        fetch: fetchImpl,
        addUser,
        users,
        claims,
        claimCalls,
        unexpected,
        dropNextClaimResponses(n: number) {
            dropClaimResponses = n;
        },
        failNextUpdateUser() {
            failNextUpdateUser = true;
        },
    };
}

export type FakeSupabaseBackend = ReturnType<typeof createFakeSupabaseBackend>;
