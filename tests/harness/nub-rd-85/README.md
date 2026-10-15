# NUB-RD-85: consentimento × terceiros e eventos de conversão

Testes das regras R1–R5 do TP-7 (decisão humana de 12/10/2026), da revisão 8e95e1f7 (P1: consentimento no instante do evento) e da decisão de 15/10 (ViewContent por abertura), execução `c4ae9058`.
Nenhum deles envia evento a Meta/Google, e nenhum é prova de recebimento no provedor (task 85d).

| Onde | Prova | Não prova |
|---|---|---|
| `tests/components/consent/ConversionEventsContract.test.tsx` (suíte normal, CI) | R1–R5 com o auth-js real em duas "abas" (cookie compartilhado + BroadcastChannel), recarga, foco, submit real do onboarding, Refazer Match, falha de persistência, retry, isolamento, consentimento × eventos, GTM só após opt-in e revogação. P1: consentimento mudando com a RPC em voo (negado→aceito, aceito→negado, revogar→aceitar, outra aba). ViewContent: ciclo de vida real do tracker em StrictMode (uma abertura = um id; revisita/outra oportunidade = outro) | Container real, consent checks das tags, recebimento |
| `tests/ci/compare-test-baseline.test.ts` (CI, passo bloqueante) | O gate de baseline reprova falha nova de asserção, de suíte/hook (inclusive `describe` aninhado), de coleta e erro não tratado, com relatórios controlados e com o vitest real sobre `tests/ci/fixtures/` | — |
| `tests/components/consent/ConsentAndEvents.test.tsx` (suíte normal, CI) | As 16 guardas da auditoria (banner, cookie com versão e data, Consent Mode, revogação, expirado, versão nova, payload sem PII) | Idem |
| `nubo-conecta-admin` `supabase/tests/conversion_event_claims/test.sql` (CI do admin) | A RPC `claim_conversion_event`: elegibilidade, confirmação, uma vez por conta, retry, outra aba, privilégios, RLS, `search_path` | Banco DEV/PROD (aplicação é gate humano) |
| `consent-network.mjs` (CI, job `consent-network-harness`) | O que o NAVEGADOR pede, executa e grava em 9 estados de consentimento, com o app real servido localmente | Tags, triggers e consent checks do container real, e recebimento |

## Travas do harness

- `BASE_URL` só em loopback (`localhost`, `127.0.0.1`, `::1`). Qualquer outro host aborta com exit 2 antes de abrir navegador. **Nunca** apontar para preview ou produção.
- Service Workers bloqueados no contexto.
- A interceptação é instalada no contexto antes da primeira navegação:
  - só a origem do app passa;
  - o `gtm.js` recebe um stub inerte, que só conta execuções;
  - todo o resto é abortado, inclusive WebSocket fora do loopback.
- Cada cenário tem assertions. Exit 1 se algum falhar, exit 3 se estourar o tempo global. Contexto e navegador fecham em `finally`.

## Rodar localmente

```bash
# 1. App local com valores FICTÍCIOS (nunca a configuração real).
#    Se o workspace tiver .env materializado, as variáveis do shell vencem.
NEXT_PUBLIC_GTM_ID=GTM-TESTE00 \
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=harness-fake-key \
NEXT_PUBLIC_CLOUDINHA_URL=http://127.0.0.1:54398 \
npx next dev -p 3123 -H 127.0.0.1

# 2. playwright-core fora do projeto
mkdir /tmp/pw && (cd /tmp/pw && npm init -y && npm i playwright-core@1.56.1)

# 3. Harness (esperado: "9/9 cenários OK", exit 0)
PW_DIR=/tmp/pw CHROME=<caminho do chrome> BASE_URL=http://127.0.0.1:3123 \
  node tests/harness/nub-rd-85/consent-network.mjs

# 4. Contratos e guardas
npx vitest run tests/components/consent
```

## Cenários e resultado esperado

| Cenário | gtm.js pedido | Após recarregar |
|---|---|---|
| ausente | não | — |
| recusado no banner | não | não |
| aceito no banner | sim, depois do `consent update` | sim |
| só análise de uso | sim, com sinais de publicidade `denied` (ponto aberto para decisão humana) | — |
| aceito → revogado pelo rodapé | sim (já tinha executado; não é desfeito), último update `denied` | **não** |
| retorno com aceite salvo | sim | — |
| retorno com recusa salva | não | — |
| nova versão do texto | não | — |
| expirado | não | — |
