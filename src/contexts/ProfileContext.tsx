"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface ProfileSummary {
  id: string;
  full_name: string | null;
  isdependent: boolean;
  avatar_url?: string | null;
}

interface ProfileContextValue {
  activeProfileId: string | null;
  setActiveProfileId: (id: string) => void;
  profiles: ProfileSummary[];
  refreshProfiles: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

const LS_KEY = "nubo:active_profile_id";

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(LS_KEY);
    }
    return null;
  });
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);

  const setActiveProfileId = useCallback((id: string) => {
    setActiveProfileIdState(id);
    localStorage.setItem(LS_KEY, id);
    // Espelha em cookie para Server Components lerem via cookies()
    document.cookie = `nubo:active_profile_id=${id};path=/;max-age=31536000;SameSite=Lax`;
  }, []);

  const refreshProfiles = useCallback(async () => {
    if (!user) return;

    // titular
    const { data: titular } = await supabase
      .from("user_profiles")
      .select("id, full_name, isdependent, avatar_url")
      .eq("id", user.id)
      .limit(1)
      .single();

    // dependentes
    const { data: dependentes } = await supabase
      .from("user_profiles")
      .select("id, full_name, isdependent, avatar_url")
      .eq("parent_user_id", user.id);

    const all: ProfileSummary[] = [];
    if (titular) all.push(titular as ProfileSummary);
    if (dependentes) all.push(...(dependentes as ProfileSummary[]));
    setProfiles(all);
  }, [user]);

  // Inicializa ao logar
  useEffect(() => {
    if (!user) {
      setActiveProfileIdState(null);
      setProfiles([]);
      return;
    }

    // Se não tinha nada no localStorage (ou no estado inicial), usa o user.id
    if (!activeProfileId) {
      const stored = localStorage.getItem(LS_KEY) ?? user.id;
      setActiveProfileIdState(stored);
      document.cookie = `nubo:active_profile_id=${stored};path=/;max-age=31536000;SameSite=Lax`;
    }

    refreshProfiles();
  }, [user, refreshProfiles]);

  // Limpa no logout (user passa a null pelo AuthContext e loading é false)
  const { loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) {
      localStorage.removeItem(LS_KEY);
    }
  }, [user, loading]);

  return (
    <ProfileContext.Provider value={{ activeProfileId, setActiveProfileId, profiles, refreshProfiles }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
