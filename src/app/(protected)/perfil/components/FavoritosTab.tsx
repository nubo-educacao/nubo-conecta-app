"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import OpportunityCard from "@/components/opportunities/OpportunityCard";
import type { IUnifiedOpportunity } from "@/types/opportunities";

interface FavoritosTabProps {
  userId: string;
}

interface FavoriteRow {
  id: string;
  course_id: string | null;
  partner_opportunities_id: string | null;
}

export default function FavoritosTab({ userId }: FavoritosTabProps) {
  const [opportunities, setOpportunities] = useState<IUnifiedOpportunity[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [rawFavorites, setRawFavorites] = useState<FavoriteRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadFavorites() {
    setLoading(true);
    const { data: favs } = await supabase
      .from("user_favorites")
      .select("id, course_id, partner_opportunities_id")
      .eq("user_id", userId);

    if (!favs || favs.length === 0) {
      setOpportunities([]);
      setFavoriteIds(new Set());
      setRawFavorites([]);
      setLoading(false);
      return;
    }

    setRawFavorites(favs as FavoriteRow[]);

    // Build unified_ids to query v_unified_opportunities
    const unifiedIds: string[] = [];
    for (const f of favs as FavoriteRow[]) {
      if (f.partner_opportunities_id) unifiedIds.push(`partner_${f.partner_opportunities_id}`);
      if (f.course_id) unifiedIds.push(`mec_${f.course_id}`);
    }

    if (unifiedIds.length === 0) {
      setOpportunities([]);
      setLoading(false);
      return;
    }

    const { data: rows } = await supabase
      .from("v_unified_opportunities")
      .select("unified_id, title, provider_name, type, opportunity_type, category, is_partner, location, badges, created_at, status, starts_at, ends_at, external_redirect_url, external_redirect_enabled, min_cutoff_score, max_cutoff_score, institution_cover_url")
      .in("unified_id", unifiedIds);

    if (!rows) {
      setOpportunities([]);
      setLoading(false);
      return;
    }

    const mapped: IUnifiedOpportunity[] = (rows as Record<string, unknown>[]).map((row) => ({
      id: row.unified_id as string,
      title: row.title as string,
      institution_name: row.provider_name as string,
      is_partner: row.is_partner as boolean,
      type: row.type as IUnifiedOpportunity["type"],
      opportunity_type: (row.opportunity_type || row.type) as string,
      category: row.category as IUnifiedOpportunity["category"],
      category_label: "",
      location: (row.location as string) || "Nacional",
      education_level: "Graduação",
      badges: (row.badges as string[]) || [],
      created_at: row.created_at as string,
      status: row.status as string | undefined,
      starts_at: row.starts_at as string | undefined,
      ends_at: row.ends_at as string | undefined,
      min_cutoff_score: row.min_cutoff_score as number | undefined,
      max_cutoff_score: row.max_cutoff_score as number | undefined,
      institution_cover_url: row.institution_cover_url as string | undefined,
      external_redirect: row.external_redirect_enabled
        ? { enabled: true, url: row.external_redirect_url as string | undefined }
        : undefined,
    }));

    setOpportunities(mapped);
    setFavoriteIds(new Set(unifiedIds));
    setLoading(false);
  }

  useEffect(() => { loadFavorites(); }, [userId]);

  async function handleFavorite(id: string) {
    // Optimistic remove
    setOpportunities((prev) => prev.filter((o) => o.id !== id));
    setFavoriteIds((prev) => { const next = new Set(prev); next.delete(id); return next; });

    // Find the raw favorite row to delete
    const isPartner = id.startsWith("partner_");
    const rawId = id.replace("partner_", "").replace("mec_", "");
    const row = rawFavorites.find((f) => (isPartner ? f.partner_opportunities_id === rawId : f.course_id === rawId));

    if (row) {
      await supabase.from("user_favorites").delete().eq("id", row.id);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-[#3092bb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ background: "rgba(48,146,187,0.08)" }}
        >
          <Heart size={28} style={{ color: "#3092bb" }} />
        </div>
        <h3 className="text-base font-bold mb-2" style={{ color: "#3A424E", fontFamily: "Montserrat, sans-serif" }}>
          Nenhum favorito ainda
        </h3>
        <p className="text-sm mb-6" style={{ color: "#707A7E", fontFamily: "Montserrat, sans-serif" }}>
          Explore oportunidades e salve as que mais te interessam.
        </p>
        <Link
          href="/oportunidades"
          className="px-6 py-2.5 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #38B1E4 0%, #024F86 100%)", fontFamily: "Montserrat, sans-serif" }}
        >
          Explorar Oportunidades
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {opportunities.map((opp) => (
        <OpportunityCard
          key={opp.id}
          opportunity={opp}
          isFavorited={favoriteIds.has(opp.id)}
          onFavorite={handleFavorite}
        />
      ))}
    </div>
  );
}
