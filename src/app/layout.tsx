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
        {/* Meta Pixel Code */}
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1405301394597111');
fbq('track', 'PageView');
            `,
          }}
        />

        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1405301394597111&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {/* End Meta Pixel Code */}
      </head>
      <body className={`${montserrat.className} relative min-h-screen overflow-x-hidden`}>
        <CloudBackground />
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
      </body>
    </html>
  );
}
