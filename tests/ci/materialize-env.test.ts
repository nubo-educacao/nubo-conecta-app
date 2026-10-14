/**
 * SNA-RD-207 — o build do app recebe a configuração do Snaps (materialização
 * OIDC → bilhete → resgate) e não das variáveis da Vercel.
 *
 * Contrato do arquivo resgatado (snaps-api services/materializacao.py `_linha`):
 * valor simples vai cru; qualquer outro vai entre aspas simples, sem
 * interpolação; aspas simples e quebra de linha nunca aparecem num valor.
 */
import { describe, expect, it } from 'vitest';
import {
  chavesSuspeitas,
  linhasDeMascara,
  materializar,
  paraGithubEnv,
  parseStackEnv,
} from '../../scripts/ci/materialize-env.mjs';

const ARQUIVO = [
  'NEXT_PUBLIC_SUPABASE_URL=https://yfgciamhzjvarwgzosto.supabase.co',
  "NEXT_PUBLIC_GTM_ID=GTM-WKQW5RN9",
  "COM_ESPACO='valor com espaco e $VAR # nao e comentario'",
  '',
].join('\n');

describe('parseStackEnv', () => {
  it('lê valor cru e valor entre aspas simples sem alterar nada', () => {
    expect(parseStackEnv(ARQUIVO)).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: 'https://yfgciamhzjvarwgzosto.supabase.co',
      NEXT_PUBLIC_GTM_ID: 'GTM-WKQW5RN9',
      COM_ESPACO: 'valor com espaco e $VAR # nao e comentario',
    });
  });

  it('recusa linha fora do contrato citando só o número da linha, nunca o conteúdo', () => {
    expect(() => parseStackEnv('SEM_IGUAL_sentinela')).toThrow(/linha 1/);
    expect(() => parseStackEnv('SEM_IGUAL_sentinela')).not.toThrow(/sentinela/);
  });

  it('recusa arquivo vazio: environment sem chaves não pode virar build silencioso', () => {
    expect(() => parseStackEnv('\n')).toThrow(/vazio/);
  });
});

describe('chavesSuspeitas', () => {
  it('aponta NEXT_PUBLIC_* com nome de segredo, porque iria para o bundle público', () => {
    expect(
      chavesSuspeitas([
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'NEXT_PUBLIC_SNAPS_API_KEY',
        'NEXT_PUBLIC_SERVICE_ROLE',
        'NEXT_PUBLIC_X_SECRET',
        'NEXT_PUBLIC_GH_TOKEN',
        'NEXT_PUBLIC_DB_PASSWORD',
        'NEXT_PUBLIC_PRIVATE_URL',
        'SUPABASE_SERVICE_KEY',
      ]),
    ).toEqual([
      'NEXT_PUBLIC_SNAPS_API_KEY',
      'NEXT_PUBLIC_SERVICE_ROLE',
      'NEXT_PUBLIC_X_SECRET',
      'NEXT_PUBLIC_GH_TOKEN',
      'NEXT_PUBLIC_DB_PASSWORD',
      'NEXT_PUBLIC_PRIVATE_URL',
    ]);
  });

  it('a anon key pública do Supabase é permitida (é publicável por desenho)', () => {
    expect(chavesSuspeitas(['NEXT_PUBLIC_SUPABASE_ANON_KEY'])).toEqual([]);
  });
});

describe('linhasDeMascara', () => {
  it('emite ::add-mask:: para todo valor não vazio', () => {
    expect(linhasDeMascara({ A: 'x1', B: '', C: 'valor com espaco' })).toEqual([
      '::add-mask::x1',
      '::add-mask::valor com espaco',
    ]);
  });
});

describe('paraGithubEnv', () => {
  // Vai para $GITHUB_ENV (ambiente do processo), não para um .env: o Next expande
  // `$VAR` dentro de arquivos .env (dotenv-expand), mas nunca em variável que já
  // está no ambiente do processo.
  it('usa heredoc com delimitador aleatório, preservando $, # e espaço', () => {
    expect(paraGithubEnv({ A: 'simples', B: 'com $VAR e # e espaço' }, 'DELIM_x')).toBe(
      'A<<DELIM_x\nsimples\nDELIM_x\nB<<DELIM_x\ncom $VAR e # e espaço\nDELIM_x\n',
    );
  });

  it('recusa se algum valor contiver o delimitador', () => {
    expect(() => paraGithubEnv({ A: 'tem DELIM_x dentro' }, 'DELIM_x')).toThrow(/A/);
  });
});

describe('materializar', () => {
  it('recusa o build quando há chave pública com nome de segredo, citando só os nomes', () => {
    const arquivo = 'NEXT_PUBLIC_SNAPS_API_KEY=valor-sentinela\nNEXT_PUBLIC_GTM_ID=GTM-X\n';
    expect(() => materializar(arquivo)).toThrow(/NEXT_PUBLIC_SNAPS_API_KEY/);
    expect(() => materializar(arquivo)).not.toThrow(/valor-sentinela/);
  });

  it('devolve máscaras, o bloco de $GITHUB_ENV e só os NOMES para o log', () => {
    const r = materializar(ARQUIVO, 'DELIM_y');
    expect(r.chaves).toEqual(['COM_ESPACO', 'NEXT_PUBLIC_GTM_ID', 'NEXT_PUBLIC_SUPABASE_URL']);
    expect(r.mascaras).toHaveLength(3);
    expect(r.githubEnv).toContain('NEXT_PUBLIC_GTM_ID<<DELIM_y\nGTM-WKQW5RN9\nDELIM_y\n');
  });
});
