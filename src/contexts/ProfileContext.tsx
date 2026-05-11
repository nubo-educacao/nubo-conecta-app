"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface ProfileSummary {
  id: string;
  full_name: string | null;
  isdependent: boolean;
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
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);

  const setActiveProfileId = useCallback((id: string) => {
    setActiveProfileIdState(id);
    localStorage.setItem(LS_KEY, id);
  }, []);

  const refreshProfiles = useCallback(async () => {
    if (!user) return;

    // titular
    const { data: titular } = await supabase
      .from("user_profiles")
      .select("id, full_name, isdependent")
      .eq("id", user.id)
      .limit(1)
      .single();

    // dependentes
    const { data: dependentes } = await supabase
      .from("user_profiles")
      .select("id, full_name, isdependent")
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

    // Restaura do localStorage ou usa user.id
    const stored = localStorage.getItem(LS_KEY);
    setActiveProfileIdState(stored ?? user.id);

    refreshProfiles();
  }, [user, refreshProfiles]);

  // Limpa no logout (user passa a null pelo AuthContext)
  useEffect(() => {
    if (!user) {
      localStorage.removeItem(LS_KEY);
    }
  }, [user]);

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
