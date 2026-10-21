# Harness NUB-RD-85: consentimento × terceiros

Este é o roteiro local da auditoria GTM/consentimento do TP-7, feita na execução `67b5deb8`. Nada aqui roda no `pnpm test`, e nada aqui é dependência do app.

| Arquivo | Prova | Não prova |
|---|---|---|
| `tests/components/consent/ConsentAndEvents.test.tsx` | Mecanismo em jsdom: banner, cookie com versão e data, updates do Consent Mode, revogação, versão nova, e o que já está certo no Lead e no ViewContent | Nada sobre o container nem sobre o provedor |
| `tests/reproducers/nub_rd_85_gtm_consent.test.tsx` | Desvios RED R1–R5, que falham de propósito | Decisão sobre como corrigir |
| `consent-network.mjs` | Quais hosts de terceiros o navegador pede em cada estado de consentimento, com o app real servido localmente | Tags, triggers e consent checks do container real, e recebimento em Meta/Google |

## Como rodar

```bash
# 1. App local com GTM fictício. Supabase e Cloudinha apontam para portas mortas.
NEXT_PUBLIC_GTM_ID=GTM-TESTE00 \
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=harness-fake-key \
NEXT_PUBLIC_CLOUDINHA_URL=http://127.0.0.1:54398 \
npx next dev -p 3123

# 2. playwright-core fora do projeto, em uma pasta qualquer
mkdir /tmp/pw && (cd /tmp/pw && npm init -y && npm i playwright-core@1.56.1)

# 3. Harness
PW_DIR=/tmp/pw CHROME=<caminho do chrome/chromium> BASE_URL=http://localhost:3123 \
  node tests/harness/nub-rd-85/consent-network.mjs

# 4. Reproducers (RED esperado)
npx vitest run --config vitest.reproducers.config.ts tests/reproducers/nub_rd_85_gtm_consent.test.tsx
```

A interceptação é instalada no contexto do navegador antes da primeira navegação. O `gtm.js` recebe um stub inerte, e toda outra requisição a host que não seja o app local é abortada.
