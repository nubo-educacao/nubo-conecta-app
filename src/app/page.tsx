"use client";

import { useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/layout/AppShell";
import AuthModal from "@/components/auth/AuthModal";

export default function HomePage() {
  const { user, showAuthModal, setShowAuthModal } = useAuth();

  return (
    <>
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <h1 className="text-2xl font-bold text-nubo-text-primary mb-2">
            Bem-vindo ao Nubo Conecta
          </h1>
          <p className="text-nubo-text-secondary text-center">
            Sua ponte para oportunidades educacionais.
          </p>
          {!user && (
            <button
              onClick={() => setShowAuthModal(true)}
              className="mt-6 px-6 py-3 bg-nubo-primary text-white rounded-xl font-medium"
            >
              Entrar
            </button>
          )}
        </div>
      </AppShell>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  );
}
