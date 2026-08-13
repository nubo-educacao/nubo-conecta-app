import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import CloudBackground from "@/components/CloudBackground";
import ChatFAB from "@/components/chat/ChatFAB";
import GlobalAuthModal from "@/components/auth/GlobalAuthModal";
import Script from "next/script";
import Footer from "@/components/layout/Footer";
import { ConsentProvider } from "@/components/consent/ConsentProvider";
import ConsentBanner from "@/components/consent/ConsentBanner";
import { GTM_CONTAINER_ID } from "@/lib/analytics";

const montserrat = Montserrat({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nubo Conecta | Seu guia para as melhores oportunidades educacionais",
  description: "O Nubo Conecta estudantes a oportunidades reais de educação. Encontre bolsas de estudo, programas educacionais e caminhos para ingressar na universidade.",
  keywords: [
    "ENEM",
    "nota do ENEM",
    "acesso ao ensino superior",
    "entrar na faculdade",
    "como entrar na universidade",
    "SISU",
    "simulador SISU",
    "nota de corte",
    "minha nota passa",
    "estratégia SISU",
    "lista de espera SISU",
    "vagas SISU",
    "ProUni",
    "bolsa ProUni",
    "bolsa de estudo faculdade",
    "bolsas de estudo",
    "oportunidades educacionais",
    "programas para estudantes",
    "oportunidades para ensino médio",
    "plataforma de bolsas",
    "programas educacionais",
    "iniciativas educacionais",
    "institutos educacionais",
    "projetos para estudantes",
    "processo seletivo estudante",
    "inscrição programa educacional",
    "inscrição bolsa de estudo",
    "seleção para estudantes",
    "orientação educacional",
    "planejamento para faculdade",
    "escolher curso",
    "escolher faculdade",
    "Nubo Conecta",
    "Cloudinha",
    "Nubo Educação",
    "plataforma gratuita para estudantes"
  ],
  icons: {
    icon: "/assets/cloudinha.jpeg",
    shortcut: "/assets/cloudinha.jpeg",
    apple: "/assets/cloudinha.jpeg",
  },
  openGraph: {
    title: "Nubo Conecta | Seu guia para as melhores oportunidades educacionais",
    description: "O Nubo Conecta estudantes a oportunidades reais de educação. Encontre bolsas de estudo, programas educacionais e caminhos para ingressar na universidade.",
    type: "website",
    locale: "pt_BR",
    siteName: "Nubo Conecta",
    images: [
      {
        url: "/assets/cloudinha.jpeg",
        width: 512,
        height: 512,
        alt: "Cloudinha - Assistente de Educação do Nubo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Nubo Conecta | Seu guia para as melhores oportunidades educacionais",
    description: "O Nubo Conecta estudantes a oportunidades reais de educação. Encontre bolsas de estudo, programas educacionais e caminhos para ingressar na universidade.",
    images: ["/assets/cloudinha.jpeg"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/*
          Consent Mode v2 — TP-7 7A task 2.

          Roda ANTES do GTM, de propósito e sem exceção: o container carrega
          tags de publicidade, e se o estado padrão não estiver declarado como
          negado quando ele sobe, a tag dispara antes de qualquer decisão do
          titular. É exatamente o problema que este bloco existe para impedir.

          `beforeInteractive` garante a ordem. Não trocar por `afterInteractive`.
        */}
        <Script id="consent-default" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              analytics_storage: 'denied',
              functionality_storage: 'granted',
              security_storage: 'granted',
              wait_for_update: 500
            });
          `}
        </Script>

        {/*
          Google Tag Manager. O ID vem de variável de ambiente — foi hardcode
          que transformou o pixel numa string presa no layout, impossível de
          trocar sem deploy.

          O Meta Pixel NÃO está mais aqui: passou a ser tag dentro do container,
          com Additional Consent Check exigindo `ad_storage`.
        */}
        {GTM_CONTAINER_ID && (
          <Script id="gtm" strategy="afterInteractive">
            {`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');
            `}
          </Script>
        )}
      </head>
      <body className={`${montserrat.className} relative min-h-screen overflow-x-hidden`}>
        {GTM_CONTAINER_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        <CloudBackground />
        <ConsentProvider>
        <AuthProvider>
          <ProfileProvider>
            <FavoritesProvider>
              <div className="relative z-10 min-h-screen flex flex-col">
                <main className="flex-grow">
                  {children}
                </main>
                <Footer />
              </div>
              <ChatFAB />
              <GlobalAuthModal />
            </FavoritesProvider>
          </ProfileProvider>
        </AuthProvider>
        <ConsentBanner />
        </ConsentProvider>
      </body>
    </html>
  );
}
