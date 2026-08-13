'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Instagram, Linkedin } from 'lucide-react';
import { useConsent } from '@/components/consent/ConsentProvider';

export default function Footer() {
  const { reopen } = useConsent();

  return (
    <footer className="w-full bg-[#024F86] text-white py-12 px-6 font-montserrat mt-auto z-20 relative">
      <div className="container mx-auto max-w-[1200px] flex flex-col gap-8">

        {/* Top Section: Logo and Socials */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center">
            <div className="relative h-10 w-40 md:h-12 md:w-48">
              <Image
                src="/assets/logo.png"
                alt="Nubo Educação"
                fill
                className="object-contain brightness-0 invert"
              />
            </div>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-4">
            <a
              href="https://www.instagram.com/nuboeducacao"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Instagram"
            >
              <Instagram size={24} color="white" strokeWidth={1.5} />
            </a>
            <a
              href="https://www.linkedin.com/company/nuboeducacao"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin size={24} color="white" fill="white" strokeWidth={0} />
            </a>
          </div>
        </div>

        <div className="h-px w-full bg-white/20" />

        {/* Middle Section: Disclaimer */}
        <div className="text-[10px] md:text-xs font-light opacity-90 leading-relaxed text-center md:text-left">
          <p>
            O Nubo Conecta é uma ferramenta de orientação. Não é um cursinho, não promete aprovação, não faz inscrições no lugar do estudante e não decide por ele. Ela apoia decisões, não substitui escolhas.
          </p>
        </div>

        {/* Bottom Section: Copyright and Links */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs md:text-sm font-medium opacity-75">
          <p>© 2026 Nubo Educação. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6">
            <Link href="/politica-de-privacidade.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-[#38B1E4] transition-colors">
              Política de Privacidade
            </Link>
            <Link href="/termos-de-uso.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-[#38B1E4] transition-colors">
              Termos de uso
            </Link>
            {/* Revogacao precisa ser tao facil quanto aceitar — LGPD Art. 8o
                paragrafo 5o: procedimento gratuito e facilitado. Dai o link
                permanente, em todas as paginas, com o mesmo peso dos demais. */}
            <button
              type="button"
              onClick={reopen}
              className="hover:text-[#38B1E4] transition-colors underline-offset-2"
            >
              Preferências de cookies
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
