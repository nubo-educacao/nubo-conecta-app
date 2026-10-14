#!/usr/bin/env bash
# SNA-RD-207 — confere, ANTES do deploy, que a saída do `vercel build` carrega a
# configuração do ambiente certo e nada do outro.
#
# Uso: verify-build-output.sh <gtm-esperado> <gtm-proibido> <supabase-ref-esperado> <supabase-ref-proibido>
#
# - GTM: procurado em toda a .vercel/output. O id do outro ambiente nunca aparece
#   como dado, então qualquer ocorrência é config errada.
# - Supabase: só nos chunks JS (`_next/static/chunks`), onde o Next embute as
#   NEXT_PUBLIC_*. HTML/RSC pré-renderizado pode citar o storage do outro projeto
#   por DADO (ex.: imagens de parceiros), o que não é configuração.
# Só imprime ids e contagens, que são públicos; nunca chaves.
set -euo pipefail

gtm_ok="$1"; gtm_bad="$2"; sb_ok="$3"; sb_bad="$4"
out=".vercel/output"
chunks="$out/static/_next/static/chunks"

[ -d "$out" ] || { echo "::error::$out não existe: o build não rodou"; exit 1; }
[ -d "$chunks" ] || { echo "::error::$chunks não existe"; exit 1; }

falhas=0
# `grep` sem ocorrência sai com 1; com pipefail isso derrubaria o script em silêncio.
conta() { { grep -rlF "$1" "$2" 2>/dev/null || true; } | wc -l | tr -d ' '; }

n=$(conta "$gtm_ok" "$out");   echo "GTM esperado $gtm_ok: $n arquivo(s)";   [ "$n" -gt 0 ] || { echo "::error::$gtm_ok ausente da saída do build"; falhas=1; }
n=$(conta "$gtm_bad" "$out");  echo "GTM proibido $gtm_bad: $n arquivo(s)";  [ "$n" -eq 0 ] || { echo "::error::$gtm_bad presente na saída do build"; falhas=1; }
n=$(conta "$sb_ok.supabase.co" "$chunks");  echo "Supabase esperado $sb_ok nos chunks: $n"; [ "$n" -gt 0 ] || { echo "::error::$sb_ok ausente dos chunks"; falhas=1; }
n=$(conta "$sb_bad.supabase.co" "$chunks"); echo "Supabase proibido $sb_bad nos chunks: $n"; [ "$n" -eq 0 ] || { echo "::error::$sb_bad presente nos chunks"; falhas=1; }
n=$(conta "sb_secret_" "$chunks");          echo "sb_secret nos chunks: $n"; [ "$n" -eq 0 ] || { echo "::error::chave secreta do Supabase nos chunks"; falhas=1; }

exit "$falhas"
