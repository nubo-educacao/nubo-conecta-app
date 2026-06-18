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

const montserrat = Montserrat({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nubo Conecta",
  description: "Sua ponte para oportunidades educacionais",
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
fbq('init', '1502097244983778');
fbq('track', 'PageView');
            `,
          }}
        />

        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1502097244983778&ev=PageView&noscript=1"
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
              <div className="relative z-10 min-h-screen">
                {children}
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
