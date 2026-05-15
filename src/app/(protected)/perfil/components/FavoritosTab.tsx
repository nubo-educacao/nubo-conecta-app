"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import OpportunityCard from "@/components/opportunities/OpportunityCard";
import type { IUnifiedOpportunity } from "@/types/opportunities";
import { useFavorites } from "@/contexts/FavoritesContext";

interface FavoritosTabProps {
  userId: string;
}

export default function FavoritosTab({ userId }: FavoritosTabProps) {
  const [allOpportunities, setAllOpportunities] = useState<IUnifiedOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const { favoriteIds } = useFavorites();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  async function loadFavorites() {
    setLoading(true);
    // Since we now have favoriteIds globally, we can just fetch those.
    const unifiedIds = Array.from(favoriteIds);

    if (unifiedIds.length === 0) {
      setAllOpportunities([]);
      setLoading(false);
      return;
    }

    const { data: rows } = await supabase
      .from("v_unified_opportunities")
      .select("unified_id, title, provider_name, type, opportunity_type, category, is_partner, location, badges, created_at, status, starts_at, ends_at, external_redirect_url, external_redirect_enabled, min_cutoff_score, max_cutoff_score, institution_cover_url")
      .in("unified_id", unifiedIds);

    if (!rows) {
      setAllOpportunities([]);
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

    setAllOpportunities(mapped);
    setLoading(false);
  }

  // Reload the details when favoriteIds change
  useEffect(() => { 
    // We only need to fetch if there are IDs we don't have
    loadFavorites(); 
  }, [favoriteIds.size]); 

  // Filter opportunities to only those that are STILL favorited
  const activeOpportunities = allOpportunities.filter(opp => favoriteIds.has(opp.id));

  // Pagination logic
  const totalPages = Math.ceil(activeOpportunities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOpportunities = activeOpportunities.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page if current page becomes empty (e.g. after unfavoriting)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-[#3092bb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (activeOpportunities.length === 0) {
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
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {paginatedOpportunities.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pb-8">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} style={{ color: "#3A424E" }} />
          </button>
          
          <div className="flex items-center gap-1.5 mx-2">
            {Array.from({ length: totalPages }).map((_, i) => {
              const pageNumber = i + 1;
              const isActive = currentPage === pageNumber;
              return (
                <button
                  key={pageNumber}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                    isActive 
                      ? "text-white shadow-lg shadow-[#38B1E4]/20" 
                      : "text-[#707A7E] bg-white border border-gray-100 hover:bg-gray-50"
                  }`}
                  style={{ 
                    background: isActive ? "linear-gradient(135deg, #38B1E4 0%, #024F86 100%)" : undefined,
                    fontFamily: "Montserrat, sans-serif" 
                  }}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm transition-all hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} style={{ color: "#3A424E" }} />
          </button>
        </div>
      )}
    </div>
  );
}
