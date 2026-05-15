"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
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
