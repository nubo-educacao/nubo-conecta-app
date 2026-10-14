#!/usr/bin/env node
/**
 * SNA-RD-207 — transforma o arquivo resgatado do Snaps (materialização OIDC) em
 * variáveis de ambiente do job, sem nunca imprimir valor.
 *
 * Uso no workflow:  node scripts/ci/materialize-env.mjs <arquivo-resgatado>
 *   stdout: uma linha `::add-mask::<valor>` por valor (o runner consome e oculta)
 *           e depois só os NOMES das chaves.
 *   efeito: acrescenta as variáveis a $GITHUB_ENV, para os passos seguintes.
 *
 * Por que $GITHUB_ENV e não um .env: o Next expande `$VAR` dentro de arquivos
 * .env (dotenv-expand), mas nunca em variável que já está no ambiente do processo.
 */
import { randomBytes } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CHAVE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const NOME_DE_SEGREDO = /(SECRET|SERVICE_ROLE|PRIVATE|TOKEN|PASSWORD|_API_KEY)/;

/** Lê o formato do snaps-api (`_linha`): valor cru ou entre aspas simples. */
export function parseStackEnv(conteudo) {
  const valores = {};
  conteudo.split(/\r?\n/).forEach((linha, i) => {
    if (linha.trim() === '') return;
    const igual = linha.indexOf('=');
    const chave = igual > 0 ? linha.slice(0, igual) : '';
    if (!CHAVE.test(chave)) {
      throw new Error(`arquivo resgatado fora do contrato na linha ${i + 1}`);
    }
    let valor = linha.slice(igual + 1);
    if (valor.length >= 2 && valor.startsWith("'") && valor.endsWith("'")) {
      valor = valor.slice(1, -1);
    }
    valores[chave] = valor;
  });
  if (Object.keys(valores).length === 0) {
    throw new Error('arquivo resgatado vazio: o environment do Snaps não tem chaves');
  }
  return valores;
}

/** NEXT_PUBLIC_* vai para o bundle público: nome de segredo ali é erro. */
export function chavesSuspeitas(chaves) {
  return chaves.filter((c) => c.startsWith('NEXT_PUBLIC_') && NOME_DE_SEGREDO.test(c));
}

export function linhasDeMascara(valores) {
  return Object.values(valores)
    .filter((v) => v !== '')
    .map((v) => `::add-mask::${v}`);
}

export function paraGithubEnv(valores, delimitador) {
  return Object.entries(valores)
    .map(([chave, valor]) => {
      if (valor.includes(delimitador)) {
        throw new Error(`valor de ${chave} contém o delimitador do heredoc`);
      }
      return `${chave}<<${delimitador}\n${valor}\n${delimitador}\n`;
    })
    .join('');
}

export function materializar(conteudo, delimitador = `SNAPS_${randomBytes(16).toString('hex')}`) {
  const valores = parseStackEnv(conteudo);
  const chaves = Object.keys(valores).sort();
  const suspeitas = chavesSuspeitas(chaves);
  if (suspeitas.length > 0) {
    throw new Error(
      `chave(s) públicas com nome de segredo, que iriam para o bundle: ${suspeitas.join(', ')}`,
    );
  }
  return {
    chaves,
    mascaras: linhasDeMascara(valores),
    githubEnv: paraGithubEnv(valores, delimitador),
  };
}

function principal() {
  const [arquivo] = process.argv.slice(2);
  const destino = process.env.GITHUB_ENV;
  if (!arquivo || !destino) {
    console.error('uso: materialize-env.mjs <arquivo>  (com GITHUB_ENV definido)');
    process.exit(2);
  }
  try {
    const r = materializar(readFileSync(arquivo, 'utf8'));
    // As máscaras saem ANTES de qualquer outra coisa que possa citar um valor.
    for (const m of r.mascaras) console.log(m);
    appendFileSync(destino, r.githubEnv, { mode: 0o600 });
    console.log(`config do Snaps materializada: ${r.chaves.length} chave(s): ${r.chaves.join(', ')}`);
  } catch (erro) {
    console.error(`::error::${erro.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  principal();
}
