"use client";

// GlobalAuthModal — Sprint 3.5
// Wrapper client-side que lê showAuthModal do AuthContext e renderiza <AuthModal>.
// Deve ser montado dentro de <AuthProvider> no layout raiz.
// A lógica de fechamento automático pós-login já está em AuthContext (onAuthStateChange).

import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "./AuthModal";

export default function GlobalAuthModal() {
  const { showAuthModal, setShowAuthModal } = useAuth();
  if (!showAuthModal) return null;
  return <AuthModal onClose={() => setShowAuthModal(false)} />;
}
