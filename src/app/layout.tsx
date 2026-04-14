import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import CloudBackground from "@/components/CloudBackground";
import ChatFAB from "@/components/chat/ChatFAB";
import GlobalAuthModal from "@/components/auth/GlobalAuthModal";

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
      <body className={`${montserrat.className} relative min-h-screen overflow-x-hidden`}>
        <CloudBackground />
        <AuthProvider>
          <div className="relative z-10 min-h-screen">
            {children}
          </div>
          <ChatFAB />
          <GlobalAuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
