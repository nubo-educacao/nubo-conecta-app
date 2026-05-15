"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/contexts/ProfileContext";

interface FavoritesContextValue {
  favoriteIds: Set<string>;
  toggleFavorite: (opportunityId: string) => Promise<void>;
  isFavorited: (opportunityId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { activeProfileId } = useProfile();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const loadFavorites = useCallback(async () => {
    if (!activeProfileId) {
      setFavoriteIds(new Set());
      return;
    }

    const { data } = await supabase
      .from("user_favorites")
      .select("course_id, partner_opportunities_id")
      .eq("user_id", activeProfileId);

    const ids = new Set<string>();
    if (data) {
      data.forEach((f: any) => {
        if (f.course_id) ids.add(`mec_${f.course_id}`);
        if (f.partner_opportunities_id) ids.add(`partner_${f.partner_opportunities_id}`);
      });
    }
    setFavoriteIds(ids);
  }, [activeProfileId]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleFavorite = async (opportunityId: string) => {
    if (!activeProfileId) return;

    const isPartner = opportunityId.startsWith("partner_");
    const rawId = opportunityId.replace("partner_", "").replace("mec_", "");
    const currentlyFavorited = favoriteIds.has(opportunityId);

    // Optimistic UI Update
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (currentlyFavorited) next.delete(opportunityId);
      else next.add(opportunityId);
      return next;
    });

    if (currentlyFavorited) {
      const column = isPartner ? "partner_opportunities_id" : "course_id";
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", activeProfileId)
        .eq(column, rawId);
      
      if (error) {
        console.error("Error removing favorite:", error);
        // Rollback
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.add(opportunityId);
          return next;
        });
      }
    } else {
      const payload = isPartner 
        ? { user_id: activeProfileId, partner_opportunities_id: rawId }
        : { user_id: activeProfileId, course_id: rawId };
        
      const { error } = await supabase
        .from("user_favorites")
        .insert(payload);

      if (error) {
        console.error("Error adding favorite:", error);
        // Rollback
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(opportunityId);
          return next;
        });
      }
    }
  };

  const isFavorited = (opportunityId: string) => favoriteIds.has(opportunityId);

  return (
    <FavoritesContext.Provider value={{ favoriteIds, toggleFavorite, isFavorited }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
