// Termos de Uso — BUG-002
// Rota pública (sem auth requerida). Placeholder enquanto o conteúdo jurídico é finalizado.

import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Termos de Uso — Nubo Conecta' };

export default function TermosPage() {
  return (
    <AppShell title="Termos de Uso">
      <div className="flex flex-col gap-6 px-4 pt-6 pb-8 max-w-2xl mx-auto w-full">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold w-fit"
          style={{ color: '#38B1E4', fontFamily: 'Montserrat, sans-serif' }}
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>

        <div className="flex flex-col gap-4">
          <h1
            className="font-bold text-[22px]"
            style={{ color: '#3A424E', fontFamily: 'Montserrat, sans-serif' }}
          >
            Termos de Uso
          </h1>

          <div
            className="rounded-2xl p-6"
            style={{
              background: 'rgba(56,177,228,0.06)',
              border: '1px solid rgba(56,177,228,0.15)',
            }}
          >
            <p
              className="text-[14px] leading-relaxed"
              style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
            >
              Os Termos de Uso do Nubo Conecta estão sendo finalizados pela nossa equipe jurídica.
              Em breve este espaço será atualizado com todas as informações sobre o uso da plataforma,
              direitos e obrigações dos usuários.
            </p>
            <p
              className="text-[14px] leading-relaxed mt-4"
              style={{ color: '#636e7c', fontFamily: 'Montserrat, sans-serif' }}
            >
              Para dúvidas, entre em contato: <span style={{ color: '#38B1E4' }}>contato@nuboconecta.com.br</span>
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
