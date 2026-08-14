"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { attachAttribution } from "@/services/attributionService";
import { trackLead } from "@/lib/analytics";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authMode: 'LOGIN' | 'UPDATE_PHONE';
  openAuthModal: (mode?: 'LOGIN' | 'UPDATE_PHONE') => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'UPDATE_PHONE'>('LOGIN');
  const initialized = useRef(false);
  // Guarda os usuários cuja atribuição já foi costurada nesta sessão de página.
  // onAuthStateChange dispara também em refresh de token e ao voltar para a
  // aba; sem isto, cada foco de janela viraria uma ida ao banco.
  const attributed = useRef<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      initialized.current = true;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (initialized.current) setLoading(false);
      if (session && authMode === 'LOGIN') setShowAuthModal(false);

      // Costura da atribuição de canal (TP-7 7B).
      //
      // Aqui e não no AuthModal de propósito: este é o único ponto por onde
      // TODO login passa, qualquer que seja a origem. Amarrado ao modal, um
      // caminho de entrada novo nasceria sem atribuição e ninguém notaria —
      // o sintoma seria um relatório com menos linhas, não um erro.
      //
      // SIGNED_IN só: TOKEN_REFRESHED e INITIAL_SESSION disparam neste mesmo
      // callback e não representam uma entrada nova.
      const userId = session?.user?.id;
      if (_event === 'SIGNED_IN' && userId && !attributed.current.has(userId)) {
        attributed.current.add(userId);

        // Deliberadamente sem await: a costura não pode atrasar a entrada no
        // produto. Se falhar, perde-se uma linha de relatório — nunca o acesso.
        attachAttribution(userId).catch((err) => {
          console.error('[auth] falha ao costurar atribuição', err);
        });

        // Evento de conversão `Lead` (TP-7 7A t4). Mesmo gancho da atribuição
        // pela mesma razão: é por onde todo login passa. O GTM só dispara o
        // pixel se houver consentimento — quem recusou empurra para o
        // dataLayer e nada sai daqui.
        trackLead(userId);
      }
    });

    return () => subscription.unsubscribe();
  }, [authMode]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const openAuthModal = (mode: 'LOGIN' | 'UPDATE_PHONE' = 'LOGIN') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, showAuthModal, setShowAuthModal, authMode, openAuthModal, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
